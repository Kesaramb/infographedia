'use client'

import { useState, useCallback } from 'react'
import type { InfographicDNA } from '@/lib/dna/schema'

// ============================================================
// useGenerate — hook wrapping /api/generate
// Manages loading, error, result states for the modal
// ============================================================

type GenerateStage = 'idle' | 'generating' | 'success' | 'error'

interface UseGenerateState {
  stage: GenerateStage
  dna: InfographicDNA | null
  searchQueries: string[]
  error: string | null
  elapsedMs: number
}

interface UseGenerateReturn extends UseGenerateState {
  generate: (prompt: string, parentDNA?: InfographicDNA) => Promise<void>
  reset: () => void
}

export function useGenerate(): UseGenerateReturn {
  const [state, setState] = useState<UseGenerateState>({
    stage: 'idle',
    dna: null,
    searchQueries: [],
    error: null,
    elapsedMs: 0,
  })

  const generate = useCallback(
    async (prompt: string, parentDNA?: InfographicDNA) => {
      setState({
        stage: 'generating',
        dna: null,
        searchQueries: [],
        error: null,
        elapsedMs: 0,
      })

      const start = Date.now()

      try {
        const body: { prompt: string; parentDNA?: InfographicDNA } = { prompt }
        if (parentDNA) body.parentDNA = parentDNA

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data = await response.json()
        const elapsed = Date.now() - start

        if (data.success) {
          setState({
            stage: 'success',
            dna: data.dna as InfographicDNA,
            searchQueries: (data.searchQueries as string[]) ?? [],
            error: null,
            elapsedMs: elapsed,
          })
        } else {
          setState({
            stage: 'error',
            dna: null,
            searchQueries: [],
            error: data.error ?? 'Generation failed',
            elapsedMs: elapsed,
          })
        }
      } catch (err) {
        setState({
          stage: 'error',
          dna: null,
          searchQueries: [],
          error: err instanceof Error ? err.message : 'Network error',
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
      searchQueries: [],
      error: null,
      elapsedMs: 0,
    })
  }, [])

  return { ...state, generate, reset }
}
