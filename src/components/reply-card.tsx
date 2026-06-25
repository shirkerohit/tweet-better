import { motion } from 'framer-motion'
import { Copy, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ReplySuggestion } from '@/types'

interface ReplyCardProps {
  reply: ReplySuggestion
  index: number
  onInsert: (text: string) => void
}

function ToneStars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  )
}

export function ReplyCard({ reply, index, onInsert }: ReplyCardProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(reply.text)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="group overflow-hidden border-border/60 hover:border-primary/40 transition-colors">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{reply.toneLabel}</Badge>
              <ToneStars count={reply.toneStars} />
            </div>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {reply.estimatedLength} · {reply.reasoningLabel}
            </span>
          </div>

          {editing ? (
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => setEditing(false)}
              autoFocus
            />
          ) : (
            <p className="text-sm leading-relaxed">{text}</p>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={() => onInsert(text)} className="flex-1">
              Insert
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <PenLine className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}