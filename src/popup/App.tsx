import { useEffect, useState } from 'react'
import { ExternalLink, Plug, Settings, Sparkles } from 'lucide-react'
import { ActivityLogPanel } from '@/components/activity-log-panel'
import { Button } from '@/components/ui/button'
import { useActivityLogs } from '@/hooks/use-activity-logs'
import { loadSettings } from '@/core/storage'
import type { AppSettings } from '@/types'

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [onX, setOnX] = useState(false)
  const [scriptOk, setScriptOk] = useState(false)
  const [testing, setTesting] = useState(false)
  const { logs, refresh: refreshLogs, clear } = useActivityLogs()

  const refresh = async () => {
    const s = await loadSettings()
    setSettings(s)
    if (s.darkMode) document.documentElement.classList.add('dark')
    const status = await chrome.runtime.sendMessage({ type: 'DEBUG_STATUS' })
    setOnX(status?.onTwitter ?? false)
    setScriptOk(status?.contentScript ?? false)
    await refreshLogs()
  }

  useEffect(() => { refresh() }, [])

  const testConnection = async () => {
    setTesting(true)
    const r = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' })
    setConnected(r?.ok ?? false)
    await refreshLogs()
    setTesting(false)
  }

  return (
    <div className="w-[300px] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <span className="font-semibold text-sm">Tweet Better</span>
          <p className="text-[10px] text-muted-foreground">v0.2.4</p>
        </div>
      </div>

      <div className="rounded-lg border p-3 bg-muted/30 text-xs space-y-2">
        <p className="font-semibold text-sm">How to use</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Select tweet text on x.com</li>
          <li>Click <b className="text-foreground">✨ Generate Reply</b> toolbar</li>
          <li>Or right-click → <b className="text-foreground">Generate AI Reply</b></li>
          <li>Pick a reply from the sidebar (opens automatically)</li>
        </ol>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">On x.com</span>
          <span className={onX ? 'text-green-500' : 'text-amber-500'}>{onX ? '✓' : '✗'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Content script</span>
          <span className={scriptOk ? 'text-green-500' : 'text-amber-500'}>{scriptOk ? '✓' : '✗ refresh x.com'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Provider</span>
          <span className="capitalize">{settings?.provider.provider ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">API key</span>
          <span className={settings?.provider.apiKey ? 'text-green-500' : 'text-red-500'}>
            {settings?.provider.apiKey ? 'Set' : 'Missing'}
          </span>
        </div>
      </div>

      <ActivityLogPanel logs={logs} onClear={clear} maxHeight="120px" />

      <div className="flex flex-col gap-2">
        <Button size="sm" variant="outline" onClick={testConnection} disabled={testing} className="w-full">
          <Plug className="h-4 w-4" />
          {testing ? 'Testing…' : connected ? 'Connected ✓' : 'Test Connection'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => chrome.runtime.openOptionsPage()} className="w-full">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      <a href="https://x.com" target="_blank" rel="noreferrer"
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary">
        Open x.com <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}