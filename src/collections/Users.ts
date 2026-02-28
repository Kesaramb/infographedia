import type { CollectionConfig } from 'payload'

/** Safely check if the user has a specific role */
function hasRole(user: unknown, role: string): boolean {
  if (!user || typeof user !== 'object') return false
  return (user as { role?: string }).role === role
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'username',
  },
  access: {
    read: () => true,       // Public profiles — anyone can see username/avatar
    create: () => true,      // Anyone can register
    update: ({ req }) => {
      if (!req.user) return false
      if (hasRole(req.user, 'admin')) return true
      // Users can update their own profile
      return { id: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return hasRole(req.user, 'admin')
    },
    admin: ({ req }) => {
      if (!req.user) return false
      return hasRole(req.user, 'admin')
    },
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
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        // Only admins can change roles. New registrations default to 'user'.
        update: ({ req }) => {
          if (!req.user) return false
          return hasRole(req.user, 'admin')
        },
      },
      admin: {
        position: 'sidebar',
        description: 'Admin users can access the Payload admin panel and AI configuration.',
      },
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
