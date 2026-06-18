/**
 * API Key Encryption Endpoint
 * Encrypts Claude API keys before storing in database
 * Uses AES-256-CBC encryption with server-side secret
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

    // Get API key from request
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        {
          status: 400,
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

    // Encrypt API key using AES-256-CBC
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionSecret, 'hex'),
      iv
    );

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combine IV and encrypted data
    const encryptedKey = iv.toString('hex') + ':' + encrypted;

    console.log('🔐 API key encrypted for user:', user.id);

    return new Response(
      JSON.stringify({ encryptedKey }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Encryption error:', error);

    return new Response(
      JSON.stringify({
        error: error.message === 'Unauthorized'
          ? 'Unauthorized'
          : 'Encryption failed',
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
