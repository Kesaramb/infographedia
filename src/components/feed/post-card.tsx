'use client'

import { useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { PostHeader } from './post-header'
import { ActionToolbar } from './action-toolbar'
import { WatermarkBadge } from './watermark-badge'
import { DNARenderer } from '@/components/dna-renderer'
import { useModal } from '@/components/modals/modal-provider'
import { useDownloadInfographic } from '@/hooks/use-download-infographic'
import type { InfographicDNA } from '@/lib/dna/schema'

// Lazy-load Remotion player (no SSR — canvas APIs)
const AnimatedDNARenderer = dynamic(
  () => import('@/components/remotion/animated-dna-renderer').then((m) => m.AnimatedDNARenderer),
  { ssr: false },
)

export interface PostCardData {
  id: number | string
  title: string
  description?: string
  dna: InfographicDNA
  createdAt: string
  author: {
    username: string
    avatar?: string | null
  }
  parentPost?: {
    id: number | string
    author?: {
      username: string
    }
  } | null
  metrics: {
    likes: number
    saves: number
    shares: number
    comments: number
    iterationCount: number
  }
  isLiked?: boolean
  isSaved?: boolean
}

interface PostCardProps {
  post: PostCardData
}

/**
 * Full post card for the feed.
 * Header → rendered infographic with watermark → action toolbar → caption.
 */
export function PostCard({ post }: PostCardProps) {
  const router = useRouter()
  const { openIterate } = useModal()
  const infographicRef = useRef<HTMLDivElement>(null)
  const { download, isDownloading } = useDownloadInfographic(infographicRef, post.id, post.title)
  const parentAuthor = post.parentPost?.author?.username ?? null

  function handleIterate() {
    openIterate({
      id: post.id,
      title: post.title,
      dna: post.dna,
      author: post.author.username,
    })
  }

  return (
    <article className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden">
      {/* Header: avatar, username, iteration attribution */}
      <PostHeader
        username={post.author.username}
        avatarUrl={post.author.avatar}
        parentAuthor={parentAuthor}
        createdAt={post.createdAt}
      />

      {/* Infographic — animated player for feed display */}
      <div
        className="block relative cursor-pointer"
        onClick={() => router.push(`/post/${post.id}`)}
      >
        <AnimatedDNARenderer dna={post.dna} />
        <WatermarkBadge />
      </div>

      {/* Hidden static renderer — used for PNG export via html-to-image */}
      <div ref={infographicRef} className="hidden">
        <DNARenderer dna={post.dna} />
      </div>

      {/* Action Toolbar */}
      <ActionToolbar
        postId={post.id}
        likes={post.metrics.likes}
        saves={post.metrics.saves}
        shares={post.metrics.shares}
        commentCount={post.metrics.comments}
        iterationCount={post.metrics.iterationCount}
        isLiked={post.isLiked}
        isSaved={post.isSaved}
        onIterate={handleIterate}
        onComment={() => router.push(`/post/${post.id}`)}
        onDownload={download}
        isDownloading={isDownloading}
      />

      {/* Caption */}
      <div className="px-4 pb-4">
        <p className="text-sm text-white">
          <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline">
            {post.author.username}
          </Link>{' '}
          <span className="text-neutral-300">{post.title}</span>
        </p>
        {post.description && (
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
            {post.description}
          </p>
        )}
      </div>
    </article>
  )
}
