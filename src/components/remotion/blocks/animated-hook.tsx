import { useCurrentFrame, interpolate } from 'remotion'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

export function AnimatedHook({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  if (!dna.content.hook) return null
  const localFrame = Math.max(0, frame - block.animation.startFrame)

  const opacity = interpolate(localFrame, [0, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const scale = interpolate(localFrame, [0, 24], [0.92, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        color: colors.accent || colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        fontStyle: 'italic',
        padding: '8px 24px 0',
        textAlign: block.align,
      }}
    >
      {dna.content.hook}
    </div>
  )
}
