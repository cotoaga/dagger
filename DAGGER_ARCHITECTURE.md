# DAGGER Architecture Report
**Version:** 0.6.0 (refactoring session active)  
**Date:** 2026-06-18  
**Purpose:** Baseline for Linear-ticket-driven development workflow

---

## 1. What DAGGER Is

DAGGER is a distributed cognition tool: a React SPA that turns AI conversations into a navigable graph instead of a linear chat. Users can branch conversations, explore tangents in parallel, and merge insights back. It sits on top of the Claude API via a Vercel edge proxy.

**Production URL:** https://dagger.be-part-of.net  
**Stack:** React 19 + Vite 6 → Vercel Edge Functions → Claude API + Supabase

---

## 2. Directory Map

```
dagger/
├── api/                        # Vercel edge functions
│   ├── chat.js                 # Claude API proxy (main entry for all LLM calls)
│   ├── encrypt-key.js          # AES-256-CBC key encryption (Web Crypto)
│   └── decrypt-key.js          # AES-256-CBC key decryption (Web Crypto)
├── src/
│   ├── App.jsx                 # ⚠️ 1690 lines — monolith, primary refactor target
│   ├── main.jsx                # React DOM entry
│   ├── App.css
│   ├── contexts/               # React Context providers
│   │   ├── UIContext.jsx       # View state, dark mode, modal state
│   │   ├── ConfigurationContext.jsx  # Model, temperature, extended thinking
│   │   ├── SessionContext.jsx  # API key lifecycle, session timeout
│   │   └── DebugContext.jsx    # Dev-only debug panel state
│   ├── services/               # Business logic, external integrations
│   │   ├── ClaudeAPI.js        # Claude API client (singleton)
│   │   ├── MessageFormatter.js # Single source of truth for Claude message format
│   │   ├── ConfigService.js    # Backend config checks, key validation
│   │   ├── BranchContextManager.js  # Context inheritance for branches
│   │   ├── TokenCostService.js # Token cost calculation + pricing db
│   │   ├── ConversationChainBuilder.js  # Build message chains (legacy layer)
│   │   └── TokenizerService.js # Token counting utility
│   ├── models/
│   │   ├── GraphModel.js       # Core conversation data structure (singleton)
│   │   └── PromptsModel.js     # Prompt loading/parsing
│   ├── components/
│   │   ├── DaggerInput.jsx     # User input textarea
│   │   ├── DaggerOutput.jsx    # Rendered response with actions
│   │   ├── GraphView.jsx       # Cytoscape.js graph visualization
│   │   ├── SessionApiKeyInput.jsx   # Login: direct API key entry
│   │   ├── TokenizerPopup.jsx  # Token analysis overlay
│   │   ├── WelcomeScreen.jsx   # Node 0 personality selection
│   │   ├── PromptsTab.jsx      # Prompt browser
│   │   ├── BranchMenu.jsx      # Branch type selector modal
│   │   ├── MergeMenu.jsx       # Merge strategy selector
│   │   ├── Auth/
│   │   │   └── AuthScreen.jsx  # Supabase auth (login/signup)
│   │   ├── Settings/
│   │   │   └── SettingsScreen.jsx  # User settings, encrypted key storage
│   │   ├── DebugPanel.jsx      # Dev: conversation state inspector
│   │   ├── DebugToolbar.jsx    # Dev: quick toggle buttons
│   │   └── TestTemplatePanel.jsx   # Dev: load test conversation fixtures
│   ├── prompts/
│   │   ├── index.ts            # XML prompt registry
│   │   ├── personality/        # User-facing AI personalities (XML)
│   │   │   ├── khaos-navigator-v7.xml
│   │   │   ├── khaos-specialist-v7.xml
│   │   │   └── vanilla-claude.xml
│   │   ├── system/             # Merge & synthesis prompts (XML)
│   │   │   ├── khaos-synthesizer-v7.xml
│   │   │   ├── khaos-squeezer-v7.xml
│   │   │   └── dagger-root-system.xml
│   │   └── decommissioned/     # Legacy prompts (reference only)
│   ├── lib/supabase/
│   │   ├── client.js           # Browser Supabase client
│   │   ├── server.js           # Edge function Supabase client + requireAuth()
│   │   └── admin.js            # Service-role client (admin ops)
│   ├── data/
│   │   └── testTemplates.js    # Fictional test markers for context testing
│   ├── hooks/
│   │   └── useVisibleConversation.js  # Intersection observer (currently disabled)
│   └── utils/
│       ├── logger.js           # Environment-aware console logger
│       └── viewSyncHelpers.js
├── supabase/
│   ├── schema.sql              # DB schema (3 tables)
│   └── README.md
├── vercel.json                 # Deployment config (maxDuration 300s for /api/chat)
├── vite.config.js              # Manual chunk splitting
└── package.json                # v0.5.0, React 19, Supabase, Cytoscape
```

