# DAGGER Supabase Setup

## Quick Start

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and project name
4. Wait for database provisioning (~2 minutes)

### 2. Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy entire contents of `supabase/schema.sql`
4. Paste and click **Run**
5. Verify tables created in **Table Editor**

### 3. Get API Keys

1. Go to **Settings** > **API**
2. Copy the following:
   - **Project URL** (e.g., `https://abcdefghij.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep secret!**

### 4. Generate Encryption Secret

For encrypting Claude API keys, generate a random 32-byte hex string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64 hex characters).

### 5. Configure Environment Variables

Create `.env.local` in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# API Key Encryption (32-byte hex string from step 4)
API_KEY_ENCRYPTION_SECRET=your-64-character-hex-string
```

### 6. Restart Dev Server

```bash
npm run dev
# or
vercel dev --listen 5173
```

## Database Tables

### `user_settings`
- **Purpose:** Store user preferences and encrypted API keys
- **Key Fields:**
  - `encrypted_api_key` - AES-256-CBC encrypted Claude API key
  - `default_model` - Preferred Claude model
  - `default_temperature` - Default creativity setting
  - `default_personality` - Default KHAOS prompt

### `conversations`
- **Purpose:** Persist conversation graph across sessions
- **Key Fields:**
  - `id` - Client-generated UUID (matches GraphModel)
  - `display_number` - Conversation numbering (e.g., "0.1.2")
  - `parent_id` - Reference to parent conversation
  - `branch_type` - 'virgin', 'personality', 'knowledge', or null

### `merge_history`
- **Purpose:** Track branch merge operations
- **Key Fields:**
  - `source_conversation_id` - Branch being merged
  - `target_conversation_id` - Merge destination
  - `merge_conversation_id` - Result conversation

## Security

### Row Level Security (RLS)
- ✅ **Enabled on all tables**
- ✅ Users can ONLY access their own data
- ✅ Service role bypasses RLS (admin only)

### API Key Encryption
- Claude API keys encrypted with AES-256-CBC
- Encryption happens server-side via edge function
- Secret stored in environment variable
- Never exposed to client

### Best Practices
- ❌ **NEVER** commit `.env.local` to git
- ❌ **NEVER** expose service role key to client
- ❌ **NEVER** use admin client in browser code
- ✅ Use browser client in React components
- ✅ Use server client in edge functions
- ✅ Always validate user input

## Testing

### Verify Setup

1. **Check Tables:**
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public';
   ```
   Should show: `user_settings`, `conversations`, `merge_history`

2. **Check RLS:**
   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```
   Should show 12+ policies

3. **Test Auth:**
   - Open DAGGER
   - Click "Sign Up"
   - Create account
   - Should redirect to settings

## Troubleshooting

### "Supabase not configured" warning
- Check `.env.local` exists in project root
- Verify environment variables are set correctly
- Restart dev server after adding variables

### "Missing Supabase environment variables"
- Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
- Variable names must start with `VITE_` for Vite to expose them
- Check Supabase dashboard for correct values

### "Unauthorized" errors
- User might not be signed in
- Check auth token in browser network tab
- Verify RLS policies are set correctly

### Cannot insert/update data
- Check RLS policies allow operation
- Verify user is authenticated
- Check browser console for errors

## Migration from Current System

### API Key Migration
Old system (localStorage):
```javascript
localStorage.getItem('dagger-session-key')
```

New system (Supabase encrypted):
```javascript
// Stored in user_settings table, encrypted
// Retrieved via /api/decrypt-key endpoint
```

### Conversation Storage
Old system (localStorage):
```javascript
localStorage.getItem('dagger-conversations')
```

New system (Supabase):
```javascript
// Stored in conversations table
// Synced automatically on changes
```

## Next Steps

1. ✅ Database schema created
2. ⏳ Create authentication UI
3. ⏳ Add API key encryption routes
4. ⏳ Update ClaudeAPI service
5. ⏳ Test complete flow

See main implementation in source files:
- `src/lib/supabase/` - Client files
- `src/components/Auth/` - Auth UI
- `src/components/Settings/` - Settings UI
- `api/encrypt-key/` - Encryption endpoint
- `api/decrypt-key/` - Decryption endpoint
