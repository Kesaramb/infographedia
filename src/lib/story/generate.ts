import type Anthropic from '@anthropic-ai/sdk'
import { createAnthropicMessageWithRetry, getAnthropicClient, isRetryableAnthropicError } from '@/lib/ai/client'
import { getAIConfig } from '@/lib/ai/config'
import { buildCorrectionPrompt, extractJSON, parseSchemaResponse } from '@/lib/ai/parse'
import { SUCCES_MODE_PROMPT } from '@/lib/ai/prompts'
import { storeGenerationKnowledge } from '@/lib/knowledge/store'
import type { InfographicDNA } from '@/lib/dna/schema'
import type { KnowledgeSearchResult } from '@/lib/knowledge/types'
import { critiqueStoryDocument } from './critic'
import { buildStoryBrief } from './brief-builder'
import { mineDeterministicInsights } from './insights'
import { buildStoryIntakePlan, type StoryIntakePlan } from './intake'
import { normalizeStoryDraft } from './normalize'
import { retrieveStoryEvidence, type StoryEvidencePacket } from './research'
import { renderStoryDocumentToSVG } from './render'
import { storyDocumentToDNA } from './compat'
import { planStoryScene } from './scene'
import { coerceStoryDocumentDraft } from './coerce'
import {
  STORY_DOCUMENT_VERSION,
  STORY_SCENE_FAMILIES,
  StoryDocumentDraftSchema,
  StoryDocumentSchema,
  type StoryDocumentV3,
  type StoryDocumentV3Draft,
} from './schema'

type TextBlock = Extract<Anthropic.Messages.ContentBlock, { type: 'text' }>

export interface GenerateStoryResult {
  success: true
  storyDocument: StoryDocumentV3
  dna: InfographicDNA
  previewSvg: string
  searchQueries: string[]
}

export interface GenerateStoryError {
  success: false
  error: string
  stage: 'api' | 'parse' | 'validation' | 'grounding'
}

export type GenerateStoryResponse = GenerateStoryResult | GenerateStoryError

export async function generateStoryInfographic(input: {
  prompt: string
  parentDNA?: InfographicDNA
  parentStoryDocument?: StoryDocumentV3
}): Promise<GenerateStoryResponse> {
  const aiConfig = await getAIConfig()
  if (!aiConfig.enableStoryPipelineV3) {
    return {
      success: false,
      error: 'Generation failed, please retry.',
      stage: 'api',
    }
  }
  const intake = buildStoryIntakePlan(input)
  const styleOnlyRequest = isStyleOnlyStoryRequest(input.prompt, input.parentDNA, input.parentStoryDocument)

  if (!styleOnlyRequest && !aiConfig.enableKnowledgeBase && !aiConfig.enableWebSearch) {
    return {
      success: false,
      error: 'Grounding unavailable. Verified search is required for new infographic facts.',
      stage: 'grounding',
    }
  }

  const evidence = styleOnlyRequest
    ? buildParentEvidence(input.parentDNA, input.parentStoryDocument, intake)
    : await retrieveStoryEvidence(intake, aiConfig, {
        preferredSceneFamily: inferPreferredSceneFamily(intake),
      })

  if (!styleOnlyRequest && !evidence.hasGrounding && evidence.sources.length === 0) {
    return {
      success: false,
      error: 'Grounding unavailable. Please retry when verified search is available.',
      stage: 'grounding',
    }
  }

  const client = getAnthropicClient()
  const systemPrompt = buildStorySystemPrompt(aiConfig)
  const userPrompt = buildStoryUserPrompt({
    intake,
    evidence,
    parentDNA: input.parentDNA,
    parentStoryDocument: input.parentStoryDocument,
  })

  try {
    const firstResponse = await createAnthropicMessageWithRetry(client, {
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }, { label: 'story-generate' })

    const firstParsed = await finalizeStoryDraftResponse(firstResponse, intake, evidence, {
      enableCritic: aiConfig.enableCritic,
      enableInsightMiner: aiConfig.enableInsightMiner,
    })
    if (firstParsed.success) {
      return firstParsed
    }

    const retryResponse = await createAnthropicMessageWithRetry(client, {
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: firstResponse.content },
        { role: 'user', content: buildCorrectionPrompt(firstParsed.error, firstParsed.rawText) },
      ],
    }, { label: 'story-generate-retry' })

    const retryParsed = await finalizeStoryDraftResponse(retryResponse, intake, evidence, {
      enableCritic: aiConfig.enableCritic,
      enableInsightMiner: aiConfig.enableInsightMiner,
    })

    if (retryParsed.success) {
      return retryParsed
    }

    const deterministicFallback = await buildDeterministicStoryFallback(intake, evidence, {
      enableCritic: aiConfig.enableCritic,
      enableInsightMiner: aiConfig.enableInsightMiner,
    })

    return deterministicFallback ?? retryParsed
  } catch (error) {
    const deterministicFallback = await buildDeterministicStoryFallback(intake, evidence, {
      enableCritic: aiConfig.enableCritic,
      enableInsightMiner: aiConfig.enableInsightMiner,
    })
    if (deterministicFallback) {
      return deterministicFallback
    }

    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: normalizeStoryError(message),
      stage: 'api',
    }
  }
}

