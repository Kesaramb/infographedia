import type { MediaItem, Source } from '@/lib/dna/schema'
import {
  CHART_TYPES,
  THEME_NAMES,
  VISUAL_DENSITIES,
  type ChartTypeValue,
  type ThemeNameValue,
  type VisualDensityValue,
} from '@/lib/dna/schema'
import type { StoryIntakePlan } from './intake'
import type { StoryEvidencePacket } from './research'
import {
  STORY_DOCUMENT_VERSION,
  STORY_INSIGHT_TYPES,
  STORY_PANEL_EMPHASIS,
  STORY_PANEL_LAYOUTS,
  STORY_PANEL_ROLES,
  STORY_PANEL_VIEW_TYPES,
  STORY_SCENE_FAMILIES,
  type StoryDocumentV3Draft,
  type StoryPanelEmphasisValue,
  type StoryPanelLayoutValue,
  type StoryPanelRoleValue,
  type StoryPanelViewTypeValue,
  type StoryRequestedViewValue,
  type StorySceneFamilyValue,
  resolveStorySceneTheme,
} from './schema'

export function coerceStoryDocumentDraft(
  raw: unknown,
  intake: StoryIntakePlan,
  evidence: StoryEvidencePacket,
): StoryDocumentV3Draft {
  const root = asRecord(raw)
  const intakeRecord = asRecord(root.intake)
  const normalizedRecord = asRecord(root.normalized)
  const storyRecord = asRecord(root.story)
  const sceneRecord = asRecord(root.scene)
  const requestedViews = coerceRequestedViews(intakeRecord.requestedViews, intake.requestedViews)
  const datasets = coerceDatasets(root, normalizedRecord.datasets, requestedViews, evidence)
  const sourceIds = evidence.support.map((item) => item.id)
  const claims = coerceClaims(normalizedRecord.claims, datasets, sourceIds)
  const insights = coerceInsights(root.insights, datasets)
  const visualDensity = coerceEnum(
    sceneRecord.visualDensity,
    VISUAL_DENSITIES,
    'balanced',
  )
  const family = coerceEnum(
    sceneRecord.family,
    STORY_SCENE_FAMILIES,
    defaultSceneFamily(requestedViews),
  )
  const sceneTheme = coerceEnum(
    sceneRecord.themeName,
    THEME_NAMES,
    resolveStorySceneTheme(family, visualDensity),
  )
  const layout = coerceEnum(
    sceneRecord.layout,
    STORY_PANEL_LAYOUTS,
    defaultSceneLayout(requestedViews),
  )

  return {
    version: STORY_DOCUMENT_VERSION,
    intake: {
      prompt: coerceText(intakeRecord.prompt, 1000, intake.prompt),
      topic: coerceText(intakeRecord.topic, 180, intake.topic),
      audience: coerceText(intakeRecord.audience, 120, intake.audience),
      humanStake: coerceText(intakeRecord.humanStake, 180, intake.humanStake),
      requestedViews,
      constraints: coerceStringArray(intakeRecord.constraints, 6, 140, intake.constraints),
      iterationMode: intake.iterationMode,
      parentFormat: intake.parentFormat,
    },
    evidence: {
      sources: coerceSources(evidence.sources),
      support: evidence.support.slice(0, 12),
      media: coerceMedia(evidence.media),
      freshness: evidence.hasGrounding ? 'fresh' : 'mixed',
    },
    normalized: {
      datasets,
      claims,
      entities: coerceEntities(normalizedRecord.entities),
      geography: coerceGeography(normalizedRecord.geography),
      timeline: coerceTimeline(normalizedRecord.timeline),
    },
    insights,
    story: coerceStory(storyRecord, intake, datasets, insights),
    scene: {
      family,
      themeName: sceneTheme,
      visualDensity,
      layout,
      panels: coercePanels(sceneRecord.panels, datasets, requestedViews),
    },
  }
}

