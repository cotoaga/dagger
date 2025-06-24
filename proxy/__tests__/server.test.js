import { describe, test, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'

// Mock fetch for Claude API calls
const mockClaudeAPIResponse = {
  id: 'msg_test_' + Date.now(),
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Mock response from Claude API'
    }
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 10,
    output_tokens: 15,
    total_tokens: 25
  }
}

// Mock fetch globally before importing the server
global.fetch = vi.fn()

// Mock environment variables
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn()
  },
  config: vi.fn()
}))

// Mock console methods to reduce test noise
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => {
  // Reset fetch mock
  vi.clearAllMocks()
  
  // Set up default successful Claude API response
  global.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(mockClaudeAPIResponse),
    text: () => Promise.resolve(JSON.stringify(mockClaudeAPIResponse))
  })
  
  // Mock environment variable
  process.env.CLAUDE_API_KEY = 'mock-api-key'
})

// Import the actual proxy server after mocking
const { default: app } = await import('../../dagger-api-proxy.js')

describe('Proxy Server - MessageFormatter Integration', () => {

  describe('Health Check', () => {
    test('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
      
      expect(response.body.status).toBe('healthy')
      expect(response.body.timestamp).toBeDefined()
      expect(response.body.service).toBe('DAGGER API Proxy')
    })
  })

  describe('MessageFormatter Output Validation', () => {
    test('should accept properly formatted MessageFormatter output', async () => {
      // ARRANGE - MessageFormatter creates this format
      const messageFormatterOutput = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is AI?' }]
        }
      ]
      
      const requestBody = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.7,
        messages: messageFormatterOutput
      }
      
      // ACT
      const response = await request(app)
        .post('/api/claude')
        .send(requestBody)
        .expect(200)
      
      // ASSERT
      expect(response.body.content).toBeDefined()
      expect(response.body.content[0].text).toBe('Mock response from Claude API')
      expect(response.body.usage).toBeDefined()
      expect(response.body.model).toBe('claude-sonnet-4-20250514')
      
      // Verify fetch was called with correct format
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'mock-api-key',
            'anthropic-version': '2023-06-01'
          }),
          body: expect.stringContaining('"messages"')
        })
      )
    })

    test('should accept virgin branch messages', async () => {
      // ARRANGE - Virgin branch: just user message
      const virginBranchMessages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Fresh start question' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: virginBranchMessages,
          model: 'claude-sonnet-4-20250514',
          temperature: 0.5
        })
        .expect(200)
      
      expect(response.body.content[0].text).toBeDefined()
    })

    test('should accept personality branch messages', async () => {
      // ARRANGE - Personality branch: system + user message
      const personalityBranchMessages = [
        {
          role: 'system',
          content: [{ type: 'text', text: 'You are KHAOS with 70% TARS sarcasm' }]
        },
        {
          role: 'user', 
          content: [{ type: 'text', text: 'Who are you?' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: personalityBranchMessages,
          model: 'claude-sonnet-4-20250514',
          temperature: 0.9
        })
        .expect(200)
      
      expect(response.body.content[0].text).toBeDefined()
    })

    test('should accept knowledge branch messages', async () => {
      // ARRANGE - Knowledge branch: system + conversation history + new message
      const knowledgeBranchMessages = [
        {
          role: 'system',
          content: [{ type: 'text', text: 'You are KHAOS...' }]
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is consciousness?' }]
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Consciousness is the hard problem...' }]
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'But what about quantum consciousness?' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: knowledgeBranchMessages,
          model: 'claude-sonnet-4-20250514',
          temperature: 0.7
        })
        .expect(200)
      
      expect(response.body.content[0].text).toBeDefined()
    })

    test('should accept main conversation continuation', async () => {
      // ARRANGE - Main conversation: full conversation history
      const mainConversationMessages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Previous question' }]
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Previous answer' }]
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'Follow-up question' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: mainConversationMessages,
          model: 'claude-sonnet-4-20250514',
          temperature: 0.7
        })
        .expect(200)
      
      expect(response.body.content[0].text).toBeDefined()
    })
  })

  describe('Error Handling for Invalid Formats', () => {
    test('should reject non-array messages', async () => {
      // ARRANGE - Invalid: messages not an array
      const invalidMessages = "This should be an array"
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: invalidMessages,
          model: 'claude-sonnet-4-20250514'
        })
        .expect(400)
      
      expect(response.body.error.message).toContain('Messages must be an array')
    })

    test('should reject messages with invalid role', async () => {
      // ARRANGE - Invalid: bad role
      const invalidMessages = [
        {
          role: 'invalid_role',
          content: [{ type: 'text', text: 'content' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: invalidMessages,
          model: 'claude-sonnet-4-20250514'
        })
        .expect(400)
      
      expect(response.body.error.message).toContain('Invalid or missing role')
    })

    test('should reject messages with non-array content', async () => {
      // ARRANGE - Invalid: content not array (old format)
      const invalidMessages = [
        {
          role: 'user',
          content: 'This should be an array' // Old format
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: invalidMessages,
          model: 'claude-sonnet-4-20250514'
        })
        .expect(400)
      
      expect(response.body.error.message).toContain('Content must be an array')
    })

    test('should reject messages with invalid content structure', async () => {
      // ARRANGE - Invalid: content items missing type/text
      const invalidMessages = [
        {
          role: 'user',
          content: [{ text: 'Missing type field' }] // Missing type
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: invalidMessages,
          model: 'claude-sonnet-4-20250514'
        })
        .expect(400)
      
      expect(response.body.error.message).toContain('must have type and text')
    })
  })

  describe('Extended Thinking Support', () => {
    test('should handle extended thinking header for Sonnet 4', async () => {
      // ARRANGE
      const messages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Complex reasoning task' }]
        }
      ]
      
      // ACT
      const response = await request(app)
        .post('/api/claude')
        .set('anthropic-beta', 'interleaved-thinking-2025-05-14')
        .send({
          messages: messages,
          model: 'claude-sonnet-4-20250514',
          temperature: 0.7
        })
        .expect(200)
      
      // ASSERT - Should accept the request and forward header
      expect(response.body.content[0].text).toBeDefined()
      
      // Verify extended thinking header was forwarded
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          headers: expect.objectContaining({
            'anthropic-beta': 'interleaved-thinking-2025-05-14'
          })
        })
      )
    })
  })

  describe('Model Support', () => {
    test('should accept Sonnet 4 model', async () => {
      // ARRANGE
      const messages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Test Sonnet 4' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({
          messages: messages,
          model: 'claude-sonnet-4-20250514',
          temperature: 0.8
        })
        .expect(200)
      
      expect(response.body.model).toBe('claude-sonnet-4-20250514')
    })

    test('should use default model when none specified', async () => {
      // ARRANGE
      const messages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Default model test' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({ messages }) // No model specified
        .expect(200)
      
      expect(response.body.model).toBe('claude-sonnet-4-20250514') // Default
    })
  })

  describe('API Error Handling', () => {
    test('should handle Claude API errors', async () => {
      // ARRANGE - Mock Claude API error
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({
          error: {
            type: 'invalid_request_error',
            message: 'Invalid request'
          }
        }))
      })
      
      const messages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Test error handling' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({ messages })
        .expect(400)
      
      expect(response.body.error.message).toBe('Invalid request')
    })

    test('should handle missing API key', async () => {
      // ARRANGE - Remove API key
      delete process.env.CLAUDE_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      
      const messages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Test no API key' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/claude')
        .send({ messages })
        .expect(500)
      
      expect(response.body.error.message).toContain('API key not configured')
      
      // Restore API key for other tests
      process.env.CLAUDE_API_KEY = 'mock-api-key'
    })
  })

  describe('Legacy Endpoint Support', () => {
    test('should handle legacy /api/chat endpoint', async () => {
      // ARRANGE
      const messages = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Legacy endpoint test' }]
        }
      ]
      
      // ACT & ASSERT
      const response = await request(app)
        .post('/api/chat')
        .send({ messages })
        .expect(200)
      
      expect(response.body.content[0].text).toBeDefined()
    })
  })
})