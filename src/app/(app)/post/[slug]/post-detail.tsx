'use client'

import { useState, useEffect, useRef } from 'react'
import { PostHeader } from '@/components/feed/post-header'
import { ActionToolbar } from '@/components/feed/action-toolbar'
import { WatermarkBadge } from '@/components/feed/watermark-badge'
import { useModal } from '@/components/modals/modal-provider'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import { CommentSection } from '@/components/comments/comment-section'
import { useDownloadInfographic } from '@/hooks/use-download-infographic'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getPostPath } from '@/lib/site'
import type { PostImage } from '@/lib/post-meta'
import { getImageURL } from '@/lib/post-meta'
import type { RenderEngineValue } from '@/lib/infographic-engine'
import { LiveInfographic } from '@/components/infographic/live-infographic'
import type { StoryDocumentV3 } from '@/lib/story/schema'

interface PostDetailProps {
  post: {
    id: number
    slug: string
    title: string
    description?: string | null
    renderEngine: RenderEngineValue
    formatVersion: 1 | 2 | 3
    documentV2?: InfographicDocumentV2 | null
    storyDocument?: StoryDocumentV3 | null
    dna: InfographicDNA
    renderedImage?: PostImage
    createdAt: string
    author: {
      username: string
    }
    parentPost?: {
      id: number
      slug?: string
      title: string
      author?: {
        username: string
      } | null
    } | null
    metrics: {
      likes: number
      saves: number
      shares: number
      comments: number
      iterationCount: number
    }
  }
}

/**
 * Full post detail view with live DNA rendering,
 * metadata, source links, and iteration lineage.
 */
export function PostDetail({ post }: PostDetailProps) {
  const parentAuthor = post.parentPost?.author?.username ?? null
  const { openIterate } = useModal()
  const infographicRef = useRef<HTMLDivElement>(null)
  const postPath = getPostPath(post.slug)
  const { download, isDownloading } = useDownloadInfographic(infographicRef, postPath, post.title, {
    storySvg: post.storyDocument?.artifacts.svg ?? null,
  })
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const sources = post.storyDocument?.evidence.sources ?? post.dna.content.sources

  // Fetch interaction state for this post on mount
  useEffect(() => {
    fetch(`/api/user/interactions?postIds=${post.id}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setIsLiked((data.liked as number[]).includes(post.id))
          setIsSaved((data.saved as number[]).includes(post.id))
        }
      })
      .catch(() => {})
  }, [post.id])

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
    <div className="flex flex-col gap-0">
      {/* Back nav */}
      <div className="px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-400" />
        </Link>
        <h1 className="text-sm font-semibold text-white truncate">
          {post.title}
        </h1>
      </div>

      {/* Header */}
      <PostHeader
        username={post.author.username}
        createdAt={post.createdAt}
        parentAuthor={parentAuthor}
      />

      {/* Animated infographic */}
      <div className="relative">
        <LiveInfographic
          formatVersion={post.formatVersion}
          renderEngine={post.renderEngine}
          dna={post.dna}
          documentV2={post.documentV2}
          storyDocument={post.storyDocument}
          renderedImageUrl={getImageURL(post.renderedImage)}
          mode="detail"
        />
        <WatermarkBadge />
      </div>

      {/* Offscreen static renderer — used for PNG export via html-to-image */}
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

      {/* Action toolbar */}
      <ActionToolbar
        postId={post.id}
        likes={post.metrics.likes}
        saves={post.metrics.saves}
        shares={post.metrics.shares}
        commentCount={post.metrics.comments}
        iterationCount={post.metrics.iterationCount}
        isLiked={isLiked}
        isSaved={isSaved}
        postPath={postPath}
        onIterate={handleIterate}
        onDownload={download}
        isDownloading={isDownloading}
      />

      {/* Caption + description */}
      <div className="px-4 py-3 border-t border-white/5">
        <p className="text-sm text-white font-medium">{post.title}</p>
        {post.description && (
          <p className="text-xs text-neutral-400 mt-1">{post.description}</p>
        )}
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="px-4 py-3 border-t border-white/5">
          <h3 className="text-[10px] text-neutral-600 uppercase tracking-wider mb-2">
            Sources
          </h3>
          <div className="flex flex-col gap-2">
            {sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{source.name}</span>
                <span className="text-neutral-600 text-[10px]">
                  {source.accessedAt}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Iteration lineage */}
      {post.parentPost && (
        <div className="px-4 py-3 border-t border-white/5">
          <h3 className="text-[10px] text-neutral-600 uppercase tracking-wider mb-2">
            Iterated from
          </h3>
          <Link
            href={getPostPath(post.parentPost.slug ?? String(post.parentPost.id))}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="text-xs text-neutral-300">
              {post.parentPost.title}
            </span>
            {post.parentPost.author && (
              <span className="text-[10px] text-neutral-500">
                by @{post.parentPost.author.username}
              </span>
            )}
          </Link>
        </div>
      )}

      {/* Comments */}
      <CommentSection postId={post.id} />

      {/* Data details */}
      {post.formatVersion >= 3 && post.storyDocument ? (
        <details className="px-4 py-3 border-t border-white/5 group">
          <summary className="text-[10px] text-neutral-600 uppercase tracking-wider cursor-pointer hover:text-neutral-400 transition-colors">
            View StoryDocument ({post.storyDocument.scene.panels.length} panels)
          </summary>
          <pre className="mt-2 bg-black/30 border border-white/10 rounded-xl p-3 text-[10px] text-neutral-400 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(post.storyDocument, null, 2)}
          </pre>
        </details>
      ) : (
        <details className="px-4 py-3 border-t border-white/5 group">
          <summary className="text-[10px] text-neutral-600 uppercase tracking-wider cursor-pointer hover:text-neutral-400 transition-colors">
            View DNA ({post.dna.content.data.length} data points)
          </summary>
          <pre className="mt-2 bg-black/30 border border-white/10 rounded-xl p-3 text-[10px] text-neutral-400 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(post.dna, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
