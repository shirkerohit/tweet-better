import { useEffect } from 'react'
import type { ExtensionMessage } from '@/types'

export function useExtensionMessages(handler: (message: ExtensionMessage) => void) {
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      handler(message)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [handler])
}