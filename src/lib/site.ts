export function getSiteURL(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'http://localhost:3000'

  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export function getPostPath(slug: string): string {
  return `/post/${encodeURIComponent(slug)}`
}

export function getPostURL(slug: string): string {
  return new URL(getPostPath(slug), getSiteURL()).toString()
}

export function getGoogleAnalyticsId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() || undefined
}

export function getGoogleSiteVerification(): string | undefined {
  return (
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
    undefined
  )
}
