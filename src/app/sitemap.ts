import type { MetadataRoute } from 'next'
import { getPostsForSitemap } from '@/lib/post-queries'
import { getPostURL, getSiteURL } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteURL = getSiteURL()

  const staticEntries: MetadataRoute.Sitemap = [
    {
      changeFrequency: 'daily',
      lastModified: new Date(),
      priority: 1,
      url: siteURL,
    },
    {
      changeFrequency: 'monthly',
      lastModified: new Date(),
      priority: 0.6,
      url: `${siteURL}/guide`,
    },
  ]

  const posts = await getPostsForSitemap().catch(() => [])
  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    changeFrequency: 'weekly',
    lastModified: new Date(post.updatedAt ?? post.createdAt),
    priority: 0.8,
    url: getPostURL(post.slug),
  }))

  return [...staticEntries, ...postEntries]
}
