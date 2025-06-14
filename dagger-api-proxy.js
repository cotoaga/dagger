// DAGGER API Proxy Server
// Handles CORS bypass and API key security for Claude API communication
import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import util from 'util'

// Load environment variables
config()

const app = express()
const PORT = process.env.PROXY_PORT || 3001
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY

// Startup validation
console.log('🗡️  DAGGER API Proxy Server starting...')
console.log(`📡 Listening on http://localhost:${PORT}`)
console.log(`🎯 Proxying requests to Claude API`)
console.log(`🔑 API Key configured: ${CLAUDE_API_KEY ? '✅ Yes' : '❌ Missing'}`)

if (!CLAUDE_API_KEY) {
  console.error('❌ CLAUDE_API_KEY environment variable is required')
  console.error('💡 Copy .env.example to .env and add your API key')
  process.exit(1)
}

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'anthropic-version', 'interleaved-thinking-2025-05-14']
}))

app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'DAGGER API Proxy',
    timestamp: new Date().toISOString(),
    claudeApiConfigured: !!CLAUDE_API_KEY
  })
})

// Enhanced logging middleware for Claude API requests
app.use('/api/claude', (req, res, next) => {
  console.log('\n🔍 === CLAUDE API REQUEST DEBUG ===')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🌐 Method:', req.method)
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2))
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2))
  console.log('🔗 Original URL:', req.originalUrl)
  next()
})

// Response logging middleware
app.use('/api/claude', (req, res, next) => {
  const originalSend = res.send
  
  res.send = function(data) {
    console.log('\n📤 === CLAUDE API RESPONSE DEBUG ===')
    console.log('📊 Status Code:', res.statusCode)
    console.log('📋 Response Headers:', JSON.stringify(res.getHeaders(), null, 2))
    console.log('📦 Response Body:', data)
    console.log('🏁 === END DEBUG ===\n')
    
    originalSend.call(this, data)
  }
  
  next()
})

