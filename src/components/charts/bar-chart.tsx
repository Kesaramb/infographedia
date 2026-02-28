'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { DNAComponentProps } from '@/components/dna-renderer/types'

export function BarChartBlock({ dna, colors }: DNAComponentProps) {
  const { data } = dna.content

  if (data.length === 0) {
    return <EmptyState colors={colors} />
  }

  return (
    <div className="w-full px-4 py-6">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${colors.text}15`} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.text, fontSize: 11, opacity: 0.7 }}
            axisLine={{ stroke: `${colors.text}30` }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.text, fontSize: 11, opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.text}30`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i % 2 === 0 ? colors.primary : colors.secondary}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmptyState({ colors }: { colors: DNAComponentProps['colors'] }) {
  return (
    <div
      className="w-full h-48 flex items-center justify-center text-sm opacity-40"
      style={{ color: colors.text }}
    >
      No data available
    </div>
  )
}
