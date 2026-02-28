'use client'

import { useState, useEffect } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { PostCard, type PostCardData } from '@/components/feed/post-card'
import { PostCardSkeleton } from '@/components/feed/post-card-skeleton'
import { transformPost } from '@/lib/transform-post'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PostCardData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          'where[title][like]': query.trim(),
          sort: '-createdAt',
          limit: '20',
          depth: '2',
        })
        const res = await fetch(`/api/posts?${params}`)
        if (res.ok) {
          const data = await res.json()
          setResults((data.docs ?? []).map(transformPost))
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
        setHasSearched(true)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Search header */}
      <div className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search infographics..."
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-neutral-400" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-6 pt-4">
        {isLoading && (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        )}

        {!isLoading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-20">
            <SearchIcon className="w-8 h-8 text-neutral-700 mb-3" />
            <p className="text-sm text-neutral-500">Search for infographics by title</p>
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-neutral-500">
              No infographics found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {!isLoading && results.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
