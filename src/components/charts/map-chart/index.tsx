'use client'

import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { DNAComponentProps } from '@/components/dna-renderer/types'
import { getNumericCode } from './country-utils'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export function MapChartBlock({ dna, colors }: DNAComponentProps) {
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

  // Build lookup: numeric code → data point
  // Label is an ISO alpha-2 country code (e.g., "US", "CN", "IN")
  const valueMap = new Map<string, (typeof data)[0]>()
  let maxValue = 0
  for (const point of data) {
    const code = (point.metadata?.countryCode as string) || point.label
    const numericCode = getNumericCode(code)
    if (numericCode) {
      valueMap.set(numericCode, point)
      if (point.value > maxValue) maxValue = point.value
    }
  }

  function getColor(geoId: string): string {
    const point = valueMap.get(geoId)
    if (!point || maxValue === 0) return `${colors.text}15`
    const ratio = point.value / maxValue
    const opacity = Math.round((0.2 + ratio * 0.8) * 255)
    return `${colors.primary}${opacity.toString(16).padStart(2, '0')}`
  }

  return (
    <div className="w-full px-2 py-4">
      <ComposableMap
        projectionConfig={{ scale: 147, center: [0, 20] }}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={getColor(geo.id as string)}
                stroke={`${colors.text}20`}
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3 px-4">
        <span className="text-xs" style={{ color: colors.text, opacity: 0.5 }}>
          Low
        </span>
        <div
          className="h-2 w-32 rounded-full"
          style={{
            background: `linear-gradient(to right, ${colors.primary}33, ${colors.primary})`,
          }}
        />
        <span className="text-xs" style={{ color: colors.text, opacity: 0.5 }}>
          High
        </span>
      </div>
    </div>
  )
}
