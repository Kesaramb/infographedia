import type {
  StoryDocumentV3Draft,
  StoryPanelLayoutValue,
  StoryRequestedViewValue,
  StorySceneFamilyValue,
} from './schema'
import type { StoryIntakePlan } from './intake'

export function planStoryScene(
  intake: StoryIntakePlan,
  draft: Pick<StoryDocumentV3Draft, 'normalized' | 'scene'>,
): StoryDocumentV3Draft['scene'] {
  const family = chooseSceneFamily(intake)
  const layout = chooseSceneLayout(intake)
  const datasets = draft.normalized.datasets

  return {
    ...draft.scene,
    family,
    layout,
    panels: draft.scene.panels.length > 0
      ? draft.scene.panels.map((panel, index) => ({
          ...panel,
          role: index === 0 ? 'primary' : 'support',
          datasetIds: panel.datasetIds.length > 0 ? panel.datasetIds : [datasets[index]?.id ?? datasets[0]?.id ?? 'dataset-1'],
          title: panel.title || datasets[index]?.label || (index === 0 ? 'Primary view' : 'Supporting view'),
          emphasis: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
        }))
      : buildDefaultPanels(intake, datasets),
  }
}

function buildDefaultPanels(
  intake: StoryIntakePlan,
  datasets: StoryDocumentV3Draft['normalized']['datasets'],
): StoryDocumentV3Draft['scene']['panels'] {
  const requestedViews: StoryRequestedViewValue[] = intake.requestedViews.length > 0
    ? intake.requestedViews
    : ['bar']

  return requestedViews.slice(0, Math.max(1, Math.min(4, datasets.length || 1))).map((viewType, index) => ({
    id: `panel-${index + 1}`,
    role: index === 0 ? 'primary' : 'support',
    viewType,
    datasetIds: [datasets[index]?.id ?? datasets[0]?.id ?? `dataset-${index + 1}`],
    title: datasets[index]?.label ?? (index === 0 ? 'Primary view' : 'Supporting view'),
    chartType: mapViewToChartType(viewType),
    emphasis: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
    annotations: [],
  }))
}

function chooseSceneFamily(intake: StoryIntakePlan): StorySceneFamilyValue {
  if (intake.requestedViews.includes('map')) return 'map-briefing'
  if (intake.requestedViews.includes('timeline') || intake.requestedViews.includes('line') || intake.requestedViews.includes('area')) {
    return 'timeline-briefing'
  }
  if (intake.requestedViews.includes('media')) return 'evidence-board'
  if (intake.requestedViews.some((view) => ['bar', 'list', 'compare'].includes(view))) return 'ranked-comparison'
  return 'single-focus'
}

function chooseSceneLayout(intake: StoryIntakePlan): StoryPanelLayoutValue {
  if (intake.requestedViews.length <= 1) return 'single'
  if (intake.requestedViews.includes('map')) return 'primary-plus-rail'
  if (intake.requestedViews.length >= 3) return 'stacked'
  if (intake.requestedViews.includes('timeline')) return 'split-vertical'
  return 'split-horizontal'
}

function mapViewToChartType(
  viewType: StoryDocumentV3Draft['scene']['panels'][number]['viewType'],
): StoryDocumentV3Draft['scene']['panels'][number]['chartType'] {
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
    case 'bar':
    case 'list':
    case 'hierarchy':
    case 'relation':
    case 'media':
    default:
      return 'bar-chart'
  }
}
