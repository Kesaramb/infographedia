'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { RotateCcw } from 'lucide-react'
import type { InfographicDNA } from '@/lib/dna/schema'
import { DNARenderer } from '@/components/dna-renderer'
import { InfographicComposition } from './infographic-composition'
import { compileLayout, REMOTION_RENDER_PROFILE } from '@/lib/dna/rendering'

interface AnimatedDNARendererProps {
  dna: InfographicDNA
}

/**
 * Renders an animated infographic using Remotion Player.
 *
 * - Waits until the card scrolls into the viewport before playing
 * - Plays once for ~8 seconds
 * - When done, swaps to the static DNARenderer so the fully populated
 *   infographic stays visible
 * - Shows a subtle replay button after playback ends
 */
export function AnimatedDNARenderer({ dna }: AnimatedDNARendererProps) {
  const compiledLayout = compileLayout(dna, REMOTION_RENDER_PROFILE)
  const { durationFrames, fps, width, height } = compiledLayout.meta
  const animationDurationMs = (durationFrames / fps) * 1000
  const prefersStaticRenderer = dna.presentation.chartType === 'map-chart'
  const playerRef = useRef<PlayerRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasEnteredView, setHasEnteredView] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Observe when the card enters the viewport, then trigger playback once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Start the swap timer once the player becomes visible and begins playing
  useEffect(() => {
    if (!hasEnteredView || prefersStaticRenderer) return

    timerRef.current = setTimeout(() => {
      setAnimationDone(true)
    }, animationDurationMs + 500) // small buffer for load delay

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [animationDurationMs, hasEnteredView, prefersStaticRenderer])

  const handleReplay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const player = playerRef.current
    if (player) {
      setAnimationDone(false)
      player.seekTo(0)
      player.play()
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setAnimationDone(true)
      }, animationDurationMs)
    }
  }, [animationDurationMs])

  return (
    <div ref={containerRef} className="relative">
      {/* Static infographic shown before viewport entry and after animation ends */}
      {(!hasEnteredView || animationDone || prefersStaticRenderer) && (
        <div style={{ borderRadius: 12, overflow: 'hidden', width: '100%' }}>
          <DNARenderer dna={dna} />
        </div>
      )}

      {/* Animated player — mounted and auto-plays only after entering viewport */}
      {hasEnteredView && !animationDone && !prefersStaticRenderer && (
        <Player
          ref={playerRef}
          component={InfographicComposition}
          inputProps={{ dna }}
          durationInFrames={durationFrames}
          fps={fps}
          compositionWidth={width}
          compositionHeight={height}
          loop={false}
          autoPlay
          controls={false}
          acknowledgeRemotionLicense
          style={{
            width: '100%',
            aspectRatio: `${width} / ${height}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        />
      )}

      {/* Subtle replay button */}
      {animationDone && !prefersStaticRenderer && (
        <button
          onClick={handleReplay}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all duration-200"
          aria-label="Replay animation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
