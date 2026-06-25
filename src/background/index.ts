import { addActivityLog, clearActivityLogs, getActivityLogs } from '@/core/activity-log'
import { getCachedReplies, setCachedReplies } from '@/core/cache'
import { buildGenerationContext } from '@/core/context-builder'
import { getSessionState, setSessionState } from '@/core/session-state'
import { loadSettings } from '@/core/storage'
import { createProvider } from '@/providers'
import type { ExtensionMessage, ProviderError, ReplySuggestion, TweetData } from '@/types'

let currentAbort: AbortController | null = null
let generationSeq = 0

const VERSION = '0.2.4'

addActivityLog('info', 'background', `Service worker started (v${VERSION})`)

function enableSidePanelOnTab(tabId: number) {
  chrome.sidePanel.setOptions({ tabId, path: 'src/sidepanel/index.html', enabled: true }).catch(() => {})
}

async function enableSidePanelOnTwitterTabs() {
  const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] })
  for (const tab of tabs) {
    if (tab.id) enableSidePanelOnTab(tab.id)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'copilot-generate',
      title: '✨ Generate AI Reply',
      contexts: ['selection'],
      documentUrlPatterns: ['https://x.com/*', 'https://twitter.com/*'],
    })
  })
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
  void enableSidePanelOnTwitterTabs()
  addActivityLog('info', 'background', `v${VERSION} installed — select text on x.com, right-click → Generate AI Reply`)
})

chrome.runtime.onStartup.addListener(() => {
  void enableSidePanelOnTwitterTabs()
})

chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
  if (!tab.url?.includes('x.com') && !tab.url?.includes('twitter.com')) return
  enableSidePanelOnTab(tabId)
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'copilot-generate' || !tab?.id) return
  const text = info.selectionText?.trim()
  if (!text) return

  // Must open in this synchronous user-gesture handler — await before open will fail.
  openSidePanelNow(tab.id, tab.windowId)

  void (async () => {
    await addActivityLog('step', 'background', 'Context menu: generate reply', text.slice(0, 80))
    await generateFromSelection(text, tab.id!, tab.url ?? '')
  })()
})

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id
  if (message.type === 'GENERATE_FROM_SELECTION' && tabId) {
    openSidePanelNow(tabId, sender.tab?.windowId)
  }
  if (message.type === 'OPEN_SIDE_PANEL' && tabId) {
    openSidePanelNow(tabId, sender.tab?.windowId)
    sendResponse({ ok: true })
    return true
  }

  handleMessage(message, tabId).then(sendResponse).catch((err: unknown) => sendResponse({ error: String(err) }))
  return true
})

async function handleMessage(message: ExtensionMessage, tabId?: number): Promise<unknown> {
  switch (message.type) {
    case 'GENERATE_FROM_SELECTION': {
      const { text, url, generationId } = message.payload as { text: string; url: string; generationId?: number }
      if (!tabId) return { ok: false, error: 'No tab' }
      await generateFromSelection(text, tabId, url, generationId)
      return { ok: true }
    }

    case 'INSERT_REPLY': {
      const { text } = message.payload as { text: string }
      const session = await getSessionState()
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const targetTabId = tabId ?? session.sourceTabId ?? activeTab?.id
      if (!targetTabId) return { ok: false, message: 'No x.com tab found' }
      try {
        const result = await chrome.tabs.sendMessage(targetTabId, { type: 'INSERT_REPLY', payload: { text } })
        return { ok: result?.ok === true, message: result?.message }
      } catch {
        return { ok: false, message: 'Content script not loaded — refresh x.com' }
      }
    }

    case 'GET_SETTINGS':
      return await loadSettings()

    case 'GET_SESSION_STATE':
      return await getSessionState()

    case 'GET_ACTIVITY_LOGS':
      return await getActivityLogs()

    case 'CLEAR_ACTIVITY_LOGS':
      await clearActivityLogs()
      return { ok: true }

    case 'TEST_CONNECTION':
      return await testConnection()

    case 'DEBUG_STATUS': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      let contentScript = false
      if (tab?.id) {
        try {
          const ping = await chrome.tabs.sendMessage(tab.id, { type: 'PING_CONTENT_SCRIPT' })
          contentScript = ping?.ok === true
        } catch { /* not loaded */ }
      }
      const session = await getSessionState()
      return {
        onTwitter: !!tab?.url?.includes('x.com') || !!tab?.url?.includes('twitter.com'),
        contentScript,
        version: VERSION,
        provider: (await loadSettings()).provider.provider,
        replyCount: session.replies.length,
        lastError: session.error?.message ?? null,
      }
    }

    default:
      return { ok: true }
  }
}

