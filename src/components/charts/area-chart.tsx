'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DNAComponentProps } from '@/components/dna-renderer/types'

export function AreaChartBlock({ dna, colors }: DNAComponentProps) {
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
    <div className="w-full px-4 py-6">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4} />
              <stop offset="95%" stopColor={colors.primary} stopOpacity={0.05} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.primary}
            strokeWidth={2.5}
            fill="url(#areaGradient)"
            dot={{ fill: colors.primary, r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