---

## 3. Context Layer

Four React Context providers wrap the app in `App.jsx`. Consumers use `useContext()`.

### UIContext
Owns all view/modal state. Nothing async.

| State | Type | Default | Notes |
|-------|------|---------|-------|
| `currentView` | `'linear' \| 'graph' \| 'prompts'` | `'linear'` | Persisted to localStorage |
| `darkMode` | boolean | `false` | Persisted to localStorage |
| `showWelcomeScreen` | boolean | `true` | Node 0 indicator |
| `selectedPersonality` | string\|null | `null` | Active personality ID |
| `showBranchMenu` | boolean | `false` | Branch modal visibility |
| `branchSourceId` | string\|null | `null` | Source node for branch |
| `tokenizerState` | object | closed | `{isOpen, content, conversationId}` |

### ConfigurationContext
Owns AI model config. Changes sync immediately to `ClaudeAPI` singleton.

| State | Type | Default | Notes |
|-------|------|---------|-------|
| `selectedModel` | string | `'claude-sonnet-4-6'` | Syncs to ClaudeAPI.setModel() |
| `temperature` | number | `0.7` | Persisted to localStorage |
| `extendedThinking` | boolean | `false` | Syncs to ClaudeAPI.setExtendedThinking() |
| `useRootPrompt` | boolean | `true` | Prepend dagger-root-system.xml |

### SessionContext
Owns API key lifecycle. Two competing auth flows exist (see §8 Known Issues).

| State | Type | Notes |
|-------|------|-------|
| `sessionApiKey` | string | Volatile — entered by user, cleared on close/timeout |
| `apiKeyConfigured` | boolean | Gate for showing main app vs. login screen |
| `configurationLoading` | boolean | Initial check |
| `lastActivity` | number | Timestamp, reset on user interaction |

**Session timeout:** 30 minutes of inactivity → clears `sessionApiKey`, sets `apiKeyConfigured = false`

### DebugContext (DEV only)
| State | Notes |
|-------|-------|
| `debugPanelVisible` | Toggled with Ctrl+Shift+D |
| `templatePanelVisible` | Toggled with Ctrl+T |
| `selectedConversationId` | Conversation being inspected |

---

## 4. Services

### ClaudeAPI.js (Singleton)
The only place that talks to the Claude API proxy.

**Key responsibility:** `sendMessage(history, userInput, options)` → Claude response

**API key resolution order:**
1. `this.sessionApiKey` (set by user on login screen)
2. `fetchApiKeyFromSupabase()` → calls `/api/decrypt-key` (cached per session)

**Available models:**
```
claude-sonnet-4-6   → default
claude-haiku-4-5    → fast/cheap (no extended thinking)
claude-opus-4-8     → most capable
```

**`sendMessage` returns:**
```js
{
  content: string,
  processingTime: number,
  usage: { input_tokens, output_tokens, cache_creation_input_tokens,
           cache_read_input_tokens, total_tokens },
  model: string,
  id: string,
  timestamp: number,
  messageCount: number,
  metadata: object
}
```

### MessageFormatter.js (Static)
**Single source of truth for Claude API message format.** Every API call goes through here.

Key methods:
- `buildConversationMessages(history, newInput, systemPrompt)` — formats full message array
- `validateMessages(messages)` — strict alternating user/assistant check
- `extractConversationHistory(conversations, threadId, branchContext)` — builds chain per branch type

### GraphModel.js (Singleton)
All conversation data lives here. Persists to `localStorage` key `dagger-conversations-v2`.

**Conversation object shape:**
```js
{
  id: UUID,
  displayNumber: '0' | '1' | '2.1.0' | '2.1.1' ...,
  prompt: string,
  response: string,
  timestamp: number,
  parentId: UUID | null,        // null = main thread
  branchType: 'virgin' | 'personality' | 'knowledge' | null,
  depth: number,
  model: string,
  temperature: number,
  usage: { input_tokens, output_tokens, ... },
  status: 'active' | 'processing' | 'complete' | 'error',
  systemPrompt?: string,        // branch-specific
  mergeSource?: UUID,
  mergeTarget?: UUID
}
```