function coerceDatasets(
  root: Record<string, unknown>,
  rawDatasets: unknown,
  requestedViews: StoryRequestedViewValue[],
  evidence: StoryEvidencePacket,
): StoryDocumentV3Draft['normalized']['datasets'] {
  const candidates = asArray(rawDatasets)
  const fallbackMetricArrays = [
    ...extractMetricArrays(asRecord(root.content).data),
    ...extractMetricArrays(root.data),
  ]
  const datasetInputs = candidates.length > 0 ? candidates : fallbackMetricArrays
  const evidenceDatasets = extractDatasetsFromEvidenceSupport(evidence, requestedViews)

  const datasets = datasetInputs
    .map((candidate, index) => {
      const record = asRecord(candidate)
      const items = coerceItems(record.items)
      if (items.length === 0) return null

      return {
        id: `dataset-${index + 1}`,
        label: coerceText(record.label, 120, `Dataset ${index + 1}`),
        summary: coerceOptionalText(record.summary, 220),
        viewHint: coerceEnum(
          record.viewHint,
          STORY_PANEL_VIEW_TYPES,
          requestedViews[index] ?? requestedViews[0] ?? 'bar',
        ),
        items,
      }
    })
    .filter((dataset): dataset is NonNullable<typeof dataset> => Boolean(dataset))
    .slice(0, 4)

  if (datasets.length > 0) {
    if (shouldReplaceWeakDatasets(datasets, requestedViews, evidenceDatasets)) {
      return evidenceDatasets
    }
    return datasets
  }

  if (evidenceDatasets.length > 0) return evidenceDatasets

  return [
    {
      id: 'dataset-1',
      label: coerceText(root.title, 120, 'Primary dataset'),
      summary: 'Grounded summary generated from the evidence packet.',
      viewHint: requestedViews[0] ?? 'bar',
      items: [
        {
          label: 'Awaiting grounded result',
          value: 1,
          unit: undefined,
          metadata: {},
        },
      ],
    },
  ]
}

