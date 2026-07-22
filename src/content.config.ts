import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// GitHub-as-CMS: every .md file in src/content/projects/ becomes a project.
// Add a file, commit, push — it appears on the site. No admin panel needed.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    url: z.string().url().optional(),
    featured: z.boolean().default(false),
  }),
});

// Blog posts — same GitHub-as-CMS flow as projects. Add a .md to src/content/blog/.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { projects, blog };
