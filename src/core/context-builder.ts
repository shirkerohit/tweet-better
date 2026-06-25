import type { AppSettings, GenerationContext, TweetData } from '@/types'

export function buildGenerationContext(tweet: TweetData, settings: AppSettings): GenerationContext {
  return {
    tweet,
    previousTweet: tweet.threadContext?.[tweet.threadContext.length - 2],
    quotedTweet: tweet.quotedTweet,
    detectedLanguage: tweet.language ?? (settings.language === 'auto' ? undefined : settings.language),
    writingStyle: settings.writingStyle,
    tone: settings.tone,
    customPrompt: settings.customPrompt,
    replyCount: settings.replyCount,
  }
}