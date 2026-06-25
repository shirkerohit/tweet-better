const OUR_UI_IDS = ['#tb-picker', '#tb-toolbar', '#tb-fab', '#tac-picker', '#tac-toolbar', '#tac-fab']

const COMPOSER_SELECTORS = [
  'div.public-DraftEditor-content[contenteditable="true"]',
  '[data-testid="tweetTextarea_0"] [contenteditable="true"]',
  '[data-testid="tweetTextarea_1"] [contenteditable="true"]',
  'div[data-testid^="tweetTextarea"] [contenteditable="true"]',
  '[data-testid="tweetTextarea_0"]',
  '[data-testid="tweetTextarea_1"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"][data-testid="dmComposerTextInput"]',
]

export function isOurUI(el: Element | null): boolean {
  if (!el || !('closest' in el)) return false
  return OUR_UI_IDS.some((id) => !!(el as HTMLElement).closest?.(id))
}

function isEditableElement(el: Element | null): el is HTMLElement {
  if (!el || el === document.body || el === document.documentElement || isOurUI(el)) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase()
    return ['text', 'search', 'email', 'url', 'tel', 'password', ''].includes(type)
  }
  const html = el as HTMLElement
  return (
    html.isContentEditable ||
    html.getAttribute('contenteditable') === 'true' ||
    html.getAttribute('role') === 'textbox'
  )
}

export function resolveEditableTarget(el: Element | null): HTMLElement | null {
  if (!el) return null
  if (isEditableElement(el)) return el
  const inner = el.querySelector<HTMLElement>(
    '[contenteditable="true"][role="textbox"], [contenteditable="true"], textarea, input[type="text"]',
  )
  return inner && isEditableElement(inner) ? inner : null
}

function dispatchInput(el: HTMLElement, text: string) {
  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
  } catch {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function hasComposerText(el: HTMLElement): boolean {
  return (el.innerText || el.textContent || (el as HTMLInputElement).value || '').trim().length > 0
}

export function setComposerText(el: HTMLElement, text: string): boolean {
  el.focus()

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = text
    dispatchInput(el, text)
    return hasComposerText(el)
  }

  try {
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      range.selectNodeContents(el)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    if (document.execCommand('insertText', false, text) && hasComposerText(el)) {
      dispatchInput(el, text)
      return true
    }
  } catch { /* fall through */ }

  try {
    el.focus()
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    el.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }),
    )
    if (hasComposerText(el)) {
      dispatchInput(el, text)
      return true
    }
  } catch { /* fall through */ }

  el.textContent = text
  dispatchInput(el, text)
  return hasComposerText(el)
}

export function findVisibleComposer(): HTMLElement | null {
  const active = resolveEditableTarget(document.activeElement)
  if (active && !isOurUI(active)) return active

  let best: HTMLElement | null = null
  let bestScore = -1

  for (const selector of COMPOSER_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      const el = resolveEditableTarget(node)
      if (!el || isOurUI(el)) return
      const rect = el.getBoundingClientRect()
      if (rect.width < 8 || rect.height < 8) return
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const score = rect.width * rect.height + rect.top * 2
      if (score > bestScore) {
        bestScore = score
        best = el
      }
    })
  }

  return best
}

export function findTweetArticle(node: Node | null): HTMLElement | null {
  let el = node && (node.nodeType === 3 ? (node.parentElement as HTMLElement | null) : (node as HTMLElement))
  while (el && el !== document.body) {
    if (el.matches?.('article[data-testid="tweet"], article[role="article"]')) return el
    el = el.parentElement
  }
  return null
}

function waitForComposer(timeoutMs: number): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      const composer = findVisibleComposer()
      if (composer) {
        resolve(composer)
        return
      }
      if (Date.now() - start > timeoutMs) {
        resolve(null)
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

export async function insertReplyText(
  text: string,
  tweetArticle?: HTMLElement | null,
): Promise<boolean> {
  const active = resolveEditableTarget(document.activeElement)
  if (active && !isOurUI(active)) {
    return setComposerText(active, text)
  }

  let composer = findVisibleComposer()
  if (composer) {
    return setComposerText(composer, text)
  }

  if (tweetArticle) {
    const replyBtn = tweetArticle.querySelector<HTMLElement>('[data-testid="reply"]')
    replyBtn?.click()
    composer = await waitForComposer(3500)
    if (composer) return setComposerText(composer, text)
  }

  return false
}