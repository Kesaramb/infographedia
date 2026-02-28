'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useModal } from './modal-provider'
import { useGenerate } from '@/hooks/use-generate'
import { DNARenderer } from '@/components/dna-renderer'
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  GitFork,
  Search,
  ChevronRight,
  LogIn,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

// ============================================================
// State machine: idle → generating → preview → publishing → done
// ============================================================
type ModalStage = 'idle' | 'generating' | 'preview' | 'publishing' | 'done' | 'error'

export function IterateModal() {
  const { modal, closeModal } = useModal()
  const { user } = useAuth()
  const { stage: genStage, dna, searchQueries, error: genError, generate, reset } = useGenerate()
  const [modalStage, setModalStage] = useState<ModalStage>('idle')
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [publishError, setPublishError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const router = useRouter()

  // Sync generate stage → modal stage
  useEffect(() => {
    if (genStage === 'generating') {
      setModalStage('generating')
    } else if (genStage === 'success') {
      setModalStage('preview')
      // Auto-fill title from generated DNA
      if (dna) setTitle(dna.content.title)
    } else if (genStage === 'error') {
      setModalStage('error')
    }
  }, [genStage, dna])

  // Elapsed time counter during generation
  useEffect(() => {
    if (modalStage !== 'generating') { setElapsed(0); return }
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 100) / 10), 100)
    return () => clearInterval(timer)
  }, [modalStage])

  // Cleanup after exit animation completes
  const handleExitComplete = useCallback(() => {
    setModalStage('idle')
    setPrompt('')
    setTitle('')
    setPublishError(null)
    reset()
  }, [reset])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    await generate(prompt.trim(), modal.parentPost?.dna)
  }, [prompt, generate, modal.parentPost?.dna])

  const handlePublish = useCallback(async () => {
    if (!dna) return
    setModalStage('publishing')
    setPublishError(null)

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim() || dna.content.title,
          description: dna.content.subtitle,
          dna,
          parentPostId: modal.parentPost?.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setModalStage('done')
        // Refresh the feed after a short delay
        setTimeout(() => {
          closeModal()
          router.refresh()
        }, 1500)
      } else {
        setPublishError(result.error ?? 'Failed to publish')
        setModalStage('preview') // revert to allow retry
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Network error')
      setModalStage('preview')
    }
  }, [dna, title, modal.parentPost?.id, closeModal, router])

  const isIteration = modal.mode === 'iterate'

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {modal.isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal panel */}
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center"
          >
            <div className="relative bg-neutral-950 border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-lg max-h-[92dvh] md:max-h-[85dvh] flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  {isIteration
                    ? <GitFork className="w-4 h-4 text-emerald-400" />
                    : <Sparkles className="w-4 h-4 text-amber-400" />
                  }
                </div>
                <div className="flex-grow min-w-0">
                  <h2 className="text-sm font-bold text-white">
                    {isIteration ? 'Iterate' : 'Create'}
                  </h2>
                  {isIteration && modal.parentPost && (
                    <p className="text-[10px] text-neutral-500 truncate">
                      from: {modal.parentPost.title} by @{modal.parentPost.author}
                    </p>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4">

                {/* Auth gate — prompt sign-in if not logged in */}
                {!user && (modalStage === 'idle' || modalStage === 'error') && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <LogIn className="w-5 h-5 text-neutral-400" />
                    </div>
                    <p className="text-sm text-neutral-400 text-center">
                      Sign in to {isIteration ? 'iterate on' : 'create'} infographics
                    </p>
                    <Link
                      href="/login"
                      onClick={closeModal}
                      className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-100 transition-colors"
                    >
                      Sign in
                    </Link>
                  </div>
                )}

                {/* Parent preview (iteration mode only) */}
                {user && isIteration && modal.parentPost && modalStage === 'idle' && (
                  <div className="rounded-xl overflow-hidden border border-white/5 opacity-60 scale-[0.98] origin-top">
                    <DNARenderer dna={modal.parentPost.dna} />
                  </div>
                )}

                {/* Prompt input — shown in idle/error, only when authenticated */}
                {user && (modalStage === 'idle' || modalStage === 'error') && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wider">
                      {isIteration ? 'What would you like to change?' : 'What infographic do you want to create?'}
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={isIteration
                        ? 'e.g. "make it a pie chart with ocean theme" or "update with 2026 data"'
                        : 'e.g. "Top 10 programming languages by popularity in 2025"'
                      }
                      rows={3}
                      maxLength={1000}
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 resize-none"
                    />
                    {modalStage === 'error' && genError && (
                      <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">{genError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Generating state */}
                {modalStage === 'generating' && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/80 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-white/60">
                        {isIteration ? 'Iterating infographic...' : 'Generating infographic...'}
                      </p>
                      <p className="text-xs text-neutral-600 mt-1">
                        Claude is searching the web and building your DNA
                      </p>
                      <p className="text-xs text-neutral-700 mt-1">{elapsed}s</p>
                    </div>
                  </div>
                )}

                {/* Preview state — generated DNA */}
                {(modalStage === 'preview' || modalStage === 'publishing') && dna && (
                  <>
                    {/* Search transparency */}
                    {searchQueries.length > 0 && (
                      <div className="bg-white/5 rounded-lg px-3 py-2 flex items-start gap-2 border border-white/5">
                        <Search className="w-3 h-3 text-neutral-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-1">Searched</p>
                          {searchQueries.map((q, i) => (
                            <p key={i} className="text-[10px] text-neutral-400">{q}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live preview */}
                    <div className="border border-white/10 rounded-2xl overflow-hidden">
                      <DNARenderer dna={dna} />
                    </div>

                    {/* DNA badges */}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        ✓ Valid DNA
                      </span>
                      <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
                        {dna.presentation.chartType}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
                        {dna.presentation.theme}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
                        {dna.content.data.length} data points
                      </span>
                    </div>

                    {/* Editable title */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-neutral-500 uppercase tracking-wider">
                        Post title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={120}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                      />
                    </div>

                    {publishError && (
                      <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">{publishError}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Done state */}
                {modalStage === 'done' && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-sm text-white/70">Published! Returning to feed...</p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              {user && (modalStage === 'idle' || modalStage === 'error') && (
                <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </button>
                </div>
              )}

              {modalStage === 'preview' && (
                <div className="px-5 py-4 border-t border-white/5 flex-shrink-0 flex gap-3">
                  <button
                    onClick={() => { setModalStage('idle'); reset() }}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-300 hover:bg-white/10 transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handlePublish}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-100 transition-colors"
                  >
                    Publish
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {modalStage === 'publishing' && (
                <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
                  <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-sm text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