// Main proxy route for Claude API
app.post('/api/claude', async (req, res) => {
  let messageCount = 0
  let dynamicTimeout = 30000
  
  try {
    console.log('🔄 Proxying Claude API request...')
    
    // Comprehensive request validation
    const { messages, model, max_tokens } = req.body
    
    console.log('🔍 Validating request format...')
    
    // Check required fields
    if (!messages) {
      console.error('❌ Missing messages field')
      return res.status(400).json({ 
        error: 'Missing messages field',
        received: Object.keys(req.body || {})
      })
    }
    
    if (!Array.isArray(messages)) {
      console.error('❌ Messages must be an array')
      return res.status(400).json({ 
        error: 'Messages must be an array',
        received: typeof messages
      })
    }
    
    if (messages.length === 0) {
      console.error('❌ Messages array is empty')
      return res.status(400).json({ error: 'Messages array cannot be empty' })
    }
    
    // Validate message format
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (!message.role || !message.content) {
        console.error(`❌ Invalid message at index ${i}:`, message)
        return res.status(400).json({ 
          error: `Invalid message format at index ${i}`,
          message: message,
          expected: { role: 'user|assistant', content: 'string' }
        })
      }
      
      if (!['user', 'assistant'].includes(message.role)) {
        console.error(`❌ Invalid role at index ${i}:`, message.role)
        return res.status(400).json({ 
          error: `Invalid role at index ${i}`,
          received: message.role,
          expected: 'user or assistant'
        })
      }
    }
    
    console.log('✅ Request format validation passed')
    
    // Build headers for Claude API
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': req.headers['anthropic-version'] || '2023-06-01'
    }
    
    // Pass through extended thinking header if present
    if (req.headers['interleaved-thinking-2025-05-14']) {
      headers['interleaved-thinking-2025-05-14'] = req.headers['interleaved-thinking-2025-05-14']
      console.log('🧠 Extended thinking mode enabled for this request')
    }

    // Build and validate Anthropic API payload
    const anthropicPayload = {
      model: req.body.model || 'claude-3-5-sonnet-20241022',
      max_tokens: req.body.max_tokens || 4096,
      temperature: req.body.temperature || 0.7,
      messages: req.body.messages
    }

    console.log('🎯 Anthropic API Payload:', JSON.stringify(anthropicPayload, null, 2))

    // Verify against Anthropic format requirements
    if (!anthropicPayload.model.startsWith('claude-')) {
      console.error('❌ Invalid model format:', anthropicPayload.model)
      return res.status(400).json({ 
        error: 'Invalid model format',
        received: anthropicPayload.model,
        expected: 'claude-*'
      })
    }

    if (anthropicPayload.max_tokens < 1 || anthropicPayload.max_tokens > 8192) {
      console.error('❌ Invalid max_tokens:', anthropicPayload.max_tokens)
      return res.status(400).json({ 
        error: 'max_tokens must be between 1 and 8192',
        received: anthropicPayload.max_tokens
      })
    }

    console.log(`🤖 Using model: ${anthropicPayload.model}`)
    console.log(`💬 Message count: ${anthropicPayload.messages.length}`)
    console.log(`🔢 Max tokens: ${anthropicPayload.max_tokens}`)
    
    // Add conversation length warnings
    messageCount = anthropicPayload.messages.length
    
    if (messageCount > 5) {
      console.log(`⚠️ Large conversation context (${messageCount} messages) - may take longer`)
    }
    
    if (messageCount > 10) {
      console.log('🐌 Very large context - Claude API response may be slow')
    }
    
    // Calculate dynamic timeout based on conversation length
    const baseTimeout = 30000 // 30 seconds base
    const timeoutPerMessage = 10000 // 10 seconds per message
    const maxTimeout = 180000 // 3 minutes max
    
    dynamicTimeout = Math.min(
      baseTimeout + (messageCount * timeoutPerMessage),
      maxTimeout
    )
    
    console.log(`⏱️ Setting timeout to ${dynamicTimeout/1000} seconds for ${messageCount} messages`)
    
    // Make request to Claude API with dynamic timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      console.log(`⏱️ Request timeout after ${dynamicTimeout/1000} seconds (${messageCount} messages)`)
      controller.abort()
    }, dynamicTimeout)
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(anthropicPayload),
      signal: controller.signal
    })
    
    clearTimeout(timeout)

    const data = await response.json()
    
    console.log(`✅ Claude API response: ${response.status}`)
    
    if (!response.ok) {
      // Enhanced error handling with specific messages
      let errorMessage = 'Claude API Error'
      
      switch (response.status) {
        case 401:
          errorMessage = '🔑 Invalid Claude API key - check your .env file'
          break
        case 429:
          errorMessage = '⏱️ Rate limit exceeded - Claude API may be busy'
          break
        case 400:
          errorMessage = '📝 Invalid request format'
          break
        case 500:
          errorMessage = '🌐 Claude API server error'
          break
        default:
          errorMessage = `Claude API Error ${response.status}`
      }
      
      console.error(`❌ ${errorMessage}`)
      return res.status(response.status).json({ 
        error: errorMessage,
        details: data 
      })
    }
    
    res.json(data)
  } catch (error) {
    console.error('❌ Proxy error:', error)
    
    if (error.name === 'AbortError') {
      console.error(`❌ Request aborted due to timeout (${messageCount} messages, ${dynamicTimeout/1000}s timeout)`)
      return res.status(408).json({ 
        error: "⏱️ Request timeout - Claude API response took too long",
        messageCount: messageCount,
        timeoutSeconds: dynamicTimeout/1000,
        suggestion: messageCount > 5 ? "Try shorter conversation context" : "Claude API may be experiencing delays"
      })
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: '🌐 Network error connecting to Claude API' 
      })
    }
    
    res.status(500).json({ 
      error: 'Proxy server error',
      message: error.message 
    })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: ['/health', '/api/claude']
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DAGGER API Proxy running on http://localhost:${PORT}`)
  console.log('📡 Ready to proxy Claude API calls')
  console.log('🔗 Connect DAGGER frontend to http://localhost:5173')
})