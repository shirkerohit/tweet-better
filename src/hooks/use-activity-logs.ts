import { useCallback, useEffect, useState } from 'react'
import type { ActivityLogEntry } from '@/core/activity-log'
import type { ExtensionMessage } from '@/types'

export function useActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])

  const refresh = useCallback(async () => {
    const result = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITY_LOGS' })
    if (Array.isArray(result)) setLogs(result)
  }, [])

  useEffect(() => {
    refresh()
    const listener = (message: ExtensionMessage) => {
      if (message.type === 'ACTIVITY_LOG') {
        const entry = message.payload as ActivityLogEntry
        setLogs((prev) => [entry, ...prev].slice(0, 100))
      } else if (message.type === 'ACTIVITY_LOGS_CLEARED') {
        setLogs([])
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [refresh])

  const clear = async () => {
    await chrome.runtime.sendMessage({ type: 'CLEAR_ACTIVITY_LOGS' })
    setLogs([])
  }

  return { logs, refresh, clear }
}