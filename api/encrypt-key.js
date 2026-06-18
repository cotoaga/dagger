/**
 * API Key Encryption Endpoint
 * Encrypts Claude API keys before storing in database
 * Uses AES-256-CBC encryption with server-side secret (Web Crypto API)
 */

import { createClient, requireAuth } from '../src/lib/supabase/server.js';

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    const keyBytes = hexToBytes(encryptionSecret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encoded = new TextEncoder().encode(apiKey);
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, encoded);

    const encryptedKey = bytesToHex(iv) + ':' + bytesToHex(new Uint8Array(encryptedBuffer));

    console.log('🔐 API key encrypted for user:', user.id);

    return new Response(
      JSON.stringify({ encryptedKey }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Encryption error:', error);
    return new Response(
      JSON.stringify({
        error: error.message === 'Unauthorized' ? 'Unauthorized' : 'Encryption failed',
      }),
      { status: error.message === 'Unauthorized' ? 401 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = {
  runtime: 'edge',
};
