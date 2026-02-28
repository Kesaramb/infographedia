import type { DNAComponentProps } from '../types'

export function SubtitleBlock({ dna, colors }: DNAComponentProps) {
  if (!dna.content.subtitle) return null

  return (
    <p
      className="text-sm sm:text-base px-6 mt-1 opacity-70"
      style={{ color: colors.text }}
    >
      {dna.content.subtitle}
    </p>
  )
}
