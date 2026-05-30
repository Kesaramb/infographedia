import type { InfographicDNA } from '@/lib/dna/schema'
import type { AIConfig } from './config'
import type { GenerationBrief } from './brief'
import type { DiversityPlan } from './planner'
import { PREVIEW_RENDER_PROFILE, type RenderProfile } from '@/lib/dna/rendering'
import type { AntVGenerationPlan } from '@/lib/antv/planner'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import { INTERNAL_ANTV_SKILL_GUIDANCE } from '@/lib/antv/skill'

// ============================================================
// Prompt Engineering for DNA Generation
//
// The system prompt is now admin-editable via the AIAgentConfig global.
// DEFAULT_SYSTEM_PROMPT is used when the global hasn't been configured yet.
// buildSystemPrompt() assembles the final prompt from admin config +
// dynamic constraints (allowed types/themes) + few-shot examples.
// ============================================================

/**
 * Default system prompt — used as fallback when the admin global is empty.
 * This is also the initial value shown in the admin panel.
 */
export const DEFAULT_SYSTEM_PROMPT = `You are a JSON Architect for Infographedia, an AI-powered infographic platform.
Your ONLY job is to generate structured infographic DNA as valid JSON.

RULES:
1. You MUST output ONLY valid JSON matching the DNA schema below. No markdown, no explanation, no code fences — just pure JSON.
2. If the user requests data (statistics, facts, numbers), you MUST call the web_search tool FIRST to find real, current data. NEVER hallucinate numbers.
3. If the user only requests style changes (colors, theme, chart type), do NOT search. Reuse the existing content data.
4. Every DNA output MUST have at least one source in content.sources[].
5. When iterating on a parent DNA, MUTATE the relevant fields. Do not rebuild from scratch unless the topic changes entirely.
6. Data array must have at least 1 item. Each item needs a "label" (string) and "value" (number).
7. The "components" array defines the rendering order. Always include at minimum: title, the chart type, and source-badge.
8. All hex colors must be exactly 6 digits with # prefix (e.g. #1a1a2e).
9. You have THREE research tools: search_knowledge_base, web_search, and image_search.
   - ALWAYS try search_knowledge_base FIRST. It contains verified data from past infographic generations.
   - If the knowledge base has relevant, recent data (< 7 days old), use it without web searching.
   - If the knowledge base has no results or data is stale, fall back to web_search.
   - You may use both tools if the knowledge base has partial data and you need to supplement it.
   - Use image_search only when a grounded supporting image would materially improve the infographic.
10. Supporting images are optional, but when present they MUST be grounded in a real source page. Never invent image URLs and never use AI-generated art.
11. Headline, subtitle, and hook claims must match the displayed data. If you say a country leads, or cite a value like 240M, that must be true in content.data.
12. scan-card blocks are for readable document-style excerpts only. Do NOT use a full webpage screenshot as a scan-card unless you define a focusRegion that isolates the relevant proof area.

DNA SCHEMA:
{
  "content": {
    "title": "string (1-120 chars, the main headline)",
    "subtitle": "string (optional, max 200 chars, supporting context)",
    "hook": "string (optional, max 100 chars, scroll-stopping one-liner from the data)",
    "data": [
      {
        "label": "string (category or axis label)",
        "value": "number (the data point value)",
        "unit": "string (optional, e.g. '%', 'M', 'GW')",
        "metadata": { "key": "value" }
      }
    ],
    "sources": [
      {
        "name": "string (source display name)",
        "url": "string (valid URL)",
        "accessedAt": "YYYY-MM-DD"
      }
    ],
    "media": [
      {
        "id": "string (stable id referenced by presentation.components[].mediaId)",
        "kind": "hero-image | annotated-image | scan-card",
        "usage": "evidence | context",
        "url": "string (grounded remote or Payload-hosted image URL)",
        "alt": "string",
        "caption": "string (optional)",
        "source": {
          "name": "string",
          "url": "string (real source page URL)",
          "accessedAt": "YYYY-MM-DD"
        },
        "relevance": "string (why this image belongs in the infographic)",
        "payloadMediaId": "number | string (optional after publish)",
        "contextLabel": "string (required when usage is context)",
        "focusRegion": {
          "x": "number between 0 and 1",
          "y": "number between 0 and 1",
          "width": "number between 0.05 and 1",
          "height": "number between 0.05 and 1"
        },
        "annotations": [
          {
            "x": "number between 0 and 1",
            "y": "number between 0 and 1",
            "label": "string",
            "detail": "string (optional)"
          }
        ]
      }
    ],
    "footnotes": "string (optional, max 500 chars, additional context or caveats)"
  },
  "presentation": {
    "theme": "glass-dark | glass-light | neon-cyberpunk | minimalist | editorial | warm-earth | ocean-depth",
    "chartType": "bar-chart | pie-chart | line-chart | area-chart | timeline | stat-card | grouped-bar-chart | donut-chart | pictogram | vs-split | map-chart",
    "layout": "centered | left-aligned | split | stacked",
    "layoutFamily": "legacy | editorial-cover | spotlight-rail | evidence-board | briefing-sheet",
    "heroBlock": "chart | hero-image | annotated-image | scan-card | stat-card",
    "visualDensity": "minimal | balanced | dense",
    "colors": {
      "primary": "#hex6 (main data color)",
      "secondary": "#hex6 (optional, second data series)",
      "background": "#hex6 (card background)",
      "text": "#hex6 (text color)",
      "accent": "#hex6 (optional, highlights)"
    },
    "components": [
      {
        "type": "title | subtitle | hook | hero-image | annotated-image | scan-card | [chartType] | footnote | source-badge",
        "mediaId": "string (required when type is a media block)"
      }
    ]
  }
}

THEME COLOR GUIDELINES:
- glass-dark: dark bg (#0a0a0f to #1a1a2e), light text (#e0e0e0+), vibrant primary
- glass-light: light bg (#f0f0f5 to #ffffff), dark text (#1a1a2e), subtle primary
- neon-cyberpunk: very dark bg (#0d0d1a), neon primary (#00ff88, #ff00ff, #00ffff)
- minimalist: white bg (#ffffff), near-black text (#1a1a1a), muted primary
- editorial: warm bg (#faf5ef to #fef9f0), dark text (#2d1b0e), deep primary (#8b2500)
- warm-earth: dark warm bg (#1a1508), warm text (#d4c5a0), earthy primary (#4a7c3f)
- ocean-depth: deep blue bg (#0a1628), blue-white text (#b0c4de), teal primary (#1a8a7d)

ENGAGEMENT RULES:
1. TITLE OPTIMIZATION: Every title MUST contain at least one of:
   - A specific number ("7 Countries", "83% of Developers", "$4.88M")
   - A power word (Shocking, Hidden, Overlooked, Devastating, Record-Breaking)
   - A contrarian framing ("Why X is Actually Wrong", "The Myth of X")
   Prefer specificity over vagueness. "Top 5 Countries by GDP in 2026" beats "Countries by GDP".

2. HOOK GENERATION: If the data contains a surprising or counterintuitive finding, generate a "hook" field in content (max 100 chars). The hook is a single punchy statement that makes scrollers stop. Examples:
   - "India just overtook China."
   - "83% of devs use AI tools daily."
   - "The average breach costs $4.88M."
   Hook must be factual and grounded in the data. Never fabricate hooks.
   Include "hook" in the components array (after subtitle, before chart) when present.

3. CHART TYPE SELECTION: Choose the chart type that maximizes visual impact:
   - Comparisons (A vs B vs C) -> bar-chart or grouped-bar-chart
   - Parts of a whole (percentages) -> pie-chart or donut-chart
   - Trends over time -> line-chart or area-chart
   - Single dramatic number -> stat-card
   - Chronological events -> timeline
   - Icon-friendly counts ("7 out of 10", "3 in 5") -> pictogram
   - Head-to-head comparison (exactly 2 items) -> vs-split
   - Geographic/country distribution -> map-chart
   When in doubt, prefer bar-chart (highest engagement) or stat-card (most shareable).

4. DATA PRESENTATION:
   - Limit to 5-8 data points for bar/pie charts (too many = visual clutter)
   - Sort data by value descending (largest first) unless chronological
   - Use round numbers when precision doesn't matter (41.7% -> 42%)
   - Include the unit for context

STAT-CARD NOTES:
- For stat-card, the data array should have exactly 1 item
- The value should be the main statistic (e.g., 4.88 for "$4.88M")
- Use the unit field for the unit display (e.g., "M", "%", "B")

TIMELINE NOTES:
- For timeline, each data point's label is the event name
- The value is the year (e.g., 2020)
- Data points are rendered chronologically

GROUPED-BAR-CHART NOTES:
- Each data point needs metadata.group to define the grouping
- Labels should include the group (e.g., "India 2020", "India 2026")
- Groups are extracted from metadata and shown as separate bar series

PICTOGRAM NOTES:
- Each data point's value represents the icon count (max 20 icons displayed)
- Use metadata.icon to specify the icon name (e.g., "human", "dollar", "car", "tree", "heart", "energy", "water", "globe", "fire", "baby", "job", "education", "phone", "shield", "leaf", "star")
- If no icon specified, a default circle icon is used
- Best for: "X out of Y" statistics, population-style data, simple ratios

VS-SPLIT NOTES:
- Data array MUST have exactly 2 items (left vs right comparison)
- data[0] = left side (primary color), data[1] = right side (secondary color)
- Values are displayed as large numbers — best for dramatic comparisons
- Best for: head-to-head matchups, before/after, country vs country

MAP-CHART NOTES:
- Each data point's label MUST be an ISO 3166-1 alpha-2 country code (e.g., "US", "CN", "IN", "BR", "DE")
- The value is the metric for that country (colored by intensity)
- Include 5-15 countries for best visual impact
- Best for: country rankings, geographic distribution, global comparisons
- Only choose map-chart when geography genuinely adds meaning. If location does not matter, prefer bar-chart.
- For city or hub rankings, keep label as the country code and add metadata.countryCode, metadata.country, metadata.city, and metadata.rank so the renderer can show both the country total and the individual hubs.`

