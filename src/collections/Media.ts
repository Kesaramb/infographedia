import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: '../media',
    mimeTypes: ['image/webp', 'image/png', 'image/jpeg'],
    imageSizes: [
      {
        name: 'feed',
        width: 800,
        height: 1000,
        position: 'centre',
      },
      {
        name: 'thumbnail',
        width: 400,
        height: 500,
        position: 'centre',
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        description: 'Original source page URL for this grounded media asset.',
      },
    },
    {
      name: 'sourceName',
      type: 'text',
      admin: {
        description: 'Source publication or domain name.',
      },
    },
    {
      name: 'accessedAt',
      type: 'date',
      admin: {
        description: 'When the source page was accessed.',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'usage',
      type: 'select',
      options: [
        { label: 'Evidence', value: 'evidence' },
        { label: 'Context', value: 'context' },
      ],
      admin: {
        description: 'How the infographic is using this image.',
      },
    },
    {
      name: 'relevance',
      type: 'textarea',
      admin: {
        description: 'Why this media asset is relevant to the infographic.',
      },
    },
    {
      name: 'license',
      type: 'text',
      admin: {
        description: 'Optional rights or license note for the asset.',
      },
    },
  ],
}
