# DAGGER Instructions: Supabase & User Management

Welcome DAGGER! This document will guide you through the be-part-of.net Supabase setup and user management system. You'll be working alongside Claude on this consciousness network platform.

## Mission Overview

Your primary focus is on **Supabase authentication and user management**. The project currently has basic auth working, but needs significant improvements to properly link authenticated users to their network nodes and provide a complete user experience.

## Current State Analysis

### What's Working ✅
- **Basic Auth Flow:** Email/password authentication via Supabase
- **Protected Routes:** Middleware guards `/network` route
- **Session Management:** Supabase SSR package handles sessions
- **Database Schema:** Simple `nodes` and `edges` tables with RLS policies
- **Test Account:** kurt@cotoaga.net / !mp3riuMalphA works

### Critical Gaps ❌
1. **No User-Node Association:** When users sign up, no corresponding `node` is created
2. **No Profile Management:** Users can't edit their name, description, or other details
3. **Hard-coded Test Data:** Reset endpoint required to create nodes
4. **Missing Invitation Flow:** No way for users to invite others (invited_by chain)
5. **No User Context:** Logged-in user doesn't know which node represents them

## Project Architecture

### Tech Stack
- **Framework:** Next.js 14.2 (App Router)
- **Language:** TypeScript 5.6
- **Database:** Supabase (PostgreSQL)
- **Auth:** @supabase/ssr 0.5.1, @supabase/supabase-js 2.45.4

### Key Files You'll Work With

```
be-part-of-net/
├── app/
│   ├── page.tsx                    # Login page (your starting point)
│   ├── network/
│   │   └── page.tsx                # Main dashboard (needs user context)
│   └── api/
│       ├── auth/callback/route.ts  # Auth callback (add node creation here)
│       └── reset/route.ts          # Test data endpoint (reference for node creation)
├── components/
│   └── Auth/
│       └── LoginForm.tsx           # Sign in/up form (works, but no node creation)
├── lib/
│   └── supabase/
│       ├── client.ts               # Client-side Supabase instance
│       └── server.ts               # Server-side Supabase instance
├── middleware.ts                   # Route protection (working)
└── supabase/
    └── migrations/
        └── 100_fresh_start_schema.sql  # Database schema (READ THIS FIRST)
```

## Database Schema Deep Dive

