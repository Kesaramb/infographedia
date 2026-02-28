'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions<T> {
  /** Fetch function that returns paginated data */
  fetcher: (page: number) => Promise<{ docs: T[]; hasNextPage: boolean }>
  /** Number of pixels before the bottom to trigger load */
  threshold?: number
}

interface UseInfiniteScrollReturn<T> {
  items: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  sentinelRef: (node: HTMLDivElement | null) => void
  refresh: () => void
}

/**
 * IntersectionObserver-based infinite scroll hook.
 * Loads the first page on mount, then loads more as the sentinel enters the viewport.
 */
export function useInfiniteScroll<T>({
  fetcher,
  threshold = 200,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef(false)

  // Load a page of data
  const loadPage = useCallback(
    async (pageNum: number) => {
      if (loadingRef.current) return
      loadingRef.current = true

      try {
        const isFirstPage = pageNum === 1
        if (isFirstPage) {
          setIsLoading(true)
        } else {
          setIsLoadingMore(true)
        }

        const result = await fetcher(pageNum)

        setItems((prev) =>
          isFirstPage ? result.docs : [...prev, ...result.docs]
        )
        setHasMore(result.hasNextPage)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        loadingRef.current = false
      }
    },
    [fetcher]
  )

  // Load first page on mount
  useEffect(() => {
    loadPage(1)
  }, [loadPage])

  // Load more when page increments
  useEffect(() => {
    if (page > 1) {
      loadPage(page)
    }
  }, [page, loadPage])

  // Sentinel ref callback — sets up IntersectionObserver
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      if (!node || !hasMore) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
            setPage((prev) => prev + 1)
          }
        },
        { rootMargin: `${threshold}px` }
      )

      observerRef.current.observe(node)
    },
    [hasMore, threshold]
  )

  // Refresh: reset and reload
  const refresh = useCallback(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setError(null)
    loadPage(1)
  }, [loadPage])

  return { items, isLoading, isLoadingMore, hasMore, error, sentinelRef, refresh }
}
