import { useEffect, useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { ActivityLogPanel } from '@/components/activity-log-panel'
import { ErrorCard } from '@/components/error-card'
import { ReplyCard } from '@/components/reply-card'
import { useActivityLogs } from '@/hooks/use-activity-logs'
import { useSettings } from '@/hooks/use-settings'
import type { ExtensionMessage, ProviderErrorCode, ReplySuggestion, TweetData } from '@/types'

export function App() {
  const { settings, loading } = useSettings()
  const { logs, clear } = useActivityLogs()
  const [replies, setReplies] = useState<ReplySuggestion[]>([])
  const [tweet, setTweet] = useState<TweetData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [insertStatus, setInsertStatus] = useState<string | null>(null)
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

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="flex flex-col h-screen w-full max-w-[380px] mx-auto">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-semibold text-sm">Tweet Copilot</h1>
            <p className="text-xs text-muted-foreground">{settings?.provider.provider} · v0.2.4</p>
          </div>
        </div>
        <button onClick={() => chrome.runtime.openOptionsPage()}>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Select → Generate → Pick</p>
          <p>Highlight tweet text on x.com, then use the toolbar or right-click menu. Replies appear here in the sidebar.</p>
        </div> */}

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
        {insertStatus && (
          <p className="text-xs text-center text-muted-foreground">{insertStatus}</p>
        )}

        {replies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Latest replies</p>
            {replies.map((r, i) => (
              <ReplyCard
                key={r.id}
                reply={r}
                index={i}
                onInsert={async (text) => {
                  setInsertStatus('Inserting…')
                  const result = await chrome.runtime.sendMessage({ type: 'INSERT_REPLY', payload: { text } })
                  setInsertStatus(
                    result?.ok
                      ? '✓ Inserted into reply box on x.com'
                      : (result?.message as string) || '✗ Open reply box on x.com, then retry',
                  )
                  setTimeout(() => setInsertStatus(null), 2800)
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}