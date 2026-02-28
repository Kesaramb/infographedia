'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Settings, Loader2 } from 'lucide-react'
import { DNARenderer } from '@/components/dna-renderer'
import { useAuth } from '@/hooks/use-auth'
import type { InfographicDNA } from '@/lib/dna/schema'

interface ProfileUser {
  id: number
  username: string
  bio?: string | null
  avatar?: { url: string } | null
}

interface ProfilePost {
  id: number
  title: string
  dna: InfographicDNA
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [posts, setPosts] = useState<ProfilePost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const isOwnProfile = currentUser?.username === params.username

  useEffect(() => {
    async function load() {
      try {
        // Fetch user
        const userRes = await fetch(
          `/api/users?where[username][equals]=${encodeURIComponent(params.username)}&limit=1&depth=1`
        )
        const userData = await userRes.json()
        if (!userData.docs?.length) {
          setNotFound(true)
          setIsLoading(false)
          return
        }
        const user = userData.docs[0]

        const avatarObj = user.avatar
        setProfileUser({
          id: user.id,
          username: user.username,
          bio: user.bio,
          avatar: typeof avatarObj === 'object' && avatarObj?.url
            ? { url: avatarObj.url }
            : null,
        })

        // Fetch user's posts
        const postsRes = await fetch(
          `/api/posts?where[author][equals]=${user.id}&sort=-createdAt&limit=30&depth=1`
        )
        const postsData = await postsRes.json()
        setPosts(
          (postsData.docs ?? []).map((doc: Record<string, unknown>) => ({
            id: doc.id as number,
            title: doc.title as string,
            dna: doc.dna as InfographicDNA,
          }))
        )
      } catch {
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [params.username])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
      </div>
    )
  }

  if (notFound || !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-neutral-400">User not found</p>
        <Link
          href="/"
          className="text-xs text-white hover:underline"
        >
          Back to feed
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-400" />
        </button>
        <h1 className="text-sm font-semibold text-white">
          {profileUser.username}
        </h1>
      </div>

      {/* Profile info */}
      <div className="px-4 py-6 flex flex-col items-center gap-4 border-b border-white/5">
        <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-white/10 flex items-center justify-center overflow-hidden">
          {profileUser.avatar?.url ? (
            <img
              src={profileUser.avatar.url}
              alt={profileUser.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-neutral-500" />
          )}
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-white">@{profileUser.username}</h2>
          {profileUser.bio && (
            <p className="text-sm text-neutral-400 mt-1 max-w-xs">{profileUser.bio}</p>
          )}
        </div>

        <div className="flex items-center gap-6 text-center">
          <div>
            <p className="text-lg font-bold text-white">{posts.length}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Posts</p>
          </div>
        </div>

        {isOwnProfile && (
          <Link
            href="/profile/edit"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-300 hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Edit Profile
          </Link>
        )}
      </div>

      {/* Post grid */}
      {posts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-neutral-500">No posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => router.push(`/post/${post.id}`)}
              className="aspect-square overflow-hidden bg-neutral-900 relative group cursor-pointer"
            >
              <div className="w-full h-full scale-[2] origin-top-left pointer-events-none">
                <DNARenderer dna={post.dna} />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <p className="text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity px-2 text-center line-clamp-2">
                  {post.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
