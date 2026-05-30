import type { InfographicDNA } from '@/lib/dna/schema'
import { prepareMapChartData } from '@/lib/dna/map-chart'

export interface SemanticConsistencyIssue {
  path: string
  message: string
}

export interface SemanticConsistencyResult {
  errors: SemanticConsistencyIssue[]
  warnings: SemanticConsistencyIssue[]
}

interface SemanticEntity {
  id: string
  label: string
  value: number
  unit?: string
  aliases: string[]
}

const LEADER_PATTERN = /\b(leads?|leading|dominates?|dominant|top|highest|largest|biggest|number one|#1|first)\b/i
const LEADER_VERBS = '(?:leads?|leading|dominates?|dominant|top|highest|largest|biggest|number one|#1|first)'
const VALUE_CONNECTORS = '(?:with|at|of|totals?|reaches?|hits?|stands at)'
const SHARE_CLAIM_PATTERN = /\b\d+(?:\.\d+)?%\b/i
const SHARE_SUPPORT_PATTERN = /\b(share|breakdown|distribution|portion|accounts for|represents?|drives?|usage)\b/i
export function evaluateSemanticConsistency(dna: InfographicDNA): SemanticConsistencyResult {
  const errors: SemanticConsistencyIssue[] = []
  const warnings: SemanticConsistencyIssue[] = []
  const fields = [
    { path: 'content.title', value: dna.content.title },
    { path: 'content.subtitle', value: dna.content.subtitle },
    { path: 'content.hook', value: dna.content.hook },
  ].filter((field): field is { path: string; value: string } => Boolean(field.value?.trim()))

  const pointEntities = buildPointEntities(dna)
  const pointLeader = getLeader(pointEntities)
  const mapData = dna.presentation.chartType === 'map-chart' ? prepareMapChartData(dna.content.data) : null
  const countryEntities = mapData
    ? mapData.countries.map<SemanticEntity>((country) => ({
        id: `country:${country.countryCode}`,
        label: country.countryName,
        value: country.totalValue,
        unit: country.unit,
        aliases: dedupeAliases([
          country.countryName,
          country.countryCode,
        ]),
      }))
    : []
  const countryLeader = getLeader(countryEntities)
  const hasPercentData = dna.content.data.some((point) => point.unit?.trim() === '%')

  for (const field of fields) {
    for (const entity of pointEntities) {
      const alias = findTriggeredAlias(field.value, entity.aliases)
      if (!alias) continue

      if (hasLeaderClaim(field.value, alias) && pointLeader && pointLeader.id !== entity.id) {
        errors.push({
          path: field.path,
          message: `"${entity.label}" is described as leading, but the highest displayed value is "${pointLeader.label}" (${formatClaimValue(pointLeader.value, pointLeader.unit)}).`,
        })
        break
      }

      const claimedValue = extractClaimedValue(field.value, alias)
      if (
        claimedValue &&
        !matchesClaimedMetric(claimedValue.value, claimedValue.unit, entity.value, entity.unit)
      ) {
        errors.push({
          path: field.path,
          message: `"${entity.label}" is paired with ${claimedValue.raw}, but the displayed value is ${formatClaimValue(entity.value, entity.unit)}.`,
        })
        break
      }
    }

    if (countryEntities.length > 0) {
      for (const entity of countryEntities) {
        const alias = findTriggeredAlias(field.value, entity.aliases)
        if (!alias) continue

        if (hasLeaderClaim(field.value, alias) && countryLeader && countryLeader.id !== entity.id) {
          errors.push({
            path: field.path,
            message: `"${entity.label}" is described as the leading country, but the highest displayed country total is "${countryLeader.label}" (${formatClaimValue(countryLeader.value, countryLeader.unit)}).`,
          })
          break
        }
      }
    }

    if (SHARE_CLAIM_PATTERN.test(field.value) && SHARE_SUPPORT_PATTERN.test(field.value) && !hasPercentData) {
      errors.push({
        path: field.path,
        message: 'Headline share or usage percentages must be represented in content.data with % units, or the claim should be rewritten to match the displayed numbers.',
      })
    }

    for (const match of field.value.matchAll(/\b(\d+)\s+(countries?|hubs?|entries?)\b/gi)) {
      const claimedCount = Number.parseInt(match[1] ?? '', 10)
      const noun = (match[2] ?? '').toLowerCase()

      if (!Number.isFinite(claimedCount) || !mapData) continue

      const actualCount =
        noun.startsWith('country')
          ? mapData.totalCountries
          : noun.startsWith('hub')
            ? mapData.totalHubs
            : dna.content.data.length

      if (claimedCount !== actualCount) {
        errors.push({
          path: field.path,
          message: `The copy says ${claimedCount} ${noun}, but the displayed infographic contains ${actualCount}.`,
        })
        break
      }
    }
  }

  if (errors.length === 0 && pointLeader && fields.length > 0 && hasPotentialRankingCopy(fields) && pointEntities.length > 6) {
    warnings.push({
      path: 'content.subtitle',
      message: 'Ranking copy is present with many entries. Double-check that leader statements and supporting values stay specific enough to avoid ambiguity.',
    })
  }

  return { errors, warnings }
}

function buildPointEntities(dna: InfographicDNA): SemanticEntity[] {
  if (dna.presentation.chartType === 'map-chart') {
    const mapData = prepareMapChartData(dna.content.data)
    if (!mapData.hasCityMetadata) {
      return []
    }

    return mapData.rankedEntries.map((entry) => ({
      id: `point:${entry.index}`,
      label: entry.city ?? entry.countryName,
      value: entry.value,
      unit: entry.unit,
      aliases: dedupeAliases([
        entry.city,
        entry.countryName,
        entry.countryCode,
        entry.point.label,
      ]),
    }))
  }

  return dna.content.data.map((point, index) => ({
    id: `point:${index}`,
    label: point.label,
    value: point.value,
    unit: point.unit,
    aliases: dedupeAliases([
      point.label,
      point.metadata?.country,
      point.metadata?.countryName,
      point.metadata?.countryCode,
      point.metadata?.city,
    ]),
  }))
}

function getLeader(entities: SemanticEntity[]): SemanticEntity | null {
  if (entities.length === 0) return null

  const sorted = [...entities].sort((a, b) => b.value - a.value)
  if (sorted.length > 1 && sorted[0].value === sorted[1].value) return null
  return sorted[0] ?? null
}

function hasPotentialRankingCopy(fields: Array<{ value: string }>): boolean {
  return fields.some((field) => LEADER_PATTERN.test(field.value))
}

function findTriggeredAlias(text: string, aliases: string[]): string | null {
  const sortedAliases = [...aliases].sort((a, b) => b.length - a.length)
  return sortedAliases.find((alias) => containsAlias(text, alias)) ?? null
}

function containsAlias(text: string, alias: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i')
  return pattern.test(text)
}

function hasLeaderClaim(text: string, alias: string): boolean {
  const aliasPattern = escapeRegExp(alias)
  const before = new RegExp(`\\b${aliasPattern}\\b[^.!?\\n]{0,28}\\b${LEADER_VERBS}\\b`, 'i')
  const after = new RegExp(`\\b${LEADER_VERBS}\\b[^.!?\\n]{0,28}\\b${aliasPattern}\\b`, 'i')

  return before.test(text) || after.test(text)
}

function extractClaimedValue(
  text: string,
  alias: string,
): { value: number; unit?: string; raw: string } | null {
  const pattern = new RegExp(
    `\\b${escapeRegExp(alias)}\\b[^.!?\\n]{0,40}?\\b${VALUE_CONNECTORS}\\b\\s*([$€£¥]?\\d[\\d,]*(?:\\.\\d+)?)\\s*([A-Za-z%]+)?`,
    'i',
  )
  const match = text.match(pattern)
  if (!match) return null

  const numeric = Number.parseFloat((match[1] ?? '').replace(/[$€£¥,]/g, ''))
  if (!Number.isFinite(numeric)) return null

  const leadingCurrency = match[1]?.match(/^[$€£¥]/)?.[0]
  const trailingUnit = match[2]?.trim()
  const unit = leadingCurrency ?? trailingUnit

  return {
    value: numeric,
    unit,
    raw: `${match[1] ?? ''}${trailingUnit ? trailingUnit : ''}`,
  }
}

function matchesClaimedMetric(
  claimedValue: number,
  claimedUnit: string | undefined,
  actualValue: number,
  actualUnit: string | undefined,
): boolean {
  const normalizedClaimedUnit = claimedUnit?.trim()
  const normalizedActualUnit = actualUnit?.trim()

  if (normalizedClaimedUnit && normalizedActualUnit && normalizedClaimedUnit !== normalizedActualUnit) {
    return false
  }

  const delta = Math.abs(claimedValue - actualValue)
  const tolerance = Math.max(0.5, Math.abs(actualValue) * 0.02)
  return delta <= tolerance
}

function formatClaimValue(value: number, unit?: string): string {
  const numeric = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 })

  if (!unit) return numeric
  if (unit === '%') return `${numeric}%`
  if (/^[$€£¥]/.test(unit)) return `${unit}${numeric}`

  return `${numeric}${unit}`
}

function dedupeAliases(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
        .filter((value) => value.length > 1),
    ),
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
