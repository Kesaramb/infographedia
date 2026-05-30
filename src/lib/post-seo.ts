import type { Metadata } from 'next'
import { getImageURL, getPostDescription, getPostKeywords } from '@/lib/post-meta'
import type { PublicPost } from '@/lib/posts'
import { getPostPath, getPostURL, getSiteURL } from '@/lib/site'

function toAbsoluteURL(value: string | null): string | null {
  if (!value) return null

  try {
    return new URL(value, getSiteURL()).toString()
  } catch {
    return null
  }
}

function getSourceReferences(post: PublicPost) {
  const sources = post.storyDocument?.evidence.sources ?? post.dna.content.sources

  return sources
    .filter((source) => source.url)
    .map((source) => ({
      '@type': 'CreativeWork',
      name: source.name,
      url: source.url,
    }))
}

export function buildPostMetadata(post: PublicPost): Metadata {
  const title = post.meta?.title?.trim() || post.title
  const description = post.meta?.description?.trim() || getPostDescription(post)
  const preferredImage = getImageURL(post.meta?.image) ? post.meta?.image : post.renderedImage
  const imageURL = toAbsoluteURL(getImageURL(preferredImage))
  const canonicalURL = getPostURL(post.slug)
  const keywords = getPostKeywords(post)

  return {
    title,
    description,
    alternates: {
      canonical: getPostPath(post.slug),
    },
    authors: [
      {
        name: post.author.username,
      },
    ],
    keywords,
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalURL,
      siteName: 'Infographedia',
      authors: [post.author.username],
      images: imageURL ? [{ url: imageURL, alt: title }] : undefined,
    },
    twitter: {
      title,
      description,
      card: imageURL ? 'summary_large_image' : 'summary',
      images: imageURL ? [imageURL] : undefined,
    },
  }
}

export function buildPostJsonLd(post: PublicPost) {
  const title = post.meta?.title?.trim() || post.title
  const description = post.meta?.description?.trim() || getPostDescription(post)
  const preferredImage = getImageURL(post.meta?.image) ? post.meta?.image : post.renderedImage
  const imageURL = toAbsoluteURL(getImageURL(preferredImage))
  const canonicalURL = getPostURL(post.slug)
  const keywords = getPostKeywords(post)
  const sources = getSourceReferences(post)
  const evidenceSources = post.storyDocument?.evidence.sources ?? post.dna.content.sources
  const variables = post.storyDocument
    ? post.storyDocument.normalized.datasets.flatMap((dataset) =>
        dataset.items.map((point) => ({
          '@type': 'PropertyValue',
          name: point.label,
          unitText: point.unit,
          value: point.value,
        })),
      )
    : post.dna.content.data.map((point) => ({
        '@type': 'PropertyValue',
        name: point.label,
        unitText: point.unit,
        value: point.value,
      }))
  const measurementTechnique = post.storyDocument?.scene.panels[0]?.chartType
    ?? post.dna.presentation.chartType

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description,
        author: {
          '@type': 'Person',
          name: post.author.username,
        },
        datePublished: post.createdAt,
        dateModified: post.updatedAt ?? post.createdAt,
        image: imageURL ? [imageURL] : undefined,
        keywords,
        mainEntityOfPage: canonicalURL,
        isBasedOn: evidenceSources.map((source) => source.url),
        citation: sources,
      },
      {
        '@type': 'Dataset',
        name: post.title,
        description,
        url: canonicalURL,
        creator: {
          '@type': 'Person',
          name: post.author.username,
        },
        includedInDataCatalog: {
          '@type': 'DataCatalog',
          name: 'Infographedia',
          url: getSiteURL(),
        },
        keywords,
        measurementTechnique,
        variableMeasured: variables,
        citation: sources,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: getSiteURL(),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: post.title,
            item: canonicalURL,
          },
        ],
      },
    ],
  }
}
