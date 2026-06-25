import type { TweetData } from '@/types'

const TWEET_SELECTORS = [
  'article[data-testid="tweet"]',
  'article[role="article"]',
]

const TEXT_SELECTORS = [
  '[data-testid="tweetText"]',
  'div[data-testid="tweetText"]',
  '[lang] div[dir="auto"]',
  'div[dir="auto"]',
]

export class TwitterAdapter {
  findAllTweetArticles(): HTMLElement[] {
    const found = new Set<HTMLElement>()
    for (const selector of TWEET_SELECTORS) {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => found.add(el))
    }
    return Array.from(found)
  }

  findFocusedTweet(): HTMLElement | null {
    if (this.isStatusPage()) {
      return this.findPrimaryTweetOnStatusPage()
    }
    return this.findCenteredTweet()
  }

  private isStatusPage(): boolean {
    return /\/status\/\d+/.test(window.location.pathname)
  }

  private findPrimaryTweetOnStatusPage(): HTMLElement | null {
    const articles = this.findAllTweetArticles()
    if (!articles.length) return null

    const main = document.querySelector('[role="main"]')
    if (main) {
      for (const selector of TWEET_SELECTORS) {
        const inMain = main.querySelector<HTMLElement>(selector)
        if (inMain && this.extractTweetText(inMain)) return inMain
      }
    }

    // On status page, pick the first extractable tweet (usually the opened one)
    for (const article of articles) {
      if (this.extractTweetText(article)) return article
    }

    return articles[0] ?? null
  }

  private findCenteredTweet(): HTMLElement | null {
    const articles = this.findAllTweetArticles()
    if (!articles.length) return null

    let best: HTMLElement | null = null
    let bestScore = -Infinity

    articles.forEach((article) => {
      if (!this.extractTweetText(article)) return

      const rect = article.getBoundingClientRect()
      if (rect.height < 20 || rect.width < 100) return

      const centerY = rect.top + rect.height / 2
      const viewportCenter = window.innerHeight / 2
      const distance = Math.abs(centerY - viewportCenter)
      const visible = rect.top < window.innerHeight && rect.bottom > 0
      if (!visible) return

      const score = -distance + (rect.width * rect.height) / 10000
      if (score > bestScore) {
        bestScore = score
        best = article
      }
    })

    return best ?? this.findPrimaryTweetOnStatusPage()
  }

  extractTweetData(element: HTMLElement): TweetData | null {
    const text = this.extractTweetText(element)
    if (!text) return null

    const { authorName, username } = this.extractAuthor(element)
    const timestamp = element.querySelector('time')?.getAttribute('datetime') ?? undefined
    const url = this.extractTweetUrl(element)
    const id = this.extractTweetId(url) ?? this.hashText(text + username)

    const quoted = this.extractQuotedTweet(element)
    const threadContext = this.extractThreadContext(element)

    return {
      id,
      text,
      authorName,
      username,
      timestamp,
      quotedTweet: quoted ?? undefined,
      threadContext: threadContext.length ? threadContext : undefined,
      url,
      hasVideo: !!element.querySelector('[data-testid="videoPlayer"], video'),
      language: document.documentElement.lang || undefined,
    }
  }

  private extractTweetText(element: HTMLElement): string {
    for (const selector of TEXT_SELECTORS) {
      const el = element.querySelector(selector)
      const text = el?.textContent?.trim()
      if (text && text.length > 1) return text
    }

    const autoSpans = element.querySelectorAll<HTMLElement>('div[dir="auto"], span[dir="auto"]')
    const parts: string[] = []
    autoSpans.forEach((span) => {
      const t = span.textContent?.trim()
      if (t && t.length > 2 && !parts.includes(t) && !t.startsWith('@')) parts.push(t)
    })
    if (parts.length) return parts.join(' ')

    const aria = element.getAttribute('aria-label')?.trim()
    if (aria && aria.length > 5) return aria

    if (element.querySelector('img, video, [data-testid="videoPlayer"]')) {
      return '[Media tweet]'
    }

    return ''
  }

  findReplyButton(tweetElement: HTMLElement): HTMLElement | null {
    return tweetElement.querySelector<HTMLElement>('[data-testid="reply"]')
  }

  findComposer(): HTMLElement | null {
    const selectors = [
      '[data-testid="tweetTextarea_0"]',
      'div[contenteditable="true"][role="textbox"]',
      '[data-testid="tweetTextarea_0_label"] [contenteditable="true"]',
      'div.public-DraftEditor-content',
    ]
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel)
      if (el) return el
    }
    return null
  }

  async insertReply(text: string, tweetElement?: HTMLElement): Promise<boolean> {
    if (tweetElement) {
      const replyBtn = this.findReplyButton(tweetElement)
      if (replyBtn) {
        replyBtn.click()
        await this.waitForComposer(2000)
      }
    }

    const composer = this.findComposer()
    if (!composer) return false

    composer.focus()

    if (composer instanceof HTMLTextAreaElement) {
      composer.value = text
      composer.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    }

    composer.textContent = text
    composer.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }))
    return true
  }

  private extractAuthor(element: HTMLElement): { authorName: string; username: string } {
    const nameBlock = element.querySelector('[data-testid="User-Name"]')
    const links = nameBlock?.querySelectorAll('a') ?? element.querySelectorAll('a[href^="/"]')

    let authorName = 'Unknown'
    let username = 'unknown'

    links.forEach((link) => {
      const href = link.getAttribute('href') ?? ''
      const profileMatch = href.match(/^\/([^/?]+)$/)
      if (profileMatch && !['home', 'explore', 'notifications', 'messages', 'i', 'search'].includes(profileMatch[1])) {
        username = profileMatch[1]
        const spans = link.querySelectorAll('span')
        spans.forEach((span) => {
          const t = span.textContent?.trim()
          if (t && !t.startsWith('@') && t.length > 1) authorName = t
        })
      }
    })

    // Fallback: parse from URL on status pages
    if (username === 'unknown') {
      const pathMatch = window.location.pathname.match(/^\/([^/]+)\/status\//)
      if (pathMatch) username = pathMatch[1]
    }

    return { authorName, username }
  }

  private extractTweetUrl(element: HTMLElement): string {
    const statusLink = element.querySelector<HTMLAnchorElement>('a[href*="/status/"]')
    if (statusLink?.href) return statusLink.href

    const timeParent = element.querySelector('time')?.closest('a') as HTMLAnchorElement | null
    if (timeParent?.href) return timeParent.href

    return window.location.href
  }

  private extractTweetId(url: string): string | null {
    const match = url.match(/status\/(\d+)/)
    return match?.[1] ?? null
  }

  private extractQuotedTweet(element: HTMLElement): TweetData | null {
    const nested = element.querySelectorAll('article[data-testid="tweet"], article[role="article"]')
    if (nested.length > 1) {
      return this.extractTweetData(nested[nested.length - 1] as HTMLElement)
    }
    return null
  }

  private extractThreadContext(element: HTMLElement): string[] {
    const timeline = element.closest('section') ?? element.parentElement
    if (!timeline) return []

    const tweets = timeline.querySelectorAll<HTMLElement>('article[data-testid="tweet"], article[role="article"]')
    const texts: string[] = []
    tweets.forEach((t) => {
      const data = this.extractTweetData(t)
      if (data?.text) texts.push(data.text)
    })
    return texts.slice(0, 5)
  }

  private hashText(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i)
      hash |= 0
    }
    return `hash_${Math.abs(hash)}`
  }

  private waitForComposer(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now()
      const check = () => {
        if (this.findComposer() || Date.now() - start > timeout) resolve()
        else requestAnimationFrame(check)
      }
      check()
    })
  }
}