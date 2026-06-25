import type { ActivityLogEntry } from '@/core/activity-log'

let panel: HTMLDivElement | null = null
let listEl: HTMLDivElement | null = null
let expanded = true

const LEVEL_COLORS: Record<ActivityLogEntry['level'], string> = {
  info: '#60a5fa',
  success: '#22c55e',
  warn: '#f59e0b',
  error: '#ef4444',
  step: '#1d9bf0',
}

function ensurePanel() {
  if (panel) return

  panel = document.createElement('div')
  panel.id = 'twitter-ai-copilot-log'
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '80px',
    right: '24px',
    width: '340px',
    maxHeight: expanded ? '240px' : '32px',
    zIndex: '99998',
    background: 'rgba(15,20,25,0.95)',
    border: '1px solid rgba(29,155,240,0.4)',
    borderRadius: '12px',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '11px',
    color: '#e7e9ea',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    overflow: 'hidden',
    transition: 'max-height 0.2s',
  })

  const header = document.createElement('div')
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    background: 'rgba(29,155,240,0.15)',
    cursor: 'pointer',
    userSelect: 'none',
  })
  header.innerHTML = `<span style="font-weight:600;color:#1d9bf0">⚡ Copilot Log</span><span id="copilot-log-toggle" style="opacity:0.6">▼</span>`
  header.addEventListener('click', () => {
    expanded = !expanded
    panel!.style.maxHeight = expanded ? '240px' : '32px'
    const toggle = panel!.querySelector('#copilot-log-toggle')
    if (toggle) toggle.textContent = expanded ? '▼' : '▲'
  })

  listEl = document.createElement('div')
  Object.assign(listEl.style, {
    overflowY: 'auto',
    maxHeight: '200px',
    padding: '6px 8px',
  })

  panel.appendChild(header)
  panel.appendChild(listEl)
  document.body.appendChild(panel)
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function appendPageLog(entry: ActivityLogEntry) {
  ensurePanel()
  if (!listEl) return

  const line = document.createElement('div')
  Object.assign(line.style, {
    marginBottom: '4px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
  })

  const color = LEVEL_COLORS[entry.level]
  line.innerHTML = `<span style="color:#71767b">${formatTime(entry.timestamp)}</span> <span style="color:${color}">${entry.message}</span>`
  if (entry.detail) {
    line.innerHTML += `<div style="color:#71767b;margin-left:8px;font-size:10px">${entry.detail}</div>`
  }

  listEl.insertBefore(line, listEl.firstChild)
  while (listEl.children.length > 30) listEl.removeChild(listEl.lastChild!)
}

export function showPageToast(message: string, level: ActivityLogEntry['level'] = 'info') {
  appendPageLog({
    id: String(Date.now()),
    timestamp: Date.now(),
    level,
    source: 'content',
    message,
  })
}