async function finalizeStoryDraftResponse(
  response: Anthropic.Message,
  intake: StoryIntakePlan,
  evidence: Awaited<ReturnType<typeof retrieveStoryEvidence>>,
  options: {
    enableCritic: boolean
    enableInsightMiner: boolean
  },
): Promise<GenerateStoryResult | { success: false; error: string; rawText: string; stage: 'parse' | 'validation' }> {
  const responseText = response.content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  if (!responseText.trim()) {
    return {
      success: false,
      error: 'The AI returned an empty response.',
      rawText: responseText,
      stage: 'parse',
    }
  }

  const parsed = parseStoryDraftResponse(responseText, intake, evidence)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      rawText: parsed.rawText,
      stage: 'parse',
    }
  }

  const deterministicDraft = mergeDeterministicContext(parsed.data, intake, evidence, {
    enableInsightMiner: options.enableInsightMiner,
  })
  const rendered = await finalizeStoryDocument(deterministicDraft)
  const critic = critiqueStoryDocument(rendered.storyDocument, rendered.dna)
  if (options.enableCritic && !critic.ok) {
    return {
      success: false,
      error: `Story critic failed:\n${critic.issues.map((issue) => `- ${issue}`).join('\n')}`,
      rawText: responseText,
      stage: 'validation',
    }
  }

  storeGenerationKnowledge(
    evidence.searchQueries,
    evidence.support.map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      usedInDNA: false,
    })) as KnowledgeSearchResult[],
    rendered.dna,
    true,
  ).catch((error) => {
    console.error('[story-knowledge-store]', error)
  })

  return {
    success: true,
    storyDocument: rendered.storyDocument,
    dna: rendered.dna,
    previewSvg: rendered.storyDocument.artifacts.svg,
    searchQueries: evidence.searchQueries,
  }
}

async function buildDeterministicStoryFallback(
  intake: StoryIntakePlan,
  evidence: StoryEvidencePacket,
  options: {
    enableCritic: boolean
    enableInsightMiner: boolean
  },
): Promise<GenerateStoryResult | null> {
  const emptyDraft = coerceStoryDocumentDraft({}, intake, evidence)
  const deterministicDraft = mergeDeterministicContext(emptyDraft, intake, evidence, {
    enableInsightMiner: options.enableInsightMiner,
  })
  const rendered = await finalizeStoryDocument(deterministicDraft)
  const critic = critiqueStoryDocument(rendered.storyDocument, rendered.dna)

  if (options.enableCritic && !critic.ok) {
    return null
  }

  storeGenerationKnowledge(
    evidence.searchQueries,
    evidence.support.map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      usedInDNA: false,
    })) as KnowledgeSearchResult[],
    rendered.dna,
    true,
  ).catch((error) => {
    console.error('[story-knowledge-store:fallback]', error)
  })

  return {
    success: true,
    storyDocument: rendered.storyDocument,
    dna: rendered.dna,
    previewSvg: rendered.storyDocument.artifacts.svg,
    searchQueries: evidence.searchQueries,
  }
}

function parseStoryDraftResponse(
  responseText: string,
  intake: StoryIntakePlan,
  evidence: StoryEvidencePacket,
): { success: true; data: StoryDocumentV3Draft } | { success: false; error: string; rawText: string } {
  const strict = parseSchemaResponse(responseText, StoryDocumentDraftSchema, 'StoryDocumentV3 draft schema')
  if (strict.success) {
    return strict
  }

  const jsonText = extractJSON(responseText)

  let rawParsed: unknown
  try {
    rawParsed = JSON.parse(jsonText)
  } catch {
    return strict
  }

  const coerced = coerceStoryDocumentDraft(rawParsed, intake, evidence)
  const fallback = StoryDocumentDraftSchema.safeParse(coerced)

  if (fallback.success) {
    return {
      success: true,
      data: fallback.data,
    }
  }

  return {
    success: false,
    error: strict.error,
    rawText: responseText,
  }
}