function coerceItems(
  rawItems: unknown,
): StoryDocumentV3Draft['normalized']['datasets'][number]['items'] {
  return asArray(rawItems)
    .map((candidate) => {
      const record = asRecord(candidate)
      const { label, value, unit, metadata } = coerceMetricRow(record)
      if (!label || value === null) return null

      return {
        label,
        value,
        unit,
        metadata,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 20)
}

function coerceClaims(
  rawClaims: unknown,
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
  sourceIds: string[],
): StoryDocumentV3Draft['normalized']['claims'] {
  const defaultSourceIds = sourceIds.slice(0, 2)

  const claims = asArray(rawClaims)
    .map((candidate, index) => {
      const record = asRecord(candidate)
      const statement = coerceText(record.statement, 220, '')
      if (!statement) return null

      return {
        id: `claim-${index + 1}`,
        statement,
        sourceIds: coerceSourceIds(record.sourceIds, defaultSourceIds),
        datasetIds: coerceDatasetIds(record.datasetIds, datasets),
        confidence: record.confidence === 'medium' ? 'medium' as const : 'high' as const,
      }
    })
    .filter((claim): claim is NonNullable<typeof claim> => Boolean(claim))
    .slice(0, 8)

  if (claims.length > 0) return claims

  const firstDataset = datasets[0]
  const firstItem = firstDataset?.items[0]
  const fallbackStatement = firstItem
    ? `${firstItem.label} is the headline result in ${firstDataset.label.toLowerCase()}.`
    : 'The visible evidence supports the headline finding.'

  return [
    {
      id: 'claim-1',
      statement: coerceText(fallbackStatement, 220, 'The visible evidence supports the headline finding.'),
      sourceIds: defaultSourceIds.length > 0 ? defaultSourceIds : ['source-1'],
      datasetIds: firstDataset ? [firstDataset.id] : [],
      confidence: 'high',
    },
  ]
}

function coerceInsights(
  rawInsights: unknown,
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
): StoryDocumentV3Draft['insights'] {
  const insights = asArray(rawInsights)
    .map((candidate, index) => {
      const record = asRecord(candidate)
      const datasetId = coerceDatasetId(record.datasetId, datasets)
      const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0]
      const title = coerceText(record.title, 120, '')
      const description = coerceText(record.description, 220, '')

      if (!dataset || !title || !description) return null

      return {
        id: `insight-${index + 1}`,
        type: coerceEnum(record.type, STORY_INSIGHT_TYPES, 'leader'),
        title,
        description,
        datasetId: dataset.id,
        score: clampNumber(coerceNumber(record.score) ?? 0.7, 0, 1),
        supportingLabels: coerceStringArray(record.supportingLabels, 4, 120, []),
      }
    })
    .filter((insight): insight is NonNullable<typeof insight> => Boolean(insight))
    .slice(0, 8)

  if (insights.length > 0) return insights

  const firstDataset = datasets[0]
  const firstItem = firstDataset?.items[0]

  return [
    {
      id: 'insight-1',
      type: 'leader',
      title: firstItem ? `${firstItem.label} leads` : 'Headline finding',
      description: firstItem && firstDataset
        ? `${firstItem.label} stands out in ${firstDataset.label.toLowerCase()}.`
        : 'The leading result defines the public-facing story.',
      datasetId: firstDataset?.id ?? 'dataset-1',
      score: 0.8,
      supportingLabels: firstItem ? [firstItem.label] : [],
    },
  ]
}

function coerceStory(
  rawStory: Record<string, unknown>,
  intake: StoryIntakePlan,
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
  insights: StoryDocumentV3Draft['insights'],
): StoryDocumentV3Draft['story'] {
  const leadDataset = datasets[0]
  const leadItem = leadDataset?.items[0]
  const leadInsight = insights[0]
  const leadLabel = leadInsight?.supportingLabels[0] ?? leadItem?.label ?? intake.topic
  const leadValue = leadItem?.value
  const leadUnit = leadItem?.unit ?? ''
  const formattedLeadValue = typeof leadValue === 'number' ? formatValue(leadValue) : ''
  const secondItem = leadDataset?.items[1]
  const formattedSecondValue = typeof secondItem?.value === 'number'
    ? `${formatValue(secondItem.value)}${secondItem.unit ?? ''}`
    : secondItem?.metadata.rank ? `#${secondItem.metadata.rank}` : ''
  const normalizedStake = intake.humanStake.replace(/\.$/, '').toLowerCase()

  return {
    thesis: coerceText(rawStory.thesis, 60, `${leadLabel} tops ${compactTopic(intake.topic)}`),
    setup: coerceText(rawStory.setup, 220, `${intake.topic} shapes public decisions because ${normalizedStake}.`),
    reveal: coerceText(
      rawStory.reveal,
      120,
      formattedLeadValue && secondItem
        ? `${leadLabel} leads at ${formattedLeadValue}${leadUnit}, ahead of ${secondItem.label}${formattedSecondValue ? ` at ${formattedSecondValue}` : ''}.`
        : formattedLeadValue
          ? `${leadLabel} stands out at ${formattedLeadValue}${leadUnit}.`
          : `${leadLabel} leads the grounded ranking.`,
    ),
    takeaway: coerceText(
      rawStory.takeaway,
      220,
      `This matters because ${normalizedStake}.`,
    ),
    socialCurrency: coerceText(
      rawStory.socialCurrency,
      160,
      `${leadLabel} makes this story feel instantly shareable, not just factual.`,
    ),
    unexpected: coerceText(
      rawStory.unexpected,
      160,
      `${leadLabel} is not where most people expect the story to land.`,
    ),
    emotionalStake: coerceText(rawStory.emotionalStake, 180, intake.humanStake),
    credibility: coerceText(
      rawStory.credibility,
      180,
      'Every key claim is grounded in current visible sources and concrete figures.',
    ),
    concreteness: coerceText(
      rawStory.concreteness,
      180,
      formattedLeadValue ? `${leadLabel} is shown with a concrete value of ${formattedLeadValue}${leadUnit}.` : 'The story stays concrete with visible labels, values, and sources.',
    ),
  }
}

function coercePanels(
  rawPanels: unknown,
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
  requestedViews: StoryRequestedViewValue[],
): StoryDocumentV3Draft['scene']['panels'] {
  const panels = asArray(rawPanels)
    .map((candidate, index) => {
      const record = asRecord(candidate)
      const viewType = coerceEnum(
        record.viewType,
        STORY_PANEL_VIEW_TYPES,
        requestedViews[index] ?? requestedViews[0] ?? 'bar',
      )
      const datasetIds = coerceDatasetIds(record.datasetIds, datasets)
      const dataset = datasets.find((item) => item.id === datasetIds[0]) ?? datasets[index] ?? datasets[0]

      if (!dataset) return null

      return {
        id: `panel-${index + 1}`,
        role: coerceEnum(
          record.role,
          STORY_PANEL_ROLES,
          index === 0 ? 'primary' : 'support',
        ),
        viewType,
        datasetIds: datasetIds.length > 0 ? datasetIds : [dataset.id],
        title: coerceText(record.title, 80, dataset.label),
        subtitle: coerceOptionalText(record.subtitle, 140),
        chartType: coerceChartType(record.chartType, defaultChartType(viewType)),
        emphasis: coerceEnum(
          record.emphasis,
          STORY_PANEL_EMPHASIS,
          index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
        ),
        annotations: coerceAnnotations(record.annotations),
        mediaId: coerceOptionalText(record.mediaId, 64),
      }
    })
    .filter((panel): panel is NonNullable<typeof panel> => Boolean(panel))
    .slice(0, 4)

  if (panels.length === 0) {
    return requestedViews.slice(0, Math.max(1, Math.min(4, datasets.length || 1))).map((viewType, index) => ({
      id: `panel-${index + 1}`,
      role: index === 0 ? 'primary' : 'support',
      viewType,
      datasetIds: [datasets[index]?.id ?? datasets[0]?.id ?? 'dataset-1'],
      title: datasets[index]?.label ?? datasets[0]?.label ?? (index === 0 ? 'Primary view' : 'Supporting view'),
      subtitle: undefined,
      chartType: defaultChartType(viewType),
      emphasis: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
      annotations: [],
      mediaId: undefined,
    }))
  }

  return panels.map((panel, index) => ({
    ...panel,
    role: index === 0 ? 'primary' : 'support',
  }))
}

function coerceAnnotations(
  rawAnnotations: unknown,
): StoryDocumentV3Draft['scene']['panels'][number]['annotations'] {
  return asArray(rawAnnotations)
    .map((candidate) => {
      const record = asRecord(candidate)
      const label = coerceText(record.label, 64, '')
      if (!label) return null

      return {
        label,
        detail: coerceOptionalText(record.detail, 140),
        targetLabel: coerceOptionalText(record.targetLabel, 120),
      }
    })
    .filter((annotation): annotation is NonNullable<typeof annotation> => Boolean(annotation))
    .slice(0, 4)
}

function coerceEntities(
  rawEntities: unknown,
): StoryDocumentV3Draft['normalized']['entities'] {
  return asArray(rawEntities)
    .map((candidate) => {
      const record = asRecord(candidate)
      const label = coerceText(record.label, 120, '')
      if (!label) return null

      const type = coerceText(record.type, 24, 'topic')
      return {
        type: (
          ['country', 'city', 'organization', 'person', 'product', 'metric', 'year', 'topic'] as const
        ).includes(type as StoryDocumentV3Draft['normalized']['entities'][number]['type'])
          ? type as StoryDocumentV3Draft['normalized']['entities'][number]['type']
          : 'topic',
        label,
        code: coerceOptionalText(record.code, 32),
      }
    })
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity))
    .slice(0, 16)
}

