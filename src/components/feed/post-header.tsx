'use client'

import Link from 'next/link'
import { User } from 'lucide-react'

interface PostHeaderProps {
  username: string
  avatarUrl?: string | null
  parentAuthor?: string | null
  createdAt: string
}

/**
 * Post card header — avatar, username, iteration attribution, timestamp.
 */
export function PostHeader({
  username,
  avatarUrl,
  parentAuthor,
  createdAt,
}: PostHeaderProps) {
  const timeAgo = getTimeAgo(createdAt)

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar */}
      <Link
        href={`/profile/${username}`}
        className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-4 h-4 text-neutral-500" />
        )}
      </Link>

      {/* Username + attribution */}
      <div className="flex-grow min-w-0">
        <Link href={`/profile/${username}`} className="text-sm font-semibold text-white hover:underline">
          {username}
        </Link>
        {parentAuthor && (
          <span className="text-xs text-neutral-500 ml-1">
            iterated from{' '}
            <Link href={`/profile/${parentAuthor}`} className="text-neutral-400 hover:underline">
              @{parentAuthor}
            </Link>
          </span>
        )}
        <p className="text-[10px] text-neutral-600">{timeAgo}</p>
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
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}