async function finalizeStoryDocument(
  draft: StoryDocumentV3Draft,
): Promise<{ storyDocument: StoryDocumentV3; dna: InfographicDNA }> {
  const renderMeta = resolveRenderMeta(draft)
  const provisionalStoryDocument = {
    ...draft,
    version: STORY_DOCUMENT_VERSION,
    artifacts: {
      width: renderMeta.width,
      height: renderMeta.height,
      aspectRatio: renderMeta.width / renderMeta.height,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" />',
    },
    compatibility: {},
  } satisfies StoryDocumentV3

  const svg = await renderStoryDocumentToSVG(provisionalStoryDocument)
  const compatibilityDNA = storyDocumentToDNA(provisionalStoryDocument)

  const storyDocument = StoryDocumentSchema.parse({
    ...provisionalStoryDocument,
    artifacts: {
      ...provisionalStoryDocument.artifacts,
      svg,
    },
    compatibility: {
      dna: compatibilityDNA,
    },
  })

  return {
    storyDocument,
    dna: compatibilityDNA,
  }
}

function buildStorySystemPrompt(aiConfig: Awaited<ReturnType<typeof getAIConfig>>): string {
  const allowedThemes = aiConfig.allowedThemes.join(', ')
  const allowedSceneFamilies = STORY_SCENE_FAMILIES.join(', ')

  return `You are the canonical StoryDocumentV3 author for Infographedia.
Output ONLY valid JSON matching the requested StoryDocumentV3 draft schema.

${SUCCES_MODE_PROMPT}

Rules:
1. Stay grounded in the supplied evidence packet. Do not invent datasets, source URLs, or unsupported claims.
2. Use evidence.support[].id values in normalized.claims[].sourceIds.
3. Build normalized.datasets as compact, inspectable data groups with view hints that match the requested story.
4. The story must read as setup -> reveal -> takeaway and remain credible.
5. scene.panels must contain exactly one primary panel.
6. Keep copy tight enough for a mobile infographic surface. No ellipsis chopping. Rewrite for fit instead.
7. Prefer concrete labels, units, place names, and years.
8. Allowed themes: ${allowedThemes}.
9. Allowed scene families: ${allowedSceneFamilies}.
10. If the request is multi-view, preserve the requested diversity of views when the evidence supports it.
11. Never output markdown or explanation.`
}

function buildStoryUserPrompt(input: {
  intake: StoryIntakePlan
  evidence: Awaited<ReturnType<typeof retrieveStoryEvidence>>
  parentDNA?: InfographicDNA
  parentStoryDocument?: StoryDocumentV3
}): string {
  const parentContext = input.parentStoryDocument
    ? `Parent StoryDocument context:
${JSON.stringify({
        intake: input.parentStoryDocument.intake,
        story: input.parentStoryDocument.story,
        scene: input.parentStoryDocument.scene,
      }, null, 2)}`
    : input.parentDNA
      ? `Parent legacy DNA context:
${JSON.stringify({
          title: input.parentDNA.content.title,
          subtitle: input.parentDNA.content.subtitle,
          hook: input.parentDNA.content.hook,
          data: input.parentDNA.content.data,
          sources: input.parentDNA.content.sources,
          chartType: input.parentDNA.presentation.chartType,
        }, null, 2)}`
      : 'No parent context.'

  return `Create a StoryDocumentV3 draft for this infographic request.

Intake plan:
${JSON.stringify(input.intake, null, 2)}

Evidence packet:
${JSON.stringify(input.evidence, null, 2)}

${parentContext}

Requirements:
- intake should stay aligned with the intake plan.
- evidence should preserve the supplied grounded sources and support records.
- normalized.datasets ids should be simple stable ids like dataset-1, dataset-2.
- claims must cite support ids from evidence.support.
- story.thesis must be strong, concrete, and public-facing.
- scene should be readable and mobile friendly.
- If evidence.media exists, use it only when it improves the scene.
- Do not leave required fields empty.`
}

