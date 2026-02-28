import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true, // Public read — anyone can browse the feed
    delete: ({ req }) => {
      if (!req.user) return false
      return (req.user as { role?: string }).role === 'admin'
    },
    admin: ({ req }) => {
      if (!req.user) return false
      return (req.user as { role?: string }).role === 'admin'
    },
  },
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
      // Stores the full InfographicDNA object
      // Validated by Zod in beforeChange hook (Iteration 6)
    },
    {
      name: 'renderedImage',
      type: 'upload',
      relationTo: 'media',
      // Auto-populated by Playwright screenshot (Iteration 6)
    },
    {
      name: 'parentPost',
      type: 'relationship',
      relationTo: 'posts',
      index: true,
      // Self-referential: if set, this post is an iteration of another
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'metrics',
      type: 'group',
      fields: [
        {
          name: 'likes',
          type: 'number',
          defaultValue: 0,
          min: 0,
        },
        {
          name: 'saves',
          type: 'number',
          defaultValue: 0,
          min: 0,
        },
        {
          name: 'shares',
          type: 'number',
          defaultValue: 0,
          min: 0,
        },
        {
          name: 'comments',
          type: 'number',
          defaultValue: 0,
          min: 0,
        },
        {
          name: 'iterationCount',
          type: 'number',
          defaultValue: 0,
          min: 0,
        },
      ],
    },
  ],
}
