import type { DNAComponentProps } from '../types'

export function SourceBadge({ dna, colors }: DNAComponentProps) {
  const sources = dna.content.sources
  if (!sources || sources.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-6 pb-4 mt-3">
      {sources.map((source, i) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 py-1 rounded-full border transition-opacity hover:opacity-100 opacity-60"
          style={{
            color: colors.text,
            borderColor: `${colors.text}33`,
          }}
        >
          <span className="font-semibold">Source:</span>
          <span className="underline underline-offset-2">{source.name}</span>
        </a>
      ))}
    </div>
  )
}
