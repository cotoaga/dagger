/**
 * Supabase Server Client (for Vercel Edge Functions)
 *
 * Use this in API routes (api/*.js) for:
 * - Server-side authentication checks
 * - Database queries from API endpoints
 * - Respects RLS policies based on authenticated user
 *
 * Note: This is for Vercel edge functions, not Next.js server components.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create Supabase client for edge functions
 * Reads session from Authorization header
 */
export function createClient(request) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Get access token from Authorization header
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  // Create client with auth token
  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
  });

  return client;
}

/**
 * Helper to require authentication in edge functions
 */
export async function requireAuth(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}
