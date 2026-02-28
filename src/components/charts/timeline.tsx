import type { DNAComponentProps } from '@/components/dna-renderer/types'

export function TimelineBlock({ dna, colors }: DNAComponentProps) {
  const { data } = dna.content

  if (data.length === 0) {
    return (
      <div
        className="w-full h-48 flex items-center justify-center text-sm opacity-40"
        style={{ color: colors.text }}
      >
        No data available
      </div>
    )
  }

  return (
    <div className="w-full px-6 py-6">
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-3 top-2 bottom-2 w-0.5 rounded-full"
          style={{ backgroundColor: `${colors.primary}40` }}
        />

        <div className="flex flex-col gap-6">
          {data.map((point, i) => (
            <div key={i} className="relative flex items-start gap-4 pl-9">
              {/* Dot */}
              <div
                className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 z-10"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.primary,
                }}
              />

              {/* Content */}
              <div className="flex-1">
                <span
                  className="text-xs font-bold tracking-wider uppercase opacity-60"
                  style={{ color: colors.accent }}
                >
                  {point.value}
                </span>
                <p
                  className="text-sm sm:text-base font-medium mt-0.5"
                  style={{ color: colors.text }}
                >
                  {point.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
