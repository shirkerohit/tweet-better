import type { ProviderErrorCode, ReplySuggestion, TweetData } from '@/types'

export interface SessionState {
  currentTweet: TweetData | null
  replies: ReplySuggestion[]
  generating: boolean
  error: { code: ProviderErrorCode; message: string } | null
  sourceTabId?: number
  summary?: string
  detectedTone?: string
  detectedLanguage?: string
}

const SESSION_KEY = 'session_state'

export const EMPTY_SESSION: SessionState = {
  currentTweet: null,
  replies: [],
  generating: false,
  error: null,
}

export async function getSessionState(): Promise<SessionState> {
  const result = await chrome.storage.session.get(SESSION_KEY)
  return (result[SESSION_KEY] as SessionState) ?? EMPTY_SESSION
}

export async function setSessionState(partial: Partial<SessionState>): Promise<SessionState> {
  const current = await getSessionState()
  const next = { ...current, ...partial }
  await chrome.storage.session.set({ [SESSION_KEY]: next })
  return next
}