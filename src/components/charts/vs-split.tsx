'use client'

import type { DNAComponentProps } from '@/components/dna-renderer/types'

export function VsSplitBlock({ dna, colors }: DNAComponentProps) {
  const { data } = dna.content
  const left = data[0]
  const right = data[1]

  if (!left || !right) {
    return (
      <div
        className="w-full h-48 flex items-center justify-center text-sm opacity-40"
        style={{ color: colors.text }}
      >
        Need exactly 2 data points for comparison
      </div>
    )
  }

  return (
    <div className="w-full flex min-h-[200px]">
      {/* Left side */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{ borderRight: `1px solid ${colors.text}20` }}
      >
        <span
          className="text-5xl sm:text-6xl font-black tracking-tight"
          style={{ color: colors.primary }}
        >
          {left.value.toLocaleString()}
        </span>
        {left.unit && (
          <span
            className="text-base font-medium mt-1"
            style={{ color: colors.primary, opacity: 0.7 }}
          >
            {left.unit}
          </span>
        )}
        <span
          className="text-sm font-medium mt-3 text-center"
          style={{ color: colors.text, opacity: 0.7 }}
        >
          {left.label}
        </span>
      </div>

      {/* VS divider */}
      <div className="flex items-center justify-center px-3">
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: colors.accent }}
        >
          VS
        </span>
      </div>

      {/* Right side */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{ borderLeft: `1px solid ${colors.text}20` }}
      >
        <span
          className="text-5xl sm:text-6xl font-black tracking-tight"
          style={{ color: colors.secondary }}
        >
          {right.value.toLocaleString()}
        </span>
        {right.unit && (
          <span
            className="text-base font-medium mt-1"
            style={{ color: colors.secondary, opacity: 0.7 }}
          >
            {right.unit}
          </span>
        )}
        <span
          className="text-sm font-medium mt-3 text-center"
          style={{ color: colors.text, opacity: 0.7 }}
        >
          {right.label}
        </span>
      </div>
    </div>
  )
}
