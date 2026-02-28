import type { PostCardData } from '@/components/feed/post-card'

/**
 * Transform a Payload post document into PostCardData.
 * Handles both populated and non-populated relationships.
 */
export function transformPost(doc: Record<string, unknown>): PostCardData {
  const author = doc.author as Record<string, unknown> | null
  const parentPost = doc.parentPost as Record<string, unknown> | null
  const metrics = (doc.metrics ?? {}) as Record<string, number>

  // Resolve avatar: when populated, avatar is a Media object with a url field
  const authorAvatar = author?.avatar
  let avatarUrl: string | null = null
  if (typeof authorAvatar === 'object' && authorAvatar !== null && 'url' in authorAvatar) {
    avatarUrl = (authorAvatar as { url: string }).url
  }

  return {
    id: doc.id as number,
    title: (doc.title as string) ?? '',
    description: doc.description as string | undefined,
    dna: doc.dna as PostCardData['dna'],
    createdAt: (doc.createdAt as string) ?? new Date().toISOString(),
    author: {
      username: (author?.username as string) ?? 'unknown',
      avatar: avatarUrl,
    },
    parentPost: parentPost
      ? {
          id: parentPost.id as number,
          author: parentPost.author
            ? {
                username:
                  (parentPost.author as Record<string, unknown>)?.username as string ??
                  'unknown',
              }
            : undefined,
        }
      : null,
    metrics: {
      likes: metrics.likes ?? 0,
      saves: metrics.saves ?? 0,
      shares: metrics.shares ?? 0,
      comments: metrics.comments ?? 0,
      iterationCount: metrics.iterationCount ?? 0,
    },
  }
}
