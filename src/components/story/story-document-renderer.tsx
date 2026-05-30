'use client'

import type { CSSProperties } from 'react'
import type { StoryDocumentV3 } from '@/lib/story/schema'

interface StoryDocumentRendererProps {
  storyDocument: StoryDocumentV3
  renderedImageUrl?: string | null
  mode?: 'feed' | 'detail' | 'preview' | 'static'
  className?: string
}

export function StoryDocumentRenderer({
  storyDocument,
  renderedImageUrl,
  mode = 'detail',
  className,
}: StoryDocumentRendererProps) {
  const aspectRatio = storyDocument.artifacts.aspectRatio
    || storyDocument.artifacts.width / storyDocument.artifacts.height

  if (mode === 'feed' && renderedImageUrl) {
    return (
      <div className={className} style={{ aspectRatio }}>
        <img
          src={renderedImageUrl}
          alt={storyDocument.story.thesis}
          className="w-full h-full object-cover bg-neutral-950"
        />
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ aspectRatio } satisfies CSSProperties}
      dangerouslySetInnerHTML={{ __html: storyDocument.artifacts.svg }}
    />
  )
}
