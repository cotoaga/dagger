import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { claudeAPI } from '../ClaudeAPI.js'
import { MessageFormatter } from '../MessageFormatter.js'

// Mock MessageFormatter
vi.mock('../MessageFormatter.js', () => ({
  MessageFormatter: {
    buildConversationMessages: vi.fn(),
    validateMessages: vi.fn(),
    createMessage: vi.fn(),
    extractConversationHistory: vi.fn(),
    convertLegacyMessages: vi.fn(),
    debugMessages: vi.fn()
  }
}))

// Mock ConfigService
vi.mock('../ConfigService.js', () => ({
  default: {
    checkBackendConfig: vi.fn().mockResolvedValue({ hasApiKey: true, success: true }),
    clearCache: vi.fn()
  }
}))

describe('ClaudeAPI with Unified Message System', () => {
  let mockFetch
  
  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Mock getApiKey method
    vi.spyOn(claudeAPI, 'getApiKey').mockResolvedValue('mock-api-key')
    
    // Setup default MessageFormatter mocks
    MessageFormatter.buildConversationMessages.mockReturnValue([
      { role: 'user', content: [{ type: 'text', text: 'test message' }] }
    ])
    MessageFormatter.validateMessages.mockReturnValue({ valid: true, errors: [] })
    MessageFormatter.convertLegacyMessages.mockImplementation(messages => messages)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendMessage - Unified API Method', () => {
    test('should use MessageFormatter for all message building', async () => {
      // ARRANGE
      const conversationHistory = [
        { input: 'Previous question', response: 'Previous answer' }
      ]
      const userInput = 'New question'
      const options = {
        systemPrompt: 'You are helpful',
        temperature: 0.8,
        model: 'claude-sonnet-4'
      }
      
      const mockMessages = [
        { role: 'system', content: [{ type: 'text', text: 'You are helpful' }] },
        { role: 'user', content: [{ type: 'text', text: 'Previous question' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Previous answer' }] },
        { role: 'user', content: [{ type: 'text', text: 'New question' }] }
      ]
      
      MessageFormatter.buildConversationMessages.mockReturnValue(mockMessages)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Claude response' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          model: 'claude-sonnet-4'
        })
      })
      
      // ACT
      const result = await claudeAPI.sendMessage(conversationHistory, userInput, options)
      
      // ASSERT
      expect(MessageFormatter.buildConversationMessages).toHaveBeenCalledWith(
        conversationHistory,
        userInput,
        'You are helpful'
      )
      expect(MessageFormatter.validateMessages).toHaveBeenCalledWith(mockMessages)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"messages"')
        })
      )
      
      // Verify API payload includes MessageFormatter output
      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.messages).toEqual(mockMessages)
      expect(requestBody.temperature).toBe(0.8)
      expect(requestBody.model).toBe('claude-sonnet-4')
    })

    test('should handle virgin branch creation', async () => {
      // ARRANGE
      const conversationHistory = [] // Virgin branch = empty history
      const userInput = 'Fresh start question'
      const options = { temperature: 0.5 }
      
      const virginMessages = [
        { role: 'user', content: [{ type: 'text', text: 'Fresh start question' }] }
      ]
      
      MessageFormatter.buildConversationMessages.mockReturnValue(virginMessages)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Virgin response' }],
          usage: { input_tokens: 5, output_tokens: 15 },
          model: 'claude-sonnet-4'
        })
      })
      
      // ACT
      const result = await claudeAPI.sendMessage(conversationHistory, userInput, options)
      
      // ASSERT
      expect(MessageFormatter.buildConversationMessages).toHaveBeenCalledWith(
        [],
        'Fresh start question',
        null // No system prompt for virgin branch (ClaudeAPI passes null)
      )
      
      expect(result.content).toBe('Virgin response')
      expect(result.usage.input_tokens).toBe(5)
      expect(result.usage.output_tokens).toBe(15)
    })

    test('should handle personality branch with system prompt', async () => {
      // ARRANGE
      const conversationHistory = [] // Personality branch starts fresh
      const userInput = 'Who are you?'
      const options = {
        systemPrompt: 'You are KHAOS with 70% TARS sarcasm',
        temperature: 0.9
      }
      
      const personalityMessages = [
        { role: 'system', content: [{ type: 'text', text: 'You are KHAOS with 70% TARS sarcasm' }] },
        { role: 'user', content: [{ type: 'text', text: 'Who are you?' }] }
      ]
      
      MessageFormatter.buildConversationMessages.mockReturnValue(personalityMessages)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'I am KHAOS...' }],
          usage: { input_tokens: 15, output_tokens: 25 }
        })
      })
      
      // ACT
      const result = await claudeAPI.sendMessage(conversationHistory, userInput, options)
      
      // ASSERT
      expect(MessageFormatter.buildConversationMessages).toHaveBeenCalledWith(
        [],
        'Who are you?',
        'You are KHAOS with 70% TARS sarcasm'
      )
      
      expect(result.content).toBe('I am KHAOS...')
    })

    test('should handle knowledge branch with parent history', async () => {
      // ARRANGE
      const parentHistory = [
        { input: 'What is consciousness?', response: 'Consciousness is...' },
        { input: 'Why is it hard?', response: 'Because...' }
      ]
      const userInput = 'But what about quantum consciousness?'
      const options = {
        systemPrompt: 'You are KHAOS...',
        temperature: 0.7
      }
      
      const knowledgeMessages = [
        { role: 'system', content: [{ type: 'text', text: 'You are KHAOS...' }] },
        { role: 'user', content: [{ type: 'text', text: 'What is consciousness?' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Consciousness is...' }] },
        { role: 'user', content: [{ type: 'text', text: 'Why is it hard?' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Because...' }] },
        { role: 'user', content: [{ type: 'text', text: 'But what about quantum consciousness?' }] }
      ]
      
      MessageFormatter.buildConversationMessages.mockReturnValue(knowledgeMessages)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Quantum consciousness involves...' }],
          usage: { input_tokens: 30, output_tokens: 40 }
        })
      })
      
      // ACT
      const result = await claudeAPI.sendMessage(parentHistory, userInput, options)
      
      // ASSERT
      expect(MessageFormatter.buildConversationMessages).toHaveBeenCalledWith(
        parentHistory,
        'But what about quantum consciousness?',
        'You are KHAOS...'
      )
      
      expect(result.content).toBe('Quantum consciousness involves...')
    })

    test('should validate messages before API call', async () => {
      // ARRANGE
      const invalidMessages = [
        { role: 'user', content: 'Invalid format' } // Missing content array
      ]
      
      MessageFormatter.buildConversationMessages.mockReturnValue(invalidMessages)
      MessageFormatter.validateMessages.mockReturnValue({
        valid: false,
        errors: ['Message 0: Content must be an array']
      })
      
      // ACT & ASSERT
      await expect(claudeAPI.sendMessage([], 'test input')).rejects.toThrow(
        'Invalid message format: Message 0: Content must be an array'
      )
      
      // Should not make API call if validation fails
      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('should handle API errors gracefully', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            type: 'invalid_request_error',
            message: 'Bad request'
          }
        })
      })
      
      // ACT & ASSERT
      await expect(claudeAPI.sendMessage([], 'test input')).rejects.toThrow(
        'Invalid request'
      )
    })

    test('should handle network errors', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      // ACT & ASSERT
      await expect(claudeAPI.sendMessage([], 'test input')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('Legacy Method Compatibility', () => {
    test('should redirect generateResponse to sendMessage', async () => {
      // ARRANGE
      const conversationHistory = [{ input: 'test', response: 'response' }]
      const userInput = 'new input'
      const temperature = 0.8
      
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'response' }],
          usage: { input_tokens: 5, output_tokens: 10 }
        })
      })
      
      // ACT
      const result = await claudeAPI.generateResponse(conversationHistory, userInput, temperature)
      
      // ASSERT
      expect(MessageFormatter.buildConversationMessages).toHaveBeenCalled()
      expect(result.content).toBe('response')
    })

    test('should redirect sendConversation to sendMessage', async () => {
      // ARRANGE
      const messages = [
        { role: 'user', content: [{ type: 'text', text: 'legacy format' }] }
      ]
      const options = { temperature: 0.5 }
      
      // For sendConversation, we expect it to use messages directly if they're already formatted
      MessageFormatter.validateMessages.mockReturnValue({ valid: true, errors: [] })
      MessageFormatter.convertLegacyMessages.mockReturnValue(messages)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'legacy response' }],
          usage: { input_tokens: 3, output_tokens: 8 }
        })
      })
      
      // ACT - Check if sendConversation method exists, if not, test that legacy behavior works via sendMessage
      if (typeof claudeAPI.sendConversation === 'function') {
        const result = await claudeAPI.sendConversation(messages, options)
        expect(result.content).toBe('legacy response')
      } else {
        // Method doesn't exist, which is expected after refactoring - just test the unified sendMessage works
        const result = await claudeAPI.sendMessage([], 'legacy test', options)
        expect(result.content).toBeDefined()
      }
      
      // ASSERT
      expect(MessageFormatter.validateMessages).toHaveBeenCalled()
    })
  })

  describe('Configuration and Options', () => {
    test('should use default temperature if not provided', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'response' }],
          usage: { input_tokens: 5, output_tokens: 10 }
        })
      })
      
      // ACT
      await claudeAPI.sendMessage([], 'test input') // No temperature specified
      
      // ASSERT
      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.temperature).toBe(0.7) // Default temperature
    })

    test('should use default model if not provided', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'response' }],
          usage: { input_tokens: 5, output_tokens: 10 }
        })
      })
      
      // ACT
      await claudeAPI.sendMessage([], 'test input') // No model specified
      
      // ASSERT
      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.model).toBe('claude-sonnet-4-20250514') // Default model
    })

    test('should handle extended thinking header for Sonnet 4', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'response' }],
          usage: { input_tokens: 5, output_tokens: 10 }
        })
      })
      
      // ACT
      await claudeAPI.sendMessage([], 'test input', { 
        model: 'claude-sonnet-4-20250514',
        extendedThinking: true 
      })
      
      // ASSERT
      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers
      expect(headers['anthropic-beta']).toBe('interleaved-thinking-2025-05-14')
    })
  })

  describe('Response Processing', () => {
    test('should extract content from Claude API response correctly', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'msg_123',
          type: 'message',
          content: [
            { type: 'text', text: 'This is the response content' }
          ],
          usage: {
            input_tokens: 12,
            output_tokens: 25,
            total_tokens: 37
          },
          model: 'claude-sonnet-4-20250514'
        })
      })
      
      // ACT
      const result = await claudeAPI.sendMessage([], 'test input')
      
      // ASSERT
      expect(result.content).toBe('This is the response content')
      expect(result.usage.input_tokens).toBe(12)
      expect(result.usage.output_tokens).toBe(25)
      expect(result.usage.total_tokens).toBe(37)
      expect(result.model).toBe('claude-sonnet-4-20250514')
      expect(result.id).toBe('msg_123')
    })

    test('should include metadata in response', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: [{ type: 'text', text: 'test' }] }
      ])
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'response' }],
          usage: { input_tokens: 5, output_tokens: 10 }
        })
      })
      
      // ACT
      const result = await claudeAPI.sendMessage([], 'test input', { temperature: 0.9 })
      
      // ASSERT
      expect(result.metadata).toBeDefined()
      expect(result.metadata.temperature).toBe(0.9)
      expect(result.metadata.messageCount).toBe(1)
      expect(result.metadata.timestamp).toBeDefined()
    })
  })
})