function tweetFromSelection(text: string, url: string): TweetData {
  const idMatch = url.match(/status\/(\d+)/)
  return {
    id: idMatch ? idMatch[1] : `sel_${hash(text)}`,
    text,
    authorName: 'Author',
    username: 'author',
    url,
  }
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return String(Math.abs(h))
}

async function generateFromSelection(text: string, tabId: number, url: string, clientGenId?: number) {
  const genId = clientGenId ?? ++generationSeq
  if (!clientGenId) generationSeq = genId
  else if (genId > generationSeq) generationSeq = genId

  const tweet = tweetFromSelection(text, url)

  if (currentAbort) currentAbort.abort()
  currentAbort = new AbortController()

  await setSessionState({ currentTweet: tweet, generating: true, error: null, replies: [], sourceTabId: tabId })
  notifyGeneration(tabId, { type: 'GENERATION_STARTED', payload: { tweet, sourceText: text, generationId: genId } })

  const cached = await getCachedReplies(tweet.id)
  if (cached) {
    if (genId !== generationSeq) return
    await finishGeneration(tabId, tweet, cached.replies, text, true, genId)
    return
  }

  try {
    const settings = await loadSettings()
    await addActivityLog('step', 'background', 'Generating replies…', `${settings.provider.provider} / ${settings.provider.model}`)

    if (!settings.provider.apiKey && !['ollama', 'lmstudio'].includes(settings.provider.provider)) {
      throw Object.assign(new Error('API key missing — add in Settings'), { code: 'invalid_api_key' })
    }

    const provider = createProvider(settings.provider.provider)
    provider.initialize(settings.provider)
    const context = buildGenerationContext(tweet, settings)
    const replies = await provider.generateReplies(context, currentAbort.signal)

    if (genId !== generationSeq) return

    await setCachedReplies(tweet.id, replies)
    await finishGeneration(tabId, tweet, replies, text, false, genId)
  } catch (err) {
    if (genId !== generationSeq) return
    const error = err as ProviderError & Error
    const msg = error.message ?? 'Generation failed'
    await addActivityLog('error', 'background', 'Generation failed', msg)
    await setSessionState({ generating: false, error: { code: error.code ?? 'unknown', message: msg } })
    notifyGeneration(tabId, {
      type: 'GENERATION_ERROR',
      payload: { tweet, code: error.code ?? 'unknown', message: msg, generationId: genId },
    })
  }
}

async function finishGeneration(
  tabId: number,
  tweet: TweetData,
  replies: ReplySuggestion[],
  sourceText: string,
  fromCache: boolean,
  generationId: number,
) {
  await addActivityLog('success', 'background', `${fromCache ? 'Cached' : 'Generated'} ${replies.length} replies`)
  await setSessionState({ currentTweet: tweet, replies, generating: false, error: null })
  notifyGeneration(tabId, {
    type: 'GENERATION_RESULT',
    payload: { tweet, replies, sourceText, fromCache, generationId },
  })
}

function notifyGeneration(tabId: number, message: ExtensionMessage) {
  sendToTab(tabId, message)
  chrome.runtime.sendMessage(message).catch(() => {})
}

function sendToTab(tabId: number, message: ExtensionMessage) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    addActivityLog('warn', 'background', 'Tab not receiving messages', 'Refresh x.com after reloading extension')
  })
}

/** Open side panel synchronously while user-gesture is still valid. Do not await before calling this. */
function openSidePanelNow(tabId: number, windowId?: number) {
  enableSidePanelOnTab(tabId)
  chrome.sidePanel.open({ tabId }).catch(() => {
    if (windowId) {
      chrome.sidePanel.open({ windowId }).catch(() => {
        void addActivityLog('warn', 'background', 'Could not open side panel', 'Click the extension icon once')
      })
    }
  })
}

async function testConnection(): Promise<{ ok: boolean; message: string; detail?: string }> {
  const settings = await loadSettings()
  if (!settings.provider.apiKey && !['ollama', 'lmstudio'].includes(settings.provider.provider)) {
    return { ok: false, message: 'API key missing' }
  }
  try {
    const provider = createProvider(settings.provider.provider)
    provider.initialize(settings.provider)
    const healthy = await provider.healthCheck()
    return healthy
      ? { ok: true, message: `Connected to ${settings.provider.provider}` }
      : { ok: false, message: 'Health check failed — verify model name' }
  } catch (err) {
    return { ok: false, message: 'Connection failed', detail: String(err) }
  }
}