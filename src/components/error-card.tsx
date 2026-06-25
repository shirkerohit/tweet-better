import { AlertCircle, WifiOff, KeyRound, Clock, ServerCrash } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { ProviderErrorCode } from '@/types'

const ERROR_CONFIG: Record<ProviderErrorCode, { icon: typeof AlertCircle; title: string; hint: string }> = {
  offline: { icon: WifiOff, title: 'Provider Offline', hint: 'Check your endpoint URL and network connection.' },
  invalid_api_key: { icon: KeyRound, title: 'Invalid API Key', hint: 'Update your API key in Settings.' },
  timeout: { icon: Clock, title: 'Request Timed Out', hint: 'Try increasing the timeout or using a faster model.' },
  network: { icon: WifiOff, title: 'Network Error', hint: 'Check your internet connection.' },
  rate_limit: { icon: AlertCircle, title: 'Rate Limited', hint: 'Wait a moment and try again.' },
  malformed_response: { icon: ServerCrash, title: 'Invalid Response', hint: 'The model returned an unexpected format.' },
  unknown: { icon: AlertCircle, title: 'Something Went Wrong', hint: 'Check settings and try again.' },
}

interface ErrorCardProps {
  code: ProviderErrorCode
  message: string
}

export function ErrorCard({ code, message }: ErrorCardProps) {
  const config = ERROR_CONFIG[code] ?? ERROR_CONFIG.unknown
  const Icon = config.icon

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 flex gap-3">
        <Icon className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">{config.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{message || config.hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}