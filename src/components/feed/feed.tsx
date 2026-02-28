'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { PostCard, type PostCardData } from './post-card'
import { PostCardSkeleton } from './post-card-skeleton'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { transformPost } from '@/lib/transform-post'
import { Loader2, AlertCircle, RefreshCcw, Sparkles } from 'lucide-react'

const PAGE_SIZE = 10

/**
 * Main feed container with infinite scroll pagination.
 * Fetches posts from `/api/posts` via Payload REST API.
 * Batch-fetches interaction state (liked/saved) for the current user.
 */
export function Feed() {
  const fetcher = useCallback(async (page: number) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort: '-createdAt',
      depth: '2', // Populate author + parentPost.author
    })

    const response = await fetch(`/api/posts?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`)
    }

    const data = await response.json()

    // Transform Payload response into PostCardData
    const docs: PostCardData[] = (data.docs ?? []).map(transformPost)

    // Batch-fetch interaction state for current user
    if (docs.length > 0) {
      try {
        const postIds = docs.map((d) => d.id).join(',')
        const interRes = await fetch(`/api/user/interactions?postIds=${postIds}`, {
          credentials: 'include',
        })
        if (interRes.ok) {
          const { liked, saved } = (await interRes.json()) as {
            liked: number[]
            saved: number[]
          }
          for (const doc of docs) {
            doc.isLiked = liked.includes(doc.id as number)
            doc.isSaved = saved.includes(doc.id as number)
          }
        }
      } catch {
        // Non-fatal — interactions just won't show active state
      }
    }

    return {
      docs,
      hasNextPage: data.hasNextPage ?? false,
    }
  }, [])

  const {
    items: posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
    refresh,
  } = useInfiniteScroll<PostCardData>({ fetcher })

  // Initial loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-neutral-400">{error}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-sm text-white hover:bg-white/15 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Try again
        </button>
      </div>
    )
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-neutral-500" />
        </div>
        <p className="text-sm text-neutral-400">No infographics yet</p>
        <p className="text-xs text-neutral-600">
          Create your first one with the + button!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: 0.4,
            delay: Math.min(index * 0.08, 0.4),
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <PostCard post={post} />
        </motion.div>
      ))}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {isLoadingMore && (
            <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
          )}
        </div>
      )}

      {/* End of feed */}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-neutral-700 py-8">
          You've seen all the infographics
        </p>
      )}
    </div>
  )
}
