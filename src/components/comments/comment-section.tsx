'use client'

import { useState, useEffect, useCallback } from 'react'
import { CommentItem } from './comment-item'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { Loader2, Send, MessageCircle, AlertCircle, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

interface CommentData {
  id: number
  author: {
    id: number
    username: string
    avatar?: { url: string } | null
  }
  body: string
  createdAt: string
}

interface CommentSectionProps {
  postId: number
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<CommentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchComments = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const res = await fetch(
        `/api/posts/${postId}/comments?page=${pageNum}&limit=20`
      )
      if (!res.ok) throw new Error('Failed to load comments')
      const data = await res.json()

      const docs: CommentData[] = (data.docs ?? []).map(parseComment)

      if (append) {
        setComments((prev) => [...prev, ...docs])
      } else {
        setComments(docs)
      }
      setHasNextPage(data.hasNextPage ?? false)
      setError(null)
    } catch {
      setError('Failed to load comments')
    }
  }, [postId])

  useEffect(() => {
    setIsLoading(true)
    fetchComments(1, false).finally(() => setIsLoading(false))
  }, [fetchComments])

  async function handleLoadMore() {
    const nextPage = page + 1
    setIsLoadingMore(true)
    await fetchComments(nextPage, true)
    setPage(nextPage)
    setIsLoadingMore(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: body.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast(data.error ?? 'Failed to post comment', 'error')
        return
      }

      const data = await res.json()
      const newComment = parseComment(data.comment)
      setComments((prev) => [newComment, ...prev])
      setBody('')
      toast('Comment posted', 'success')
    } catch {
      toast('Failed to post comment', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(commentId: number) {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commentId }),
      })

      if (!res.ok) {
        toast('Failed to delete comment', 'error')
        return
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId))
      toast('Comment deleted', 'success')
    } catch {
      toast('Failed to delete comment', 'error')
    }
  }

  function handleRetry() {
    setError(null)
    setIsLoading(true)
    fetchComments(1, false).finally(() => setIsLoading(false))
  }

  return (
    <div className="border-t border-white/5">
      {/* Comment input */}
      <div className="px-4 py-3 border-b border-white/5">
        {user ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              className="flex-grow bg-transparent text-sm text-white placeholder-neutral-600 outline-none"
            />
            <button
              type="submit"
              disabled={!body.trim() || isSubmitting}
              className="text-neutral-400 hover:text-white disabled:text-neutral-700 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        ) : (
          <p className="text-xs text-neutral-500">
            <Link href="/login" className="text-neutral-400 hover:text-white transition-colors">
              Sign in
            </Link>{' '}
            to comment
          </p>
        )}
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-xs text-neutral-400">{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white hover:bg-white/15 transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            Try again
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <MessageCircle className="w-5 h-5 text-neutral-600" />
          <p className="text-xs text-neutral-500">No comments yet</p>
          <p className="text-[10px] text-neutral-600">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              id={comment.id}
              author={comment.author}
              body={comment.body}
              createdAt={comment.createdAt}
              currentUserId={user?.id}
              onDelete={handleDelete}
            />
          ))}

          {hasNextPage && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-3 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {isLoadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Load more comments'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function parseComment(doc: Record<string, unknown>): CommentData {
  const author = doc.author as Record<string, unknown> | null
  const authorAvatar = author?.avatar as { url: string } | null

  return {
    id: doc.id as number,
    author: {
      id: (author?.id as number) ?? 0,
      username: (author?.username as string) ?? 'unknown',
      avatar: authorAvatar?.url ? { url: authorAvatar.url } : null,
    },
    body: (doc.body as string) ?? '',
    createdAt: (doc.createdAt as string) ?? new Date().toISOString(),
  }
}
