/**
 * API Key Decryption Endpoint
 * Decrypts Claude API keys when needed for API calls
 * Uses AES-256-CBC decryption with server-side secret (Web Crypto API)
 */

import { createClient, requireAuth } from '../src/lib/supabase/server.js';

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(req);
    const user = await requireAuth(supabase);

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
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encryptionSecret = process.env.API_KEY_ENCRYPTION_SECRET;

    if (!encryptionSecret) {
      console.error('❌ API_KEY_ENCRYPTION_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server encryption not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [ivHex, encryptedHex] = settings.encrypted_api_key.split(':');

    if (!ivHex || !encryptedHex) {
      throw new Error('Invalid encrypted key format');
    }

    const keyBytes = hexToBytes(encryptionSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']
    );

    const iv = hexToBytes(ivHex);
    const encryptedBytes = hexToBytes(encryptedHex);
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, encryptedBytes);
    const decrypted = new TextDecoder().decode(decryptedBuffer);

    console.log('🔓 API key decrypted for user:', user.id);

    return new Response(
      JSON.stringify({ apiKey: decrypted }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Decryption error:', error);
    return new Response(
      JSON.stringify({
        error: error.message === 'Unauthorized' ? 'Unauthorized' : 'Decryption failed',
      }),
      { status: error.message === 'Unauthorized' ? 401 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = {
  runtime: 'edge',
};
