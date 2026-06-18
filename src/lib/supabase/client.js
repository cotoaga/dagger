/**
 * Supabase Browser Client
 *
 * Use this in client components ('use client') for:
 * - User authentication (sign in, sign out, get user)
 * - Client-side data fetching
 * - Real-time subscriptions
 *
 * Respects RLS policies based on authenticated user.
 */

import { createBrowserClient } from '@supabase/ssr';

let client = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    // Return mock client to avoid crashes during development
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
        signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
        signUp: async () => ({ error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: new Error('Supabase not configured') }),
      },
      from: () => ({
        select: () => ({ data: null, error: new Error('Supabase not configured') }),
        insert: () => ({ data: null, error: new Error('Supabase not configured') }),
        update: () => ({ data: null, error: new Error('Supabase not configured') }),
        delete: () => ({ error: new Error('Supabase not configured') }),
        upsert: () => ({ data: null, error: new Error('Supabase not configured') }),
      }),
    };
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);

  console.log('🔐 Supabase browser client initialized');
  return client;
}
