import { z } from 'zod'

export const ToneSchema = z.enum([
  'balanced',
  'technical',
  'professional',
  'friendly',
  'funny',
  'contrarian',
  'supportive',
  'curious',
  'custom',
])
export type Tone = z.infer<typeof ToneSchema>

export const ProviderIdSchema = z.enum([
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'openrouter',
  'ollama',
  'lmstudio',
  'custom',
])
export type ProviderId = z.infer<typeof ProviderIdSchema>

export const StorageModeSchema = z.enum(['basic', 'secure'])
export type StorageMode = z.infer<typeof StorageModeSchema>

export const GenerateModeSchema = z.enum(['auto', 'focus', 'manual'])
export type GenerateMode = z.infer<typeof GenerateModeSchema>

export interface TweetData {
  id: string
  text: string
  authorName: string
  username: string
  timestamp?: string
  quotedTweet?: TweetData
  threadContext?: string[]
  conversationId?: string
  url: string
  hasVideo?: boolean
  language?: string
}

export interface ReplySuggestion {
  id: string
  text: string
  tone: Tone
  toneLabel: string
  toneStars: number
  estimatedLength: 'short' | 'medium' | 'long'
  reasoningLabel: string
}

export const ReplyResponseSchema = z.object({
  replies: z.array(
    z.object({
      text: z.string(),
      tone: ToneSchema,
      toneLabel: z.string(),
      toneStars: z.number().min(1).max(5),
      estimatedLength: z.enum(['short', 'medium', 'long']),
      reasoningLabel: z.string(),
    }),
  ),
  detectedTone: z.string().optional(),
  detectedLanguage: z.string().optional(),
  summary: z.string().optional(),
})

export type ReplyResponse = z.infer<typeof ReplyResponseSchema>

export interface ProviderSettings {
  provider: ProviderId
  endpoint: string
  model: string
  apiKey: string
  temperature: number
  topP: number
  maxTokens: number
  replyCount: number
  timeout: number
}

export interface AppSettings {
  generateMode: GenerateMode
  openSidePanelAutomatically: boolean
  darkMode: boolean
  language: string
  replyCount: number
  tone: Tone
  customPrompt: string
  writingStyle: string
  storageMode: StorageMode
  masterPassword?: string
  provider: ProviderSettings
  debugLogs: boolean
}

export interface GenerationContext {
  tweet: TweetData
  previousTweet?: string
  quotedTweet?: TweetData
  detectedLanguage?: string
  writingStyle: string
  tone: Tone
  customPrompt: string
  replyCount: number
}

export type ProviderErrorCode =
  | 'offline'
  | 'invalid_api_key'
  | 'timeout'
  | 'network'
  | 'rate_limit'
  | 'malformed_response'
  | 'unknown'

export interface ProviderError {
  code: ProviderErrorCode
  message: string
}

export type MessageType =
  | 'GENERATE_FROM_SELECTION'
  | 'REGENERATE_LAST'
  | 'TRIGGER_GENERATE'
  | 'OPEN_SIDE_PANEL'
  | 'SETTINGS_UPDATED'
  | 'GENERATION_RESULT'
  | 'GENERATION_ERROR'
  | 'GENERATION_STARTED'
  | 'GET_SETTINGS'
  | 'GET_SESSION_STATE'
  | 'PING_CONTENT_SCRIPT'
  | 'HEALTH_CHECK'
  | 'DEBUG_STATUS'
  | 'ACTIVITY_LOG'
  | 'ACTIVITY_LOGS_CLEARED'
  | 'GET_ACTIVITY_LOGS'
  | 'CLEAR_ACTIVITY_LOGS'
  | 'TEST_CONNECTION'

export interface ExtensionMessage<T = unknown> {
  type: MessageType
  payload?: T
}

export interface CachedReplies {
  tweetId: string
  replies: ReplySuggestion[]
  summary?: string
  detectedTone?: string
  detectedLanguage?: string
  cachedAt: number
}