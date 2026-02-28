'use client'

import { Player } from '@remotion/player'
import type { InfographicDNA } from '@/lib/dna/schema'
import { InfographicComposition } from './infographic-composition'
import { FPS, DURATION_FRAMES, WIDTH, HEIGHT } from './constants'

interface AnimatedDNARendererProps {
  dna: InfographicDNA
  /** Override width (default: responsive 100%) */
  width?: number
  /** Override height (default: auto from aspect ratio) */
  height?: number
  /** Enable looping (default: true) */
  loop?: boolean
  /** Auto-play on mount (default: true) */
  autoPlay?: boolean
}

/**
 * Renders an animated infographic using Remotion Player.
 *
 * - Auto-plays and loops by default
 * - Responsive width, maintains aspect ratio
 * - No user controls (clean feed experience)
 * - Uses InfographicComposition which orchestrates all animated blocks
 */
export function AnimatedDNARenderer({
  dna,
  loop = true,
  autoPlay = true,
}: AnimatedDNARendererProps) {
  return (
    <Player
      component={InfographicComposition}
      inputProps={{ dna }}
      durationInFrames={DURATION_FRAMES}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      loop={loop}
      autoPlay={autoPlay}
      controls={false}
      acknowledgeRemotionLicense
      style={{
        width: '100%',
        aspectRatio: `${WIDTH} / ${HEIGHT}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    />
  )
}
