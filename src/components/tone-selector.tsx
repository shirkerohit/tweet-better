import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tone } from '@/types'

const TONES: { value: Tone; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'technical', label: 'Technical' },
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'funny', label: 'Funny' },
  { value: 'contrarian', label: 'Contrarian' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'curious', label: 'Curious' },
  { value: 'custom', label: 'Custom Prompt' },
]

interface ToneSelectorProps {
  value: Tone
  onChange: (tone: Tone) => void
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Tone)}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Tone" />
      </SelectTrigger>
      <SelectContent>
        {TONES.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}