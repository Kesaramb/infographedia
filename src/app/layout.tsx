import type { Metadata } from 'next'
import '@/styles/globals.css'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { getGoogleAnalyticsId, getGoogleSiteVerification, getSiteURL } from '@/lib/site'

const googleAnalyticsId = getGoogleAnalyticsId()
const googleSiteVerification = getGoogleSiteVerification()

export const metadata: Metadata = {
  metadataBase: new URL(getSiteURL()),
  title: {
    default: 'Infographedia',
    template: '%s | Infographedia',
  },
  description: 'AI-powered infographic platform. Create, iterate, and explore data visualizations backed by real sources.',
  openGraph: {
    description: 'AI-powered infographic platform. Create, iterate, and explore data visualizations backed by real sources.',
    siteName: 'Infographedia',
    title: 'Infographedia',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    description: 'AI-powered infographic platform. Create, iterate, and explore data visualizations backed by real sources.',
    title: 'Infographedia',
  },
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {googleAnalyticsId ? (
          <GoogleAnalytics measurementId={googleAnalyticsId} />
        ) : null}
        {children}
      </body>
    </html>
  )
}
