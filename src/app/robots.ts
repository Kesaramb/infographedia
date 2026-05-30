import type { MetadataRoute } from 'next'
import { getSiteURL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: '/',
      userAgent: '*',
    },
    sitemap: `${getSiteURL()}/sitemap.xml`,
  }
}
