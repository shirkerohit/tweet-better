import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Twitter AI Reply Copilot',
  version: '0.2.5',
  description: 'Select tweet text → Generate AI replies → Copy and paste. Works with any LLM.',
  permissions: ['storage', 'sidePanel', 'activeTab', 'tabs', 'contextMenus'],
  host_permissions: [
    'https://x.com/*',
    'https://twitter.com/*',
    'http://localhost:11434/*',
    'http://127.0.0.1:11434/*',
    'http://localhost:1234/*',
    'http://127.0.0.1:1234/*',
    'https://openrouter.ai/*',
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    'https://generativelanguage.googleapis.com/*',
    'https://api.groq.com/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://x.com/*', 'https://twitter.com/*'],
      js: ['src/content/content-script.js'],
      run_at: 'document_end',
    },
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Tweet Better',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  icons: {
    16: 'src/assets/icon-16.png',
    48: 'src/assets/icon-48.png',
    128: 'src/assets/icon-128.png',
  },
})