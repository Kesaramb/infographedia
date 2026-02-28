---
description: Scaffold a new Payload CMS collection with strict TypeScript. Provide the collection name.
arguments:
  - name: collection_name
    description: The name of the collection (e.g., "comments", "notifications")
    required: true
---

# New Payload Collection

Create a new Payload CMS collection for Infographedia.

## Steps

1. **Create the collection file** at `src/collections/{{ collection_name }}.ts`
2. The collection MUST:
   - Use strict TypeScript with `CollectionConfig` type from `payload`
   - Have a kebab-case `slug`
   - Include proper field types, validation, and indexes on frequently queried fields
   - Include `index: true` on any relationship fields or fields used in `where` queries
3. **Register the collection** in `payload.config.ts` under the `collections` array
4. **Run migrations**: Execute `pnpm db:migrate` to apply schema changes
5. **Create TypeScript types** for the collection's data shape if not auto-generated

Follow the existing collections (Users, Posts, Media) as reference. Use the `payload-cms` skill for patterns.