function coerceGeography(
  rawGeography: unknown,
): StoryDocumentV3Draft['normalized']['geography'] {
  const record = asRecord(rawGeography)
  const scope = coerceText(record.scope, 24, 'none')

  return {
    scope: (
      ['global', 'regional', 'national', 'local', 'none'] as const
    ).includes(scope as StoryDocumentV3Draft['normalized']['geography']['scope'])
      ? scope as StoryDocumentV3Draft['normalized']['geography']['scope']
      : 'none',
    primaryCodes: coerceStringArray(record.primaryCodes, 12, 16, []),
  }
}

function coerceTimeline(
  rawTimeline: unknown,
): StoryDocumentV3Draft['normalized']['timeline'] {
  const record = asRecord(rawTimeline)
  const start = coerceNumber(record.start)
  const end = coerceNumber(record.end)

  return {
    start: typeof start === 'number' && Number.isInteger(start) ? start : undefined,
    end: typeof end === 'number' && Number.isInteger(end) ? end : undefined,
    cadence: coerceOptionalText(record.cadence, 32),
  }
}

function coerceSources(sources: Source[]): Source[] {
  return sources.slice(0, 8).map((source) => ({
    name: coerceText(source.name, 120, 'Source'),
    url: source.url,
    accessedAt: source.accessedAt,
  }))
}

function coerceMedia(media: MediaItem[]): MediaItem[] {
  return media.slice(0, 3).map((item) => ({
    ...item,
    alt: coerceText(item.alt, 180, 'Context image'),
    caption: item.caption ? coerceText(item.caption, 220, item.caption) : undefined,
    relevance: coerceText(item.relevance, 220, 'Contextual media evidence.'),
    contextLabel: item.usage === 'context' ? coerceText(item.contextLabel, 40, 'Context') : item.contextLabel,
  }))
}

function coerceDatasetIds(
  rawDatasetIds: unknown,
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
): string[] {
  const validIds = new Set(datasets.map((dataset) => dataset.id))
  const resolved = coerceStringArray(rawDatasetIds, 4, 64, [])
    .map((value) => {
      const matched = value.match(/(\d+)/)
      const candidate = matched ? `dataset-${matched[1]}` : value
      return validIds.has(candidate) ? candidate : null
    })
    .filter((value): value is string => Boolean(value))

  return resolved.slice(0, 4)
}

