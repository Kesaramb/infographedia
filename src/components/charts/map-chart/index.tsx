'use client'

import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { DNAComponentProps } from '@/components/dna-renderer/types'
import {
  formatMapValue,
  prepareMapChartData,
  type PreparedMapEntry,
} from '@/lib/dna/map-chart'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface DetailCardProps {
  entry: PreparedMapEntry
  colors: DNAComponentProps['colors']
  compact?: boolean
}

function SummaryChip({
  label,
  colors,
}: {
  label: string
  colors: DNAComponentProps['colors']
}) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.16em] uppercase"
      style={{
        borderColor: `${colors.text}1f`,
        color: colors.text,
        backgroundColor: `${colors.text}0d`,
      }}
    >
      {label}
    </span>
  )
}

function RankBadge({
  rank,
  colors,
}: {
  rank: number | null
  colors: DNAComponentProps['colors']
}) {
  if (rank === null) return null

  return (
    <div
      className="rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        color: colors.background,
        backgroundColor: colors.primary,
      }}
    >
      #{rank}
    </div>
  )
}

function DetailCard({ entry, colors, compact = false }: DetailCardProps) {
  const title = entry.city ?? entry.countryName
  const subtitle = entry.city ? entry.countryName : entry.countryCode
  const eyebrow = compact ? (entry.city ? 'Hub detail' : 'Country rank') : entry.city ? 'Top hub' : 'Top country'
  const secondaryDetail =
    entry.countryEntryCount > 1
      ? `${entry.countryEntryCount} hubs • ${formatMapValue(entry.countryTotalValue, entry.unit)} total`
      : entry.city
        ? `Single highlighted hub`
        : 'Country total'

  return (
    <div
      className={`rounded-[24px] border ${compact ? 'px-4 py-3' : 'px-4 py-4'}`}
      style={{
        borderColor: `${colors.text}18`,
        background: `linear-gradient(180deg, ${colors.text}0d 0%, transparent 100%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`font-semibold ${compact ? 'text-sm' : 'text-[11px] uppercase tracking-[0.24em]'}`}
            style={{ color: compact ? colors.text : `${colors.text}aa` }}
          >
            {eyebrow}
          </div>
          {!compact ? (
            <div className="mt-2 text-2xl font-semibold leading-tight" style={{ color: colors.text }}>
              {title}
            </div>
          ) : (
            <div className="mt-1 text-sm font-semibold leading-tight" style={{ color: colors.text }}>
              {title}
            </div>
          )}
          <div className="mt-1 text-xs" style={{ color: `${colors.text}a3` }}>
            {subtitle}
          </div>
        </div>
        <RankBadge rank={entry.rank} colors={colors} />
      </div>

      <div className={`flex items-end justify-between gap-3 ${compact ? 'mt-3' : 'mt-5'}`}>
        <div
          className={`font-semibold leading-none ${compact ? 'text-xl' : 'text-4xl'}`}
          style={{ color: colors.text }}
        >
          {formatMapValue(entry.value, entry.unit)}
        </div>
        <div className="max-w-[45%] text-right text-[11px]" style={{ color: `${colors.text}8c` }}>
          {secondaryDetail}
        </div>
      </div>
    </div>
  )
}

export function MapChartBlock({ dna, colors }: DNAComponentProps) {
  const mapData = prepareMapChartData(dna.content.data)

  if (mapData.rankedEntries.length === 0) {
    return (
      <div
        className="flex h-48 w-full items-center justify-center text-sm opacity-40"
        style={{ color: colors.text }}
      >
        No map data available
      </div>
    )
  }

  const spotlight = mapData.topEntry
  const detailEntries = mapData.rankedEntries.slice(1, mapData.hasCityMetadata ? 6 : 5)
  const multiHubCountryCount = mapData.countries.filter((country) => country.entries.length > 1).length

  function getColor(geoId: string): string {
    const country = mapData.countryMap.get(geoId)
    if (!country || mapData.maxCountryValue === 0) return `${colors.text}15`

    const ratio = country.totalValue / mapData.maxCountryValue
    const opacity = Math.round((0.24 + ratio * 0.76) * 255)
    return `${colors.primary}${opacity.toString(16).padStart(2, '0')}`
  }

  return (
    <div className="w-full px-2 py-4">
      <div
        className="rounded-[28px] border p-3 sm:p-4"
        style={{
          borderColor: `${colors.text}18`,
          background: `linear-gradient(180deg, ${colors.text}0c 0%, transparent 100%)`,
        }}
      >
        <div className="overflow-hidden rounded-[22px]">
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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

        <div className="mt-4 flex items-center justify-center gap-2 px-4">
          <span className="text-xs" style={{ color: colors.text, opacity: 0.5 }}>
            Lower total
          </span>
          <div
            className="h-2 w-32 rounded-full"
            style={{
              background: `linear-gradient(to right, ${colors.primary}33, ${colors.primary})`,
            }}
          />
          <span className="text-xs" style={{ color: colors.text, opacity: 0.5 }}>
            Higher total
          </span>
        </div>

        {mapData.hasCityMetadata ? (
          <p className="mt-3 text-center text-[11px]" style={{ color: `${colors.text}88` }}>
            Country shading shows combined totals. The cards below break out the individual hubs.
          </p>
        ) : null}
      </div>

      {spotlight ? (
        <div
          className="mt-4 flex flex-wrap items-start gap-3"
        >
          <div className="min-w-[260px] flex-[1.08_1_300px] self-start">
            <DetailCard entry={spotlight} colors={colors} />
          </div>

          {detailEntries.length > 0 ? (
            <div className="min-w-[240px] flex-[0.92_1_260px] grid gap-2 self-start">
              {detailEntries.map((entry) => (
                <DetailCard
                  key={`${entry.numericCode}-${entry.index}`}
                  entry={entry}
                  colors={colors}
                  compact
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