### nodes Table
```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('person', 'url', 'mcp')),
  name TEXT NOT NULL,
  description TEXT,
  email TEXT,                      -- Person only (THIS SHOULD MATCH auth.users.email)
  url TEXT,                        -- URL/MCP only
  invited_by UUID REFERENCES nodes(id) ON DELETE SET NULL,  -- NULL = root node
  created_by UUID REFERENCES nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Insight:** The `email` field is how you'll link `auth.users` to `nodes`. When a user signs up, you need to:
1. Create a `node` with `type='person'`
2. Set `email` to match their `auth.users.email`
3. Set `invited_by` to the node ID of whoever invited them (or NULL for root)

### edges Table
```sql
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('invited', 'knowing', 'created', 'collaborates_on')),
  created_by UUID REFERENCES nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id, relation)
);
```

**Relation Hierarchy (strongest → weakest):**
- `invited`: Person invited another person (PERMANENT, cannot be deleted)
- `created`: Person created URL/MCP (PERMANENT, cannot be deleted)
- `collaborates_on`: Person collaborates on URL/MCP (deletable)
- `knowing`: Person knows person (deletable)

### RLS Policies
- Anyone can SELECT (read) nodes and edges
- Authenticated users can INSERT nodes and edges
- Users can UPDATE/DELETE nodes where `created_by = auth.uid()`
- Special rule: Can't DELETE person nodes
- Special rule: Can't DELETE edges with `relation='invited'`

**IMPORTANT:** The RLS policies currently reference `auth.uid()` but there's NO LINK between `auth.users.id` and `nodes.id`. You need to establish this link.

## Your Mission: Priority Tasks

### 🎯 Priority 1: Auto-Create Node on Signup (CRITICAL)

**Goal:** When a user signs up, automatically create a `person` node linked to their account.

**Where to implement:**
- Option A: Database trigger on `auth.users` insert
- Option B: `/api/auth/callback/route.ts` (after Supabase redirects)
- Option C: Custom signup endpoint that wraps Supabase auth

**Recommended approach: Database Trigger**
```sql
-- Create function to auto-create node
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.nodes (type, name, email, created_by, invited_by)
  VALUES (
    'person',
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.id,
    NULL  -- TODO: Get this from invite token
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Migration file to create:** `supabase/migrations/101_auto_create_user_nodes.sql`

### 🎯 Priority 2: User Context Helper

**Goal:** Create a utility function to get the current user's node.

**File to create:** `lib/supabase/getUserNode.ts`

```typescript
import { createClient } from './server'
import type { Node } from '@/types'

export async function getUserNode(): Promise<Node | null> {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  // Find their node by email
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('*')
    .eq('type', 'person')
    .eq('email', user.email)
    .single()

  if (nodeError) return null
  return node as Node
}
```

**Then use it in:** `app/network/page.tsx` to center the graph on the user's node.

### 🎯 Priority 3: Profile Management UI

**Goal:** Let users edit their node information.

**New component to create:** `components/ProfilePanel.tsx`

**Features needed:**
- Display current name, description
- Editable form
- Save button that updates `nodes` table
- Only allow editing their own node (use `created_by` check)

**API endpoint to create:** `app/api/profile/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, description } = await request.json()

  // Update node where email matches user's email
  const { data, error } = await supabase
    .from('nodes')
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq('email', user.email)
    .eq('type', 'person')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ node: data })
}
```

### 🎯 Priority 4: Invitation System

**Goal:** Users can invite others, creating the `invited_by` chain.

**Approach:**
1. Generate invite tokens (store in new `invitations` table)
2. Create invite link: `https://be-part-of-net.vercel.app/?invite=TOKEN`
3. On signup, check for invite token
4. Set `invited_by` to inviter's node ID
5. Create `invited` edge from inviter → invitee

**New table needed:**
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  inviter_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  invitee_email TEXT,  -- Optional: restrict to specific email
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration file:** `supabase/migrations/102_invitation_system.sql`

### 🎯 Priority 5: Link auth.users ↔ nodes

**Problem:** RLS policies use `auth.uid()` but `nodes.created_by` is a UUID with no guaranteed link.

**Solution:** Make `nodes.created_by` reference `auth.users.id` instead of `nodes.id`.

**Schema change needed:**
```sql
-- Drop old foreign key
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_created_by_fkey;

-- Add new foreign key to auth.users
ALTER TABLE nodes ADD CONSTRAINT nodes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
```

**Warning:** This is a breaking change. Coordinate with Claude before implementing.

## Testing Strategy

### Test Account
- Email: kurt@cotoaga.net
- Password: !mp3riuMalphA
- Has node ID in test data (see `/api/reset`)

### Test Scenarios
1. **New Signup:** Create new account, verify node is auto-created
2. **Profile Edit:** Update name/description, verify changes persist
3. **Invitation:** Generate invite link, signup with it, verify `invited_by` chain
4. **RLS Policies:** Try to edit another user's node (should fail)
5. **Graph Centering:** Verify graph centers on logged-in user's node

### Local Development
```bash
# Start dev server
npm run dev

# Check Supabase connection
# Should see no console errors at http://localhost:3000

# Test auth flow
# 1. Sign out (if logged in)
# 2. Sign up with new email
# 3. Check Supabase Studio → nodes table
# 4. Verify new node exists with matching email
```

## Coordination with Claude

### What Claude is Working On
- 3D graph visualization
- Force-directed physics
- UI components (GraphCanvas, Node3D, Edge3D)
- Camera controls and fog-of-war

### What You Own
- All Supabase migrations
- Auth flow improvements
- User management features
- Database schema changes (coordinate before applying)
- RLS policy updates

### Communication Protocol
- **Before schema changes:** Ask Claude if any code depends on current schema
- **After migrations:** Tell Claude which tables/columns changed
- **New API endpoints:** Document in CLAUDE.md under "Application Routes"
- **Type changes:** Update `types/index.ts` and notify Claude

## Environment Setup

### Prerequisites
- Node.js 22 (see `.nvmrc`)
- npm
- Supabase CLI (optional, for migrations)

### Environment Variables
Already configured in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Supabase Studio
- Access at: [your-supabase-url]/project/[project-id]
- Use for:
  - Viewing tables
  - Running SQL queries
  - Testing RLS policies
  - Managing auth users

## Migration Workflow

### Creating Migrations
```bash
# Create new migration file
# supabase/migrations/[NUMBER]_[description].sql

# Example: supabase/migrations/101_auto_create_user_nodes.sql
```

### Applying Migrations
```bash
# Option 1: Supabase CLI (if installed)
supabase db push

# Option 2: Supabase Studio SQL Editor
# Copy-paste migration SQL and run
```

### Migration Numbering
- Last migration: `100_fresh_start_schema.sql`
- Your migrations: Start at `101_` and increment

## Code Style & Conventions

### TypeScript
- Strict mode enabled
- Use types from `types/index.ts`
- No `any` types
- Async/await over promises

### React
- Server Components by default
- Use `'use client'` only when needed
- Hooks at component top level

### Supabase
- Import from `@/lib/supabase/server` in server components
- Import from `@/lib/supabase/client` in client components
- Always check for errors in responses

### Naming
- Components: PascalCase
- Files: PascalCase for components, camelCase for utilities
- Database: snake_case
- Types: PascalCase interfaces

## Quick Reference

### Get Current User (Server)
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Get Current User (Client)
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Query with RLS
```typescript
// RLS automatically filters by auth.uid()
const { data, error } = await supabase
  .from('nodes')
  .select('*')
  .eq('type', 'person')
```

### Insert Node
```typescript
const { data, error } = await supabase
  .from('nodes')
  .insert({
    type: 'person',
    name: 'Alice',
    email: 'alice@example.com',
    created_by: user.id,
    invited_by: inviterNodeId
  })
  .select()
  .single()
```

## Resources

### Documentation
- Supabase Docs: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app
- Supabase Auth: https://supabase.com/docs/guides/auth
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security

### Project Files to Read First
1. `CLAUDE.md` - Full project context
2. `supabase/migrations/100_fresh_start_schema.sql` - Database schema
3. `lib/supabase/server.ts` - Server-side Supabase setup
4. `app/api/reset/route.ts` - Example of creating nodes/edges
5. `types/index.ts` - TypeScript definitions

## Success Criteria

You'll know you're done when:
- [ ] New signups automatically create person nodes
- [ ] Users can edit their profile (name, description)
- [ ] Graph centers on logged-in user's node
- [ ] Invite links work and create `invited_by` chains
- [ ] RLS policies properly restrict access
- [ ] No manual reset endpoint needed for basic functionality
- [ ] Kurt can invite Alice, Alice can invite Bob (3-hop chain visible)

## Current Blockers

### None! You're Ready to Start

The codebase is clean, well-documented, and waiting for your auth expertise. Start with Priority 1 (auto-create nodes) and work your way down.

---

**Welcome to the team, DAGGER!** 🗡️

Questions? Check `CLAUDE.md` or ask Claude directly. We're building something unique here - the anti-social social network where every connection tells a story.

**Last Updated:** 2026-01-18
**Your Point of Contact:** Claude (your sibling AI)
**Project Status:** Fresh rebuild, ready for user management implementation
