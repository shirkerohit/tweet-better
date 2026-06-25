import type { GenerationContext, Tone } from '@/types'

export const SYSTEM_PROMPT_TEMPLATE = `You are an expert Twitter (X) reply assistant. Generate authentic, engaging replies that feel natural — not robotic or overly formal.

Rules:
- Keep replies concise (Twitter-friendly length)
- Match the requested tone and writing style
- Never use hashtags unless contextually appropriate
- Never include chain-of-thought or meta commentary
- Each reply must be unique in approach
- Respond ONLY with valid JSON matching the schema`

export const TONE_DESCRIPTIONS: Record<Tone, string> = {
  balanced: 'balanced and thoughtful',
  technical: 'technical and insightful',
  professional: 'professional and polished',
  friendly: 'warm and friendly',
  funny: 'witty and humorous',
  contrarian: 'thoughtfully contrarian',
  supportive: 'encouraging and supportive',
  curious: 'genuinely curious and inquisitive',
  custom: 'as specified in custom instructions',
}

export const OUTPUT_SCHEMA = `{
  "replies": [
    {
      "text": "the reply text",
      "tone": "balanced|technical|professional|friendly|funny|contrarian|supportive|curious|custom",
      "toneLabel": "short tone label e.g. Technical",
      "toneStars": 1-5,
      "estimatedLength": "short|medium|long",
      "reasoningLabel": "brief label like Insightful take"
    }
  ],
  "detectedTone": "detected tone of original tweet",
  "detectedLanguage": "ISO language code",
  "summary": "one-line summary of the tweet"
}`

export function buildUserPrompt(context: GenerationContext): string {
  const { tweet, previousTweet, quotedTweet, detectedLanguage, writingStyle, tone, customPrompt, replyCount } =
    context

  const parts: string[] = [
    `Generate exactly ${replyCount} reply suggestions for this tweet.`,
    '',
    '## Tweet',
    `Author: ${tweet.authorName} (@${tweet.username})`,
    `Text: ${tweet.text}`,
    tweet.url ? `URL: ${tweet.url}` : '',
  ]

  if (quotedTweet) {
    parts.push('', '## Quoted Tweet', `Author: ${quotedTweet.authorName} (@${quotedTweet.username})`, `Text: ${quotedTweet.text}`)
  }

  if (previousTweet) {
    parts.push('', '## Previous in Thread', previousTweet)
  }

  if (tweet.threadContext?.length) {
    parts.push('', '## Thread Context', ...tweet.threadContext.map((t, i) => `${i + 1}. ${t}`))
  }

  parts.push(
    '',
    '## Preferences',
    `Tone: ${TONE_DESCRIPTIONS[tone]}`,
    `Writing style: ${writingStyle}`,
    detectedLanguage ? `Language: ${detectedLanguage}` : 'Language: match the tweet language',
  )

  if (customPrompt) {
    parts.push('', '## Custom Instructions', customPrompt)
  }

  parts.push('', '## Output Schema', OUTPUT_SCHEMA)

  return parts.filter(Boolean).join('\n')
}