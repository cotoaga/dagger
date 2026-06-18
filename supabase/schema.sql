-- DAGGER Database Schema for Supabase
-- Run this in Supabase SQL Editor after creating your project

-- ============================================================================
-- USER SETTINGS TABLE
-- Stores user preferences and encrypted Claude API keys
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Encrypted Claude API key (AES-256-CBC encrypted)
  encrypted_api_key TEXT,

  -- User preferences
  default_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  default_temperature FLOAT DEFAULT 0.7,
  default_personality TEXT DEFAULT 'khaos_navigator_v7',
  use_root_prompt BOOLEAN DEFAULT true,
  use_extended_thinking BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- ============================================================================
-- CONVERSATIONS TABLE
-- Stores conversation graph state for persistence across sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY,  -- Use client-generated UUID to match GraphModel
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation metadata
  display_number TEXT NOT NULL,
  prompt TEXT,
  response TEXT,
  system_prompt TEXT,

  -- Branch structure
  parent_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  branch_type TEXT,  -- 'virgin', 'personality', 'knowledge', or null (main)
  depth INTEGER DEFAULT 0,

  -- Model configuration
  model TEXT,
  temperature FLOAT,
  personality_id TEXT,

  -- Status and metadata
  status TEXT DEFAULT 'complete',  -- 'processing', 'complete', 'error'
  token_count INTEGER DEFAULT 0,
  processing_time INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for fast user queries
  INDEX idx_conversations_user_id (user_id),
  INDEX idx_conversations_parent_id (parent_id),
  INDEX idx_conversations_created_at (created_at)
);

-- ============================================================================
-- MERGE HISTORY TABLE (Optional - for tracking merge operations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source_conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  target_conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  merge_conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  synthesizer_used TEXT,  -- 'khaos_synthesizer_v7' or 'khaos_squeezer_v7'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_merge_history_user_id (user_id),
  INDEX idx_merge_history_created_at (created_at)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE merge_history ENABLE ROW LEVEL SECURITY;

-- USER SETTINGS POLICIES
-- Users can only access their own settings

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- CONVERSATIONS POLICIES
-- Users can only access their own conversations

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- MERGE HISTORY POLICIES
-- Users can only access their own merge history

CREATE POLICY "Users can view own merge history"
  ON merge_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merge history"
  ON merge_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Get user settings
-- SELECT * FROM user_settings WHERE user_id = auth.uid();

-- Get all conversations for current user
-- SELECT * FROM conversations WHERE user_id = auth.uid() ORDER BY created_at;

-- Get conversation tree (with parent relationships)
-- WITH RECURSIVE conversation_tree AS (
--   SELECT *, 0 as level
--   FROM conversations
--   WHERE user_id = auth.uid() AND parent_id IS NULL
--   UNION ALL
--   SELECT c.*, ct.level + 1
--   FROM conversations c
--   INNER JOIN conversation_tree ct ON c.parent_id = ct.id
--   WHERE c.user_id = auth.uid()
-- )
-- SELECT * FROM conversation_tree ORDER BY level, created_at;

-- ============================================================================
-- SETUP INSTRUCTIONS
-- ============================================================================

-- 1. Create Supabase project at https://supabase.com
-- 2. Copy this entire SQL and run in SQL Editor
-- 3. Get your project URL and anon key from Settings > API
-- 4. Add to .env.local:
--    VITE_SUPABASE_URL=your-project-url
--    VITE_SUPABASE_ANON_KEY=your-anon-key
--    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for admin operations)
--    API_KEY_ENCRYPTION_SECRET=random-32-byte-hex-string (for API key encryption)
--
-- 5. Generate encryption secret:
--    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

-- ============================================================================
-- NOTES
-- ============================================================================

-- API Key Security:
-- - API keys are encrypted client-side before storage
-- - Encryption happens via edge function with server-side secret
-- - Never stored in plain text
-- - Users can only access their own encrypted keys
--
-- Conversation Persistence:
-- - Optional feature - can work without DB sync
-- - Conversations auto-sync on changes
-- - Cross-device support when enabled
-- - LocalStorage fallback if offline
--
-- RLS Security:
-- - All tables use Row Level Security
-- - Users can ONLY access their own data
-- - Service role key bypasses RLS (admin operations only)
