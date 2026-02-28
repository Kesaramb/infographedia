'use client'

/**
 * Shimmer loading skeleton for post cards.
 * Matches the exact layout of PostCard for smooth loading transitions.
 */
export function PostCardSkeleton() {
  return (
    <div className="bg-neutral-900/40 border border-white/5 rounded-2xl overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full animate-shimmer" />
        <div className="flex flex-col gap-1.5">
          <div className="w-24 h-3 rounded animate-shimmer" />
          <div className="w-16 h-2 rounded animate-shimmer" />
        </div>
      </div>

      {/* Image skeleton */}
      <div className="w-full aspect-[4/5] animate-shimmer" />

      {/* Toolbar skeleton */}
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="w-5 h-5 rounded animate-shimmer" />
        <div className="w-5 h-5 rounded animate-shimmer" />
        <div className="w-5 h-5 rounded animate-shimmer" />
        <div className="w-5 h-5 rounded animate-shimmer" />
        <div className="flex-grow" />
        <div className="w-5 h-5 rounded animate-shimmer" />
        <div className="w-5 h-5 rounded animate-shimmer" />
      </div>

      {/* Title skeleton */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        <div className="w-3/4 h-3.5 rounded animate-shimmer" />
        <div className="w-1/2 h-2.5 rounded animate-shimmer" />
      </div>
    </div>
  )
}
