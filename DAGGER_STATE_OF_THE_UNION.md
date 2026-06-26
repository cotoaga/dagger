# DAGGER — State of the Union
**Date:** 2026-06-26  
**Purpose:** Honest brief for Merlin CRG → fresh-start rebuild  
**Status of current codebase:** Inspirational archaeology, not a spec

---

## The Idea (Worth Keeping Forever)

DAGGER solves a real problem: **linear chat interfaces destroy complex thinking**. Every AI conversation tool forces a single thread. Deep work — research, architecture, creative exploration — doesn't happen in a line. It branches, merges, and forks.

DAGGER's answer:
- **Branch** a conversation into a parallel thread without losing the main one
- **Explore tangents** with full context, partial context, or a clean slate
- **Merge** insights back — either manually or with an AI synthesis pass
- **Navigate** the resulting thought-graph visually

The metaphor is knowledge cartography. You're mapping cognition, not scrolling a chat log.

**This idea is solid. The implementation is 1.5 years old and shows it.**

---

## What Currently Exists

### Tech Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + Vite 6 | ES modules, no TypeScript except prompts registry |
| Graph viz | Cytoscape.js + Dagre | Handles 100+ nodes, drag-to-merge works |
| AI | Claude API via Vercel edge proxy | `/api/chat` edge function |
| Auth | Supabase Auth (JWT) | Half-integrated — exists but not wired |
| DB | Supabase PostgreSQL + RLS | Schema exists, nothing writes to it |
| Crypto | Web Crypto API (AES-256-CBC) | encrypt/decrypt edge functions |
| Persistence | localStorage only | `dagger-conversations-v2` key |
| Deployment | Vercel | push-to-main = deploy |

### Current Model Support
```
claude-sonnet-4-6   (default)
claude-haiku-4-5    (fast, no extended thinking)
claude-opus-4-8     (most capable)
```

---

## Core Concepts Worth Preserving in the Rebuild

### 1. The Conversation Graph
Every conversation is a node. The graph has two layers:

**Main thread** — numbered sequentially: `0, 1, 2, 3…`  
**Branches** — hierarchical dot notation: `2.1.0`, `2.1.1`, `2.2.0`, `2.1.0.1.0`

This ID scheme is elegant and survives rendering at any depth without collision. Worth keeping.

**Conversation node shape (conceptual):**
```
id, displayNumber, prompt, response
parentId (null = main thread)
branchType: virgin | personality | knowledge
depth, timestamp, model, temperature
usage: { input_tokens, output_tokens, cached_tokens }
status: processing | complete | error
systemPrompt (branch-specific)
```

### 2. Three Branch Types
The taxonomy is genuinely useful:

| Type | Context inheritance | Use case |
|------|-------------------|----------|
| **Virgin** | None — clean slate | Completely different angle, no baggage |
| **Personality** | No history, custom system prompt | Same topic, different AI persona |
| **Knowledge** | Full parent chain | Deepen/continue with everything the parent knew |

This maps to real cognitive patterns. Keep it.

### 3. The Prompt System
XML-based personality and system prompts, registered via TypeScript, parsed in-browser with DOMParser. Direct file editing = version-controlled prompt evolution.

**Current prompts:**
- `khaos-navigator-v7` — broad exploration (default)
- `khaos-specialist-v7` — focused problem-solving
- `vanilla-claude` — baseline Claude
- `khaos-synthesizer-v7` — full branch synthesis (merge)
- `khaos-squeezer-v7` — 200-word executive summary (merge)
- `dagger-root-system` — prepended to all conversations

### 4. Merge Strategies
Two AI-assisted merge modes are defined:
- **Synthesize** — comprehensive integration of both branches
- **Squeeze** — 200-word executive summary

Currently triggered in graph view by dragging a node onto another. The UX is novel but needs polish.

### 5. Three Views
- **Linear** — traditional conversation list, main thread or current branch
- **Graph** — Cytoscape DAG, full topology visible, drag-to-merge
- **Prompts** — browse/launch prompt templates

