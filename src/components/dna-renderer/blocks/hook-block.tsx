import type { DNAComponentProps } from '../types'

export function HookBlock({ dna, colors }: DNAComponentProps) {
  if (!dna.content.hook) return null

  return (
    <p
      className="text-lg sm:text-xl font-bold px-6 mt-2 italic"
      style={{ color: colors.accent || colors.primary }}
    >
      {dna.content.hook}
    </p>
  )
}
