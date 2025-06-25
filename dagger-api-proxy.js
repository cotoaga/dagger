#!/usr/bin/env node

/**
 * DAGGER API Proxy Server
 * 
 * Proxy server for Claude API with MessageFormatter validation
 * Ensures all DAGGER conversation types work with proper message formatting
 * 
 * CRITICAL: This proxy validates that MessageFormatter output is correctly
 * formatted before forwarding to Claude API, preventing format bugs.
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json({ limit: '10mb' }))

// CORS configuration for DAGGER frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
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
    'x-session-api-key'  // ADD THIS LINE - allows session API key header
  ],
  credentials: true
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'DAGGER API Proxy',
    version: '1.0.0'
  })
})

// API key management with session support
function getApiKey(req) {
  // Priority 1: Session API key from request header
  const sessionApiKey = req.headers['x-session-api-key']
  if (sessionApiKey) {
    return sessionApiKey
  }
  
  // Priority 2: Environment variable (for development)
  const envApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
  if (envApiKey) {
    return envApiKey
  }
  
  // No API key found
  throw new Error('No Claude API key found. Provide via x-session-api-key header or environment variable.')
}

/**
 * Validate MessageFormatter output format
 * Ensures messages match the exact format MessageFormatter produces
 */
function validateMessageFormatterOutput(messages) {
  const errors = []
  
  if (!Array.isArray(messages)) {
    errors.push('Messages must be an array')
    return { valid: false, errors }
  }
  
  if (messages.length === 0) {
    errors.push('Messages array cannot be empty')
    return { valid: false, errors }
  }
  
  // Validate each message structure
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    
    // Validate role
    if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
      errors.push(`Message ${i}: Invalid or missing role "${message.role}". Must be user, assistant, or system`)
    }
    
    // Validate content structure (MessageFormatter format)
    if (!message.content || !Array.isArray(message.content)) {
      errors.push(`Message ${i}: Content must be an array (MessageFormatter format)`)
    } else {
      for (let j = 0; j < message.content.length; j++) {
        const contentItem = message.content[j]
        if (!contentItem.type || !contentItem.text) {
          errors.push(`Message ${i}: Content item ${j} must have type and text fields`)
        }
        if (contentItem.type !== 'text') {
          errors.push(`Message ${i}: Content item ${j} type must be "text" (MessageFormatter format)`)
        }
      }
    }
  }
  
  // Validate conversation flow
  let expectingAssistant = false
  let systemMessageSeen = false
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    
    if (message.role === 'system') {
      if (i !== 0) {
        errors.push(`Message ${i}: System message must be first`)
      }
      systemMessageSeen = true
      continue
    }
    
    if (message.role === 'user') {
      if (expectingAssistant && i > 0) {
        errors.push(`Message ${i}: Unexpected user message (expecting assistant response)`)
      }
      expectingAssistant = true
    }
    
    if (message.role === 'assistant') {
      if (!expectingAssistant && i > 0) {
        errors.push(`Message ${i}: Unexpected assistant message (expecting user message)`)
      }
      expectingAssistant = false
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Main Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    console.log('🔍 === DAGGER API PROXY ===')
    console.log('📝 Request received:', {
      messagesCount: req.body.messages?.length || 0,
      model: req.body.model,
      temperature: req.body.temperature
    })
    
    const { messages, model, max_tokens, temperature, ...otherOptions } = req.body
    
    // Validate MessageFormatter output format
    const validation = validateMessageFormatterOutput(messages)
    if (!validation.valid) {
      console.error('❌ MessageFormatter validation failed:', validation.errors)
      return res.status(400).json({
        error: {
          type: 'invalid_request_error',
          message: `Invalid MessageFormatter output: ${validation.errors.join(', ')}`
        }
      })
    }
    
    console.log('✅ MessageFormatter validation passed')
    
    // Get API key from session or environment
    let apiKey
    try {
      apiKey = getApiKey(req) // Pass req to get session key
    } catch (error) {
      console.error('❌ API key error:', error.message)
      return res.status(500).json({
        error: {
          type: 'authentication_error',
          message: 'API key not configured on server'
        }
      })
    }
    
    // Build request to Claude API
    const claudeRequest = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 4000,
      temperature: temperature !== undefined ? temperature : 0.7,
      messages: messages, // Pass through MessageFormatter format exactly
      ...otherOptions
    }
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
    
    // Add extended thinking header if present
    if (req.headers['anthropic-beta']) {
      headers['anthropic-beta'] = req.headers['anthropic-beta']
      console.log('🧠 Extended thinking mode enabled:', req.headers['anthropic-beta'])
    }
    
    console.log('📡 Forwarding to Claude API...')
    
    // Forward to Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(claudeRequest)
    })
    
    console.log('📡 Claude API response status:', claudeResponse.status)
    
    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text()
      console.error('❌ Claude API Error:', errorData)
      
      // Parse error if possible
      let parsedError
      try {
        parsedError = JSON.parse(errorData)
      } catch {
        parsedError = { error: { message: errorData } }
      }
      
      return res.status(claudeResponse.status).json(parsedError)
    }
    
    const data = await claudeResponse.json()
    console.log('✅ Claude API success:', {
      id: data.id,
      model: data.model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens
    })
    
    // Forward response as-is
    res.json(data)
    
  } catch (error) {
    console.error('❌ Proxy server error:', error)
    res.status(500).json({
      error: {
        type: 'api_error',
        message: 'Internal proxy server error'
      }
    })
  }
})