function coerceDatasetId(
  rawDatasetId: unknown,
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
): string | undefined {
  return coerceDatasetIds([rawDatasetId], datasets)[0]
}

function coerceSourceIds(
  rawSourceIds: unknown,
  defaultSourceIds: string[],
): string[] {
  const resolved = coerceStringArray(rawSourceIds, 5, 64, defaultSourceIds)
  return resolved.length > 0 ? resolved : defaultSourceIds.slice(0, 1)
}

function coerceMetadata(rawMetadata: unknown): Record<string, string> {
  const record = asRecord(rawMetadata)
  const metadata: Record<string, string> = {}

  for (const [key, value] of Object.entries(record)) {
    const normalized = coerceOptionalText(value, 120)
    if (normalized) metadata[key] = normalized
  }

  return metadata
}

function coerceMetricRow(record: Record<string, unknown>): {
  label: string
  value: number | null
  unit: string | undefined
  metadata: Record<string, string>
} {
  const label = coerceText(
    record.label ?? record.name ?? record.city ?? record.country ?? record.market ?? record.entity ?? record.title,
    120,
    '',
  )
  const value = coerceNumber(
    record.value
    ?? record.median_multiple
    ?? record.amount
    ?? record.score
    ?? record.count
    ?? record.total
    ?? record.share
    ?? record.percentage
    ?? record.percent
    ?? record.users
    ?? record.population
    ?? record.income
    ?? record.ratio,
  )
  const explicitUnit = coerceOptionalText(record.unit, 24)
  const unit = explicitUnit
    ?? (record.median_multiple !== undefined || record.ratio !== undefined ? 'x' : undefined)

  return {
    label,
    value,
    unit,
    metadata: coerceMetricMetadata(record),
  }
}

function coerceMetricMetadata(record: Record<string, unknown>): Record<string, string> {
  const metadata: Record<string, string> = {}
  const reservedKeys = new Set([
    'label',
    'name',
    'city',
    'country',
    'market',
    'entity',
    'title',
    'value',
    'median_multiple',
    'amount',
    'score',
    'count',
    'total',
    'share',
    'percentage',
    'percent',
    'users',
    'population',
    'income',
    'ratio',
    'unit',
    'metadata',
  ])

  for (const [key, value] of Object.entries(record)) {
    if (reservedKeys.has(key)) continue
    const normalized = coerceOptionalText(value, 120)
    if (normalized) metadata[key] = normalized
  }

  const nestedMetadata = coerceMetadata(record.metadata)
  for (const [key, value] of Object.entries(nestedMetadata)) {
    metadata[key] = value
  }

  if (!metadata.country && typeof record.country === 'string') {
    metadata.country = coerceText(record.country, 120, record.country)
  }

  if (!metadata.city && typeof record.city === 'string') {
    metadata.city = coerceText(record.city, 120, record.city)
  }

  return metadata
}

function extractDatasetsFromEvidenceSupport(
  evidence: StoryEvidencePacket,
  requestedViews: StoryRequestedViewValue[],
): StoryDocumentV3Draft['normalized']['datasets'] {
  const extractedItems = aggregateRankedEvidenceItems(evidence)
  if (extractedItems.length < 3) return []

  const primaryView = requestedViews[0] ?? 'bar'

  return [
    {
      id: 'dataset-1',
      label: inferEvidenceDatasetLabel(evidence, primaryView),
      summary: 'Recovered from grounded ranking evidence in live search results.',
      viewHint: primaryView,
      items: extractedItems,
    },
  ]
}