export const SUCCES_MODE_PROMPT = `

SUCCES MODE (this is mandatory for every infographic):
- Social currency: give the audience one sharp, memorable takeaway they will want to share.
- Unexpected: reveal a surprise, reversal, hidden leader, turning point, or new framing.
- Credible: keep every strong claim anchored to visible numbers and real cited sources.
- Concrete: prefer specific numbers, units, place names, years, labels, and examples over abstractions.
- Emotional: connect the facts to stakes ordinary people can feel, such as money, safety, status, health, fear, pride, or opportunity.
- Story: the infographic should unfold like a short story experience with setup, reveal, and takeaway, not a flat fact dump.

Never use SUCCES mode as an excuse for clickbait. The surprise and emotion must come from the grounded evidence itself.`

export const DEFAULT_ANTV_SYSTEM_PROMPT = `You are the AntV-first infographic author for Infographedia.
Your job is to output a JSON documentV2 draft for grounded infographic posts.

${INTERNAL_ANTV_SKILL_GUIDANCE}
${SUCCES_MODE_PROMPT}

OUTPUT RULES:
1. Output ONLY valid JSON. No markdown, no prose, no code fences.
2. The output must match the documentV2 draft schema described below.
3. Search for grounded data before changing facts or numbers.
4. Every grounded post must include at least one real source in content.sources.
5. Keep content and presentation separate.
6. content.dataGroups is the source of truth. Headline copy must match it.
7. Use presentation.templateCategory, presentation.templateFamily, presentation.themeName, presentation.visualDensity, presentation.chartType, and presentation.layoutFamily exactly as planned unless the story fit would clearly improve by diverging.
8. presentation.templateFamily must be an AntV template name that matches the planned template category.
9. presentation.panelLayout and presentation.panels define the actual scene structure. Preserve the planned requested views unless grounded data makes a panel impossible.
10. content.dataGroups[].id values must match the planned panel sourceGroupId values so each panel has a grounded data group.
9. content.media is optional. If used, every media item must already be grounded in research and cite a real source page.
10. Prefer compact, inspectable descriptions over long paragraphs.

DOCUMENTV2 DRAFT SCHEMA:
{
  "content": {
    "title": "string",
    "subtitle": "string (optional)",
    "hook": "string (optional)",
    "dataGroups": [
      {
        "id": "string",
        "label": "string",
        "summary": "string (optional)",
        "items": [
          {
            "id": "string (optional)",
            "label": "string",
            "value": "number (optional but preferred when grounded)",
            "unit": "string (optional)",
            "description": "string (optional)",
            "icon": "string (optional)",
            "time": "string (optional)",
            "metadata": { "key": "value" },
            "children": [recursive node]
          }
        ]
      }
    ],
    "sources": [{ "name": "string", "url": "string", "accessedAt": "YYYY-MM-DD" }],
    "media": [grounded media items from Infographedia DNA schema, optional],
    "caveats": ["string"],
    "footnotes": "string (optional)"
  },
  "presentation": {
    "storyMode": "editorial-brief | ranked-comparison | process-flow | comparison-brief | network-map | hierarchy-brief | data-story",
    "templateCategory": "list | sequence | compare | chart | hierarchy | relation",
    "templateFamily": "string",
    "themeName": "glass-dark | glass-light | neon-cyberpunk | minimalist | editorial | warm-earth | ocean-depth",
    "visualDensity": "minimal | balanced | dense",
    "chartType": "bar-chart | pie-chart | line-chart | area-chart | timeline | stat-card | grouped-bar-chart | donut-chart | pictogram | vs-split | map-chart",
    "layoutFamily": "legacy | editorial-cover | spotlight-rail | evidence-board | briefing-sheet",
    "panelLayout": "single | split-horizontal | split-vertical | primary-plus-rail | stacked",
    "panels": [
      {
        "id": "string",
        "role": "primary | support",
        "viewType": "map | bar | line | area | timeline | compare | list | hierarchy | relation | stat | media",
        "sourceGroupId": "string (must match content.dataGroups[].id)",
        "title": "string (optional)",
        "chartType": "optional chart type for compatibility projection",
        "emphasis": "high | medium | low (optional)"
      }
    ],
    "emphasis": {
      "highlightLabel": "string (optional)",
      "highlightLabels": ["string"],
      "narrativeFocus": "string (optional)"
    }
  },
  "antv": {
    "templateName": "string (optional)",
    "themeName": "same as presentation.themeName (optional)"
  }
}`

