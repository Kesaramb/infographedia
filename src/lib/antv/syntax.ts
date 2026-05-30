import type { ThemeNameValue } from '@/lib/dna/schema'
import type {
  AntVContentGroup,
  AntVContentNode,
  AntVRenderMeta,
  AntVTemplatePlan,
  AntVTemplateCategoryValue,
  InfographicDocumentV2,
  InfographicDocumentV2Draft,
} from './schema'
import { alignDocumentToPlannedPanels, ensureAntVDocumentPanels, projectDocumentToPrimaryScene } from './panels'
import { themeNameToColors } from './theme'

const DEFAULT_RENDER_WIDTH = 800
const DEFAULT_RENDER_HEIGHT = 1280

export function finalizeAntVDocument(
  draft: InfographicDocumentV2Draft,
  plan: {
    templateCategory: AntVTemplateCategoryValue
    templateName: string
    themeName: ThemeNameValue
    panelLayout?: AntVTemplatePlan['panelLayout']
    panels?: AntVTemplatePlan['panels']
  },
): InfographicDocumentV2 {
  const templateName = draft.antv.templateName || plan.templateName
  const themeName = draft.antv.themeName || plan.themeName
  const alignedDraft = alignDocumentToPlannedPanels({
    content: draft.content,
    presentation: {
      ...draft.presentation,
      panelLayout: plan.panelLayout ?? draft.presentation.panelLayout ?? 'single',
      panels: plan.panels ?? draft.presentation.panels,
    },
  }, plan.panels ?? draft.presentation.panels, plan.panelLayout)
  const normalizedDraft = ensureAntVDocumentPanels(alignedDraft)
  const renderMeta = getRenderMeta(
    draft.presentation.visualDensity,
    plan.templateCategory,
    normalizedDraft.presentation.panelLayout,
    normalizedDraft.presentation.panels.length,
  )
  const sceneDocument = {
    ...draft,
    content: normalizedDraft.content,
    presentation: {
      ...normalizedDraft.presentation,
      templateCategory: plan.templateCategory,
      templateFamily: templateName,
      themeName,
    },
  }
  const syntax = buildAntVSyntax(
    projectDocumentToPrimaryScene({
      content: sceneDocument.content,
      presentation: sceneDocument.presentation,
    }),
    renderMeta,
  )

  return {
    content: normalizedDraft.content,
    presentation: {
      ...normalizedDraft.presentation,
      templateCategory: plan.templateCategory,
      templateFamily: templateName,
      themeName,
    },
    antv: {
      syntax,
      templateName,
      themeName,
      renderMeta,
    },
  }
}

export function buildAntVSyntax(
  document: Pick<InfographicDocumentV2, 'content' | 'presentation'>,
  _renderMeta?: AntVRenderMeta,
): string {
  const projected = projectDocumentToPrimaryScene(document)
  const templateName = projected.presentation.templateFamily
  const colors = themeNameToColors(projected.presentation.themeName)
  const lines: string[] = [
    `infographic ${templateName}`,
    'theme',
    `  colorPrimary ${colors.primary}`,
    `  colorBg ${colors.background}`,
    '  palette',
    `    - ${colors.primary}`,
    `    - ${colors.accent ?? colors.secondary ?? colors.primary}`,
    `    - ${colors.secondary ?? colors.primary}`,
    'data',
    `  title ${sanitizeLine(projected.content.title)}`,
  ]

  const description = [
    projected.content.subtitle,
    projected.content.hook,
    projected.content.caveats[0],
  ].filter(Boolean).join(' ')

  if (description) {
    lines.push(`  desc ${sanitizeLine(description)}`)
  }

  switch (projected.presentation.templateCategory) {
    case 'sequence':
      appendSequenceBlock(lines, projected.content.dataGroups[0]?.items ?? [])
      break
    case 'compare':
      appendCompareBlock(lines, projected.content.dataGroups)
      break
    case 'hierarchy':
      appendHierarchyBlock(lines, projected.content.dataGroups[0]?.items[0])
      break
    case 'relation':
      appendRelationBlock(lines, projected.content.dataGroups[0]?.items ?? [])
      break
    case 'list':
      appendListBlock(lines, projected.content.dataGroups[0]?.items ?? [])
      break
    case 'chart':
    default:
      appendChartBlock(lines, projected.content.dataGroups[0]?.items ?? [], projected.presentation.templateFamily)
      break
  }

  return `${lines.join('\n')}\n`
}

function appendChartBlock(lines: string[], items: AntVContentNode[], templateName: string) {
  if (templateName.includes('pie')) {
    lines.push('  values')
    items.forEach((item) => {
      lines.push('    -')
      lines.push(`      label ${sanitizeLine(item.label)}`)
      lines.push(`      value ${String(item.value ?? 0)}`)
      if (item.description || item.unit) {
        lines.push(`      desc ${sanitizeLine(buildItemDescriptor(item))}`)
      }
    })
    return
  }

  lines.push('  values')
  items.forEach((item) => {
    lines.push('    - label ' + sanitizeLine(item.label))
    lines.push(`      value ${String(item.value ?? 0)}`)
    if (item.description || item.unit) {
      lines.push(`      desc ${sanitizeLine(buildItemDescriptor(item))}`)
    }
  })
}