function buildParentEvidence(
  parentDNA: InfographicDNA | undefined,
  parentStoryDocument: StoryDocumentV3 | undefined,
  intake: StoryIntakePlan,
) {
  if (parentStoryDocument) {
    return {
      searchQueries: [],
      support: parentStoryDocument.evidence.support,
      sources: parentStoryDocument.evidence.sources,
      media: parentStoryDocument.evidence.media,
      hasGrounding: true,
    }
  }

  if (parentDNA) {
    return {
      searchQueries: [],
      support: parentDNA.content.sources.map((source, index) => ({
        id: `parent-${index + 1}`,
        title: source.name,
        url: source.url,
        snippet: `Inherited source for ${parentDNA.content.title}.`,
        sourceName: source.name,
        query: intake.topic,
        kind: 'knowledge' as const,
        freshness: 'unknown' as const,
      })),
      sources: parentDNA.content.sources,
      media: parentDNA.content.media,
      hasGrounding: true,
    }
  }

  return {
    searchQueries: [],
    support: [],
    sources: [],
    media: [],
    hasGrounding: false,
  }
}

function mergeDeterministicContext(
  draft: StoryDocumentV3Draft,
  intake: StoryIntakePlan,
  evidence: Awaited<ReturnType<typeof retrieveStoryEvidence>>,
  options: {
    enableInsightMiner: boolean
  },
): StoryDocumentV3Draft {
  const normalized = normalizeStoryDraft(draft, intake, evidence)
  const insights = options.enableInsightMiner
    ? mineDeterministicInsights({ normalized })
    : draft.insights
  const scene = planStoryScene(intake, {
    normalized,
    scene: draft.scene,
  })
  const story = buildStoryBrief({
    story: draft.story,
    normalized,
    insights,
    scene,
  }, intake)

  return {
    ...draft,
    intake: {
      prompt: intake.prompt,
      topic: intake.topic,
      audience: intake.audience,
      humanStake: intake.humanStake,
      requestedViews: intake.requestedViews,
      constraints: intake.constraints,
      iterationMode: intake.iterationMode,
      parentFormat: intake.parentFormat,
    },
    evidence: {
      sources: evidence.sources,
      support: evidence.support,
      media: evidence.media,
      freshness: evidence.hasGrounding ? 'fresh' : 'mixed',
    },
    normalized,
    insights,
    story,
    scene,
  }
}

function inferPreferredSceneFamily(
  intake: StoryIntakePlan,
): StoryDocumentV3Draft['scene']['family'] {
  if (intake.requestedViews.includes('map')) return 'map-briefing'
  if (intake.requestedViews.includes('timeline') || intake.requestedViews.includes('line') || intake.requestedViews.includes('area')) {
    return 'timeline-briefing'
  }
  if (intake.requestedViews.includes('media')) return 'evidence-board'
  if (intake.requestedViews.includes('bar') || intake.requestedViews.includes('list') || intake.requestedViews.includes('compare')) {
    return 'ranked-comparison'
  }
  return 'single-focus'
}

function resolveRenderMeta(
  draft: StoryDocumentV3Draft,
): { width: number; height: number } {
  const panelCount = draft.scene.panels.length
  if (panelCount >= 3 || draft.scene.layout === 'stacked') {
    return { width: 900, height: 1500 }
  }

  if (draft.scene.layout === 'split-horizontal' || draft.scene.layout === 'primary-plus-rail') {
    return { width: 900, height: 1320 }
  }

  return { width: 800, height: 1280 }
}

function isStyleOnlyStoryRequest(
  prompt: string,
  parentDNA?: InfographicDNA,
  parentStoryDocument?: StoryDocumentV3,
): boolean {
  if (!parentDNA && !parentStoryDocument) return false

  const lower = prompt.toLowerCase()
  const dataKeywords = [
    'latest',
    'update',
    'data',
    'statistics',
    'number',
    'fact',
    'source',
    'research',
    'compare',
    'ranking',
    'trend',
    'growth',
    'country',
    'percent',
    'percentage',
    'ratio',
    'year',
  ]
  const styleKeywords = [
    'style',
    'theme',
    'color',
    'palette',
    'layout',
    'visual',
    'look',
    'design',
    'bold',
    'minimal',
    'editorial',
    'glass',
    'dark',
    'light',
  ]

  const hasDataKeyword = dataKeywords.some((keyword) => lower.includes(keyword))
  const hasStyleKeyword = styleKeywords.some((keyword) => lower.includes(keyword))

  return hasStyleKeyword && !hasDataKeyword
}

function normalizeStoryError(message: string): string {
  const lower = message.toLowerCase()

  if (isRetryableAnthropicError(new Error(message))) {
    return 'The AI provider is busy right now. Please retry in a moment.'
  }

  if (lower.includes('grounding')) {
    return 'Grounding unavailable. Please retry when verified search is available.'
  }

  return 'Generation failed, please retry.'
}