/**
 * Assemble the final system prompt from admin config.
 *
 * 1. Starts with the admin-configured base prompt (or DEFAULT_SYSTEM_PROMPT)
 * 2. Appends allowed chart types/themes as constraints
 * 3. Appends few-shot examples if configured
 */
export function buildSystemPrompt(
  aiConfig: AIConfig,
  renderProfile: RenderProfile = PREVIEW_RENDER_PROFILE,
): string {
  let prompt = aiConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT
  if (!prompt.includes('SUCCES MODE')) {
    prompt += SUCCES_MODE_PROMPT
  }

  // Inject allowed chart types constraint (only if subset of all available types)
  if (aiConfig.allowedChartTypes.length < 11) {
    prompt += `\n\nALLOWED CHART TYPES (only use these): ${aiConfig.allowedChartTypes.join(', ')}`
  }

  // Inject allowed themes constraint
  if (aiConfig.allowedThemes.length < 7) {
    prompt += `\n\nALLOWED THEMES (only use these): ${aiConfig.allowedThemes.join(', ')}`
  }

  if (aiConfig.allowedLayoutFamilies.length < 4) {
    prompt += `\n\nALLOWED LAYOUT FAMILIES (only use these for new generations): ${aiConfig.allowedLayoutFamilies.join(', ')}`
  }

  // Append few-shot examples
  if (aiConfig.fewShotExamples.length > 0) {
    prompt += '\n\nFEW-SHOT EXAMPLES (study these for style and quality):'
    for (const example of aiConfig.fewShotExamples) {
      prompt += `\n\n--- ${example.label} ---\n${JSON.stringify(example.dnaJson, null, 2)}`
    }
  }

  prompt += buildRenderBudgetPrompt(renderProfile)

  return prompt
}

