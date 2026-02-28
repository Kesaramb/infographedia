import type { DNAComponentProps } from '../types'

export function FootnoteBlock({ dna, colors }: DNAComponentProps) {
  if (!dna.content.footnotes) return null

  return (
    <p
      className="text-xs px-6 mt-4 opacity-50 italic leading-relaxed"
      style={{ color: colors.text }}
    >
      {dna.content.footnotes}
    </p>
  )
}
