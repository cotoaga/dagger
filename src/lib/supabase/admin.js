/**
 * Supabase Admin Client (Bypass RLS)
 *
 * ⚠️ USE SPARINGLY! This bypasses all Row Level Security policies.
 *
 * Use only for:
 * - System operations
 * - Admin-only endpoints
 * - Database seeding/testing
 *
 * NEVER use in client components or for normal user operations.
 */

import { createClient } from '@supabase/supabase-js';

let adminClient = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables (SUPABASE_SERVICE_ROLE_KEY required)');
  }

  adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔓 Supabase ADMIN client initialized (RLS bypassed)');
  return adminClient;
}
