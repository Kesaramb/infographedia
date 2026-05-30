import type { InfographicDNA } from '@/lib/dna/schema'
import type { StoryDocumentV3 } from '@/lib/story/schema'

export type PostImage =
  | {
      id?: number | string
      url?: string | null
      alt?: string | null
    }
  | number
  | string
  | null
  | undefined

export type PostTag = {
  tag?: string
}

export type PostSEO = {
  title?: string
  description?: string
  image?: PostImage
}

export function getPostDescription(
  post: Partial<{
    description?: string | null
    dna?: Partial<InfographicDNA>
    storyDocument?: Partial<StoryDocumentV3> | null
  }>,
): string {
  const description = post.description?.trim()
  if (description) return description

  const storySetup = post.storyDocument?.story?.setup?.trim()
  if (storySetup) return storySetup

  const storyTakeaway = post.storyDocument?.story?.takeaway?.trim()
  if (storyTakeaway) return storyTakeaway

  const subtitle = post.dna?.content?.subtitle?.trim()
  if (subtitle) return subtitle

  const hook = post.dna?.content?.hook?.trim()
  if (hook) return hook

  const footnotes = post.dna?.content?.footnotes?.trim()
  if (footnotes) return footnotes

  return 'Explore grounded, AI-generated infographic posts with transparent data and sources.'
}

export function getPostKeywords(post: Partial<{ tags?: PostTag[] | null }>): string[] {
  return (post.tags ?? [])
    .map((tag) => tag?.tag?.trim())
    .filter((tag): tag is string => Boolean(tag))
}

export function getPostImage(post: Partial<{ meta?: PostSEO | null; renderedImage?: PostImage }>): PostImage {
  return post.meta?.image ?? post.renderedImage ?? null
}

export function getImageURL(image: PostImage): string | null {
  if (!image) return null

  if (typeof image === 'object' && 'url' in image && typeof image.url === 'string') {
    return image.url
  }

  return null
}
