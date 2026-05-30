import { getPayload } from 'payload'
import config from '@payload-config'
import type { AIConfig } from '@/lib/ai/config'
import type { GenerationBrief, RequestedView } from '@/lib/ai/brief'
import { planInfographic, type DiversityPlan } from '@/lib/ai/planner'
import type { InfographicDNA } from '@/lib/dna/schema'
import type {
  AntVPresentationPanel,
  AntVPresentationPanelLayoutValue,
  AntVTemplateCategoryValue,
  AntVTemplatePlan,
  InfographicDocumentV2,
} from './schema'
import { documentV2ToDNA } from './compat'
import { chartTypeToPanelView } from './panels'

interface RecentTemplateUsage {
  templateCategory: AntVTemplateCategoryValue
  templateName: string
}

const CATEGORY_ORDER: Record<AntVTemplateCategoryValue, string[]> = {
  chart: ['chart-bar-plain-text', 'chart-line-plain-text', 'chart-pie-donut-plain-text'],
  compare: ['compare-binary-horizontal-simple-fold', 'compare-swot', 'compare-quadrant-quarter-simple-card'],
  sequence: ['sequence-timeline-rounded-rect-node', 'sequence-ascending-steps'],
  list: ['list-grid-badge-card', 'list-row-horizontal-icon-arrow'],
  hierarchy: ['hierarchy-tree-curved-line-rounded-rect-node'],
  relation: ['relation-dagre-flow-tb-simple-circle-node'],
}

export interface AntVGenerationPlan extends AntVTemplatePlan {
  brief: GenerationBrief
  dnaPlan: DiversityPlan
  panelLayout: AntVPresentationPanelLayoutValue
  panels: AntVPresentationPanel[]
}

export async function planAntVInfographic(
  prompt: string,
  aiConfig: AIConfig,
  brief: GenerationBrief,
  parentDocument?: InfographicDocumentV2,
): Promise<AntVGenerationPlan> {
  const parentDNA = parentDocument ? documentV2ToDNA(parentDocument) : undefined
  const dnaPlan = await planInfographic(prompt, aiConfig, parentDNA)
  const recentUsage = await getRecentTemplateUsage()

  const preferredCategory = chooseTemplateCategory(prompt, dnaPlan, parentDocument, brief)
  const templateCategory = aiConfig.allowedAntVTemplateCategories.includes(preferredCategory)
    ? preferredCategory
    : aiConfig.allowedAntVTemplateCategories[0] ?? 'chart'
  const templateNameCandidates = CATEGORY_ORDER[templateCategory]
  const templateName = pickLeastUsedTemplate(templateNameCandidates, recentUsage)
  const storyMode = chooseStoryMode(templateCategory, dnaPlan)
  const themeName = pickTheme(aiConfig.allowedAntVThemes, dnaPlan)
  const panelLayout = choosePanelLayout(brief)
  const panels = buildPanels(brief, dnaPlan, parentDocument)

  return {
    brief,
    dnaPlan,
    templateCategory,
    templateName,
    storyMode,
    chartType: panels[0]?.chartType ?? dnaPlan.chartType,
    themeName,
    visualDensity: dnaPlan.visualDensity,
    layoutFamily: dnaPlan.layoutFamily,
    panelLayout,
    panels,
    recentUsageSummary: summarizeRecentUsage(recentUsage),
  }
}

function chooseTemplateCategory(
  prompt: string,
  dnaPlan: DiversityPlan,
  parentDocument?: InfographicDocumentV2,
  brief?: GenerationBrief,
): AntVTemplateCategoryValue {
  const lower = prompt.toLowerCase()

  if (parentDocument?.presentation.templateCategory) {
    return parentDocument.presentation.templateCategory
  }

  if (brief?.intent === 'multi-view') {
    if (brief.requestedViews.includes('timeline')) return 'sequence'
    if (brief.requestedViews.includes('compare')) return 'compare'
    if (brief.requestedViews.includes('relation')) return 'relation'
    if (brief.requestedViews.includes('hierarchy')) return 'hierarchy'
    return 'chart'
  }

  if (includesAny(lower, ['process', 'timeline', 'history', 'roadmap', 'stages', 'steps', 'journey'])) {
    return 'sequence'
  }

  if (includesAny(lower, ['network', 'flow', 'ecosystem', 'dependency', 'relationship', 'relations'])) {
    return 'relation'
  }

  if (includesAny(lower, ['hierarchy', 'organization', 'org chart', 'tree', 'taxonomy'])) {
    return 'hierarchy'
  }

  if (includesAny(lower, ['vs', 'versus', 'compare', 'comparison', 'battle', 'against'])) {
    return 'compare'
  }

  if (dnaPlan.chartType === 'timeline') {
    return 'sequence'
  }

  if (includesAny(lower, ['top ', 'ranking', 'leaders', 'dominating', 'largest', 'biggest'])) {
    return 'chart'
  }

  if (includesAny(lower, ['list', 'ways', 'reasons', 'facts', 'takeaways'])) {
    return 'list'
  }

  return 'chart'
}

