---
name: ai-pipeline
description: AI generation pipeline with tool calling and web search grounding. Use when building the AI infographic generator, prompt engineering, structured output, tool calling, web search integration, iteration mutation logic, or anything involving the LLM.
---

# AI Pipeline — Grounded DNA Generation

## Architecture Overview

The AI pipeline uses Claude (Anthropic API) with **tool calling** to ground infographic data in real-world sources before generating any DNA.

```
User Prompt + Parent DNA (optional)
        │
        ▼
┌─────────────────────┐
│ Build System Prompt  │ ← Includes DNA schema, rules, parent context
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│   Claude API Call    │
│   with tools:       │
│   - web_search      │
│                     │
│   Step 1: AI calls  │──→ Web Search Tool
│   web_search if     │←── Results + URLs
│   data is needed    │
│                     │
│   Step 2: AI builds │
│   DNA JSON from     │
│   search results    │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Zod Validation     │ ← DNASchema.safeParse()
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Return to Client   │
└─────────────────────┘
```

## System Prompt Template

```typescript
const SYSTEM_PROMPT = `You are a JSON Architect for Infographedia. Your job is to generate structured infographic DNA.

RULES:
1. You MUST output valid JSON matching the DNA schema. Nothing else.
2. If the user requests data (statistics, facts, numbers), you MUST call the web_search tool FIRST to find real, current data. NEVER hallucinate numbers.
3. If the user only requests style changes (colors, theme, chart type), do NOT search. Reuse the existing content data.
4. Every DNA output MUST have at least one source in content.sources[].
5. When iterating on a parent DNA, MUTATE the relevant fields. Do not rebuild from scratch.

DNA SCHEMA:
{
  "content": {
    "title": "string (max 120 chars)",
    "subtitle": "string (optional, max 200 chars)",
    "data": [{ "label": "string", "value": "number", "unit": "string (optional)" }],
    "sources": [{ "name": "string", "url": "string (valid URL)", "accessedAt": "YYYY-MM-DD" }],
    "footnotes": "string (optional, max 500 chars)"
  },
  "presentation": {
    "theme": "glass-dark | glass-light | neon-cyberpunk | minimalist | editorial | warm-earth | ocean-depth",
    "chartType": "bar-chart | pie-chart | line-chart | area-chart | timeline | stat-card | grouped-bar-chart | donut-chart",
    "layout": "centered | left-aligned | split | stacked",
    "colors": {
      "primary": "#hex",
      "secondary": "#hex (optional)",
      "background": "#hex",
      "text": "#hex",
      "accent": "#hex (optional)"
    },
    "components": [{ "type": "title | subtitle | [chartType] | footnote | source-badge" }]
  }
}`;
```

## Tool Definition

```typescript
const WEB_SEARCH_TOOL = {
  name: 'web_search',
  description: 'Search the web for current, factual data to use in infographic generation. Use this for any statistics, facts, or data the user requests.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant data',
      },
    },
    required: ['query'],
  },
};
```

## Iteration Logic

When iterating (parent DNA exists):

```typescript
async function generateIteration(parentDNA: InfographicDNA, userPrompt: string) {
  const messages = [
    {
      role: 'user',
      content: `PARENT DNA (the infographic being iterated on):
${JSON.stringify(parentDNA, null, 2)}

USER REQUEST: ${userPrompt}

Generate the mutated DNA. Only change what the user asked for. Keep everything else from the parent.`,
    },
  ];

  // The AI decides whether to search based on whether data changes are needed
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [WEB_SEARCH_TOOL],
    messages,
  });

  // Handle tool use loop (search → final response)
  // ... tool use handling ...

  // Parse and validate the DNA from the response
  const dna = DNASchema.parse(JSON.parse(responseText));
  return dna;
}
```

## Decision Matrix: When to Search

| User Prompt Contains | Action |
|---|---|
| Data requests ("2026 sales", "latest stats") | SEARCH, then generate |
| Style changes ("make it red", "neon theme") | NO SEARCH, mutate presentation only |
| New topic ("create chart about X") | SEARCH, then generate from scratch |
| Both ("update data AND change style") | SEARCH, then generate with new style |

## Error Handling

1. **Search fails**: Fall back to telling the user the data couldn't be verified. Never generate fake numbers.
2. **Invalid JSON from AI**: Retry once with a correction prompt. If still invalid, return error to user.
3. **Schema validation fails**: Return specific Zod error messages to help the AI self-correct on retry.

## Rules

1. **NEVER generate data without searching first**. This is the core trust mechanism.
2. **Sources must be real URLs** from search results, not fabricated.
3. **Iteration mutates, not recreates**. The parent DNA is the starting point.
4. **Use structured output / JSON mode** when available to reduce parsing errors.
5. **Rate limit AI calls per user**. This is the primary cost driver.
