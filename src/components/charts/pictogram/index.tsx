'use client'

import type { DNAComponentProps } from '@/components/dna-renderer/types'
import { getIconComponent } from './icon-registry'

const MAX_ICONS = 20

export function PictogramBlock({ dna, colors }: DNAComponentProps) {
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
    <div className="w-full px-6 py-6 flex flex-col gap-6">
      {data.map((point, i) => {
        const iconName = point.metadata?.icon ?? 'default'
        const Icon = getIconComponent(iconName)
        const iconCount = Math.min(Math.max(1, Math.round(point.value)), MAX_ICONS)

        return (
          <div key={i} className="flex flex-col gap-2">
            {/* Label + value */}
            <div className="flex items-baseline gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: colors.text, opacity: 0.7 }}
              >
                {point.label}
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: colors.primary }}
              >
                {point.value.toLocaleString()}
                {point.unit ? ` ${point.unit}` : ''}
              </span>
            </div>

            {/* Icon grid */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: iconCount }).map((_, j) => (
                <Icon
                  key={j}
                  className="w-6 h-6"
                  style={{ color: j % 2 === 0 ? colors.primary : colors.secondary }}
                  strokeWidth={1.5}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
