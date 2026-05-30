import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isLegacyNumericPostParam, normalizePublicPost, type PublicPost } from '@/lib/posts'

export const getPostByParam = cache(async (param: string): Promise<PublicPost | null> => {
  const payload = await getPayload({ config })

  if (isLegacyNumericPostParam(param)) {
    try {
      const post = await payload.findByID({
        collection: 'posts',
        depth: 2,
        id: Number(param),
        overrideAccess: true,
      })

      return normalizePublicPost(post as unknown as Record<string, unknown>)
    } catch {
      return null
    }
  }

  const result = await payload.find({
    collection: 'posts',
    depth: 2,
    limit: 1,
    overrideAccess: true,
    where: {
      slug: {
        equals: param,
      },
    },
  })

  const post = result.docs[0] as unknown as Record<string, unknown> | undefined
  return post ? normalizePublicPost(post) : null
})

export const getPostsForSitemap = cache(
  async (): Promise<Array<Pick<PublicPost, 'createdAt' | 'slug' | 'updatedAt'>>> => {
    const payload = await getPayload({ config })
    const docs: Array<Pick<PublicPost, 'createdAt' | 'slug' | 'updatedAt'>> = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const result = await payload.find({
        collection: 'posts',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        page,
        sort: '-createdAt',
      })

      docs.push(
        ...result.docs.map((doc) => ({
          createdAt: doc.createdAt,
          slug: doc.slug,
          updatedAt: doc.updatedAt,
        })),
      )

      hasNextPage = result.hasNextPage
      page++
    }

    return docs
  },
)
