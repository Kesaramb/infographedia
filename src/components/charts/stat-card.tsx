import type { DNAComponentProps } from '@/components/dna-renderer/types'

export function StatCardBlock({ dna, colors }: DNAComponentProps) {
  const { data } = dna.content
  const primary = data[0]

  if (!primary) {
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
    <div className="flex flex-col items-center justify-center py-10 px-6 gap-3">
      {/* Large stat number */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-6xl sm:text-7xl font-black tracking-tight"
          style={{ color: colors.primary }}
        >
          {primary.unit?.includes('million') || primary.unit?.includes('billion')
            ? `$${primary.value}`
            : primary.value.toLocaleString()}
        </span>
        {primary.unit && (
          <span
            className="text-lg sm:text-xl font-medium opacity-60"
            style={{ color: colors.text }}
          >
            {primary.unit.replace('million USD', 'M').replace('billion', 'B')}
          </span>
        )}
      </div>

      {/* Label */}
      <span
        className="text-base sm:text-lg font-medium opacity-70 text-center"
        style={{ color: colors.text }}
      >
        {primary.label}
      </span>
    </div>
  )
}
