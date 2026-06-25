import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TweetData } from '@/types'

interface TweetSummaryProps {
  tweet: TweetData | null
  summary?: string
  detectedTone?: string
  detectedLanguage?: string
}

export function TweetSummary({ tweet, summary, detectedTone, detectedLanguage }: TweetSummaryProps) {
  if (!tweet) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Focus on a tweet to get started
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{tweet.authorName}</span>
          <span className="text-muted-foreground text-xs">@{tweet.username}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {summary ?? tweet.text}
        </p>
        <div className="flex gap-2 flex-wrap">
          {detectedTone && <Badge variant="outline">{detectedTone}</Badge>}
          {detectedLanguage && <Badge variant="outline">{detectedLanguage}</Badge>}
        </div>
      </CardContent>
    </Card>
  )
}