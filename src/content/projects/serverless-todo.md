---
title: "Serverless To-Do App with Event-Driven Expiry"
description: "An AWS task manager where tasks expire on a schedule."
date: 2026-07-24
tags: ["AWS", "Serverless", "Python", "Event-Driven", "Backend", "CI/CD"]
repo: "https://github.com/EkowSackey/serverless-todo-app"
featured: true
---

A fully serverless task manager built with python and deployed on AWS.

![Architecture diagram: Cognito and API Gateway in front of Lambda, DynamoDB with Streams feeding SQS FIFO, EventBridge Scheduler driving the expiry handler, SNS for email](/serverless-todo-architecture.png)

## The problem:

Scheduling a future event is kinda easy. UNscheduling it is where system  design
comes into play.

Approach:
When a task is created, the API writes it to DynamoDB and creates a one-off
[EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/) entry that will
invoke an expiry Lambda at the deadline. But, the moment a user
marks that task done, there is now a live schedule out in the world pointed at
a task that must never be expired. A potential email that will disturb some unsuspecting human for no apparent reason.
You could delete the schedule inline, in the same request that completes the
task. I chose not to do it this way... for two reasons:
1. it couples the user-facing write path to a second service that can fail or throttle, and
2. it does nothing for the delete path where the item is simply gone.

So cancellation runs as its own pipeline, triggered by the data change at the database level rather than by the request:
1. Completing or deleting a task mutates the targetted DynamoDB item.
2. **DynamoDB Streams** signals the  change. A thin stream-processor Lambda Function inspects the old and new images and decides whether this transition warrants triggering a cancellation.
3. If it does, it enqueues a message on an **SQS FIFO** queue, grouped by
   `TaskId` and de-duplicated by `TaskId + eventID`.
4. A **cancellation worker** consumes the queue and calls the  `DeleteSchedule` function.

The stream processor stays dumb by design: it decides and enqueues, nothing
more...

Caution: A stream can hand you the same record again, and an update that touches only the description shouldn't look like a completion. Comparing the transition, not the state, stops a replay from generating a new cancellation.

## Idempotency, x3

Distributed schedule cancellation has a lot of ways to be delivered twice or
not at all, so every stage assumes it will be re-run:

**The queue** is FIFO with a deduplication ID of `{TaskId}-{eventID}`, so a
replayed stream record collapses into a single message. `MessageGroupId` is the
`TaskId`, which means cancellation events for a single task are strictly ordered
while different tasks are still processed in parallel.

**The worker** treats a missing schedule as success.

Anything else would put a permanently-unfulfillable message into a retry loop.

**The expiry handler** doesn't trust the pipeline at all. It writes
conditionally, and this condition is the real guarantee.

If cancellation is slow, fails, or never actually happens, the schedule still fires. It
finds a task that is no longer `Pending`, so the conditional write fails and
nothing is sent. The cancellation pipeline is an *optimisation* that keeps dead
schedules from piling up. Correctness becomes dependent on that one condition, on the write itself, where it can't create race conditions.

## Auth, and the notification fan-out

Cognito handles sign-up and sign-in.
It sits infront of the  REST API with an authorizer.
Two triggers do the work around it:

- **PreSignUp**  this auto-confirms new users. Cognito has no configuration flag for
  this and so a trigger is the mechanism by which it supports this.
- **PostAuthentication**: this  subscribes a user's email to the SNS topic with a
  filter policy of `{"userId": ["<their sub>"]}`. The expiry handler publishes
  with a matching `userId` message attribute, so one topic serves every user
  and SNS routes each message to exactly one subscription.

  The PostAuth trigger runs on *every* sign-in request, so it checks for an existing
  subscription and also repairs the filter policy rather than blindly re-subscribing a user to the channel.
  It  swallows its own exceptions  a notification problem should never be
  able to block someone from logging in.

## Cloud Infrastructure

Everything is one AWS SAM template. The table, user pool, API, all nine functions,
queue, topic, scheduler role, and the *Amplify app* that hosts the React frontend
with its backend config injected as build-time environment variables. `sam
deploy` outputs the API base URL, pool IDs, and the live frontend URL.

Frontend lives in a [separate repo](https://github.com/EkowSackey/serverless-todo-frontend)--React and Vite, talking to Cognito through `aws-amplify`.

---

**Stack:** AWS SAM · Lambda (Python) · API Gateway · DynamoDB + Streams ·
EventBridge Scheduler · SQS FIFO · SNS · Cognito · Amplify
