# Twitter AI Reply Copilot — plan.md

## Overview

Build a Chrome Extension that acts as an AI-powered reply assistant for Twitter (X).

When the user opens or focuses on a tweet, the extension automatically analyzes the tweet and generates multiple high-quality reply suggestions.

The user can:

* Automatically generate replies when a tweet is focused.
* Manually regenerate replies.
* Edit a reply.
* Insert the reply into Twitter's reply composer.
* Optionally post automatically after confirmation (future feature).

The extension must be provider-agnostic and support any OpenAI-compatible or local LLM.

No backend server is required.

---

# Goals

Primary goals:

* Extremely fast.
* Beautiful UI.
* Zero setup beyond API key.
* Local-first architecture.
* Provider independent.
* Easy to extend.

Non-goals:

* Scheduling tweets.
* Analytics.
* Twitter API integration.
* User accounts.
* Cloud sync.

---

# High Level Architecture

```
Chrome Extension

├── Background Service Worker
│
├── Content Script
│
├── Side Panel
│
├── Popup
│
├── Options Page
│
└── Shared Core
```

Shared Core contains all business logic.

---

# Tech Stack

Language

* TypeScript

Framework

* React
* Vite

State

* Zustand

UI

* TailwindCSS
* shadcn/ui
* Lucide Icons

Animation

* Framer Motion

Validation

* Zod

Storage

* chrome.storage.local

Build

* CRXJS + Vite

---

# Folder Structure

```
src/

background/

content/

sidepanel/

popup/

options/

core/

providers/

components/

hooks/

utils/

styles/

assets/

types/
```

---

# Extension Flow

User opens Twitter.

↓

Content Script detects active tweet.

↓

Extract context.

↓

If Auto Generate enabled

Generate replies automatically.

Else

Display AI button.

↓

Display reply panel.

↓

User chooses reply.

↓

Reply inserted into composer.

↓

User reviews.

↓

User posts.

---

# Auto Detection

Use MutationObserver.

Detect:

* New tweet focused
* URL changes
* Infinite scrolling
* Modal tweet opened
* Reply dialog opened

Debounce:

500ms

Do not regenerate for same tweet twice.

Maintain cache.

---

# Tweet Extraction

Extract:

Tweet text

Author name

Username

Timestamp

Quoted tweet

Thread context

Conversation ID

Tweet URL

Image alt text (future)

Video indicator

Language

Return structured object.

---

# Context Builder

Context includes:

Current tweet

Previous tweet in thread

Quoted tweet

Author

Conversation

Detected language

User preferences

Writing style

Output format

---

# Prompt Builder

System Prompt

↓

Writing Style

↓

Context

↓

User Instructions

↓

Output Schema

Never hardcode prompts.

Prompt templates must be configurable.

---

# LLM Provider System

Create Provider interface.

```
Provider

initialize()

healthCheck()

generateReplies()

rewrite()

summarize()
```

Implement:

OpenAI

Anthropic

Gemini

Groq

OpenRouter

Ollama

LM Studio

Custom OpenAI Endpoint

Adding new providers should only require creating one class.

---

# Provider Settings

Provider

Endpoint

Model

API Key

Temperature

Top P

Max Tokens

Reply Count

Timeout

All configurable.

---

# Security

Never send API keys anywhere except provider endpoint.

Store configuration locally.

Support two storage modes.

Basic

Store in chrome.storage.local.

Secure

Encrypt API key using AES-GCM.

Encryption key derived from master password using PBKDF2.

Only ciphertext stored.

No plaintext persisted.

---

# Side Panel UI

Panel width

~380px

Sections

Header

Tweet Summary

Reply Cards

Tone Selector

Settings Shortcut

Footer

---

Header

Tweet Better

Current provider

Current model

Refresh button

Settings button

---

Tweet Summary

Small card

Author

Short summary

Detected tone

Language

---

Reply Cards

Each reply displayed as a card.

```
━━━━━━━━━━━━━━━━━━━━━━

Technical ⭐⭐⭐⭐⭐

Reply text...

[Insert]

[Copy]

━━━━━━━━━━━━━━━━━━━━━━
```

Hover reveals:

Estimated tone

Length

Reasoning label

No chain-of-thought.

---

Reply Generation

Default

3 replies

Configurable

1–10

Tones

Balanced

Technical

Professional

Friendly

Funny

Contrarian

Supportive

Curious

Custom Prompt

---

Loading

Beautiful skeleton loader.

Animated shimmer.

Progress indicator.

Estimated time.

---

Settings

General

Auto Generate

Generate on Focus

Manual Only

Open Side Panel Automatically

Dark Mode

Reply Count

Language

Provider

Provider

API Key

Endpoint

Model

Temperature

Timeout

Advanced

Custom Prompt

Writing Style

Debug Logs

Export Settings

Import Settings

Reset

---

Popup

Very small.

Shows

Provider

Connected

Current model

Open Settings

Open Side Panel

Nothing else.

---

Caching

Cache replies per Tweet ID.

TTL

15 minutes.

Avoid duplicate AI calls.

---

Rate Limiting

Ignore repeated focus events.

Debounce.

Cancel previous requests.

AbortController support.

---

Error Handling

Provider offline

Invalid API key

Timeout

Network failure

Rate limit

Malformed response

Each shown as elegant cards.

Never use browser alert().

---

Reply Workflow

Generate

↓

Display

↓

Insert

↓

User edits

↓

User clicks Post

No automatic posting in MVP.

---

DOM Interaction

Never depend on brittle selectors.

Create DOM abstraction.

TwitterAdapter

findFocusedTweet()

findReplyButton()

findComposer()

insertReply()

Future DOM changes only affect adapter.

---

Accessibility

Keyboard shortcuts

Alt+R

Generate

Alt+1

Insert first reply

Alt+2

Insert second

Alt+3

Insert third

Escape

Close panel

---

Performance

Lazy load provider SDKs.

Keep content script lightweight.

Maximum bundle size target

< 1.5 MB

Generation starts within 200ms after focus.

---

Telemetry

Disabled by default.

No analytics.

No external tracking.

---

Future Roadmap

V2

Thread summarization

Rewrite draft

Quote tweet generation

V3

Vision support

Image-aware replies

V4

Learn user's writing style from exported tweets

V5

Support additional social platforms

---

Acceptance Criteria

* Works on latest Chrome.
* Works on latest Twitter UI.
* Auto-generates replies on focused tweets.
* Manual generation available.
* Replies insert correctly into composer.
* Provider switching requires no code changes.
* API keys remain local.
* Responsive, polished UI.
* No backend required.
* Extension remains functional with both cloud providers and Ollama.
