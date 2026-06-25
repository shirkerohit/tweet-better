import type { ExtensionMessage } from '@/types'

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'step'

export interface ActivityLogEntry {
  id: string
  timestamp: number
  level: LogLevel
  source: 'background' | 'content' | 'sidepanel' | 'popup' | 'provider'
  message: string
  detail?: string
}

const LOG_KEY = 'activity_logs'
const MAX_LOGS = 100

function createId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export async function getActivityLogs(): Promise<ActivityLogEntry[]> {
  const result = await chrome.storage.session.get(LOG_KEY)
  return (result[LOG_KEY] as ActivityLogEntry[]) ?? []
}

export async function addActivityLog(
  level: LogLevel,
  source: ActivityLogEntry['source'],
  message: string,
  detail?: string,
): Promise<ActivityLogEntry> {
  const entry: ActivityLogEntry = {
    id: createId(),
    timestamp: Date.now(),
    level,
    source,
    message,
    detail,
  }

  const logs = await getActivityLogs()
  logs.unshift(entry)
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS
  await chrome.storage.session.set({ [LOG_KEY]: logs })

  const msg: ExtensionMessage = { type: 'ACTIVITY_LOG', payload: entry }
  chrome.runtime.sendMessage(msg).catch(() => {})

  const prefix = `[Copilot/${source}]`
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  consoleFn(prefix, message, detail ?? '')

  return entry
}

export async function clearActivityLogs(): Promise<void> {
  await chrome.storage.session.set({ [LOG_KEY]: [] })
  chrome.runtime.sendMessage({ type: 'ACTIVITY_LOGS_CLEARED' }).catch(() => {})
}