import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'
import {
  createCustomProvider,
  createGroqProvider,
  createLMStudioProvider,
  createOllamaProvider,
  createOpenAIProvider,
  createOpenRouterProvider,
} from './openai-compatible'
import type { LLMProvider } from './base'
import type { ProviderId } from '@/types'

const providerFactories: Record<ProviderId, () => LLMProvider> = {
  openai: createOpenAIProvider,
  anthropic: () => new AnthropicProvider(),
  gemini: () => new GeminiProvider(),
  groq: createGroqProvider,
  openrouter: createOpenRouterProvider,
  ollama: createOllamaProvider,
  lmstudio: createLMStudioProvider,
  custom: createCustomProvider,
}

export function createProvider(id: ProviderId): LLMProvider {
  const factory = providerFactories[id]
  if (!factory) {
    throw new Error(`Unknown provider: ${id}`)
  }
  return factory()
}

export function getProviderList(): { id: ProviderId; name: string }[] {
  return Object.entries(providerFactories).map(([id]) => {
    const provider = createProvider(id as ProviderId)
    return { id: id as ProviderId, name: provider.name }
  })
}