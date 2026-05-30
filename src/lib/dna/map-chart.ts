import type { DataPoint } from '@/lib/dna/schema'
import { getNumericCode } from '@/lib/dna/country-codes'

export interface PreparedMapEntry {
  index: number
  point: DataPoint
  countryCode: string
  numericCode: string
  countryName: string
  city: string | null
  rank: number | null
  value: number
  unit: string | undefined
  countryEntryCount: number
  countryTotalValue: number
}

export interface PreparedMapCountry {
  countryCode: string
  numericCode: string
  countryName: string
  totalValue: number
  unit: string | undefined
  entries: PreparedMapEntry[]
  topEntry: PreparedMapEntry
}

export interface PreparedMapData {
  countries: PreparedMapCountry[]
  countryMap: Map<string, PreparedMapCountry>
  rankedEntries: PreparedMapEntry[]
  maxCountryValue: number
  totalValue: number
  totalCountries: number
  totalHubs: number
  hasCityMetadata: boolean
  hasDuplicateCountries: boolean
  topEntry: PreparedMapEntry | null
  topCountry: PreparedMapCountry | null
}

let regionDisplayNames: Intl.DisplayNames | null | undefined

function getRegionDisplayNames(): Intl.DisplayNames | null {
  if (regionDisplayNames !== undefined) {
    return regionDisplayNames
  }

  regionDisplayNames =
    typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames(['en'], { type: 'region' })
      : null

  return regionDisplayNames
}

function resolveCountryName(countryCode: string, point: DataPoint): string {
  const explicitCountry = point.metadata?.country?.trim() || point.metadata?.countryName?.trim()
  if (explicitCountry) {
    return explicitCountry
  }

  return getRegionDisplayNames()?.of(countryCode) ?? countryCode
}

function parseRank(value: string | undefined): number | null {
  if (!value?.trim()) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function compareNullableRank(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

function sortMapEntries(a: PreparedMapEntry, b: PreparedMapEntry): number {
  const rankDiff = compareNullableRank(a.rank, b.rank)
  if (rankDiff !== 0) return rankDiff

  if (b.value !== a.value) return b.value - a.value

  return a.index - b.index
}

function formatNumericValue(value: number): string {
  const abs = Math.abs(value)
  const maximumFractionDigits = Number.isInteger(value) ? 0 : abs >= 100 ? 0 : abs >= 10 ? 1 : 2

  return value.toLocaleString(undefined, { maximumFractionDigits })
}

export function formatMapValue(value: number, unit?: string): string {
  const formattedNumber = formatNumericValue(value)
  const normalizedUnit = unit?.trim()

  if (!normalizedUnit) return formattedNumber
  if (normalizedUnit === '%') return `${formattedNumber}%`
  if (/^[$€£¥]/.test(normalizedUnit)) return `${normalizedUnit}${formattedNumber}`
  if (['K', 'M', 'B', 'T', 'x'].includes(normalizedUnit)) return `${formattedNumber}${normalizedUnit}`

  return `${formattedNumber} ${normalizedUnit}`
}

export function prepareMapChartData(data: DataPoint[]): PreparedMapData {
  const countryMap = new Map<string, PreparedMapCountry>()
  const rankedEntries: PreparedMapEntry[] = []

  for (const [index, point] of data.entries()) {
    const countryCode = (point.metadata?.countryCode ?? point.label).trim().toUpperCase()
    const numericCode = getNumericCode(countryCode)

    if (!numericCode) {
      continue
    }

    const entry: PreparedMapEntry = {
      index,
      point,
      countryCode,
      numericCode,
      countryName: resolveCountryName(countryCode, point),
      city: point.metadata?.city?.trim() || null,
      rank: parseRank(point.metadata?.rank),
      value: point.value,
      unit: point.unit,
      countryEntryCount: 1,
      countryTotalValue: point.value,
    }

    rankedEntries.push(entry)

    const existingCountry = countryMap.get(numericCode)
    if (existingCountry) {
      existingCountry.totalValue += point.value
      existingCountry.entries.push(entry)
      if (!existingCountry.unit) {
        existingCountry.unit = point.unit
      }
      continue
    }

    countryMap.set(numericCode, {
      countryCode,
      numericCode,
      countryName: entry.countryName,
      totalValue: point.value,
      unit: point.unit,
      entries: [entry],
      topEntry: entry,
    })
  }

  const countries = Array.from(countryMap.values())
    .map((country) => {
      country.entries.sort(sortMapEntries)
      country.topEntry = country.entries[0]

      country.entries.forEach((entry) => {
        entry.countryEntryCount = country.entries.length
        entry.countryTotalValue = country.totalValue
      })

      return country
    })
    .sort((a, b) => {
      if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue
      return sortMapEntries(a.topEntry, b.topEntry)
    })

  rankedEntries.sort(sortMapEntries)

  const maxCountryValue =
    countries.length > 0 ? Math.max(...countries.map((country) => country.totalValue)) : 0

  return {
    countries,
    countryMap,
    rankedEntries,
    maxCountryValue,
    totalValue: countries.reduce((sum, country) => sum + country.totalValue, 0),
    totalCountries: countries.length,
    totalHubs: rankedEntries.length,
    hasCityMetadata: rankedEntries.some((entry) => Boolean(entry.city)),
    hasDuplicateCountries: countries.some((country) => country.entries.length > 1),
    topEntry: rankedEntries[0] ?? null,
    topCountry: countries[0] ?? null,
  }
}
