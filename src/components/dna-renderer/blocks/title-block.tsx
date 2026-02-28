import type { DNAComponentProps } from '../types'

export function TitleBlock({ dna, colors }: DNAComponentProps) {
  return (
    <h2
      className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight px-6 pt-6"
      style={{ color: colors.text }}
    >
      {dna.content.title}
    </h2>
  )
}
