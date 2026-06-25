import type { AppSettings } from '@/types'

export const DEFAULT_SETTINGS: AppSettings = {
  generateMode: 'focus',
  openSidePanelAutomatically: true,
  darkMode: true,
  language: 'auto',
  replyCount: 3,
  tone: 'balanced',
  customPrompt: '',
  writingStyle: 'concise, witty, and authentic — like a real Twitter user',
  storageMode: 'basic',
  provider: {
    provider: 'ollama',
    endpoint: 'http://localhost:11434/v1',
    model: 'llama3.2',
    apiKey: '',
    temperature: 0.8,
    topP: 1,
    maxTokens: 1024,
    replyCount: 3,
    timeout: 30000,
  },
  debugLogs: false,
}

export const PROVIDER_DEFAULTS: Record<
  AppSettings['provider']['provider'],
  { endpoint: string; model: string }
> = {
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-haiku-20241022' },
  gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash' },
  groq: { endpoint: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  openrouter: { endpoint: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  ollama: { endpoint: 'http://localhost:11434/v1', model: 'llama3.2' },
  lmstudio: { endpoint: 'http://localhost:1234/v1', model: 'local-model' },
  custom: { endpoint: 'http://localhost:8080/v1', model: 'custom-model' },
}

export const CACHE_TTL_MS = 15 * 60 * 1000
export const FOCUS_DEBOUNCE_MS = 500