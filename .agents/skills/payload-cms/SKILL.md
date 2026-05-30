---
name: payload-cms
description: Payload CMS v3 collection schemas, hooks, and configuration. Use when creating database schemas, API endpoints, authentication, file uploads, Payload hooks, or any backend/CMS related work.
---

# Payload CMS v3 — Backend Patterns

## Setup Context

Payload v3 runs embedded inside the Next.js application as a monolith. There is no separate backend server. Payload's admin panel is accessible at `/admin`.

## Collection Schemas

All collections use strict TypeScript with the Payload config API.

### Users Collection
```typescript
import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true, // Enables JWT auth, login, register
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
      maxLength: 300,
    },
  ],
};
```

### Posts Collection (Infographics)
```typescript
import type { CollectionConfig } from 'payload';

export const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'dna',
      type: 'json',
      required: true,
      // This stores the full InfographicDNA object
    },
    {
      name: 'renderedImage',
      type: 'upload',
      relationTo: 'media',
      // Auto-populated by beforeChange hook via Playwright screenshot
    },
    {
      name: 'parentPost',
      type: 'relationship',
      relationTo: 'posts',
      // Self-referential: if set, this post is an iteration of another
      index: true,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        { name: 'tag', type: 'text' },
      ],
    },
    {
      name: 'metrics',
      type: 'group',
      fields: [
        { name: 'likes', type: 'number', defaultValue: 0 },
        { name: 'saves', type: 'number', defaultValue: 0 },
        { name: 'shares', type: 'number', defaultValue: 0 },
        { name: 'iterationCount', type: 'number', defaultValue: 0 },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      // 1. Validate DNA with Zod before saving
      // 2. Trigger Playwright screenshot to generate renderedImage
    ],
    afterChange: [
      // If parentPost is set, increment parent's iterationCount
    ],
  ],
};
```

### Media Collection
```typescript
import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/webp', 'image/png', 'image/jpeg'],
    imageSizes: [
      { name: 'feed', width: 800, height: 1000, position: 'centre' },
      { name: 'thumbnail', width: 400, height: 500, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
};
```

## Payload Hooks

### beforeChange on Posts
```typescript
import { DNASchema } from '@/lib/dna/schema';
import { generateSnapshot } from '@/lib/snapshot/generate';

const validateAndSnapshot: CollectionBeforeChangeHook = async ({ data, operation }) => {
  // Step 1: Validate DNA
  if (data.dna) {
    const result = DNASchema.safeParse(data.dna);
    if (!result.success) {
      throw new Error(`Invalid DNA: ${result.error.message}`);
    }
    data.dna = result.data; // Use the cleaned/parsed version
  }

  // Step 2: Generate rendered image (on create or DNA update)
  if (operation === 'create' || data.dna) {
    const imageId = await generateSnapshot(data.dna);
    data.renderedImage = imageId;
  }

  return data;
};
```

## API Patterns

Payload auto-generates REST and GraphQL APIs. Key endpoints:

```
GET    /api/posts              # Feed (paginated, sorted by createdAt)
GET    /api/posts/:id          # Single post with full DNA
POST   /api/posts              # Create new post
PATCH  /api/posts/:id          # Update post
GET    /api/posts?where[parentPost][equals]=:id   # Get all iterations of a post

GET    /api/users/:id          # User profile
POST   /api/users/login        # Auth
POST   /api/users/register     # Register
```

## Rules

1. **All schemas in strict TypeScript**. No `any`, no loose field definitions.
2. **Always validate DNA in beforeChange hooks**. Never trust client-submitted JSON.
3. **The `parentPost` field is the iteration lineage**. Query it with Payload's `where` clause for tree traversal.
4. **renderedImage is auto-generated**. Never let the client upload it directly. It's always a Playwright screenshot of the rendered DNA.
5. **Use Payload's built-in auth**. Don't build custom JWT. Leverage `auth: true` on the Users collection.
