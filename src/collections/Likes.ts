import type { CollectionConfig } from 'payload'

export const Likes: CollectionConfig = {
  slug: 'likes',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  indexes: [
    {
      fields: ['user', 'post'],
      unique: true,
    },
  ],
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      index: true,
    },
  ],
}
