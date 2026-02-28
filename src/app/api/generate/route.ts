import { NextRequest, NextResponse } from 'next/server'
import { generateDNA } from '@/lib/ai/generate'
import { DNASchema, type InfographicDNA } from '@/lib/dna/schema'

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

    // Generate!
    const result = await generateDNA(prompt.trim(), parentDNA)

    if (result.success) {
      return NextResponse.json({
        success: true,
        dna: result.dna,
        searchQueries: result.searchQueries,
      })
    }

    // AI pipeline error (not a server error — the AI just couldn't generate valid output)
    return NextResponse.json(
      { success: false, error: result.error, stage: result.stage },
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
