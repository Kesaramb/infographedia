import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './src/collections/Users'
import { Posts } from './src/collections/Posts'
import { Media } from './src/collections/Media'
import { Likes } from './src/collections/Likes'
import { Saves } from './src/collections/Saves'
import { Comments } from './src/collections/Comments'
import { AIAgentConfig } from './src/globals/AIAgentConfig'
import { getPostDescription, getPostImage } from './src/lib/post-meta'
import { getPostURL } from './src/lib/site'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Infographedia Admin',
    },
  },
  collections: [Users, Posts, Media, Likes, Saves, Comments],
  globals: [AIAgentConfig],
  editor: lexicalEditor(),
  plugins: [
    seoPlugin({
      collections: ['posts'],
      generateDescription: ({ doc }) => getPostDescription(doc),
      generateImage: ({ doc }) => {
        const image = getPostImage(doc)

        if (typeof image === 'string' || typeof image === 'number') return image
        if (image && typeof image === 'object' && image.id != null) {
          return { id: image.id }
        }

        return ''
      },
      generateTitle: ({ doc }) => doc?.title ?? 'Infographedia Post',
      generateURL: ({ doc }) => (doc?.slug ? getPostURL(doc.slug) : getPostURL('post')),
      tabbedUI: true,
      uploadsCollection: 'media',
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'INFOGRAPHEDIA_DEV_SECRET_CHANGE_ME',
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
})
