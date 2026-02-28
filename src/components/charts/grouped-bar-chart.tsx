'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { DNAComponentProps } from '@/components/dna-renderer/types'

export function GroupedBarChartBlock({ dna, colors }: DNAComponentProps) {
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

  // Group data by extracting the base label (e.g., "India" from "India 2020")
  // Uses metadata.group if available, otherwise splits on last space
  const groups = new Map<string, Record<string, number>>()
  const groupKeys = new Set<string>()

  for (const point of data) {
    const groupName = point.metadata?.group ?? 'default'
    groupKeys.add(groupName)

    // Extract base label by removing the group suffix
    const baseLabel = point.label.replace(` ${groupName}`, '').trim()

    if (!groups.has(baseLabel)) {
      groups.set(baseLabel, {})
    }
    const entry = groups.get(baseLabel)!
    entry[groupName] = point.value
    entry.label = baseLabel as unknown as number // Recharts expects this
  }

  const chartData = Array.from(groups.entries()).map(([label, values]) => ({
    label,
    ...values,
  }))

  const sortedGroupKeys = Array.from(groupKeys).sort()
  const barColors = [colors.primary, colors.secondary, colors.accent]

  return (
    <div className="w-full px-4 py-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
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
          <Legend
            wrapperStyle={{ fontSize: 11, color: colors.text, opacity: 0.7 }}
          />
          {sortedGroupKeys.map((groupKey, i) => (
            <Bar
              key={groupKey}
              dataKey={groupKey}
              name={groupKey}
              fill={barColors[i % barColors.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={35}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
