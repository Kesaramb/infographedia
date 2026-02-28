import Anthropic from '@anthropic-ai/sdk'

/**
 * Anthropic client singleton.
 * Reads ANTHROPIC_API_KEY from environment.
 * Throws eagerly if the key is missing so we fail fast at startup, not mid-request.
 */

let _client: Anthropic | null = null

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
