import { SYSTEM_PROMPT_TEMPLATE, buildUserPrompt } from '@/core/prompt-templates'
import { ReplyResponseSchema, type GenerationContext, type ProviderError, type ProviderSettings, type ReplyResponse, type ReplySuggestion } from '@/types'
import { createId } from '@/utils/id'

export interface LLMProvider {
  readonly id: string
  readonly name: string
  initialize(settings: ProviderSettings): void
  healthCheck(signal?: AbortSignal): Promise<boolean>
  generateReplies(context: GenerationContext, signal?: AbortSignal): Promise<ReplySuggestion[]>
  rewrite(text: string, instruction: string, signal?: AbortSignal): Promise<string>
  summarize(text: string, signal?: AbortSignal): Promise<string>
}

export abstract class BaseProvider implements LLMProvider {
  abstract readonly id: string
  abstract readonly name: string
  protected settings!: ProviderSettings

  initialize(settings: ProviderSettings): void {
    this.settings = settings
  }

  abstract healthCheck(signal?: AbortSignal): Promise<boolean>
  protected abstract callLLM(system: string, user: string, signal?: AbortSignal): Promise<string>

  async generateReplies(context: GenerationContext, signal?: AbortSignal): Promise<ReplySuggestion[]> {
    const system = SYSTEM_PROMPT_TEMPLATE
    const user = buildUserPrompt(context)
    const raw = await this.callLLM(system, user, signal)
    const parsed = this.parseResponse(raw)
    return parsed.replies.map((r) => ({
      id: createId('reply'),
      ...r,
    }))
  }

  async rewrite(text: string, instruction: string, signal?: AbortSignal): Promise<string> {
    const system = 'You rewrite Twitter replies. Return only the rewritten text, nothing else.'
    const user = `Rewrite this reply:\n\n"${text}"\n\nInstruction: ${instruction}`
    return (await this.callLLM(system, user, signal)).trim()
  }

  async summarize(text: string, signal?: AbortSignal): Promise<string> {
    const system = 'Summarize tweets concisely in one sentence.'
    const user = `Summarize:\n\n${text}`
    return (await this.callLLM(system, user, signal)).trim()
  }

  protected parseResponse(raw: string): ReplyResponse {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw this.createError('malformed_response', 'No JSON found in response')
    }

    try {
      const parsed = JSON.parse(jsonMatch[0])
      return ReplyResponseSchema.parse(parsed)
    } catch {
      throw this.createError('malformed_response', 'Invalid JSON response from provider')
    }
  }

  protected createError(code: ProviderError['code'], message: string): ProviderError & Error {
    const error = new Error(message) as ProviderError & Error
    error.code = code
    return error
  }

  protected async fetchWithTimeout(
    url: string,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.settings.timeout)

    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      return response
    } catch (err) {
      if (controller.signal.aborted) {
        throw this.createError('timeout', 'Request timed out')
      }
      throw this.createError('network', err instanceof Error ? err.message : 'Network error')
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
    }
  }

  protected handleHttpError(status: number, body: string): never {
    if (status === 401 || status === 403) {
      throw this.createError('invalid_api_key', 'Invalid API key')
    }
    if (status === 429) {
      throw this.createError('rate_limit', 'Rate limit exceeded')
    }
    throw this.createError('unknown', `HTTP ${status}: ${body.slice(0, 200)}`)
  }
}