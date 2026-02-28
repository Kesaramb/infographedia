'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { DNAComponentProps } from '@/components/dna-renderer/types'

const PALETTE = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316',
]

export function PieChartBlock({ dna, colors }: DNAComponentProps) {
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

  const palette = [colors.primary, colors.secondary, colors.accent, ...PALETTE]

  return (
    <div className="w-full px-4 py-6">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={100}
            strokeWidth={2}
            stroke={colors.background}
            label={({ label, percent }: { label?: string; percent?: number }) =>
              `${label ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={{ stroke: `${colors.text}50` }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.text}30`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: colors.text, opacity: 0.7 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
