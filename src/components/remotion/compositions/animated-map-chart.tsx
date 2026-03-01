import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { InfographicDNA } from '@/lib/dna/schema'
import { getNumericCode } from '@/components/charts/map-chart/country-utils'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface AnimatedChartProps {
  dna: InfographicDNA
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
  }
}

export function AnimatedMapChart({ dna, colors }: AnimatedChartProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const data = dna.content.data

  // Build lookup: numeric code → { index, value }
  // Label is an ISO alpha-2 country code (e.g., "US", "CN", "IN")
  const valueMap = new Map<string, { index: number; value: number }>()
  let maxValue = 0
  data.forEach((point, i) => {
    const code = (point.metadata?.countryCode as string) || point.label
    const numericCode = getNumericCode(code)
    if (numericCode) {
      valueMap.set(numericCode, { index: i, value: point.value })
      if (point.value > maxValue) maxValue = point.value
    }
  })

  function getColor(geoId: string): string {
    const entry = valueMap.get(geoId)
    if (!entry || maxValue === 0) return `${colors.text}10`

    // Stagger each country's appearance by its data index
    const progress = spring({
      frame: frame - 60 - entry.index * 10,
      fps,
      config: { damping: 14, stiffness: 60 },
    })

    const ratio = entry.value / maxValue
    const targetOpacity = 0.2 + ratio * 0.8
    const currentOpacity = interpolate(progress, [0, 1], [0.05, targetOpacity])
    const hex = Math.round(currentOpacity * 255)
      .toString(16)
      .padStart(2, '0')

    return `${colors.primary}${hex}`
  }

  // Overall map fade-in
  const mapProgress = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  // Legend fade-in
  const legendProgress = spring({
    frame: frame - 120,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  return (
    <div style={{ padding: '0 8px', opacity: mapProgress }}>
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
                stroke={`${colors.text}15`}
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 12,
          padding: '0 16px',
          opacity: legendProgress,
        }}
      >
        <span style={{ fontSize: 11, color: colors.text, opacity: 0.5 }}>Low</span>
        <div
          style={{
            height: 6,
            width: 100,
            borderRadius: 3,
            background: `linear-gradient(to right, ${colors.primary}33, ${colors.primary})`,
          }}
        />
        <span style={{ fontSize: 11, color: colors.text, opacity: 0.5 }}>High</span>
      </div>
    </div>
  )
}
