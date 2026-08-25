---
title: "Food Delivery Microservices with Spring Cloud"
description: "A food delivery monolith broken into six Spring Boot services, and what the failure paths taught me."
date: 2026-05-14
tags: ["Java", "Spring Boot", "Microservices", "RabbitMQ", "Docker", "Backend"]
repo: "https://github.com/EkowSackey/food-delivery-lab"
featured: false
---

A food delivery platform, migrated from a monolith into six independently deployable Spring Boot services.

Six services, each its own repo, wired together as submodules and brought up by one docker compose file:

- **API Gateway** (8080): the only door to the outside
- **Customer** (8081): identity, auth, profiles
- **Restaurant** (8082): restaurants and menus
- **Order** (8083): the core transaction
- **Delivery** (8084): logistics lifecycle
- **Discovery Server** (8761): Eureka registry

## The problem:

Splitting a monolith into services is , one could say, easy. You draw lines around bounded contexts, give each one a database, and you're " done". 


The part that could catch you lacking: the moment you cut the monolith, every method call that used to be a guaranteed function call becomes a network request that can *fail*. Code that could never fail before now has a failure mode. And you have to decide, at every single call site, what should happen when the other service isn't there.

That decision is almost the whole project. Everything else is Spring annotations...


Approach:
Draw boundaries along bounded domains.  Customer, Restaurant, Order, Delivery. Each owns its own PostgreSQL database, and no service reaches into another's tables. If Order needs to know whether a customer exists, it asks Customer over HTTP like anyone else.

Which sounds clean until you realise you've just turned a JOIN into a distributed system.
Committing the first sin of distributed systems: distributing your systems. 
## Inter Service Communication in 2 ways

Not every call deserves the same treatment, so there are two channels.

**Feign (synchronous)** for anything that must be true before a write happens. Placing an order verifies the customer exists, the restaurant is accepting orders, and every menu item belongs to that restaurant. The order cannot be persisted until those answers come back, so the caller waits. The trade accepted here is real: if Customer is down, orders don't get placed.

**RabbitMQ (asynchronous)** for anything that can happen slightly later. Once an order is placed, creating the delivery record does not need to block the customer's response. Order publishes `OrderPlacedEvent`, Delivery consumes it, and a delivery record appears a moment later. Cancellation works the same way in reverse.

The customer sees `PLACED`, then `CONFIRMED` a beat later when Delivery acknowledges. That flicker is eventual consistency, and for a food delivery flow it's fine. Choosing where it's fine is the actual skill.

Caution: async is not fire-and-forget. Every queue is bound to a dead-letter exchange, three delivery attempts with exponential backoff, and anything that still fails lands in a `.dlq` queue where a human can look at it. A dropped event with no DLQ is just data loss with extra steps.

## When customer-service goes down

Here's the main thing the lab actually taught me.

Three different call sites depend on customer-service. All three are protected by the same Resilience4j circuit breaker, with the same config: 10-call sliding window, 50% failure threshold, 10s in OPEN. Identical infrastructure.

They do three completely different things when it trips.

**Order validating a customer** throws a 503. An order placed against a customer that may not exist is corrupt data. Refusing is the correct answer, and failing loudly is better than guessing.

**Restaurant checking ownership** also throws. This one is a security boundary: "is this person allowed to edit this restaurant?" has no safe default. When you can't verify, you deny.

**Restaurant enriching `ownerName`** returns the string `"unknown"` and carries on. Nobody should be unable to browse restaurants because a display name is temporarily unavailable.

Same dependency. Same outage. Same circuit breaker. Three answers,  two in the same file:

```java
// ownership validation: must fail loudly
throw new ServiceUnavailableException("Customer service is currently unavailable.");

// enrichOwnerName only: graceful degradation
fallback.setUsername("unknown");
```

The circuit breaker is infrastructure. The fallback is a *product decision* wearing a technical costume. Resilience4j will happily let you return a default for a security check, and nothing will warn you. 

That was the lesson: the framework gives you the mechanism and hands the actual  judgement calls back to you.
One reason why i actually enjoy Spring is the way it pretends not to be there at all. Very demure. 
## What the gateway refuses to trust

Internal service-to-service calls carry an `X-Internal-Service-Token` header, and endpoints that require `ROLE_SERVICE` are never issued to real users.

Which is only safe because the gateway strips that header off *every* inbound request before doing anything else: unconditionally, before routing, before even checking whether the route is public. If it stripped the header only on secured routes, a public endpoint would become a way to forge a service identity.

Everything behind the gateway trusts the token in the request. So the gateway's job is making sure nothing dishonest gets that far.

## Running it

One `docker compose up` brings up all six services plus PostgreSQL and RabbitMQ. Health checks gate the startup order, so Eureka comes up before the services that register with it, and Postgres is accepting connections before anything tries to migrate.

Startup is still asynchronous, though: services take 30 to 60 seconds to appear in the Eureka dashboard, and requests sent before registration completes fail in confusing ways. Worth knowing before you go debugging a gateway 500 that is really just a service that hasn't announced itself yet.

---

**Stack:** Java 21 · Spring Boot · Spring Cloud Gateway · Eureka · OpenFeign · Resilience4j · RabbitMQ · PostgreSQL · Docker Compose
