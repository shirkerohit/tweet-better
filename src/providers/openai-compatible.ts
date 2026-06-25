import { BaseProvider } from './base'

export class OpenAICompatibleProvider extends BaseProvider {
  readonly id: string
  readonly name: string
  private readonly authHeader: string
  private readonly authPrefix: string
  private readonly extraHeaders: Record<string, string>
  private readonly useJsonMode: boolean

  constructor(
    id: string,
    name: string,
    options: {
      authHeader?: string
      authPrefix?: string
      extraHeaders?: Record<string, string>
      useJsonMode?: boolean
    } = {},
  ) {
    super()
    this.id = id
    this.name = name
    this.authHeader = options.authHeader ?? 'Authorization'
    this.authPrefix = options.authPrefix ?? 'Bearer'
    this.extraHeaders = options.extraHeaders ?? {}
    this.useJsonMode = options.useJsonMode ?? true
  }

  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    try {
      const url = `${this.settings.endpoint.replace(/\/$/, '')}/models`
      const headers = this.buildHeaders()
      const response = await this.fetchWithTimeout(url, { method: 'GET', headers }, signal)
      return response.ok || response.status === 404
    } catch {
      return false
    }
  }

  protected async callLLM(system: string, user: string, signal?: AbortSignal): Promise<string> {
    const url = `${this.settings.endpoint.replace(/\/$/, '')}/chat/completions`
    const body: Record<string, unknown> = {
      model: this.settings.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: this.settings.temperature,
      top_p: this.settings.topP,
      max_tokens: this.settings.maxTokens,
    }
    if (this.useJsonMode) {
      body.response_format = { type: 'json_object' }
    }

    const response = await this.fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { ...this.buildHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      signal,
    )

    if (!response.ok) {
      const text = await response.text()
      this.handleHttpError(response.status, text)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw this.createError('malformed_response', 'Empty response from provider')
    }
    return content
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { ...this.extraHeaders }
    if (this.settings.apiKey) {
      headers[this.authHeader] = `${this.authPrefix} ${this.settings.apiKey}`.trim()
    }
    return headers
  }
}

export function createOpenAIProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('openai', 'OpenAI')
}

export function createGroqProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('groq', 'Groq')
}

export function createOpenRouterProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('openrouter', 'OpenRouter', {
    extraHeaders: { 'HTTP-Referer': 'https://twitter-ai-copilot.local', 'X-Title': 'Tweet Better' },
  })
}

export function createOllamaProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('ollama', 'Ollama', { authPrefix: '', useJsonMode: false })
}

export function createLMStudioProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('lmstudio', 'LM Studio', { authPrefix: '', useJsonMode: false })
}

export function createCustomProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('custom', 'Custom Endpoint')
}