function chooseStoryMode(
  category: AntVTemplateCategoryValue,
  dnaPlan: DiversityPlan,
): AntVTemplatePlan['storyMode'] {
  if (category === 'sequence') return 'process-flow'
  if (category === 'compare') return 'comparison-brief'
  if (category === 'relation') return 'network-map'
  if (category === 'hierarchy') return 'hierarchy-brief'
  if (dnaPlan.layoutFamily === 'editorial-cover') return 'editorial-brief'
  return 'data-story'
}

function choosePanelLayout(
  brief: GenerationBrief,
): AntVPresentationPanelLayoutValue {
  if (brief.intent === 'single-view') return 'single'
  if (brief.requestedViews.includes('map')) return 'primary-plus-rail'
  if (brief.requestedViews.includes('timeline') && brief.requestedViews.length === 2) {
    return 'split-vertical'
  }
  if (brief.requestedViews.length >= 3) return 'stacked'
  return 'split-horizontal'
}

function buildPanels(
  brief: GenerationBrief,
  dnaPlan: DiversityPlan,
  parentDocument?: InfographicDocumentV2,
): AntVPresentationPanel[] {
  if (parentDocument?.presentation.panels?.length) {
    return parentDocument.presentation.panels
  }

  const requestedViews = brief.requestedViews.length > 0
    ? brief.requestedViews
    : [chartTypeToPanelView(dnaPlan.chartType)]

  return requestedViews.slice(0, 4).map((viewType, index) => ({
    id: `panel-${index + 1}`,
    role: index === 0 ? 'primary' : 'support',
    viewType,
    sourceGroupId: buildSourceGroupId(viewType, index),
    title: buildPanelTitle(viewType, index),
    chartType: viewToChartType(viewType, dnaPlan.chartType),
    emphasis: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
  }))
}

function buildSourceGroupId(viewType: RequestedView, index: number): string {
  return `group-${viewType}-${index + 1}`
}

function buildPanelTitle(viewType: RequestedView, index: number): string {
  if (index === 0) {
    switch (viewType) {
      case 'map':
        return 'Geographic view'
      case 'timeline':
        return 'Timeline view'
      case 'line':
      case 'area':
        return 'Trend view'
      case 'compare':
        return 'Comparison view'
      case 'stat':
        return 'Headline stat'
      default:
        return 'Primary view'
    }
  }

  switch (viewType) {
    case 'bar':
      return 'Ranking view'
    case 'line':
    case 'area':
      return 'Growth view'
    case 'timeline':
      return 'Timeline view'
    case 'map':
      return 'Regional view'
    case 'compare':
      return 'Compare view'
    case 'list':
      return 'List view'
    default:
      return 'Supporting view'
  }
}

function viewToChartType(viewType: RequestedView, fallbackChartType: DiversityPlan['chartType']): DiversityPlan['chartType'] {
  switch (viewType) {
    case 'map':
      return 'map-chart'
    case 'bar':
    case 'list':
      return 'bar-chart'
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
    case 'hierarchy':
    case 'relation':
    case 'media':
    default:
      return fallbackChartType === 'stat-card' ? 'bar-chart' : fallbackChartType
  }
}

function pickTheme(
  allowedThemes: AIConfig['allowedAntVThemes'],
  dnaPlan: DiversityPlan,
): AntVTemplatePlan['themeName'] {
  const preferredTheme =
    dnaPlan.visualDensity === 'dense'
      ? 'glass-dark'
      : dnaPlan.heroBlock === 'stat-card'
        ? 'minimalist'
        : dnaPlan.layoutFamily === 'evidence-board'
          ? 'editorial'
          : dnaPlan.layoutFamily === 'briefing-sheet'
            ? 'ocean-depth'
            : 'glass-dark'

  if (allowedThemes.length > 0 && allowedThemes.includes(preferredTheme)) {
    return preferredTheme
  }

  return allowedThemes[0] ?? 'glass-dark'
}

async function getRecentTemplateUsage(): Promise<RecentTemplateUsage[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      depth: 0,
      limit: 12,
      sort: '-createdAt',
      overrideAccess: true,
    })

    return result.docs.flatMap((doc) => {
      if (doc.renderEngine !== 'antv') return []
      const document = doc.documentV2 as InfographicDocumentV2 | undefined
      if (!document) return []

      return [{
        templateCategory: document.presentation.templateCategory,
        templateName: document.presentation.templateFamily,
      }]
    })
  } catch {
    return []
  }
}

function summarizeRecentUsage(items: RecentTemplateUsage[]): string {
  if (items.length === 0) return 'No recent AntV template history was available.'

  const counts = new Map<string, number>()
  for (const item of items) {
    const key = `${item.templateCategory} + ${item.templateName}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, count]) => `${key} (${count})`)
    .join(', ')
}

function pickLeastUsedTemplate(
  candidates: string[],
  recentUsage: RecentTemplateUsage[],
): string {
  const counts = new Map<string, number>()
  for (const item of recentUsage) {
    counts.set(item.templateName, (counts.get(item.templateName) ?? 0) + 1)
  }

  return [...candidates].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0] ?? candidates[0] ?? 'chart-bar-plain-text'
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value))
}