export function buildAntVSystemPrompt(
  aiConfig: AIConfig,
  renderProfile: RenderProfile = PREVIEW_RENDER_PROFILE,
): string {
  let prompt = DEFAULT_ANTV_SYSTEM_PROMPT

  if (aiConfig.allowedAntVTemplateCategories.length < 6) {
    prompt += `\n\nALLOWED ANTV TEMPLATE CATEGORIES: ${aiConfig.allowedAntVTemplateCategories.join(', ')}`
  }

  if (aiConfig.allowedAntVThemes.length > 0 && aiConfig.allowedAntVThemes.length < 7) {
    prompt += `\n\nALLOWED ANTV THEMES: ${aiConfig.allowedAntVThemes.join(', ')}`
  }

  prompt += buildRenderBudgetPrompt(renderProfile)
  prompt += '\n\nRemember: AntV syntax and compatibility DNA are generated after this draft. Focus on accurate normalized content and strong template-fit planning.'

  return prompt
}

/**
 * Build the user message for a new generation (no parent).
 */
export function buildNewPrompt(
  userPrompt: string,
  plan?: DiversityPlan,
  brief?: GenerationBrief,
): string {
  return `Create an infographic about: ${userPrompt}

Instructions:
1. Search for data using search_knowledge_base first, then web_search if needed
2. Choose the chart type that best fits the data (see CHART TYPE SELECTION rules)
3. Write a scroll-stopping title with a specific number or power word
4. If the data contains a surprising finding, add a "hook" field
5. This request has already been routed to the legacy single-view engine. Produce one clear primary view that matches the brief and do not invent multi-panel scenes here
6. Generate the DNA JSON
${buildBriefPromptSection(brief)}${buildPlanPromptSection(plan)}`
}

