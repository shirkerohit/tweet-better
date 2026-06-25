import { DEFAULT_SETTINGS } from './defaults'
import { encryptApiKey, decryptApiKey } from './encryption'
import type { AppSettings } from '@/types'

const SETTINGS_KEY = 'app_settings'
const ENCRYPTED_API_KEY_KEY = 'encrypted_api_key'

type StoredSettings = Omit<AppSettings, 'provider'> & {
  provider: Omit<AppSettings['provider'], 'apiKey'>
}

function stripApiKey(settings: AppSettings): StoredSettings {
  const { apiKey: _, ...provider } = settings.provider
  return { ...settings, provider }
}

export async function loadSettings(): Promise<AppSettings> {
  const result = await chrome.storage.local.get([SETTINGS_KEY, ENCRYPTED_API_KEY_KEY])
  const stored = result[SETTINGS_KEY] as StoredSettings | undefined

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    provider: {
      ...DEFAULT_SETTINGS.provider,
      ...stored?.provider,
      apiKey: '',
    },
  }

  if (settings.storageMode === 'secure' && result[ENCRYPTED_API_KEY_KEY] && settings.masterPassword) {
    try {
      settings.provider.apiKey = await decryptApiKey(
        result[ENCRYPTED_API_KEY_KEY] as string,
        settings.masterPassword,
      )
    } catch {
      settings.provider.apiKey = ''
    }
  } else {
    const full = result[SETTINGS_KEY] as AppSettings | undefined
    if (full?.provider?.apiKey) {
      settings.provider.apiKey = full.provider.apiKey
    }
  }

  return settings
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (settings.storageMode === 'secure' && settings.masterPassword && settings.provider.apiKey) {
    const toStore = stripApiKey(settings)
    const encrypted = await encryptApiKey(settings.provider.apiKey, settings.masterPassword)
    await chrome.storage.local.set({
      [SETTINGS_KEY]: toStore,
      [ENCRYPTED_API_KEY_KEY]: encrypted,
    })
  } else {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: settings,
      [ENCRYPTED_API_KEY_KEY]: null,
    })
  }
}

export async function exportSettings(): Promise<string> {
  const settings = await loadSettings()
  const exportable = { ...settings, provider: { ...settings.provider, apiKey: '***REDACTED***' } }
  return JSON.stringify(exportable, null, 2)
}

export async function importSettings(json: string): Promise<AppSettings> {
  const parsed = JSON.parse(json) as Partial<AppSettings>
  const current = await loadSettings()
  const merged: AppSettings = {
    ...current,
    ...parsed,
    provider: { ...current.provider, ...parsed.provider },
  }
  await saveSettings(merged)
  return merged
}

export async function resetSettings(): Promise<AppSettings> {
  await chrome.storage.local.clear()
  return DEFAULT_SETTINGS
}