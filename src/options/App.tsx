import { useRef } from 'react'
import { Download, RotateCcw, Sparkles, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PROVIDER_DEFAULTS } from '@/core/defaults'
import { exportSettings, importSettings, resetSettings } from '@/core/storage'
import { getProviderList } from '@/providers'
import { useSettings } from '@/hooks/use-settings'
import type { GenerateMode, ProviderId, StorageMode, Tone } from '@/types'

const TONES: { value: Tone; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'technical', label: 'Technical' },
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'funny', label: 'Funny' },
  { value: 'contrarian', label: 'Contrarian' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'curious', label: 'Curious' },
  { value: 'custom', label: 'Custom' },
]

export function App() {
  const { settings, loading, updateSettings } = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const providers = getProviderList()

  if (loading || !settings) {
    return <div className="p-8 text-muted-foreground">Loading settings…</div>
  }

  const handleProviderChange = (id: ProviderId) => {
    const defaults = PROVIDER_DEFAULTS[id]
    updateSettings({
      provider: {
        ...settings.provider,
        provider: id,
        endpoint: defaults.endpoint,
        model: defaults.model,
      },
    })
  }

  const handleExport = async () => {
    const json = await exportSettings()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'twitter-ai-copilot-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    await importSettings(text)
    window.location.reload()
  }

  const handleReset = async () => {
    if (confirm('Reset all settings to defaults?')) {
      await resetSettings()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Tweet Better</h1>
            <p className="text-muted-foreground">Configure your AI reply assistant</p>
          </div>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <section className="space-y-4">
              <h2 className="font-semibold">Generation</h2>
              <p className="text-xs text-muted-foreground">
                These settings apply on the next generate or when you click Regenerate in the sidebar.
              </p>

              <div className="space-y-2">
                <Label>Generate Mode</Label>
                <Select
                  value={settings.generateMode}
                  onValueChange={(v) => updateSettings({ generateMode: v as GenerateMode })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto — generate when text is selected</SelectItem>
                    <SelectItem value="focus">Toolbar — show Generate button on selection</SelectItem>
                    <SelectItem value="manual">Manual — right-click or sidebar only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Controls how generation starts on x.com after you select tweet text.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Open Side Panel Automatically</Label>
                  <p className="text-[11px] text-muted-foreground">Opens sidebar when a reply is generated</p>
                </div>
                <Switch
                  checked={settings.openSidePanelAutomatically}
                  onCheckedChange={(v) => updateSettings({ openSidePanelAutomatically: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-[11px] text-muted-foreground">Extension UI theme</p>
                </div>
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={(v) => updateSettings({ darkMode: v })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reply Count: {settings.replyCount}</Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[settings.replyCount]}
                  onValueChange={([v]) => updateSettings({ replyCount: v })}
                />
                <p className="text-[11px] text-muted-foreground">Number of reply suggestions per generation</p>
              </div>

              <div className="space-y-2">
                <Label>Default Tone</Label>
                <Select value={settings.tone} onValueChange={(v) => updateSettings({ tone: v as Tone })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Tweet reply style — change tone then click Regenerate (↻) in the sidebar
                </p>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="provider" className="space-y-6">
            <section className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={settings.provider.provider}
                  onValueChange={(v) => handleProviderChange(v as ProviderId)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={settings.provider.apiKey}
                  onChange={(e) => updateSettings({ provider: { ...settings.provider, apiKey: e.target.value } })}
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <Label>Endpoint</Label>
                <Input
                  value={settings.provider.endpoint}
                  onChange={(e) => updateSettings({ provider: { ...settings.provider, endpoint: e.target.value } })}
                />
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={settings.provider.model}
                  onChange={(e) => updateSettings({ provider: { ...settings.provider, model: e.target.value } })}
                />
              </div>

              <div className="space-y-2">
                <Label>Temperature: {settings.provider.temperature}</Label>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[settings.provider.temperature]}
                  onValueChange={([v]) => updateSettings({ provider: { ...settings.provider, temperature: v } })}
                />
              </div>

              <div className="space-y-2">
                <Label>Timeout (ms): {settings.provider.timeout}</Label>
                <Slider
                  min={5000}
                  max={120000}
                  step={1000}
                  value={[settings.provider.timeout]}
                  onValueChange={([v]) => updateSettings({ provider: { ...settings.provider, timeout: v } })}
                />
              </div>

              <div className="space-y-2">
                <Label>Storage Mode</Label>
                <Select
                  value={settings.storageMode}
                  onValueChange={(v) => updateSettings({ storageMode: v as StorageMode })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (chrome.storage)</SelectItem>
                    <SelectItem value="secure">Secure (AES-GCM encrypted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.storageMode === 'secure' && (
                <div className="space-y-2">
                  <Label>Master Password</Label>
                  <Input
                    type="password"
                    value={settings.masterPassword ?? ''}
                    onChange={(e) => updateSettings({ masterPassword: e.target.value })}
                    placeholder="Used to encrypt API key"
                  />
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <section className="space-y-4">
              <div className="space-y-2">
                <Label>Writing Style</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={settings.writingStyle}
                  onChange={(e) => updateSettings({ writingStyle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Custom Prompt</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={settings.customPrompt}
                  onChange={(e) => updateSettings({ customPrompt: e.target.value })}
                  placeholder="Additional instructions for reply generation…"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Debug Logs</Label>
                <Switch
                  checked={settings.debugLogs}
                  onCheckedChange={(v) => updateSettings({ debugLogs: v })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4" /> Export
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Import
                </Button>
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                <Button variant="destructive" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}