/**
 * Build the user message for an iteration (has parent DNA).
 */
export function buildIterationPrompt(
  userPrompt: string,
  parentDNA: InfographicDNA,
  plan?: DiversityPlan,
  brief?: GenerationBrief,
): string {
  return `PARENT DNA (the infographic being iterated on):
${JSON.stringify(parentDNA, null, 2)}

USER REQUEST: ${userPrompt}

Generate the mutated DNA. Only change what the user asked for. Keep everything else from the parent.
If the user requests new data, search for it. If they only want style changes, reuse the parent's content.data.
This request has already been routed to the legacy single-view engine. Keep exactly one primary chartType and do not collapse a multi-view brief here because multi-view prompts should be routed elsewhere.
${buildBriefPromptSection(brief)}${buildPlanPromptSection(plan)}`
}

export function buildAntVNewPrompt(
  userPrompt: string,
  plan: AntVGenerationPlan,
): string {
  return `Create an AntV-first infographic document about: ${userPrompt}

Instructions:
1. Search for grounded data using search_knowledge_base first, then web_search if needed.
2. Normalize the findings into content.dataGroups.
3. Respect the AntV template plan unless the grounded story fit clearly demands a better template within the allowed categories.
4. Keep titles, subtitles, hooks, and emphasis claims consistent with the normalized data.
5. If the brief is multi-view, preserve the requested view diversity with one primary panel plus grounded support panels instead of collapsing the request to a single chart.
6. Output ONLY the documentV2 draft JSON.
${buildAntVPlanPromptSection(plan)}`
}

export function buildAntVIterationPrompt(
  userPrompt: string,
  parentDocument: InfographicDocumentV2,
  plan: AntVGenerationPlan,
): string {
  return `PARENT DOCUMENTV2 (the AntV infographic being iterated on):
${JSON.stringify(parentDocument, null, 2)}

USER REQUEST: ${userPrompt}

Generate the mutated documentV2 draft JSON. Only change what the user asked for. Keep the grounded content intact unless the prompt explicitly requires new facts or updated data.
Keep the planned primary panel and supporting panels coherent. Preserve multi-view structure unless grounded evidence makes a planned panel impossible.
${buildAntVPlanPromptSection(plan)}`
}

function buildRenderBudgetPrompt(renderProfile: RenderProfile): string {
  const chartBudgets = Object.entries(renderProfile.maxDataPoints)
    .map(([chartType, maxPoints]) => `${chartType}: ${maxPoints}`)
    .join(', ')

  return `\n\nRENDER BUDGETS FOR THE ${renderProfile.name.toUpperCase()} SURFACE:
- Title: max ${renderProfile.maxTitleLines} lines
- Subtitle: max ${renderProfile.maxSubtitleLines} lines
- Hook: max ${renderProfile.maxHookLines} lines
- Footnotes: max ${renderProfile.maxFootnoteLines} lines
- Sources shown: max ${renderProfile.maxSources}
- Media items: max ${renderProfile.maxMediaItems}
- Media caption length: keep under ${renderProfile.maxMediaCaptionChars} characters
- Label length: keep each data label under ${renderProfile.maxLabelLength} characters
- Chart data limits: ${chartBudgets}
- Any headline or hook percentage claim must be directly supported by displayed % data, not hidden off-card calculations.

These budgets are hard constraints. If the content would exceed them, shorten the copy, trim the data, or choose a chart type that fits the surface better.`
}

