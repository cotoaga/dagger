/**
 * API Key Decryption Endpoint
 * Decrypts Claude API keys when needed for API calls
 * Uses AES-256-CBC decryption with server-side secret
 */

import crypto from 'crypto';
import { createClient } from '../src/lib/supabase/server.js';
import { requireAuth } from '../src/lib/supabase/server.js';

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Authenticate user
    const supabase = createClient(req);
    const user = await requireAuth(supabase);

    // Get user's encrypted API key from database
    const { data: settings, error: fetchError } = await supabase
      .from('user_settings')
      .select('encrypted_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error('Failed to fetch settings');
    }

    if (!settings || !settings.encrypted_api_key) {
      return new Response(
        JSON.stringify({ error: 'No API key configured' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get encryption secret
    const encryptionSecret = process.env.API_KEY_ENCRYPTION_SECRET;

    if (!encryptionSecret) {
      console.error('❌ API_KEY_ENCRYPTION_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server encryption not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse IV and encrypted data
    const [ivHex, encrypted] = settings.encrypted_api_key.split(':');

    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted key format');
    }

    // Decrypt API key using AES-256-CBC
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionSecret, 'hex'),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    console.log('🔓 API key decrypted for user:', user.id);

    return new Response(
      JSON.stringify({ apiKey: decrypted }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Decryption error:', error);

    return new Response(
      JSON.stringify({
        error: error.message === 'Unauthorized'
          ? 'Unauthorized'
          : 'Decryption failed',
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config = {
  runtime: 'edge',
};