These three views represent three cognitive modes. Worth keeping as the navigation model.

---

## What's Broken or Unfinished

### The Big Ones

**1. No real persistence**  
Everything lives in `localStorage`. The Supabase `conversations` table exists in the schema but nothing has ever written to it. Clear the browser = lose everything. No cross-device access.

**2. Auth is half-baked**  
`AuthScreen.jsx` and `SettingsScreen.jsx` were built during the v0.6.0 refactor but are not reachable from the app. Two competing auth flows coexist:
- Session key (user types API key on login screen → stored in memory)
- Supabase encrypted key (user stores key in DB → fetched per-request)

Neither is the "right" answer yet. No decision was made.

**3. App.jsx is a 1690-line monolith**  
The entire application — all event handlers, all render logic, all state — lives in one file. Context extraction was started (ConfigurationContext, SessionContext, UIContext, DebugContext were extracted) but all the *logic* still lives in App.jsx. It was written before hooks and proper React patterns were in use.

**4. No conversation sync to Supabase**  
Even if auth worked, conversations are not synced anywhere. The schema supports it; the code does not.

### The Smaller Ones

| Issue | Location |
|-------|----------|
| TokenCostService pricing table references old model IDs (4.5 series) | `TokenCostService.js` |
| Extended thinking beta header is deprecated (`interleaved-thinking-2025-05-14`) | `ClaudeAPI.js` |
| `checkProxyHealth()` references `response.ok` before `response` is defined | `ClaudeAPI.js:104` |
| `user_settings.default_model` DB default is retired model `claude-sonnet-4-5-20250929` | `schema.sql` |
| `useVisibleConversation` hook is disabled dead code | `hooks/` |
| Dev debug scaffolding mixed throughout production code | everywhere |
| Conversation export (markdown) implemented in GraphModel, no UI to trigger it | `GraphModel.js` |
| `from Kurt/` and `from Screens/` directories in repo root — working files that shouldn't be tracked | repo root |

---

## Current File Inventory (What Exists)

```
src/
├── App.jsx                     1690 lines — the monolith
├── contexts/
│   ├── UIContext.jsx            view, dark mode, modal state
│   ├── ConfigurationContext.jsx model, temperature, extended thinking
│   ├── SessionContext.jsx       API key lifecycle, 30-min timeout
│   └── DebugContext.jsx         dev-only
├── services/
│   ├── ClaudeAPI.js             Claude API client (singleton)
│   ├── MessageFormatter.js      single source of truth for message format
│   ├── ConfigService.js         key validation, backend config check
│   ├── BranchContextManager.js  context inheritance per branch type
│   ├── TokenCostService.js      cost calculation, stale pricing
│   ├── ConversationChainBuilder.js  legacy layer
│   └── TokenizerService.js      token counting
├── models/
│   ├── GraphModel.js            600+ lines, core data structure (singleton)
│   └── PromptsModel.js          prompt loading
├── components/
│   ├── DaggerInput.jsx          user input textarea
│   ├── DaggerOutput.jsx         rendered response + actions
│   ├── GraphView.jsx            Cytoscape graph
│   ├── SessionApiKeyInput.jsx   login screen (session key flow)
│   ├── TokenizerPopup.jsx       token analysis overlay
│   ├── WelcomeScreen.jsx        node 0, personality selection
│   ├── PromptsTab.jsx           prompt browser
│   ├── BranchMenu.jsx           branch type selector
│   ├── MergeMenu.jsx            merge strategy selector
│   ├── Auth/AuthScreen.jsx      Supabase login (not wired in)
│   ├── Settings/SettingsScreen.jsx  (not reachable)
│   ├── DebugPanel.jsx           dev only
│   ├── DebugToolbar.jsx         dev only
│   └── TestTemplatePanel.jsx    dev only
├── prompts/
│   ├── index.ts                 XML registry
│   ├── personality/*.xml        navigator, specialist, vanilla
│   └── system/*.xml             synthesizer, squeezer, root
├── lib/supabase/
│   ├── client.js                browser client
│   ├── server.js                edge function client + requireAuth()
│   └── admin.js                 service role (admin ops)
└── data/testTemplates.js        fictional test markers

api/
├── chat.js                      Claude API proxy (edge function)
├── encrypt-key.js               AES-256-CBC Web Crypto
└── decrypt-key.js               AES-256-CBC Web Crypto

supabase/
├── schema.sql                   3 tables: user_settings, conversations, merge_history
└── README.md
```

