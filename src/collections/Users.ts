import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'username',
  },
  access: {
    read: () => true, // Public profiles — anyone can see username/avatar
    create: () => true, // Anyone can register
  },
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      minLength: 3,
      maxLength: 30,
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
}
