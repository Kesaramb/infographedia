'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PostHeader } from './post-header'
import { ActionToolbar } from './action-toolbar'
import { WatermarkBadge } from './watermark-badge'
import { useModal } from '@/components/modals/modal-provider'
import { useDownloadInfographic } from '@/hooks/use-download-infographic'
import type { InfographicDNA } from '@/lib/dna/schema'
import { getPostPath } from '@/lib/site'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import type { RenderEngineValue } from '@/lib/infographic-engine'
import type { PostImage } from '@/lib/post-meta'
import { getImageURL } from '@/lib/post-meta'
import { LiveInfographic } from '@/components/infographic/live-infographic'
import type { StoryDocumentV3 } from '@/lib/story/schema'

export interface PostCardData {
  id: number | string
  slug: string
  title: string
  description?: string
  renderEngine: RenderEngineValue
  formatVersion: 1 | 2 | 3
  documentV2?: InfographicDocumentV2 | null
  storyDocument?: StoryDocumentV3 | null
  dna: InfographicDNA
  renderedImage?: PostImage
  createdAt: string
  author: {
    username: string
    avatar?: string | null
  }
  parentPost?: {
    id: number | string
    slug?: string
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
  const postPath = getPostPath(post.slug)
  const { download, isDownloading } = useDownloadInfographic(infographicRef, postPath, post.title, {
    storySvg: post.storyDocument?.artifacts.svg ?? null,
  })
  const parentAuthor = post.parentPost?.author?.username ?? null

  function handleIterate() {
    openIterate({
      id: post.id,
      title: post.title,
      renderEngine: post.renderEngine,
      formatVersion: post.formatVersion,
      documentV2: post.documentV2,
      storyDocument: post.storyDocument,
      dna: post.dna,
      author: post.author.username,
    })
  }

  return (
    <article className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden flex flex-col min-h-[var(--feed-card-h)] md:min-h-0">
      {/* Header: avatar, username, iteration attribution */}
      <div className="flex-shrink-0">
        <PostHeader
          username={post.author.username}
          avatarUrl={post.author.avatar}
          parentAuthor={parentAuthor}
          createdAt={post.createdAt}
        />
      </div>

      {/* Infographic — animated player for feed display */}
      <div
        className="relative cursor-pointer flex-grow overflow-hidden md:flex-grow-0 md:overflow-visible"
        onClick={() => router.push(postPath)}
      >
        <LiveInfographic
          formatVersion={post.formatVersion}
          renderEngine={post.renderEngine}
          dna={post.dna}
          documentV2={post.documentV2}
          storyDocument={post.storyDocument}
          renderedImageUrl={getImageURL(post.renderedImage)}
          mode="feed"
        />
        <WatermarkBadge />
      </div>

      {/* Offscreen static renderer — used for PNG export via html-to-image.
          Must be rendered (not display:none) so html-to-image can capture it. */}
      {!post.storyDocument && (
        <div
          ref={infographicRef}
          className="absolute -left-[9999px] top-0"
          style={{ width: 600 }}
          aria-hidden="true"
        >
          <LiveInfographic
            formatVersion={post.formatVersion}
            renderEngine={post.renderEngine}
            dna={post.dna}
            documentV2={post.documentV2}
            storyDocument={post.storyDocument}
            mode="static"
          />
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex-shrink-0">
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
          onComment={() => router.push(postPath)}
          onDownload={download}
          isDownloading={isDownloading}
          postPath={postPath}
        />
      </div>

      {/* Caption */}
      <div className="px-4 pb-3 flex-shrink-0 overflow-hidden">
        <p className="text-sm text-white line-clamp-1 md:line-clamp-none">
          <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline">
            {post.author.username}
          </Link>{' '}
          <span className="text-neutral-300">{post.title}</span>
        </p>
        {post.description && (
          <p className="text-xs text-neutral-500 mt-1 line-clamp-1 md:line-clamp-2">
            {post.description}
          </p>
        )}
      </div>
    </article>
  )
}
