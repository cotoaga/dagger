#!/usr/bin/env node

/**
 * 🗡️ DAGGER Proxy v2.0 - Nuclear Transparent Implementation
 * 
 * ZERO VALIDATION - COMPLETE TRANSPARENCY - NO MIDDLEWARE COMPLEXITY
 * 
 * This is the ENTIRE proxy logic in ~50 lines
 * Built test-first with TDD approach for bulletproof reliability
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment configuration
dotenv.config()

const app = express()
const PORT = process.env.PROXY_PORT || 3001

/**
 * 🗡️ DEMON OBLITERATION: Transform MessageFormatter output to Claude API format
 * Extracts system messages to top-level parameter (Claude API requirement)
 */
function transformForClaudeAPI(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { system: null, messages: [] };
  }
  
  let systemMessage = null;
  const filteredMessages = [];
  
  for (const message of messages) {
    if (message.role === 'system') {
      // Extract system message content as string
      systemMessage = message.content[0]?.text || '';
      console.log('🎭 Extracted system message:', systemMessage.substring(0, 100) + '...');
    } else {
      // Keep non-system messages in array
      filteredMessages.push(message);
    }
  }
  
  console.log('🔄 Claude API transformation:');
  console.log(`  System parameter: ${systemMessage ? 'SET' : 'NULL'}`);
  console.log(`  Messages array: ${filteredMessages.length} messages`);
  
  return {
    system: systemMessage,
    messages: filteredMessages
  };
}

// Middleware - MINIMAL configuration only
app.use(express.json({ limit: '10mb' }))

// CORS configuration for DAGGER frontend
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'x-api-key',
    'anthropic-version',
    'anthropic-beta',
    'x-session-api-key'
  ],
  credentials: true
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Nuclear DAGGER Proxy v2.0 - Demon Obliterated',
    version: '2.0.0',
    systemMessageFix: 'ACTIVE'
  })
})

// ============================================================================
// THE ENTIRE PROXY LOGIC - TRANSPARENT FORWARDING ONLY
// ============================================================================

app.post('/api/claude', async (req, res) => {
  try {
    console.log('🗡️ Nuclear proxy with Claude API format fix');
    
    // Step 1: Get API key (session header takes priority over environment)
    const apiKey = req.headers['x-session-api-key'] || process.env.CLAUDE_API_KEY
    
    if (!apiKey) {
      return res.status(500).json({
        error: {
          type: 'authentication_error',
          message: 'No Claude API key configured'
        }
      })
    }
    
    // Step 2: CRITICAL FIX - Transform MessageFormatter output to Claude API format
    const { system, messages } = transformForClaudeAPI(req.body.messages);
    
    // Build Claude API request with correct format
    const claudeRequest = {
      model: req.body.model || 'claude-sonnet-4-20250514',
      max_tokens: req.body.max_tokens || 4000,
      temperature: req.body.temperature !== undefined ? req.body.temperature : 0.7,
      messages: messages // NO system messages in this array
    };
    
    // Add system parameter if extracted
    if (system) {
      claudeRequest.system = system;
      console.log('🎭 Added system parameter to Claude API request');
    }
    
    console.log('🚀 Forwarding to Claude API with correct format');
    console.log('📊 Request payload:', JSON.stringify(claudeRequest, null, 2));
    
    // Step 3: Forward to Claude API with correct format
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Forward extended thinking header if present
        ...(req.headers['anthropic-beta'] && { 'anthropic-beta': req.headers['anthropic-beta'] })
      },
      body: JSON.stringify(claudeRequest)
    })
    
    // Step 4: Return Claude response transparently
    const data = await claudeResponse.json()
    console.log('✅ Claude API response received');
    
    // Log token usage if available
    if (data.usage) {
      console.log('💰 Token usage:', {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        cached: data.usage.cache_read_input_tokens || 0,
        total: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      });
    }
    
    res.status(claudeResponse.status).json(data)
    
  } catch (error) {
    console.error('❌ Nuclear proxy error:', error);
    res.status(500).json({
      error: {
        type: 'proxy_error',
        message: 'Proxy infrastructure error'
      }
    })
  }
})

// Legacy endpoint compatibility (uses same transformation)
app.post('/api/chat', async (req, res) => {
  try {
    console.log('🗡️ Legacy endpoint with Claude API format fix');
    
    // Step 1: Get API key (session header takes priority over environment)
    const apiKey = req.headers['x-session-api-key'] || process.env.CLAUDE_API_KEY
    
    if (!apiKey) {
      return res.status(500).json({
        error: {
          type: 'authentication_error',
          message: 'No Claude API key configured'
        }
      })
    }
    
    // Step 2: CRITICAL FIX - Transform MessageFormatter output to Claude API format
    const { system, messages } = transformForClaudeAPI(req.body.messages);
    
    // Build Claude API request with correct format
    const claudeRequest = {
      model: req.body.model || 'claude-sonnet-4-20250514',
      max_tokens: req.body.max_tokens || 4000,
      temperature: req.body.temperature !== undefined ? req.body.temperature : 0.7,
      messages: messages // NO system messages in this array
    };
    
    // Add system parameter if extracted
    if (system) {
      claudeRequest.system = system;
      console.log('🎭 Legacy endpoint: Added system parameter to Claude API request');
    }
    
    console.log('🚀 Legacy endpoint: Forwarding to Claude API with correct format');
    
    // Step 3: Forward to Claude API with correct format
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Forward extended thinking header if present
        ...(req.headers['anthropic-beta'] && { 'anthropic-beta': req.headers['anthropic-beta'] })
      },
      body: JSON.stringify(claudeRequest)
    })
    
    // Step 4: Return Claude response transparently
    const data = await claudeResponse.json()
    console.log('✅ Legacy endpoint: Claude API response received');
    
    // Log token usage if available
    if (data.usage) {
      console.log('💰 Legacy endpoint token usage:', {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        cached: data.usage.cache_read_input_tokens || 0,
        total: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      });
    }
    
    res.status(claudeResponse.status).json(data)
    
  } catch (error) {
    console.error('❌ Legacy endpoint error:', error);
    res.status(500).json({
      error: {
        type: 'proxy_error',
        message: 'Proxy infrastructure error'
      }
    })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      type: 'not_found',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`
🗡️ DAGGER PROXY v2.0 NUCLEAR ONLINE ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server:     http://localhost:${PORT}
🏥 Health:     http://localhost:${PORT}/health  
🤖 Claude API: http://localhost:${PORT}/api/claude
🔧 Features:   ZERO validation, COMPLETE transparency, NO middleware
🔑 API Key:    ${process.env.CLAUDE_API_KEY ? '✅ Configured' : '❌ Missing (set CLAUDE_API_KEY)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 NUCLEAR TRANSPARENCY ACHIEVED:
   ✅ Virgin branches: Pure forwarding
   ✅ Personality branches: System messages preserved
   ✅ Knowledge branches: Full conversation history
   ✅ Error forwarding: Claude API authority
   ✅ Zero validation: Claude validates, not proxy

Ready for distributed cognition at scale! 🚀
`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 DAGGER Proxy v2.0 shutting down...')
  process.exit(0)
})

export default app