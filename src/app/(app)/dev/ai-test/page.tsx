'use client'

import { useState, useCallback } from 'react'
import { DNARenderer } from '@/components/dna-renderer'
import type { InfographicDNA } from '@/lib/dna/schema'
import { Sparkles, Loader2, AlertCircle, Search, Zap } from 'lucide-react'

type Stage = 'idle' | 'generating' | 'success' | 'error'

interface GenerateResponse {
  success: boolean
  dna?: InfographicDNA
  searchQueries?: string[]
  error?: string
  stage?: string
}

const EXAMPLE_PROMPTS = [
  'Top 5 programming languages by popularity in 2025',
  'Global smartphone market share by manufacturer',
  'Average salary comparison: Software Engineer vs Data Scientist',
  'World energy consumption breakdown by source',
  'Top 10 most visited websites in the world',
]

export default function AITestPage() {
  const [prompt, setPrompt] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || stage === 'generating') return

    setStage('generating')
    setResult(null)
    const start = Date.now()

    // Update elapsed time every 100ms during generation
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 100) / 10)
    }, 100)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data: GenerateResponse = await response.json()
      setResult(data)
      setStage(data.success ? 'success' : 'error')
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      })
      setStage('error')
    } finally {
      clearInterval(timer)
      setElapsed(Math.round((Date.now() - start) / 100) / 10)
    }
  }, [prompt, stage])

  return (
    <div className="py-6 px-4 flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">AI Test Lab</h1>
          <p className="text-xs text-neutral-500">
            Dev tool — generate infographic DNA via Claude API
          </p>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="flex flex-col gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the infographic you want to create..."
          rows={3}
          maxLength={1000}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-neutral-600">
            {prompt.length}/1000
          </span>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || stage === 'generating'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {stage === 'generating' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating... ({elapsed}s)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Example Prompts */}
      {stage === 'idle' && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider">
            Try an example
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Queries (transparency) */}
      {result?.searchQueries && result.searchQueries.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Web searches performed
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {result.searchQueries.map((q, i) => (
              <span key={i} className="text-xs text-neutral-400">
                {i + 1}. {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && result && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-medium">
              Generation failed
            </p>
            <p className="text-xs text-red-400/80 mt-1">{result.error}</p>
            {result.stage && (
              <p className="text-[10px] text-red-500/60 mt-1">
                Stage: {result.stage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success: Live Preview */}
      {stage === 'success' && result?.dna && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Generated in {elapsed}s
            </span>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                Valid DNA
              </span>
              <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300 text-[10px]">
                {result.dna.presentation.chartType}
              </span>
              <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300 text-[10px]">
                {result.dna.presentation.theme}
              </span>
            </div>
          </div>

          {/* Rendered Infographic */}
          <div className="border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <DNARenderer dna={result.dna} />
          </div>

          {/* DNA Info */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-wrap gap-3 text-xs">
            <span className="px-2 py-1 rounded-md bg-white/10 text-white font-medium">
              {result.dna.content.data.length} data points
            </span>
            <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
              {result.dna.content.sources.length} source(s)
            </span>
            {result.dna.content.footnotes && (
              <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
                Has footnote
              </span>
            )}
          </div>

          {/* Raw JSON */}
          <details className="group">
            <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300 transition-colors">
              Show raw DNA JSON
            </summary>
            <pre className="mt-2 bg-black/30 border border-white/10 rounded-xl p-4 text-[10px] text-neutral-400 overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(result.dna, null, 2)}
            </pre>
          </details>
        </>
      )}

      {/* Generating State */}
      {stage === 'generating' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/80 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm text-white/60">Generating infographic...</p>
            <p className="text-xs text-neutral-600 mt-1">
              Claude is searching the web and building your DNA
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
