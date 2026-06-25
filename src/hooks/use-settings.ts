import { useEffect, useState } from 'react'
import { loadSettings, saveSettings } from '@/core/storage'
import type { AppSettings } from '@/types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s)
      setLoading(false)
      if (s.darkMode) {
        document.documentElement.classList.add('dark')
      }
    })
  }, [])

  const updateSettings = async (partial: Partial<AppSettings>) => {
    if (!settings) return
    const next = { ...settings, ...partial }
    if (partial.provider) {
      next.provider = { ...settings.provider, ...partial.provider }
    }
    setSettings(next)
    await saveSettings(next)
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {})
    if (next.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return { settings, loading, updateSettings }
}