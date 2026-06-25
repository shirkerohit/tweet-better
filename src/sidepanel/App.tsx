import { useEffect, useState } from 'react'
import { RefreshCw, Settings, Sparkles } from 'lucide-react'
import { ActivityLogPanel } from '@/components/activity-log-panel'
import { ErrorCard } from '@/components/error-card'
import { ReplyCard } from '@/components/reply-card'
import { Button } from '@/components/ui/button'
import { useActivityLogs } from '@/hooks/use-activity-logs'
import { useSettings } from '@/hooks/use-settings'
import type { ExtensionMessage, ProviderErrorCode, ReplySuggestion, TweetData } from '@/types'

export function App() {
  const { settings, loading } = useSettings()
  const { logs, clear } = useActivityLogs()
  const [replies, setReplies] = useState<ReplySuggestion[]>([])
  const [tweet, setTweet] = useState<TweetData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<{ code: ProviderErrorCode; message: string } | null>(null)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION_STATE' }).then((s) => {
      if (s?.replies) setReplies(s.replies)
      if (s?.currentTweet) setTweet(s.currentTweet)
      if (s?.generating) setGenerating(true)
      if (s?.error) setError(s.error)
    })
    const listener = (msg: ExtensionMessage) => {
      if (msg.type === 'GENERATION_STARTED') {
        const p = msg.payload as { tweet: TweetData }
        setReplies([])
        setTweet(p.tweet)
        setGenerating(true)
        setError(null)
      }
      if (msg.type === 'GENERATION_RESULT') {
        const p = msg.payload as { replies: ReplySuggestion[]; tweet: TweetData }
        setReplies(p.replies)
        setTweet(p.tweet)
        setGenerating(false)
        setError(null)
      }
      if (msg.type === 'GENERATION_ERROR') {
        const p = msg.payload as { code: ProviderErrorCode; message: string }
        setReplies([])
        setGenerating(false)
        setError({ code: p.code, message: p.message })
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const handleRegenerate = async () => {
    if (generating || !tweet) return
    setGenerating(true)
    setError(null)
    await chrome.runtime.sendMessage({ type: 'REGENERATE_LAST' })
  }

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="flex flex-col h-screen w-full max-w-[380px] mx-auto">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-semibold text-sm">Tweet Copilot</h1>
            <p className="text-xs text-muted-foreground">
              {settings?.provider.provider} · {settings?.tone} · v0.2.5
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Regenerate with current settings"
            disabled={generating || !tweet}
            onClick={handleRegenerate}
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          </Button>
          <button type="button" onClick={() => chrome.runtime.openOptionsPage()} className="p-1.5">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {tweet && (
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Last selection</p>
            <p className="line-clamp-3">{tweet.text}</p>
          </div>
        )}

        <ActivityLogPanel logs={logs} onClear={clear} maxHeight="140px" />
        {generating && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
            ⏳ Generating replies…
          </div>
        )}
        {error && <ErrorCard code={error.code} message={error.message} />}

        {replies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Latest replies — copy to paste</p>
            {replies.map((r, i) => (
              <ReplyCard key={r.id} reply={r} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}