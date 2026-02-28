'use client'

import { Heart, MessageCircle, Share2, GitFork, Download, Bookmark } from 'lucide-react'
import { motion } from 'framer-motion'
import { useOptimisticToggle } from '@/hooks/use-optimistic-action'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { useCallback, useRef, useEffect } from 'react'

interface ActionToolbarProps {
  postId: number | string
  likes: number
  saves: number
  shares: number
  commentCount: number
  iterationCount: number
  isLiked?: boolean
  isSaved?: boolean
  onIterate?: () => void
  onComment?: () => void
  onDownload?: () => void
  isDownloading?: boolean
}

/**
 * Instagram-style action toolbar.
 * Like, comment, share, iterate, download, save.
 */
export function ActionToolbar({
  postId,
  likes,
  saves,
  shares,
  commentCount,
  iterationCount,
  isLiked = false,
  isSaved = false,
  onIterate,
  onComment,
  onDownload,
  isDownloading = false,
}: ActionToolbarProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const like = useOptimisticToggle(isLiked, likes)
  const save = useOptimisticToggle(isSaved, saves)

  // Track state transitions for animation (don't animate on mount)
  const prevLikeRef = useRef(like.isActive)
  const prevSaveRef = useRef(save.isActive)
  const justLiked = like.isActive && !prevLikeRef.current
  const justSaved = save.isActive && !prevSaveRef.current

  useEffect(() => {
    prevLikeRef.current = like.isActive
  }, [like.isActive])

  useEffect(() => {
    prevSaveRef.current = save.isActive
  }, [save.isActive])

  const handleLike = useCallback(() => {
    if (!user) {
      toast('Sign in to like posts', 'error')
      return
    }
    like.toggle(async () => {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const data = await res.json()
      return data.success === true
    })
  }, [user, like, postId, toast])

  const handleSave = useCallback(() => {
    if (!user) {
      toast('Sign in to save posts', 'error')
      return
    }
    save.toggle(async () => {
      const res = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const data = await res.json()
      return data.success === true
    })
  }, [user, save, postId, toast])

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${postId}`

    // Try native share first, then clipboard
    if (navigator.share) {
      try {
        await navigator.share({ url })
      } catch {
        // User cancelled — don't count as share
        return
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast('Link copied to clipboard', 'success')
    }

    // Fire-and-forget share counter increment
    fetch(`/api/posts/${postId}/share`, { method: 'POST' }).catch(() => {})
  }, [postId, toast])

  return (
    <div className="px-4 py-2">
      {/* Action icons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 group"
          >
            <motion.div
              animate={justLiked
                ? { scale: [1, 1.3, 0.9, 1.1, 1] }
                : { scale: 1 }
              }
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Heart
                className={`w-5 h-5 transition-colors duration-200 ${
                  like.isActive
                    ? 'fill-red-500 text-red-500'
                    : 'text-neutral-400 group-hover:text-white'
                }`}
              />
            </motion.div>
            <span className="text-xs text-neutral-400">{formatCount(like.count)}</span>
          </button>

          {/* Comment */}
          <button
            onClick={onComment}
            className="flex items-center gap-1.5 group"
          >
            <MessageCircle className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
            {commentCount > 0 && (
              <span className="text-xs text-neutral-400">{formatCount(commentCount)}</span>
            )}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 group"
          >
            <Share2 className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
            <span className="text-xs text-neutral-400">{formatCount(shares)}</span>
          </button>

          {/* Iterate */}
          <button
            onClick={onIterate}
            className="flex items-center gap-1.5 group"
          >
            <GitFork className="w-5 h-5 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
            <span className="text-xs text-neutral-400">{formatCount(iterationCount)}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Download */}
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="group"
            title="Download as PNG"
          >
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
            )}
          </button>

          {/* Save */}
          <button onClick={handleSave} className="group">
            <motion.div
              animate={justSaved
                ? { y: [0, 3, -1, 0] }
                : { y: 0 }
              }
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Bookmark
                className={`w-5 h-5 transition-colors duration-200 ${
                  save.isActive
                    ? 'fill-white text-white'
                    : 'text-neutral-400 group-hover:text-white'
                }`}
              />
            </motion.div>
          </button>
        </div>
      </div>
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
