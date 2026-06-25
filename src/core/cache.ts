import { CACHE_TTL_MS } from './defaults'
import type { CachedReplies, ReplySuggestion } from '@/types'

const CACHE_PREFIX = 'reply_cache_'

export async function getCachedReplies(tweetId: string): Promise<CachedReplies | null> {
  const key = `${CACHE_PREFIX}${tweetId}`
  const result = await chrome.storage.local.get(key)
  const cached = result[key] as CachedReplies | undefined

  if (!cached) return null
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    await chrome.storage.local.remove(key)
    return null
  }

  return cached
}

export async function setCachedReplies(
  tweetId: string,
  replies: ReplySuggestion[],
  meta?: { summary?: string; detectedTone?: string; detectedLanguage?: string },
): Promise<void> {
  const key = `${CACHE_PREFIX}${tweetId}`
  const entry: CachedReplies = {
    tweetId,
    replies,
    ...meta,
    cachedAt: Date.now(),
  }
  await chrome.storage.local.set({ [key]: entry })
}