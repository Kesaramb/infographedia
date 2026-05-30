import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import {
  formatMapValue,
  prepareMapChartData,
  type PreparedMapEntry,
} from '@/lib/dna/map-chart'
import type { AnimatedRenderableProps } from '@/components/remotion/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

function SummaryChip({
  label,
  colors,
}: {
  label: string
  colors: AnimatedRenderableProps['colors']
}) {
  return (
    <span
      style={{
        borderRadius: 999,
        border: `1px solid ${colors.text}1f`,
        padding: '6px 12px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: colors.text,
        backgroundColor: `${colors.text}0d`,
      }}
    >
      {label}
    </span>
  )
}

function DetailCard({
  entry,
  colors,
  progress,
  compact = false,
}: {
  entry: PreparedMapEntry
  colors: AnimatedRenderableProps['colors']
  progress: number
  compact?: boolean
}) {
  const title = entry.city ?? entry.countryName
  const subtitle = entry.city ? entry.countryName : entry.countryCode
  const eyebrow = compact ? (entry.city ? 'Hub detail' : 'Country rank') : entry.city ? 'Top hub' : 'Top country'
  const secondaryDetail =
    entry.countryEntryCount > 1
      ? `${entry.countryEntryCount} hubs • ${formatMapValue(entry.countryTotalValue, entry.unit)} total`
      : entry.city
        ? 'Single highlighted hub'
        : 'Country total'

  return (
    <div
      style={{
        borderRadius: 24,
        border: `1px solid ${colors.text}18`,
        padding: compact ? '14px 16px' : '18px 18px 20px',
        background: `linear-gradient(180deg, ${colors.text}0d 0%, transparent 100%)`,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [10, 0])}px)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: compact ? 13 : 11,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: compact ? undefined : '0.24em',
              textTransform: compact ? undefined : 'uppercase',
              color: compact ? colors.text : `${colors.text}aa`,
            }}
          >
            {eyebrow}
          </div>
          {!compact ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.05,
                color: colors.text,
              }}
            >
              {title}
            </div>
          ) : (
            <div
              style={{
                marginTop: 6,
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.15,
                color: colors.text,
              }}
            >
              {title}
            </div>
          )}
          <div style={{ marginTop: 4, fontSize: 11, color: `${colors.text}a3` }}>{subtitle}</div>
        </div>

        {entry.rank !== null ? (
          <div
            style={{
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: colors.background,
              backgroundColor: colors.primary,
            }}
          >
            #{entry.rank}
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: compact ? 14 : 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: compact ? 24 : 40,
            fontWeight: 700,
            lineHeight: 1,
            color: colors.text,
          }}
        >
          {formatMapValue(entry.value, entry.unit)}
        </div>
        <div
          style={{
            maxWidth: '45%',
            fontSize: 11,
            lineHeight: 1.35,
            textAlign: 'right',
            color: `${colors.text}8c`,
          }}
        >
          {secondaryDetail}
        </div>
      </div>
    </div>
  )
}

export function AnimatedMapChart({ dna, colors, block }: AnimatedRenderableProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = Math.max(0, frame - block.animation.startFrame)
  const mapData = prepareMapChartData(dna.content.data)

  if (mapData.rankedEntries.length === 0) {
    return null
  }

  const spotlight = mapData.topEntry
  const detailEntries = mapData.rankedEntries.slice(1, mapData.hasCityMetadata ? 6 : 5)
  const multiHubCountryCount = mapData.countries.filter((country) => country.entries.length > 1).length
  const countryIndexMap = new Map(
    mapData.countries.map((country, index) => [country.numericCode, index] as const),
  )

  function getColor(geoId: string): string {
    const country = mapData.countryMap.get(geoId)
    if (!country || mapData.maxCountryValue === 0) return `${colors.text}10`

    const countryIndex = countryIndexMap.get(geoId) ?? 0
    const progress = spring({
      frame: localFrame - countryIndex * 8,
      fps,
      config: { damping: 16, stiffness: 70 },
    })

    const ratio = country.totalValue / mapData.maxCountryValue
    const targetOpacity = 0.24 + ratio * 0.76
    const currentOpacity = interpolate(progress, [0, 1], [0.05, targetOpacity])
    const hex = Math.round(currentOpacity * 255)
      .toString(16)
      .padStart(2, '0')

    return `${colors.primary}${hex}`
  }

  const mapProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  const legendProgress = spring({
    frame: localFrame - 42,
    fps,
    config: { damping: 14, stiffness: 60 },
  })

  const spotlightProgress = spring({
    frame: localFrame - 68,
    fps,
    config: { damping: 16, stiffness: 80 },
  })

  return (
    <div
      style={{
        padding: '0 16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: mapProgress,
      }}
    >
      <div
        style={{
          borderRadius: 28,
          border: `1px solid ${colors.text}18`,
          padding: 14,
          background: `linear-gradient(180deg, ${colors.text}0c 0%, transparent 100%)`,
        }}
      >
        <div style={{ overflow: 'hidden', borderRadius: 22 }}>
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
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            opacity: legendProgress,
          }}
        >
          <SummaryChip
            label={`${mapData.totalCountries} ${mapData.totalCountries === 1 ? 'country' : 'countries'}`}
            colors={colors}
          />
          <SummaryChip
            label={
              mapData.hasCityMetadata
                ? `${mapData.totalHubs} ${mapData.totalHubs === 1 ? 'hub' : 'hubs'}`
                : `${mapData.totalHubs} ranked ${mapData.totalHubs === 1 ? 'entry' : 'entries'}`
            }
            colors={colors}
          />
          <SummaryChip
            label={
              multiHubCountryCount > 0
                ? `${multiHubCountryCount} multi-hub ${multiHubCountryCount === 1 ? 'country' : 'countries'}`
                : `Top total ${formatMapValue(mapData.topCountry?.totalValue ?? 0, mapData.topCountry?.unit)}`
            }
            colors={colors}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 14,
            opacity: legendProgress,
          }}
        >
          <span style={{ fontSize: 11, color: colors.text, opacity: 0.5 }}>Lower total</span>
          <div
            style={{
              height: 6,
              width: 108,
              borderRadius: 999,
              background: `linear-gradient(to right, ${colors.primary}33, ${colors.primary})`,
            }}
          />
          <span style={{ fontSize: 11, color: colors.text, opacity: 0.5 }}>Higher total</span>
        </div>

        {mapData.hasCityMetadata ? (
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              textAlign: 'center',
              color: `${colors.text}88`,
              opacity: legendProgress,
            }}
          >
            Country shading shows combined totals. The cards below break out the individual hubs.
          </div>
        ) : null}
      </div>

      {spotlight ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              flex: '1.08 1 300px',
              minWidth: 260,
              alignSelf: 'flex-start',
            }}
          >
            <DetailCard entry={spotlight} colors={colors} progress={spotlightProgress} />
          </div>

          {detailEntries.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gap: 8,
                flex: '0.92 1 260px',
                minWidth: 240,
                alignSelf: 'flex-start',
              }}
            >
              {detailEntries.map((entry, index) => {
                const progress = interpolate(
                  localFrame,
                  [82 + index * 8, 108 + index * 8],
                  [0, 1],
                  {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  },
                )

                return (
                  <DetailCard
                    key={`${entry.numericCode}-${entry.index}`}
                    entry={entry}
                    colors={colors}
                    progress={progress}
                    compact
                  />
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
