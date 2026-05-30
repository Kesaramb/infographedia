import type { InfographicDNA } from '@/lib/dna/schema'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import { normalizeRenderEngine, type RenderEngineValue } from '@/lib/infographic-engine'
import type { StoryDocumentV3 } from './schema'

export interface LegacyCompatiblePostRecord {
  renderEngine?: unknown
  formatVersion?: unknown
  dna?: unknown
  documentV2?: unknown
  storyDocument?: unknown
}

export interface LegacyCompatibleReadModel {
  renderEngine: RenderEngineValue
  formatVersion: 1 | 2 | 3
  dna: InfographicDNA | null
  documentV2: InfographicDocumentV2 | null
  storyDocument: StoryDocumentV3 | null
}

export function adaptLegacyCompatiblePost(
  doc: LegacyCompatiblePostRecord,
): LegacyCompatibleReadModel {
  return {
    renderEngine: normalizeRenderEngine(doc.renderEngine),
    formatVersion: doc.formatVersion === 3 ? 3 : doc.formatVersion === 2 ? 2 : 1,
    dna: (doc.dna as InfographicDNA | null | undefined) ?? null,
    documentV2: (doc.documentV2 as InfographicDocumentV2 | null | undefined) ?? null,
    storyDocument: (doc.storyDocument as StoryDocumentV3 | null | undefined) ?? null,
  }
}
