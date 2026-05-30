import { z } from 'zod/v4'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import type { StoryDocumentV3 } from '@/lib/story/schema'

export const RENDER_ENGINES = [
  'dna-legacy',
  'antv',
  'story-v3',
] as const

export const RenderEngineSchema = z.enum(RENDER_ENGINES)

export type RenderEngineValue = z.infer<typeof RenderEngineSchema>

export type InfographicGenerationResult =
  | {
      renderEngine: 'dna-legacy'
      formatVersion: 1
      dna: InfographicDNA
      documentV2?: undefined
      storyDocument?: undefined
    }
  | {
      renderEngine: 'antv'
      formatVersion: 2
      dna: InfographicDNA
      documentV2: InfographicDocumentV2
      storyDocument?: undefined
    }
  | {
      renderEngine: 'story-v3'
      formatVersion: 3
      dna: InfographicDNA
      documentV2?: undefined
      storyDocument: StoryDocumentV3
    }

export function normalizeRenderEngine(
  value: unknown,
): RenderEngineValue {
  if (value === 'story-v3') return 'story-v3'
  return value === 'antv' ? 'antv' : 'dna-legacy'
}

export function getFormatVersion(
  renderEngine: RenderEngineValue,
): 1 | 2 | 3 {
  if (renderEngine === 'story-v3') return 3
  return renderEngine === 'antv' ? 2 : 1
}
