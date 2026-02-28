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
  ],
}
