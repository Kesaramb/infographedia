import type { InfographicDNA } from '@/lib/dna/schema'
import { PREVIEW_RENDER_PROFILE } from '@/lib/dna/rendering'
import { getAIConfig } from './config'
import { generateDNA, type GenerateResponse } from './generate'
import { generateAntVInfographic, type GenerateAntVResponse } from './generate-antv'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import { normalizeRenderEngine, type InfographicGenerationResult, type RenderEngineValue } from '@/lib/infographic-engine'
import { buildGenerationBrief } from './brief'

type GenerateInfographicSuccess = {
  success: true
  result: InfographicGenerationResult
  searchQueries: string[]
}

type GenerateInfographicFailure = Extract<GenerateResponse, { success: false }> | Extract<GenerateAntVResponse, { success: false }>

export type GenerateInfographicResponse = GenerateInfographicSuccess | GenerateInfographicFailure

export async function generateInfographic(input: {
  prompt: string
  parentDNA?: InfographicDNA
  parentDocumentV2?: InfographicDocumentV2
  parentRenderEngine?: RenderEngineValue
}): Promise<GenerateInfographicResponse> {
  const aiConfig = await getAIConfig()
  const parentRenderEngine = normalizeRenderEngine(input.parentRenderEngine)
  const brief = buildGenerationBrief({
    prompt: input.prompt,
    aiConfig,
    renderProfile: PREVIEW_RENDER_PROFILE,
    parentDNA: input.parentDNA,
    parentDocumentV2: input.parentDocumentV2,
    parentRenderEngine,
  })

  if (brief.engine === 'dna-legacy') {
    const legacy = await generateDNA(input.prompt, input.parentDNA, brief)
    if (!legacy.success) return legacy

    return {
      success: true,
      result: {
        renderEngine: 'dna-legacy',
        formatVersion: 1,
        dna: legacy.dna,
      },
      searchQueries: legacy.searchQueries,
    }
  }

  const antv = await generateAntVInfographic(input.prompt, input.parentDocumentV2, brief)
  if (!antv.success) return antv

  return {
    success: true,
    result: {
      renderEngine: 'antv',
      formatVersion: 2,
      dna: antv.dna,
      documentV2: antv.documentV2,
    },
    searchQueries: antv.searchQueries,
  }
}