function aggregateRankedEvidenceItems(
  evidence: StoryEvidencePacket,
): StoryDocumentV3Draft['normalized']['datasets'][number]['items'] {
  const byLabel = new Map<string, {
    label: string
    rank: number
    rankKind: 'explicit' | 'implicit'
    sourceNames: Set<string>
    value: number | null
    unit: string | undefined
    metric: 'score' | 'rank'
    valueSourceWeight: number
  }>()

  for (const support of evidence.support) {
    const explicitMatches = extractRankedItemsFromSupportText(`${support.title}; ${support.snippet}`)
    const extractedMatches = explicitMatches.length > 0
      ? explicitMatches
      : extractOrderedItemsFromSupportText(support.snippet)

    for (const match of extractedMatches) {
      const label = canonicalizeEvidenceLabel(match.label)
      if (!label) continue
      const sourceWeight = sourceAuthorityWeight(support.sourceName)
      const hasObservedValue = 'value' in match && match.value !== undefined
      const observedValue: number | null = hasObservedValue ? (match.value ?? null) : null
      const observedUnit = hasObservedValue ? match.unit : undefined

      const existing = byLabel.get(label.toLowerCase())
      if (!existing) {
        byLabel.set(label.toLowerCase(), {
          label,
          rank: match.rank,
          rankKind: match.rankKind,
          sourceNames: new Set([support.sourceName]),
          value: observedValue,
          unit: observedUnit,
          metric: hasObservedValue ? 'score' : 'rank',
          valueSourceWeight: hasObservedValue ? sourceWeight : -1,
        })
        continue
      }

      const incomingRankScore = match.rankKind === 'explicit' ? 2 : 1
      const existingRankScore = existing.rankKind === 'explicit' ? 2 : 1

      if (
        incomingRankScore > existingRankScore
        || (incomingRankScore === existingRankScore && match.rank < existing.rank)
      ) {
        existing.rank = match.rank
        existing.rankKind = match.rankKind
      }

      if (
        hasObservedValue
        && (
          existing.value === null
          || sourceWeight > existing.valueSourceWeight
          || (sourceWeight === existing.valueSourceWeight && match.rank < existing.rank)
        )
      ) {
        existing.value = observedValue
        existing.unit = observedUnit
        existing.metric = 'score'
        existing.valueSourceWeight = sourceWeight
      }

      existing.sourceNames.add(support.sourceName)
    }
  }

  const ranked = [...byLabel.values()]
    .filter((item) => item.metric === 'score' || item.sourceNames.size >= 2)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      if (a.metric !== b.metric) return a.metric === 'score' ? -1 : 1
      return b.sourceNames.size - a.sourceNames.size
    })
    .slice(0, 10)

  if (ranked.length < 3) return []

  return ranked.map((item) => ({
    label: item.label,
    value: item.value ?? item.rank,
    unit: item.metric === 'score' ? item.unit : undefined,
    metadata: {
      rank: String(item.rank),
      source: [...item.sourceNames].join(', '),
      sourceCount: String(item.sourceNames.size),
      metric: item.metric,
    },
  }))
}

