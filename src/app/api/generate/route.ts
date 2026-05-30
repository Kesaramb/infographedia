import { NextRequest, NextResponse } from 'next/server'
import { generateStoryInfographic } from '@/lib/story/generate'
import { DNASchema, type InfographicDNA } from '@/lib/dna/schema'
import { AntVDocumentSchema, type InfographicDocumentV2 } from '@/lib/antv/schema'
import { normalizeRenderEngine, type RenderEngineValue } from '@/lib/infographic-engine'
import { StoryDocumentSchema, type StoryDocumentV3 } from '@/lib/story/schema'

/**
 * POST /api/generate
 *
 * Accepts a user prompt and optional parent DNA, calls the AI pipeline,
 * and returns validated InfographicDNA JSON.
 *
 * Body: { prompt: string, parentDNA?: InfographicDNA }
 * Returns: { success: true, dna: InfographicDNA, searchQueries: string[] }
 *       or { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, parentDNA } = body as {
      prompt?: string
      parentDNA?: InfographicDNA
      parentDocumentV2?: InfographicDocumentV2
      parentStoryDocument?: StoryDocumentV3
      parentRenderEngine?: RenderEngineValue
    }

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A prompt is required.' },
        { status: 400 }
      )
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Prompt must be under 1000 characters.' },
        { status: 400 }
      )
    }

    // Validate parent DNA if provided
    if (parentDNA) {
      const parentResult = DNASchema.safeParse(parentDNA)
      if (!parentResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent DNA format.' },
          { status: 400 }
        )
      }
    }

    if (body.parentStoryDocument) {
      const parentStoryResult = StoryDocumentSchema.safeParse(body.parentStoryDocument)
      if (!parentStoryResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent StoryDocument format.' },
          { status: 400 },
        )
      }
    } else if (body.parentDocumentV2) {
      const parentDocumentResult = AntVDocumentSchema.safeParse(body.parentDocumentV2)
      if (!parentDocumentResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent documentV2 format.' },
          { status: 400 }
        )
      }
    }

    const result = await generateStoryInfographic({
      prompt: prompt.trim(),
      parentDNA,
      parentStoryDocument: body.parentStoryDocument,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        storyDocument: result.storyDocument,
        previewSvg: result.previewSvg,
        dna: result.dna,
        formatVersion: 3,
        searchQueries: result.searchQueries,
      })
    }

    // AI pipeline error (not a server error — the AI just couldn't generate valid output)
    return NextResponse.json(
      {
        success: false,
        error: normalizeGenerationError(result.error, result.stage),
        stage: result.stage,
      },
      { status: 422 }
    )
  } catch (error) {
    console.error('[/api/generate] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}

function normalizeGenerationError(
  error: string,
  stage: 'api' | 'parse' | 'validation' | 'tool_loop' | 'grounding',
): string {
  const normalized = error.toLowerCase()

  if (stage === 'grounding') {
    return 'Grounding unavailable. Please retry when verified search is available.'
  }

  if (
    normalized.includes('overloaded') ||
    normalized.includes('overload') ||
    normalized.includes('529') ||
    normalized.includes('rate limit') ||
    normalized.includes('temporarily unavailable') ||
    normalized.includes('service unavailable')
  ) {
    return 'The AI provider is busy right now. Please retry in a moment.'
  }

  if (
    normalized.includes('multi-panel') ||
    normalized.includes('panellayout') ||
    normalized.includes('panel "') ||
    normalized.includes('scene') ||
    normalized.includes('router')
  ) {
    return 'Could not build the requested multi-panel layout.'
  }

  if (
    normalized.includes('preflight') ||
    normalized.includes('fit') ||
    normalized.includes('title') ||
    normalized.includes('subtitle') ||
    normalized.includes('hook') ||
    normalized.includes('footnote') ||
    normalized.includes('line')
  ) {
    return 'Could not fit this infographic.'
  }

  if (
    normalized.includes('placeholder fallback') ||
    normalized.includes('not enough grounded items') ||
    normalized.includes('grounded items to support the requested chart') ||
    normalized.includes('grounded ranking') ||
    normalized.includes('grounded results')
  ) {
    return 'Could not build a strong grounded ranking from the available evidence. Try a more specific topic or timeframe.'
  }

  return 'Generation failed, please retry.'
}