---

## The Database Schema (Good Bones)

### `user_settings`
Per-user config + encrypted API key storage.
```sql
user_id, encrypted_api_key, default_model, default_temperature,
default_personality, use_root_prompt, use_extended_thinking
```

### `conversations`
Full conversation tree persistence.
```sql
id (UUID, matches GraphModel), user_id, display_number,
prompt, response, system_prompt,
parent_id (self-FK for branching), branch_type, depth,
model, temperature, personality_id, status,
token_count, processing_time
```

### `merge_history`
Audit trail for merge operations.
```sql
source_conversation_id, target_conversation_id, merge_conversation_id,
synthesizer_used
```

RLS on all three tables. Schema is solid. Nothing writes to it.

---

## What the Rebuild Needs to Get Right

These are observations, not prescriptions — CRG input only:

**1. Auth first, everything else second**  
The whole product collapses without a decided, working auth flow. Session key vs. Supabase stored key is still an open question. Pick one lane.

**2. Persistence before features**  
localStorage is a prototype tool. A graph-based knowledge tool with no persistence is a toy. Supabase sync should be the foundation, not an afterthought.

**3. App.jsx cannot be the architecture**  
The rebuild needs a clear component hierarchy before a line is written. Handlers and state belong in hooks or services, not the root component.

**4. The graph model is the product**  
Everything else is UI scaffolding around `GraphModel`. The rebuild should treat the graph as the core abstraction and build UI on top, not the reverse.

**5. Clean dev/prod separation**  
Debug tooling, test templates, and dev scaffolding should never touch production code paths.

---

## Dependencies (Keep / Reconsider)

| Dependency | Verdict | Reason |
|-----------|---------|--------|
| React + Vite | Keep | No reason to change |
| Cytoscape.js | Keep | Best-in-class graph viz for this use case |
| Supabase | Keep | Already integrated, RLS is right for this product |
| `@supabase/ssr` | Keep | Edge function auth support |
| `react-markdown` + syntax highlighter | Keep | Renders AI output correctly |
| `react-textarea-autosize` | Keep | Small, useful |
| `uuid` | Keep | Stable node IDs |
| `cytoscape-dagre` | Keep | Layout algorithm fits the DAG model |
| TypeScript | Consider expanding | Only the prompts registry uses TS currently |

---

## Summary for Merlin

DAGGER's **concept** is 18 months ahead of the implementation. The graph-shaped conversation model, three branch types, and merge-with-AI-synthesis are genuinely novel and worth rebuilding cleanly.

The current codebase is a pre-workflow, pre-Pact, pre-Supabase prototype that evolved by accretion. It demonstrates the idea but cannot be extended without constant archaeology.

**The rebuild should treat the current code as:**
- ✅ Reference for the data model (conversation node shape, branch ID scheme)
- ✅ Reference for the three branch types and their context inheritance rules
- ✅ Reference for the prompt system architecture (XML + registry)
- ✅ Reference for the three-view UX pattern (linear / graph / prompts)
- ❌ Not a source for component structure
- ❌ Not a source for state management patterns
- ❌ Not a source for auth/persistence design

Start with auth + persistence + graph model. Build UI on top of those. Ship incrementally per the Loop.

---

*Three minds, one Loop, closed learning. Vision dreams it, Strategy boxes it, Tactics ships it.*  
🏴‍☠️
