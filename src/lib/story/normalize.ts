import type { StoryIntakePlan } from './intake'
import type { StoryEvidencePacket } from './research'
import type { StoryDocumentV3Draft } from './schema'

export function normalizeStoryDraft(
  draft: StoryDocumentV3Draft,
  intake: StoryIntakePlan,
  evidence: StoryEvidencePacket,
): StoryDocumentV3Draft['normalized'] {
  const datasetIdMap = new Map<string, string>()
  const datasets = draft.normalized.datasets
    .slice(0, 4)
    .map((dataset, index) => {
      const nextId = `dataset-${index + 1}`
      datasetIdMap.set(dataset.id, nextId)

      return {
        ...dataset,
        id: nextId,
        label: normalizeInlineCopy(dataset.label, 120, dataset.label || `Dataset ${index + 1}`),
        summary: dataset.summary
          ? normalizeInlineCopy(dataset.summary, 220, undefined)
          : undefined,
        viewHint: intake.requestedViews[index] ?? dataset.viewHint,
        items: dataset.items.slice(0, 20).map((item) => ({
          ...item,
          label: normalizeInlineCopy(item.label, 120, item.label || `Item ${index + 1}`),
          metadata: item.metadata ?? {},
        })),
      }
    })

  const availableSourceIds = new Set(evidence.support.map((item) => item.id))
  const defaultSourceIds = evidence.support.slice(0, 2).map((item) => item.id)

  const claims = draft.normalized.claims
    .slice(0, 8)
    .map((claim, index) => ({
      ...claim,
      id: `claim-${index + 1}`,
      statement: normalizeInlineCopy(claim.statement, 220, claim.statement || 'Grounded claim'),
      sourceIds: normalizeClaimSourceIds(claim.sourceIds, availableSourceIds, defaultSourceIds),
      datasetIds: claim.datasetIds
        .map((datasetId) => datasetIdMap.get(datasetId) ?? datasetId)
        .filter((datasetId) => datasets.some((dataset) => dataset.id === datasetId))
        .slice(0, 4),
    }))

  const entities = dedupeEntities(draft.normalized.entities).slice(0, 16)
  const geography = inferGeography(draft, intake)
  const timeline = inferTimeline(datasets)

  return {
    datasets,
    claims,
    entities,
    geography,
    timeline,
  }
}

function normalizeClaimSourceIds(
  sourceIds: string[],
  availableSourceIds: Set<string>,
  defaultSourceIds: string[],
): string[] {
  const resolved = sourceIds.filter((sourceId) => availableSourceIds.has(sourceId)).slice(0, 5)
  if (resolved.length > 0) return resolved
  return defaultSourceIds.slice(0, 1)
}

function dedupeEntities(
  entities: StoryDocumentV3Draft['normalized']['entities'],
): StoryDocumentV3Draft['normalized']['entities'] {
  const seen = new Set<string>()

  return entities.filter((entity) => {
    const key = `${entity.type}:${entity.label.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function inferGeography(
  draft: StoryDocumentV3Draft,
  intake: StoryIntakePlan,
): StoryDocumentV3Draft['normalized']['geography'] {
  if (draft.normalized.geography.scope !== 'none') {
    return draft.normalized.geography
  }

  const primaryCodes = draft.normalized.datasets
    .flatMap((dataset) => dataset.items)
    .map((item) => item.metadata.countryCode ?? item.metadata.country ?? '')
    .filter(Boolean)
    .slice(0, 12)

  if (intake.requestedViews.includes('map')) {
    return {
      scope: 'global',
      primaryCodes,
    }
  }

  return {
    scope: primaryCodes.length > 0 ? 'regional' : 'none',
    primaryCodes,
  }
}

function inferTimeline(
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
): StoryDocumentV3Draft['normalized']['timeline'] {
  const years = datasets
    .flatMap((dataset) => dataset.items)
    .map((item) => Number(item.metadata.time ?? item.metadata.year))
    .filter((value) => Number.isFinite(value))

  if (years.length === 0) {
    return {}
  }

  return {
    start: Math.min(...years),
    end: Math.max(...years),
    cadence: years.length > 4 ? 'yearly' : undefined,
  }
}

function normalizeInlineCopy(
  value: string | undefined,
  maxLength: number,
  fallback?: string,
): string {
  const cleaned = (value ?? fallback ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim()

  if (!cleaned) return fallback ?? ''
  if (cleaned.length <= maxLength) return cleaned

  const shortened = cleaned.slice(0, maxLength)
  const boundary = shortened.lastIndexOf(' ')
  return (boundary > Math.floor(maxLength * 0.55) ? shortened.slice(0, boundary) : shortened).trim()
}
