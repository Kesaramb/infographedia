'use client'

import Link from 'next/link'
import { User, Trash2 } from 'lucide-react'

interface CommentItemProps {
  id: number
  author: {
    id: number
    username: string
    avatar?: { url: string } | null
  }
  body: string
  createdAt: string
  currentUserId?: number
  onDelete?: (commentId: number) => void
}

export function CommentItem({
  id,
  author,
  body,
  createdAt,
  currentUserId,
  onDelete,
}: CommentItemProps) {
  const isOwn = currentUserId === author.id

  return (
    <div className="flex gap-3 px-4 py-3">
      {/* Avatar */}
      <Link
        href={`/profile/${author.username}`}
        className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0"
      >
        {author.avatar?.url ? (
          <img
            src={author.avatar.url}
            alt={author.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-3.5 h-3.5 text-neutral-500" />
        )}
      </Link>

      {/* Content */}
      <div className="flex-grow min-w-0">
        <p className="text-sm text-white">
          <Link
            href={`/profile/${author.username}`}
            className="font-semibold hover:underline"
          >
            {author.username}
          </Link>{' '}
          <span className="text-neutral-300 font-normal">{body}</span>
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-neutral-600">{getTimeAgo(createdAt)}</span>
          {isOwn && onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString()
}
