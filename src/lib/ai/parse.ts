import { DNASchema, type InfographicDNA } from '@/lib/dna/schema'

/**
 * Extract and validate DNA JSON from an AI response.
 *
 * The AI should return raw JSON, but sometimes wraps it in markdown code fences.
 * This function handles both cases, validates against the Zod schema, and
 * returns a typed result with detailed error messages for retry.
 */

export type ParseResult =
  | { success: true; dna: InfographicDNA }
  | { success: false; error: string; rawText: string }

/**
 * Extract JSON from AI response text.
 * Handles: raw JSON, ```json fences, ``` fences, JSON embedded in prose.
 */
function extractJSON(text: string): string {
  // Try to find JSON in code fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  // Try raw JSON (starts with {)
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    return trimmed
  }

  // Try to find JSON object anywhere in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  return text
}

/**
 * Parse and validate AI response text into InfographicDNA.
 */
export function parseAIResponse(responseText: string): ParseResult {
  const jsonText = extractJSON(responseText)

  // Step 1: Parse as JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {
      success: false,
      error: `Invalid JSON: Could not parse the response as JSON. Make sure to output ONLY valid JSON with no markdown or explanation.`,
      rawText: responseText,
    }
  }

  // Step 2: Validate against Zod schema
  const result = DNASchema.safeParse(parsed)

  if (result.success) {
    return { success: true, dna: result.data }
  }

  // Build a detailed error message for the AI to self-correct
  const issues = result.error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return `  - ${path}: ${issue.message}`
    })
    .join('\n')

  return {
    success: false,
    error: `Schema validation failed:\n${issues}\n\nFix these issues and regenerate the JSON.`,
    rawText: responseText,
  }
}

/**
 * Build a correction prompt for the AI to fix invalid output.
 */
export function buildCorrectionPrompt(error: string, rawText: string): string {
  return `Your previous output was invalid:

${error}

Previous output (first 1000 chars):
${rawText.slice(0, 1000)}

Please fix the issues and output ONLY valid JSON matching the DNA schema. No markdown, no explanation.`
}
