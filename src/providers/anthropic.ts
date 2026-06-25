import { BaseProvider } from './base'

export class AnthropicProvider extends BaseProvider {
  readonly id = 'anthropic'
  readonly name = 'Anthropic'

  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.settings.endpoint.replace(/\/$/, '')}/messages`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify({
            model: this.settings.model,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        },
        signal,
      )
      return response.ok || response.status === 400
    } catch {
      return false
    }
  }

  protected async callLLM(system: string, user: string, signal?: AbortSignal): Promise<string> {
    const response = await this.fetchWithTimeout(
      `${this.settings.endpoint.replace(/\/$/, '')}/messages`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.settings.model,
          max_tokens: this.settings.maxTokens,
          temperature: this.settings.temperature,
          top_p: this.settings.topP,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      },
      signal,
    )

    if (!response.ok) {
      const text = await response.text()
      this.handleHttpError(response.status, text)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text
    if (!content) {
      throw this.createError('malformed_response', 'Empty response from Anthropic')
    }
    return content
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.settings.apiKey,
      'anthropic-version': '2023-06-01',
    }
  }
}