**Branch ID scheme:** `parentDisplayNumber.branchIndex.0`  
Example: parent `2` → branch `2.1.0` → sub-branch `2.1.0.1.0`

### TokenCostService.js (Static)
Hardcoded pricing table for all models. Calculates per-call and session costs.

⚠️ **Stale:** Pricing table still references old model IDs (4.5 series). Needs update to match ClaudeAPI.MODELS.

### ConfigService.js (Static)
- Validates session API key format (`sk-ant-` prefix)
- Tests key with minimal API call
- Checks backend config (5-min cache)
- Dev mode: always returns `apiKeyConfigured: false` (no backend in local dev)

---

## 5. API Endpoints (Vercel Edge)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/chat` | x-session-api-key header | Forward to Claude API, transform messages |
| `POST /api/encrypt-key` | Supabase JWT | AES-256-CBC encrypt API key for storage |
| `POST /api/decrypt-key` | Supabase JWT | AES-256-CBC decrypt stored API key |

**`/api/chat` message transformation:**  
Extracts `system` role messages from the array → sends as top-level `system` param to Claude (required by Claude API format).

---

## 6. Database Schema (Supabase / PostgreSQL)

### `user_settings`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID (FK auth.users) | UNIQUE |
| `encrypted_api_key` | TEXT | `ivHex:ciphertextHex` format |
| `default_model` | TEXT | ⚠️ Default still `claude-sonnet-4-5-20250929` |
| `default_temperature` | FLOAT | Default 0.7 |
| `default_personality` | TEXT | |
| `use_root_prompt` | BOOLEAN | Default true |
| `use_extended_thinking` | BOOLEAN | Default true |

### `conversations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Matches GraphModel UUID |
| `user_id` | UUID (FK) | |
| `display_number` | TEXT | e.g. `2.1.0` |
| `prompt` / `response` | TEXT | |
| `parent_id` | UUID (FK self) | Branch parent |
| `branch_type` | TEXT | `virgin\|personality\|knowledge\|null` |
| `model` / `temperature` | TEXT / FLOAT | |
| `status` | TEXT | Default `complete` |

### `merge_history`
Tracks which conversations were merged, what synthesizer was used.

**RLS:** All tables enforce row-level security — users see only their own rows.

---

## 7. Conversation Flows

### Main Thread
```
User types → DaggerInput.onSubmit
  → App.handleNewConversation()
    → GraphModel.addConversation()     (creates node, displayNumber++)
    → MessageFormatter.buildMessages() (format history + new input)
    → ClaudeAPI.sendMessage()          (POST /api/chat)
      → Claude API → response
    → GraphModel.updateConversation()  (store response + usage)
    → React state update → DaggerOutput renders
```

### Branch
```
User clicks Branch button on DaggerOutput
  → UIContext.handleOpenBranchMenu(sourceId)
    → BranchMenu shown (virgin / personality / knowledge)
User selects type
  → App.handleCreateBranch(sourceId, type)
    → GraphModel.createBranch()        (hierarchical displayNumber)
    → currentBranchContext = "2.1"     (App state)
User types in branch
  → handleNewConversation() detects currentBranchContext
    → MessageFormatter.extractConversationHistory()
       (virgin = empty, personality = empty+systemPrompt, knowledge = full parent chain)
    → ClaudeAPI.sendMessage()
```

### Merge (Graph View)
```
User drags node onto target in GraphView
  → handleMergeNodes(sourceId, targetId, mergePrompt)
    → Optional: ClaudeAPI.sendMessage() with synthesizer/squeezer prompt
    → GraphModel.mergeNodes()          (marks source closed, logs in mergeHistory)
    → Graph rerenders without source branch
```

---

## 8. Known Issues & Tech Debt

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | **App.jsx is 1690 lines** — all handlers, all render logic, needs decomposition | High | `App.jsx` |
| 2 | **Two competing auth flows** — session key (current UI) and Supabase encrypted key (new backend). `setSessionApiKey` was missing, causing the TypeError crash | High | `ClaudeAPI.js`, `SessionContext.jsx` |
| 3 | **Stale model IDs in `user_settings` default** — DB schema defaults to old `claude-sonnet-4-5-20250929` | Medium | `supabase/schema.sql` |
| 4 | **TokenCostService pricing table out of date** — references 4.5-series model IDs | Medium | `TokenCostService.js` |
| 5 | **Extended thinking beta header is deprecated** — `interleaved-thinking-2025-05-14` should be removed; adaptive thinking is now standard | Medium | `ClaudeAPI.js` |
| 6 | **ConfigurationContext default model stale** — still `claude-sonnet-4-5-20250929` | Low | `ConfigurationContext.jsx` |
| 7 | **`checkProxyHealth()` is broken** — references `response.ok` before `response` is assigned | Low | `ClaudeAPI.js:104` |
| 8 | **`useVisibleConversation` hook disabled** — dead code | Low | `hooks/useVisibleConversation.js` |
| 9 | **Conversations not synced to Supabase** — `conversations` table exists in schema but nothing writes to it | High | `GraphModel.js` |
| 10 | **localStorage-only persistence** — loses all data on browser clear; no cross-device sync | High | `GraphModel.js` |

