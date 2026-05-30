import { useCurrentFrame, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

export function AnimatedFootnote({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  if (!dna.content.footnotes) return null
  const localFrame = Math.max(0, frame - block.animation.startFrame)

  const opacity = interpolate(localFrame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity: opacity * 0.5,
        color: colors.text,
        fontSize: 11,
        padding: '4px 24px',
        textAlign: block.align,
      }}
    >
      {dna.content.footnotes}
    </div>
  )
}