function appendListBlock(lines: string[], items: AntVContentNode[]) {
  lines.push('  lists')
  items.forEach((item) => {
    lines.push('    - label ' + sanitizeLine(item.label))
    if (item.description || item.value != null) {
      lines.push(`      desc ${sanitizeLine(buildItemDescriptor(item))}`)
    }
  })
}

function appendSequenceBlock(lines: string[], items: AntVContentNode[]) {
  lines.push('  sequences')
  items.forEach((item) => {
    lines.push('    -')
    if (item.time) {
      lines.push(`      time ${sanitizeLine(item.time)}`)
    }
    lines.push(`      label ${sanitizeLine(item.label)}`)
    if (item.description || item.value != null) {
      lines.push(`      desc ${sanitizeLine(buildItemDescriptor(item))}`)
    }
  })
}

function appendCompareBlock(lines: string[], groups: AntVContentGroup[]) {
  lines.push('  compares')
  groups.slice(0, 4).forEach((group) => {
    lines.push(`    - label ${sanitizeLine(group.label)}`)
    lines.push('      children')
    group.items.forEach((item) => {
      lines.push(`        - label ${sanitizeLine(item.label)}`)
      if (item.description || item.value != null) {
        lines.push(`          desc ${sanitizeLine(buildItemDescriptor(item))}`)
      }
    })
  })
}

function appendHierarchyBlock(lines: string[], root?: AntVContentNode) {
  const safeRoot = root ?? { label: 'Root' }
  lines.push('  root')
  appendHierarchyNode(lines, safeRoot, 2)
}

function appendHierarchyNode(lines: string[], node: AntVContentNode, depth: number) {
  const indent = '  '.repeat(depth)
  lines.push(`${indent}label ${sanitizeLine(node.label)}`)
  if (node.children?.length) {
    lines.push(`${indent}children`)
    node.children.forEach((child) => {
      lines.push(`${indent}  -`)
      appendHierarchyNode(lines, child, depth + 2)
    })
  }
}

function appendRelationBlock(lines: string[], items: AntVContentNode[]) {
  const nodes = flattenRelationNodes(items)
  lines.push('  nodes')
  nodes.forEach((node) => {
    lines.push(`    - id ${sanitizeLine(node.id ?? slugify(node.label))}`)
    lines.push(`      label ${sanitizeLine(node.label)}`)
    if (node.description) {
      lines.push(`      desc ${sanitizeLine(node.description)}`)
    }
  })

  const relations = buildRelations(items)
  if (relations.length > 0) {
    lines.push('  relations')
    relations.forEach((relation) => {
      lines.push(`    ${relation}`)
    })
  }
}

function flattenRelationNodes(items: AntVContentNode[]): AntVContentNode[] {
  const nodes: AntVContentNode[] = []

  const visit = (node: AntVContentNode) => {
    nodes.push(node)
    node.children?.forEach(visit)
  }

  items.forEach(visit)
  return nodes
}

function buildRelations(items: AntVContentNode[]): string[] {
  const relations: string[] = []

  const visit = (node: AntVContentNode) => {
    node.children?.forEach((child) => {
      relations.push(`${sanitizeLine(node.id ?? slugify(node.label))} - relates to -> ${sanitizeLine(child.id ?? slugify(child.label))}`)
      visit(child)
    })
  }

  items.forEach(visit)
  return relations
}

function buildItemDescriptor(item: AntVContentNode): string {
  const numberText = item.value != null
    ? `${item.value}${item.unit ?? ''}`
    : null

  return [numberText, item.description].filter(Boolean).join(' — ')
}

function getRenderMeta(
  density: InfographicDocumentV2Draft['presentation']['visualDensity'],
  category: AntVTemplateCategoryValue,
  panelLayout: InfographicDocumentV2Draft['presentation']['panelLayout'],
  panelCount: number,
): AntVRenderMeta {
  const extraHeight =
    density === 'dense'
      ? 220
      : density === 'minimal'
        ? -80
        : 0

  const categoryHeight =
    category === 'sequence'
      ? 120
      : category === 'relation' || category === 'hierarchy'
        ? 180
        : 0

  const panelHeight =
    panelLayout === 'primary-plus-rail'
      ? 220
      : panelLayout === 'stacked'
        ? 280
        : panelLayout === 'split-horizontal'
          ? 160
          : 0

  const extraPanels = Math.max(0, panelCount - 1) * 70

  const width = DEFAULT_RENDER_WIDTH
  const height = DEFAULT_RENDER_HEIGHT + extraHeight + categoryHeight + panelHeight + extraPanels

  return {
    width,
    height,
    aspectRatio: width / height,
  }
}

function sanitizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim()
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'node'
}
