import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ActivityLogEntry } from '@/core/activity-log'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

const LEVEL_STYLES: Record<ActivityLogEntry['level'], string> = {
  info: 'text-blue-400',
  success: 'text-green-500',
  warn: 'text-amber-500',
  error: 'text-red-500',
  step: 'text-primary',
}

const LEVEL_DOTS: Record<ActivityLogEntry['level'], string> = {
  info: 'bg-blue-400',
  success: 'bg-green-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500',
  step: 'bg-primary',
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface ActivityLogPanelProps {
  logs: ActivityLogEntry[]
  onClear?: () => void
  compact?: boolean
  maxHeight?: string
  defaultExpanded?: boolean
}

export function ActivityLogPanel({
  logs,
  onClear,
  compact,
  maxHeight = '200px',
  defaultExpanded = false,
}: ActivityLogPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold hover:text-foreground text-muted-foreground transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Activity Log
          {!expanded && logs.length > 0 && (
            <span className="font-normal text-muted-foreground">({logs.length})</span>
          )}
        </button>
        {onClear && expanded && (
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onClear}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {expanded && (
      <div className="overflow-y-auto p-2 space-y-1 font-mono" style={{ maxHeight }}>
        {logs.length === 0 && (
          <p className="text-[10px] text-muted-foreground px-1 py-2">No activity yet. Click Generate or AI Reply.</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className={cn('text-[10px] leading-tight px-1 py-0.5 rounded', compact && 'truncate')}>
            <div className="flex items-start gap-1.5">
              <span className={cn('mt-1 h-1.5 w-1.5 rounded-full shrink-0', LEVEL_DOTS[log.level])} />
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground">{formatTime(log.timestamp)}</span>
                <span className="text-muted-foreground mx-1">[{log.source}]</span>
                <span className={cn('font-medium', LEVEL_STYLES[log.level])}>{log.message}</span>
                {log.detail && !compact && (
                  <p className="text-muted-foreground mt-0.5 break-all whitespace-pre-wrap">{log.detail}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}