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
    service: 'DAGGER Proxy v2.0 Nuclear',
    version: '2.0.0'
  })
})

// ============================================================================
// THE ENTIRE PROXY LOGIC - TRANSPARENT FORWARDING ONLY
// ============================================================================

app.post('/api/claude', async (req, res) => {
  try {
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
    
    // Step 2: Forward request to Claude API (ZERO MODIFICATION)
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Forward extended thinking header if present
        ...(req.headers['anthropic-beta'] && { 'anthropic-beta': req.headers['anthropic-beta'] })
      },
      body: JSON.stringify(req.body) // ← COMPLETE TRANSPARENCY: Forward exact payload
    })
    
    // Step 3: Return Claude response (ZERO MODIFICATION)
    const data = await claudeResponse.json()
    res.status(claudeResponse.status).json(data) // ← COMPLETE TRANSPARENCY: Forward exact response
    
  } catch (error) {
    // ONLY proxy infrastructure errors - NEVER content validation errors
    res.status(500).json({
      error: {
        type: 'proxy_error',
        message: 'Proxy infrastructure error'
      }
    })
  }
})

// Legacy endpoint compatibility (forwards to same logic)
app.post('/api/chat', async (req, res) => {
  try {
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
    
    // Step 2: Forward request to Claude API (ZERO MODIFICATION)
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Forward extended thinking header if present
        ...(req.headers['anthropic-beta'] && { 'anthropic-beta': req.headers['anthropic-beta'] })
      },
      body: JSON.stringify(req.body) // ← COMPLETE TRANSPARENCY: Forward exact payload
    })
    
    // Step 3: Return Claude response (ZERO MODIFICATION)
    const data = await claudeResponse.json()
    res.status(claudeResponse.status).json(data) // ← COMPLETE TRANSPARENCY: Forward exact response
    
  } catch (error) {
    // ONLY proxy infrastructure errors - NEVER content validation errors
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