import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Infographedia',
    template: '%s | Infographedia',
  },
  description: 'AI-powered infographic platform. Create, iterate, and explore data visualizations backed by real sources.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  )
}