// Alternative endpoint for legacy compatibility - just use the same handler
app.post('/api/chat', async (req, res) => {
  console.log('⚠️ Legacy /api/chat endpoint used')
  
  // Use the same logic as /api/claude
  try {
    const { messages, model, max_tokens, temperature, ...otherOptions } = req.body
    
    // Validate MessageFormatter output format
    const validation = validateMessageFormatterOutput(messages)
    if (!validation.valid) {
      console.error('❌ MessageFormatter validation failed:', validation.errors)
      return res.status(400).json({
        error: {
          type: 'invalid_request_error',
          message: `Invalid MessageFormatter output: ${validation.errors.join(', ')}`
        }
      })
    }
    
    // Get API key from session or environment
    let apiKey
    try {
      apiKey = getApiKey(req) // Pass req to get session key
    } catch (error) {
      console.error('❌ API key error:', error.message)
      return res.status(500).json({
        error: {
          type: 'authentication_error',
          message: 'API key not configured on server'
        }
      })
    }
    
    // Build request to Claude API
    const claudeRequest = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 4000,
      temperature: temperature !== undefined ? temperature : 0.7,
      messages: messages,
      ...otherOptions
    }
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
    
    // Add extended thinking header if present
    if (req.headers['anthropic-beta']) {
      headers['anthropic-beta'] = req.headers['anthropic-beta']
    }
    
    // Forward to Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(claudeRequest)
    })
    
    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text()
      let parsedError
      try {
        parsedError = JSON.parse(errorData)
      } catch {
        parsedError = { error: { message: errorData } }
      }
      return res.status(claudeResponse.status).json(parsedError)
    }
    
    const data = await claudeResponse.json()
    res.json(data)
    
  } catch (error) {
    console.error('❌ Legacy endpoint error:', error)
    res.status(500).json({
      error: {
        type: 'api_error',
        message: 'Internal proxy server error'
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

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled proxy error:', error)
  res.status(500).json({
    error: {
      type: 'internal_error',
      message: 'Proxy server internal error'
    }
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`
🗡️ DAGGER API PROXY ONLINE ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server:     http://localhost:${PORT}
🏥 Health:     http://localhost:${PORT}/health  
🤖 Claude API: http://localhost:${PORT}/api/claude
🔧 Features:   MessageFormatter validation, CORS, Extended thinking support
🔑 API Key:    ${process.env.CLAUDE_API_KEY ? '✅ Configured' : '❌ Missing (set CLAUDE_API_KEY)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to proxy DAGGER conversations to Claude API! 🚀
`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 DAGGER API Proxy shutting down...')
  process.exit(0)
})

export default app