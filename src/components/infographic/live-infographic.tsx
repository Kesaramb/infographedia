'use client'

import dynamic from 'next/dynamic'
import { DNARenderer } from '@/components/dna-renderer'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import type { RenderEngineValue } from '@/lib/infographic-engine'
import type { StoryDocumentV3 } from '@/lib/story/schema'
import { StoryDocumentRenderer } from '@/components/story/story-document-renderer'

const AnimatedDNARenderer = dynamic(
  () => import('@/components/remotion/animated-dna-renderer').then((m) => m.AnimatedDNARenderer),
  { ssr: false },
)

const AntVInfographicRenderer = dynamic(
  () => import('@/components/antv/antv-infographic-renderer').then((m) => m.AntVInfographicRenderer),
  { ssr: false },
)

interface LiveInfographicProps {
  formatVersion?: 1 | 2 | 3
  renderEngine: RenderEngineValue
  dna: InfographicDNA
  documentV2?: InfographicDocumentV2 | null
  storyDocument?: StoryDocumentV3 | null
  renderedImageUrl?: string | null
  mode?: 'feed' | 'detail' | 'preview' | 'static'
}

export function LiveInfographic({
  formatVersion = 1,
  renderEngine,
  dna,
  documentV2,
  storyDocument,
  renderedImageUrl,
  mode = 'detail',
}: LiveInfographicProps) {
  if (formatVersion >= 3 && storyDocument) {
    return (
      <StoryDocumentRenderer
        storyDocument={storyDocument}
        renderedImageUrl={renderedImageUrl}
        mode={mode}
      />
    )
  }

  if (renderEngine === 'antv' && documentV2) {
    if (mode === 'feed' && renderedImageUrl) {
      return (
        <div
          className="w-full bg-neutral-950"
          style={{ aspectRatio: documentV2.antv.renderMeta.aspectRatio ?? documentV2.antv.renderMeta.width / documentV2.antv.renderMeta.height }}
        >
          <img
            src={renderedImageUrl}
            alt={documentV2.content.title}
            className="w-full h-full object-cover"
          />
        </div>
      )
    }

    return <AntVInfographicRenderer document={documentV2} />
  }

  if (mode === 'preview' || mode === 'static') {
    return <DNARenderer dna={dna} />
  }

  return <AnimatedDNARenderer dna={dna} />
}
