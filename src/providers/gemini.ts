import { BaseProvider } from './base'

export class GeminiProvider extends BaseProvider {
  readonly id = 'gemini'
  readonly name = 'Gemini'

  async healthCheck(signal?: AbortSignal): Promise<boolean> {
    try {
      const url = `${this.settings.endpoint.replace(/\/$/, '')}/models?key=${this.settings.apiKey}`
      const response = await this.fetchWithTimeout(url, { method: 'GET' }, signal)
      return response.ok
    } catch {
      return false
    }
  }

  protected async callLLM(system: string, user: string, signal?: AbortSignal): Promise<string> {
    const model = this.settings.model
    const url = `${this.settings.endpoint.replace(/\/$/, '')}/models/${model}:generateContent?key=${this.settings.apiKey}`

    const response = await this.fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: this.settings.temperature,
            topP: this.settings.topP,
            maxOutputTokens: this.settings.maxTokens,
            responseMimeType: 'application/json',
          },
        }),
      },
      signal,
    )

    if (!response.ok) {
      const text = await response.text()
      this.handleHttpError(response.status, text)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      throw this.createError('malformed_response', 'Empty response from Gemini')
    }
    return content
  }
}