---

## 9. Prompts System

XML files in `src/prompts/` are imported as raw strings by Vite and parsed with `DOMParser` in the browser.

**Registry (`src/prompts/index.ts`)** exports:
- `getPrompt(id)` → `{metadata, systemPrompt}`
- `toLegacyFormat()` → backwards-compatible array

**Personality prompts** (user selects on Welcome Screen):
| ID | Name | Use |
|----|------|-----|
| `khaos-navigator-v7` | KHAOS Navigator | Default — broad exploration |
| `khaos-specialist-v7` | KHAOS Specialist | Focused problem-solving |
| `vanilla-claude` | Claude Classic | No personality layer |

**System prompts** (used during merge operations):
| ID | Name | Use |
|----|------|-----|
| `khaos-synthesizer-v7` | Synthesizer | Full branch synthesis |
| `khaos-squeezer-v7` | Squeezer | 200-word executive summary |
| `dagger-root-system` | Root System | Prepended to all conversations if `useRootPrompt = true` |

---

## 10. Build & Deployment

**Local dev:**
```bash
npm run dev      # localhost:5173 — UI only, no API calls work
npm test         # vitest
npm run build    # Production build → dist/
```

**Vite chunk splitting:**
- `react` chunk — React + ReactDOM
- `cytoscape` chunk — Cytoscape + Dagre
- `markdown` chunk — react-markdown + syntax-highlighter
- `index` chunk — application code

**Vercel:**
- Framework: Vite
- Edge functions: `api/` directory
- `/api/chat` timeout: 300s
- Env vars needed: `API_KEY_ENCRYPTION_SECRET`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (optional — session key takes priority)

---

## 11. Current Refactoring Session (v0.6.0)

**What was done in this session:**
- Extracted `ConfigurationContext`, `SessionContext`, `UIContext` from App.jsx
- Added `DebugContext` + `DebugPanel` + `DebugToolbar` (dev-only)
- Added `AuthScreen` (Supabase auth) and `SettingsScreen` (encrypted key storage)
- Added Supabase library layer (`src/lib/supabase/`)
- Added `api/encrypt-key.js` + `api/decrypt-key.js` edge functions
- Added `supabase/schema.sql` with 3-table schema
- Fixed model IDs to current versions (`claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-opus-4-8`)
- Fixed `setSessionApiKey` missing from `ClaudeAPI.js` (was causing TypeError crash)
- Fixed Node crypto → Web Crypto API for Vercel Edge compatibility

**What is NOT done yet (needs Linear tickets):**
- App.jsx decomposition (still 1690 lines)
- Supabase sync for conversations (schema exists, no writes)
- Auth flow integration (AuthScreen exists but not wired into app routing)
- Settings screen wiring (exists but not reachable from main UI)
- TokenCostService pricing table update
- Deprecated extended thinking header removal
- Cross-device sync / persistence beyond localStorage

---

## 12. Suggested Linear Ticket Areas

Based on the above, here are the natural work boundaries:

### Auth & Settings
- Wire `AuthScreen` into app boot flow (replace or complement `SessionApiKeyInput`)
- Wire `SettingsScreen` into main navigation
- Decide: session key OR Supabase key — unified flow

### Persistence
- Implement `GraphModel` → Supabase `conversations` table sync on save/load
- Add cross-device conversation loading on auth

### App.jsx Decomposition
- Extract `handleNewConversation` into a `ConversationService` or custom hook
- Extract branch handlers into `useBranch` hook
- Extract merge handlers into `useMerge` hook
- Target: App.jsx under 400 lines

### Cleanup
- Update `TokenCostService` pricing for current model IDs
- Remove deprecated extended thinking beta header
- Fix `checkProxyHealth()` broken reference
- Update `user_settings.default_model` DB default

### Features
- Conversation export (markdown export exists in GraphModel, no UI trigger)
- Search across conversations
- Conversation history sidebar / navigator
