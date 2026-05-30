import Anthropic from '@anthropic-ai/sdk'
import type { Message, MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'

/**
 * Anthropic client singleton.
 * Reads ANTHROPIC_API_KEY from environment.
 * Throws eagerly if the key is missing so we fail fast at startup, not mid-request.
 */

let _client: Anthropic | null = null

const RETRYABLE_ERROR_PATTERNS = [
  'overloaded',
  'overload',
  '529',
  'rate limit',
  'temporarily unavailable',
  'timed out',
  'timeout',
  'connection reset',
  'network error',
  'service unavailable',
]

export function getAnthropicClient(): Anthropic {
  if (_client) return _client

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to your .env file.'
    )
  }

  _client = new Anthropic({ apiKey })
  return _client
}

export async function createAnthropicMessageWithRetry(
  client: Anthropic,
  params: MessageCreateParamsNonStreaming,
  options?: {
    attempts?: number
    baseDelayMs?: number
    label?: string
  },
): Promise<Message> {
  const attempts = Math.max(1, options?.attempts ?? 3)
  const baseDelayMs = Math.max(250, options?.baseDelayMs ?? 750)
  const label = options?.label ?? 'anthropic'

  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await client.messages.create(params)
    } catch (error) {
      lastError = error

      if (!isRetryableAnthropicError(error) || attempt >= attempts) {
        throw error
      }

      const delayMs = baseDelayMs * (2 ** (attempt - 1))
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[${label}] transient provider error on attempt ${attempt}/${attempts}; retrying in ${delayMs}ms: ${message}`)
      await sleep(delayMs)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown Anthropic API error')
}

export function isRetryableAnthropicError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
