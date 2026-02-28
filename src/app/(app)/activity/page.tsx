'use client'

import { useState, useEffect, useCallback } from 'react'
import { Heart, Bookmark, FileText, AlertCircle, RefreshCcw } from 'lucide-react'
import { PostCard, type PostCardData } from '@/components/feed/post-card'
import { PostCardSkeleton } from '@/components/feed/post-card-skeleton'
import { transformPost } from '@/lib/transform-post'
import { AuthGuard } from '@/components/ui/auth-guard'
import { useAuth } from '@/hooks/use-auth'

type Tab = 'posts' | 'liked' | 'saved'

const emptyIcons: Record<Tab, typeof Heart> = {
  posts: FileText,
  liked: Heart,
  saved: Bookmark,
}

function ActivityContent() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('posts')
  const [posts, setPosts] = useState<PostCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    setPosts([])

    try {
      let docs: PostCardData[] = []

      if (tab === 'posts') {
        const res = await fetch(
          `/api/posts?where[author][equals]=${user.id}&sort=-createdAt&limit=30&depth=2`
        )
        if (res.ok) {
          const data = await res.json()
          docs = (data.docs ?? []).map(transformPost)
        }
      } else {
        // Fetch liked or saved post IDs from junction table
        const collection = tab === 'liked' ? 'likes' : 'saves'
        const res = await fetch(
          `/api/${collection}?where[user][equals]=${user.id}&sort=-createdAt&limit=30&depth=2`
        )
        if (res.ok) {
          const data = await res.json()
          // Each doc has a `post` field which is the populated post
          docs = (data.docs ?? [])
            .filter((doc: Record<string, unknown>) => doc.post && typeof doc.post === 'object')
            .map((doc: Record<string, unknown>) => transformPost(doc.post as Record<string, unknown>))
        }
      }

      // Mark interaction state
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
          // Non-fatal
        }
      }

      setPosts(docs)
    } catch {
      setError('Failed to load your activity')
    } finally {
      setIsLoading(false)
    }
  }, [user, tab])

  useEffect(() => {
    load()
  }, [load])

  const tabs: { key: Tab; label: string; icon: typeof Heart }[] = [
    { key: 'posts', label: 'Posts', icon: FileText },
    { key: 'liked', label: 'Liked', icon: Heart },
    { key: 'saved', label: 'Saved', icon: Bookmark },
  ]

  const emptyMessages: Record<Tab, { title: string; subtitle: string }> = {
    posts: {
      title: 'No posts yet',
      subtitle: 'Create your first infographic to see it here!',
    },
    liked: {
      title: 'No liked posts',
      subtitle: 'Like infographics to find them here later.',
    },
    saved: {
      title: 'No saved posts',
      subtitle: 'Save infographics to find them here later.',
    },
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <Heart className="w-5 h-5 text-white" />
          <h1 className="text-sm font-semibold text-white">Your Activity</h1>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/5">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                tab === key
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 pt-4">
        {isLoading && (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-neutral-400">{error}</p>
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-sm text-white hover:bg-white/15 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              {(() => {
                const Icon = emptyIcons[tab]
                return <Icon className="w-5 h-5 text-neutral-500" />
              })()}
            </div>
            <p className="text-sm text-neutral-400">{emptyMessages[tab].title}</p>
            <p className="text-xs text-neutral-600">
              {emptyMessages[tab].subtitle}
            </p>
          </div>
        )}

        {!isLoading && !error && posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

export default function ActivityPage() {
  return (
    <AuthGuard>
      <ActivityContent />
    </AuthGuard>
  )
}
