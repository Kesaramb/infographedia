'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { RotateCcw } from 'lucide-react'
import type { InfographicDNA } from '@/lib/dna/schema'
import { DNARenderer } from '@/components/dna-renderer'
import { InfographicComposition } from './infographic-composition'
import { FPS, DURATION_FRAMES, WIDTH, HEIGHT } from './constants'

const ANIMATION_DURATION_MS = (DURATION_FRAMES / FPS) * 1000

interface AnimatedDNARendererProps {
  dna: InfographicDNA
}

/**
 * Renders an animated infographic using Remotion Player.
 *
 * - Plays once on mount for ~8 seconds
 * - When done, swaps to the static DNARenderer so the fully populated
 *   infographic stays visible
 * - Shows a subtle replay button after playback ends
 */
export function AnimatedDNARenderer({ dna }: AnimatedDNARendererProps) {
  const playerRef = useRef<PlayerRef>(null)
  const [animationDone, setAnimationDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // After the animation duration elapses, swap to static renderer
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setAnimationDone(true)
    }, ANIMATION_DURATION_MS + 500) // small buffer for load delay

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleReplay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const player = playerRef.current
    if (player) {
      setAnimationDone(false)
      player.seekTo(0)
      player.play()
      // Set up timer for this replay
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setAnimationDone(true)
      }, ANIMATION_DURATION_MS)
    }
  }, [])

  return (
    <div className="relative">
      {/* Animated player — visible during playback */}
      {!animationDone && (
        <Player
          ref={playerRef}
          component={InfographicComposition}
          inputProps={{ dna }}
          durationInFrames={DURATION_FRAMES}
          fps={FPS}
          compositionWidth={WIDTH}
          compositionHeight={HEIGHT}
          loop={false}
          autoPlay
          controls={false}
          acknowledgeRemotionLicense
          style={{
            width: '100%',
            aspectRatio: `${WIDTH} / ${HEIGHT}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        />
      )}

      {/* Static infographic — shown after animation ends */}
      {animationDone && (
        <div style={{ borderRadius: 12, overflow: 'hidden' }}>
          <DNARenderer dna={dna} />
        </div>
      )}

      {/* Subtle replay button */}
      {animationDone && (
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