function extractRankedItemsFromSupportText(
  text: string,
): Array<{ label: string; rank: number; rankKind: 'explicit'; value?: number; unit?: string }> {
  const segments = text
    .split(/[;\n•·|]/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const matches: Array<{ label: string; rank: number; rankKind: 'explicit'; value?: number; unit?: string }> = []

  for (const segment of segments) {
    const scoredMatch = segment.match(/^(?:#\s*)?(\d{1,2})[\)\].:\-\s]+(.+?)(?:,\s*|\s+)([$€£]?\d[\d,.\s]{0,10}(?:[KMB%])?)$/i)
    if (scoredMatch) {
      const rank = Number(scoredMatch[1])
      if (!Number.isFinite(rank) || rank < 1 || rank > 20) continue

      const label = normalizeEvidenceLabel(scoredMatch[2])
      const parsedValue = parseSupportNumericValue(scoredMatch[3])
      if (!label || !parsedValue) continue

      matches.push({
        label,
        rank,
        rankKind: 'explicit',
        value: parsedValue.value,
        unit: parsedValue.unit,
      })
      continue
    }

    const rankedMatch = segment.match(/^(?:#\s*)?(\d{1,2})[\)\].:\-\s]+(.+)$/)
    if (!rankedMatch) continue

    const rank = Number(rankedMatch[1])
    if (!Number.isFinite(rank) || rank < 1 || rank > 20) continue

    const label = normalizeEvidenceLabel(rankedMatch[2])
    if (!label) continue

    matches.push({ label, rank, rankKind: 'explicit' })
  }

  return matches
}

function extractOrderedItemsFromSupportText(
  text: string,
): Array<{ label: string; rank: number; rankKind: 'implicit' }> {
  const segments = text
    .split(/[;\n•·|]/)
    .map((segment) => normalizeEvidenceLabel(segment))
    .filter(Boolean)

  const filtered = segments.filter((segment) =>
    segment.length >= 2
    && segment.length <= 80
    && !/[.!?]$/.test(segment)
    && !/^(latest|statistics|ranking|popular databases?|report|source)$/i.test(segment),
  )

  if (filtered.length < 3) return []

  return filtered.slice(0, 10).map((label, index) => ({
    label,
    rank: index + 1,
    rankKind: 'implicit',
  }))
}

function normalizeEvidenceLabel(value: string): string {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/\s[-–:|].*$/, '')
    .replace(/,\s.*$/, '')
    .replace(/^\d{1,2}[\)\].:\-\s]+/, '')
    .replace(/^(?:rank(?:ed)?\s*)?(?:#\s*)?\d{1,2}\s+/i, '')
    .replace(/^[•*-]\s*/, '')
    .trim()

  if (!cleaned) return ''
  if (cleaned.length > 120) return cleaned.slice(0, 120).trim()
  return cleaned
}

function canonicalizeEvidenceLabel(label: string): string | null {
  const normalized = normalizeEvidenceLabel(label)
    .replace(/\.\.\.+$/g, '')
    .trim()

  if (!isUsableEvidenceLabel(normalized)) return null

  if (/^sql server$/i.test(normalized)) return 'Microsoft SQL Server'
  if (/^microsoft$/i.test(normalized)) return 'Microsoft SQL Server'
  if (/^microsoft sql$/i.test(normalized)) return 'Microsoft SQL Server'
  if (/^oracle ai database$/i.test(normalized)) return 'Oracle'
  if (/^oracle mysql heatwave$/i.test(normalized)) return 'MySQL'
  if (/^mongo db$/i.test(normalized)) return 'MongoDB'

  return normalized
}

function isUsableEvidenceLabel(label: string): boolean {
  const normalized = label.trim()
  const lower = normalized.toLowerCase()
  const wordCount = normalized.split(/\s+/).length

  if (!normalized) return false
  if (wordCount > 4) return false
  if (normalized.includes('...')) return false
  if (
    lower.startsWith('by ')
    || lower.startsWith('# ')
    || lower === 'filter by'
    || lower.includes('ratings')
    || lower.startsWith('the most popular')
    || lower.startsWith('top 10 most popular')
    || lower.includes('cloud-native')
    || lower.includes('adoption')
    || lower.includes('developers in ')
    || lower.includes('read more')
    || /^\(.+\)$/.test(normalized)
  ) {
    return false
  }

  return /[a-z]/i.test(normalized)
}

function parseSupportNumericValue(
  rawValue: string,
): { value: number; unit?: string } | null {
  const normalized = rawValue.replace(/\s+/g, '').trim()
  const suffix = normalized.slice(-1).toUpperCase()
  const hasSuffix = ['K', 'M', 'B', '%'].includes(suffix)
  const numericPart = hasSuffix ? normalized.slice(0, -1) : normalized
  const parsed = Number(numericPart.replace(/,/g, ''))

  if (!Number.isFinite(parsed)) return null

  if (suffix === 'K') return { value: parsed * 1_000 }
  if (suffix === 'M') return { value: parsed * 1_000_000 }
  if (suffix === 'B') return { value: parsed * 1_000_000_000 }
  if (suffix === '%') return { value: parsed, unit: '%' }

  return { value: parsed }
}

function sourceAuthorityWeight(sourceName: string): number {
  const normalized = sourceName.toLowerCase()
  if (normalized.includes('db-engines.com')) return 5
  if (normalized.includes('statista.com') || normalized.includes('gartner.com')) return 4
  if (normalized.includes('red-gate.com')) return 3
  if (normalized.includes('kingswaysoft.com') || normalized.includes('bairesdev.com')) return 2
  return 1
}

function inferEvidenceDatasetLabel(
  evidence: StoryEvidencePacket,
  primaryView: StoryRequestedViewValue,
): string {
  const firstTitle = evidence.support[0]?.title?.trim()
  if (firstTitle) {
    return coerceText(firstTitle, 120, 'Grounded ranking')
  }

  if (primaryView === 'bar' || primaryView === 'list' || primaryView === 'compare') {
    return 'Grounded ranking'
  }

  return 'Recovered evidence dataset'
}

function shouldReplaceWeakDatasets(
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
  requestedViews: StoryRequestedViewValue[],
  evidenceDatasets: StoryDocumentV3Draft['normalized']['datasets'],
): boolean {
  if (evidenceDatasets.length === 0) return false

  const combinedText = datasets
    .flatMap((dataset) => [
      dataset.label,
      dataset.summary ?? '',
      ...dataset.items.map((item) => item.label),
    ])
    .join('\n')
    .toLowerCase()

  if (
    combinedText.includes('awaiting grounded result')
    || combinedText.includes('grounded summary generated from the evidence packet')
  ) {
    return true
  }

  const requiresMultipleItems = requestedViews.some((view) =>
    ['bar', 'list', 'compare', 'hierarchy', 'relation'].includes(view),
  )

  const totalItems = datasets.reduce((sum, dataset) => sum + dataset.items.length, 0)
  if (requiresMultipleItems && totalItems < 3) return true

  const noisyItemCount = datasets
    .flatMap((dataset) => dataset.items)
    .filter((item) => canonicalizeEvidenceLabel(item.label) === null)
    .length

  return requiresMultipleItems && noisyItemCount >= 2
}

function defaultSceneFamily(
  requestedViews: StoryRequestedViewValue[],
): StorySceneFamilyValue {
  if (requestedViews.includes('map')) return 'map-briefing'
  if (requestedViews.includes('timeline') || requestedViews.includes('line') || requestedViews.includes('area')) {
    return 'timeline-briefing'
  }
  if (requestedViews.includes('media')) return 'evidence-board'
  if (requestedViews.some((view) => ['bar', 'list', 'compare'].includes(view))) return 'ranked-comparison'
  return 'single-focus'
}

function defaultSceneLayout(
  requestedViews: StoryRequestedViewValue[],
): StoryPanelLayoutValue {
  if (requestedViews.length <= 1) return 'single'
  if (requestedViews.includes('map')) return 'primary-plus-rail'
  if (requestedViews.length >= 3) return 'stacked'
  if (requestedViews.includes('timeline')) return 'split-vertical'
  return 'split-horizontal'
}

function defaultChartType(
  viewType: StoryPanelViewTypeValue,
): ChartTypeValue {
  switch (viewType) {
    case 'map':
      return 'map-chart'
    case 'line':
      return 'line-chart'
    case 'area':
      return 'area-chart'
    case 'timeline':
      return 'timeline'
    case 'compare':
      return 'vs-split'
    case 'stat':
      return 'stat-card'
    default:
      return 'bar-chart'
  }
}

function coerceChartType(
  value: unknown,
  fallback: ChartTypeValue,
): ChartTypeValue {
  const normalized = coerceText(value, 32, fallback)
  return CHART_TYPES.includes(normalized as ChartTypeValue)
    ? normalized as ChartTypeValue
    : fallback
}

function coerceRequestedViews(
  value: unknown,
  fallback: StoryRequestedViewValue[],
): StoryRequestedViewValue[] {
  const resolved = coerceStringArray(value, 4, 24, fallback)
    .filter((candidate): candidate is StoryRequestedViewValue => STORY_PANEL_VIEW_TYPES.includes(candidate as StoryRequestedViewValue))

  return resolved.length > 0 ? resolved : fallback
}

function coerceStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
  fallback: string[],
): string[] {
  const values = asArray(value)
    .map((item) => coerceOptionalText(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems)

  return values.length > 0 ? values : fallback.slice(0, maxItems)
}

function coerceEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = coerceText(value, 64, fallback)
  return allowed.includes(normalized as T) ? normalized as T : fallback
}

function coerceText(
  value: unknown,
  maxLength: number,
  fallback: string,
): string {
  const normalized = normalizeText(value)
  if (!normalized) return fallback
  if (normalized.length <= maxLength) return normalized

  const shortened = normalized.slice(0, maxLength)
  const boundary = shortened.lastIndexOf(' ')
  return (boundary > Math.floor(maxLength * 0.6) ? shortened.slice(0, boundary) : shortened).trim()
}

function compactTopic(topic: string): string {
  return topic
    .replace(/^top\s+\d{1,2}\s+/i, '')
    .replace(/\bthe\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48)
}

function coerceOptionalText(
  value: unknown,
  maxLength: number,
): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized) return undefined
  if (normalized.length <= maxLength) return normalized

  const shortened = normalized.slice(0, maxLength)
  const boundary = shortened.lastIndexOf(' ')
  return (boundary > Math.floor(maxLength * 0.6) ? shortened.slice(0, boundary) : shortened).trim()
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').replace(/[“”]/g, '"').trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const normalized = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  if (!normalized) return null

  const parsed = Number(normalized[0])
  return Number.isFinite(parsed) ? parsed : null
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function extractMetricArrays(value: unknown): Array<{ items: unknown[]; label?: string }> {
  if (!Array.isArray(value)) return []

  const directItems = value.every((item) => {
    const record = asRecord(item)
    return typeof record.label === 'string' && record.value !== undefined
  })

  if (directItems) {
    return [{ items: value }]
  }

  return value
    .map((item) => {
      const record = asRecord(item)
      const items = asArray(record.items)
      return items.length > 0 ? { items, label: coerceOptionalText(record.label, 120) } : null
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}

function formatValue(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