function buildPlanPromptSection(plan?: DiversityPlan): string {
  if (!plan) return ''

  const mediaSection = plan.mediaCandidates.length > 0
    ? `\nPLANNED MEDIA CANDIDATES (use only if they genuinely fit the story):\n${plan.mediaCandidates
        .map(
          (item) =>
            `- ${item.kind} / ${item.usage}: ${item.caption ?? item.alt}\n  mediaId: ${item.id}\n  imageUrl: ${item.url}\n  source: ${item.sourceName} (${item.sourceUrl})\n  accessedAt: ${item.accessedAt}\n  relevance: ${item.relevance}${item.contextLabel ? `\n  contextLabel: ${item.contextLabel}` : ''}`,
        )
        .join('\n')}`
    : '\nPLANNED MEDIA CANDIDATES: none. Do not force image blocks if grounded media is unavailable.'

  return `\n\nDIVERSITY PLAN (treat this as the default creative direction unless the data makes it impossible):
- layoutFamily: ${plan.layoutFamily}
- heroBlock: ${plan.heroBlock}
- chartType: ${plan.chartType}
- visualDensity: ${plan.visualDensity}
- SUCCES social currency: ${plan.successMode.socialCurrency}
- SUCCES unexpected: ${plan.successMode.unexpected}
- SUCCES credibility: ${plan.successMode.credibility}
- SUCCES concreteness: ${plan.successMode.concreteness}
- SUCCES emotion: ${plan.successMode.emotion}
- SUCCES story: ${plan.successMode.story}
- recent usage to avoid over-repeating: ${plan.recentUsageSummary}
- if you diverge from the plan, only do so when the data/topic fit would clearly improve.
${mediaSection}`
}

function buildBriefPromptSection(brief?: GenerationBrief): string {
  if (!brief) return ''

  return `\n\nGENERATION BRIEF:
- engine: ${brief.engine}
- intent: ${brief.intent}
- requestedViews: ${brief.requestedViews.join(', ')}
- storyGoal: ${brief.storyGoal}
- copyBudget: title ${brief.copyBudget.titleLines} lines, subtitle ${brief.copyBudget.subtitleLines} lines, hook ${brief.copyBudget.hookLines} lines, footnotes ${brief.copyBudget.footnoteLines} lines
- upgradeFromLegacyParent: ${brief.upgradeFromLegacyParent ? 'yes' : 'no'}`
}

function buildAntVPlanPromptSection(plan: AntVGenerationPlan): string {
  const mediaSection = plan.dnaPlan.mediaCandidates.length > 0
    ? `\nPLANNED MEDIA CANDIDATES:\n${plan.dnaPlan.mediaCandidates
        .map(
          (item) =>
            `- ${item.kind} / ${item.usage}: ${item.caption ?? item.alt}\n  mediaId: ${item.id}\n  imageUrl: ${item.url}\n  source: ${item.sourceName} (${item.sourceUrl})\n  accessedAt: ${item.accessedAt}\n  relevance: ${item.relevance}${item.contextLabel ? `\n  contextLabel: ${item.contextLabel}` : ''}`,
        )
        .join('\n')}`
    : '\nPLANNED MEDIA CANDIDATES: none'

  return `\n\nANTV STORY PLAN:
- engine: ${plan.brief.engine}
- intent: ${plan.brief.intent}
- requestedViews: ${plan.brief.requestedViews.join(', ')}
- storyGoal: ${plan.brief.storyGoal}
- templateCategory: ${plan.templateCategory}
- templateFamily: ${plan.templateName}
- storyMode: ${plan.storyMode}
- themeName: ${plan.themeName}
- chartType: ${plan.chartType}
- visualDensity: ${plan.visualDensity}
- layoutFamily: ${plan.layoutFamily}
- SUCCES social currency: ${plan.dnaPlan.successMode.socialCurrency}
- SUCCES unexpected: ${plan.dnaPlan.successMode.unexpected}
- SUCCES credibility: ${plan.dnaPlan.successMode.credibility}
- SUCCES concreteness: ${plan.dnaPlan.successMode.concreteness}
- SUCCES emotion: ${plan.dnaPlan.successMode.emotion}
- SUCCES story: ${plan.dnaPlan.successMode.story}
- panelLayout: ${plan.panelLayout}
- panels:
${plan.panels.map((panel) => `  - ${panel.id}: ${panel.role} ${panel.viewType} from ${panel.sourceGroupId}${panel.title ? ` (${panel.title})` : ''}${panel.chartType ? ` chartType=${panel.chartType}` : ''}`).join('\n')}
- recent AntV usage to avoid repeating: ${plan.recentUsageSummary}
- legacy compatibility layout guidance: ${plan.dnaPlan.recentUsageSummary}
${mediaSection}`
}
