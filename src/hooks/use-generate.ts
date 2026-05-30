'use client'

import { useState, useCallback } from 'react'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import type { RenderEngineValue } from '@/lib/infographic-engine'
import type { StoryDocumentV3 } from '@/lib/story/schema'

// ============================================================
// useGenerate — hook wrapping /api/generate
// Manages loading, error, result states for the modal
// ============================================================

type GenerateStage = 'idle' | 'generating' | 'success' | 'error'

interface UseGenerateState {
  stage: GenerateStage
  dna: InfographicDNA | null
  documentV2: InfographicDocumentV2 | null
  storyDocument: StoryDocumentV3 | null
  renderEngine: RenderEngineValue
  formatVersion: 1 | 2 | 3
  searchQueries: string[]
  error: string | null
  elapsedMs: number
}

interface UseGenerateReturn extends UseGenerateState {
  generate: (prompt: string, parent?: {
    dna: InfographicDNA
    documentV2?: InfographicDocumentV2 | null
    storyDocument?: StoryDocumentV3 | null
    renderEngine?: RenderEngineValue
  }) => Promise<void>
  reset: () => void
}

interface GenerateAPIResponse {
  success: boolean
  dna?: InfographicDNA
  storyDocument?: StoryDocumentV3
  previewSvg?: string
  formatVersion?: 3
  searchQueries?: string[]
  error?: string
}

export function useGenerate(): UseGenerateReturn {
  const [state, setState] = useState<UseGenerateState>({
    stage: 'idle',
    dna: null,
    documentV2: null,
    storyDocument: null,
    renderEngine: 'story-v3',
    formatVersion: 3,
    searchQueries: [],
    error: null,
    elapsedMs: 0,
  })

  const generate = useCallback(
    async (prompt: string, parent?: {
      dna: InfographicDNA
      documentV2?: InfographicDocumentV2 | null
      storyDocument?: StoryDocumentV3 | null
      renderEngine?: RenderEngineValue
    }) => {
      setState({
        stage: 'generating',
        dna: null,
        documentV2: null,
        storyDocument: null,
        renderEngine: 'story-v3',
        formatVersion: 3,
        searchQueries: [],
        error: null,
        elapsedMs: 0,
      })

      const start = Date.now()

      try {
        const body: {
          prompt: string
          parentDNA?: InfographicDNA
          parentDocumentV2?: InfographicDocumentV2 | null
          parentStoryDocument?: StoryDocumentV3 | null
          parentRenderEngine?: RenderEngineValue
        } = { prompt }
        if (parent?.dna) body.parentDNA = parent.dna
        if (parent?.documentV2) body.parentDocumentV2 = parent.documentV2
        if (parent?.storyDocument) body.parentStoryDocument = parent.storyDocument
        if (parent?.renderEngine) body.parentRenderEngine = parent.renderEngine

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const rawBody = await response.text()
        const data = safeParseGenerateResponse(rawBody)
        const elapsed = Date.now() - start

        if (!data) {
          throw new Error(normalizeClientGenerateError({
            responseStatus: response.status,
            rawBody,
          }))
        }

        if (data.success) {
          setState({
            stage: 'success',
            dna: data.dna ?? null,
            documentV2: null,
            storyDocument: data.storyDocument ?? null,
            renderEngine: 'story-v3',
            formatVersion: 3,
            searchQueries: (data.searchQueries as string[]) ?? [],
            error: null,
            elapsedMs: elapsed,
          })
        } else {
          setState({
            stage: 'error',
            dna: null,
            documentV2: null,
            storyDocument: null,
            renderEngine: 'story-v3',
            formatVersion: 3,
            searchQueries: [],
            error: data.error ?? 'Generation failed',
            elapsedMs: elapsed,
          })
        }
      } catch (err) {
        setState({
          stage: 'error',
          dna: null,
          documentV2: null,
          storyDocument: null,
          renderEngine: 'story-v3',
          formatVersion: 3,
          searchQueries: [],
          error: normalizeThrownGenerateError(err),
          elapsedMs: Date.now() - start,
        })
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({
      stage: 'idle',
      dna: null,
      documentV2: null,
      storyDocument: null,
      renderEngine: 'story-v3',
      formatVersion: 3,
      searchQueries: [],
      error: null,
      elapsedMs: 0,
    })
  }, [])

  return { ...state, generate, reset }
}

function safeParseGenerateResponse(rawBody: string): GenerateAPIResponse | null {
  if (!rawBody.trim()) return null

  try {
    return JSON.parse(rawBody) as GenerateAPIResponse
  } catch {
    return null
  }
}

function normalizeThrownGenerateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (
    lower.includes('expected pattern') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return 'The generation service is temporarily unavailable. Please retry.'
  }

  return message || 'Network error'
}

function normalizeClientGenerateError(input: {
  responseStatus: number
  rawBody: string
}): string {
  const body = input.rawBody.toLowerCase()

  if (
    body.includes('could not build a strong grounded ranking')
    || body.includes('strong grounded ranking')
    || body.includes('specific topic or timeframe')
  ) {
    return 'Could not build a strong grounded ranking from the available evidence. Try a more specific topic or timeframe.'
  }

  if (
    body.includes('could not fit this infographic')
    || body.includes('could not build the requested multi-panel layout')
    || body.includes('grounding unavailable')
  ) {
    return input.rawBody
      .replace(/^[\s\S]*"error":"?/i, '')
      .replace(/"?[,}][\s\S]*$/i, '')
      .replace(/\\"/g, '"')
      .trim() || 'Generation failed, please retry.'
  }

  if (
    body.includes('overloaded') ||
    body.includes('temporarily unavailable') ||
    body.includes('rate limit') ||
    body.includes('service unavailable')
  ) {
    return 'The AI provider is busy right now. Please retry in a moment.'
  }

  if (input.responseStatus >= 500) {
    return 'The generation service is temporarily unavailable. Please retry.'
  }

  return 'Generation failed, please retry.'
}
