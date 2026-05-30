import type { CollectionConfig } from 'payload'
import { ensurePostSlug } from '@/lib/posts'

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
  hooks: {
    beforeValidate: [ensurePostSlug],
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Canonical URL slug. Auto-generated from the title when left empty.',
        position: 'sidebar',
      },
    },
    {
      name: 'renderEngine',
      type: 'select',
      required: true,
      defaultValue: 'dna-legacy',
      options: [
        { label: 'Legacy DNA', value: 'dna-legacy' },
        { label: 'AntV v2', value: 'antv' },
        { label: 'StoryDocument v3', value: 'story-v3' },
      ],
      admin: {
        description: 'Legacy compatibility field. New posts should use StoryDocument v3.',
        position: 'sidebar',
      },
    },
    {
      name: 'formatVersion',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 1,
      max: 3,
      admin: {
        description: 'Post document format version.',
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'documentV2',
      type: 'json',
      admin: {
        description: 'Legacy AntV-first document format for v2 posts.',
      },
    },
    {
      name: 'storyDocument',
      type: 'json',
      admin: {
        description: 'Canonical StoryDocument v3 format for new posts.',
      },
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
