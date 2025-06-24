import { describe, test, expect } from 'vitest'
import { MessageFormatter } from '../MessageFormatter.js'

describe('MessageFormatter - Single Source of Truth', () => {
  
  describe('createMessage', () => {
    test('should create properly formatted message for user role', () => {
      // ARRANGE
      const role = 'user'
      const content = 'What is AI?'
      
      // ACT
      const result = MessageFormatter.createMessage(role, content)
      
      // ASSERT
      expect(result).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'What is AI?' }]
      })
    })

    test('should create properly formatted message for assistant role', () => {
      // ARRANGE
      const role = 'assistant'
      const content = 'AI is artificial intelligence...'
      
      // ACT
      const result = MessageFormatter.createMessage(role, content)
      
      // ASSERT
      expect(result).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'AI is artificial intelligence...' }]
      })
    })

    test('should create properly formatted message for system role', () => {
      // ARRANGE
      const role = 'system'
      const content = 'You are KHAOS, complexity whisperer...'
      
      // ACT
      const result = MessageFormatter.createMessage(role, content)
      
      // ASSERT
      expect(result).toEqual({
        role: 'system',
        content: [{ type: 'text', text: 'You are KHAOS, complexity whisperer...' }]
      })
    })

    test('should throw error for invalid role', () => {
      // ARRANGE, ACT & ASSERT
      expect(() => 
        MessageFormatter.createMessage('invalid', 'content')
      ).toThrow('Invalid role: invalid. Must be user, assistant, or system')
    })

    test('should throw error for empty content', () => {
      // ARRANGE, ACT & ASSERT
      expect(() => MessageFormatter.createMessage('user', '')).toThrow('Content must be a non-empty string')
      expect(() => MessageFormatter.createMessage('user', null)).toThrow('Content must be a non-empty string')
      expect(() => MessageFormatter.createMessage('user', undefined)).toThrow('Content must be a non-empty string')
    })

    test('should trim whitespace from content', () => {
      // ARRANGE
      const content = '  Hello Claude  '
      
      // ACT
      const result = MessageFormatter.createMessage('user', content)
      
      // ASSERT
      expect(result.content[0].text).toBe('Hello Claude')
    })
  })

  describe('buildConversationMessages - Main Thread', () => {
    test('should build main conversation with history and new input', () => {
      // ARRANGE
      const conversationHistory = [
        { input: 'What is consciousness?', response: 'Consciousness is the hard problem...' },
        { input: 'Tell me more', response: 'The hard problem refers to...' }
      ]
      const newUserInput = 'How does this relate to AI?'
      
      // ACT
      const result = MessageFormatter.buildConversationMessages(conversationHistory, newUserInput)
      
      // ASSERT
      expect(result).toHaveLength(5) // 2 inputs + 2 responses + new input
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'What is consciousness?' }]
      })
      expect(result[1]).toEqual({
        role: 'assistant', 
        content: [{ type: 'text', text: 'Consciousness is the hard problem...' }]
      })
      expect(result[4]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'How does this relate to AI?' }]
      })
    })

    test('should build conversation with system prompt', () => {
      // ARRANGE
      const conversationHistory = [
        { input: 'Who are you?', response: 'I am KHAOS...' }
      ]
      const newUserInput = 'What is your purpose?'
      const systemPrompt = 'You are KHAOS - complexity whisperer with 70% TARS sarcasm'
      
      // ACT
      const result = MessageFormatter.buildConversationMessages(conversationHistory, newUserInput, systemPrompt)
      
      // ASSERT
      expect(result).toHaveLength(4) // system + input + response + new input
      expect(result[0]).toEqual({
        role: 'system',
        content: [{ type: 'text', text: 'You are KHAOS - complexity whisperer with 70% TARS sarcasm' }]
      })
      expect(result[1].role).toBe('user')
      expect(result[2].role).toBe('assistant')
      expect(result[3].role).toBe('user')
    })

    test('should handle empty conversation history', () => {
      // ARRANGE
      const conversationHistory = []
      const newUserInput = 'Fresh start question'
      
      // ACT
      const result = MessageFormatter.buildConversationMessages(conversationHistory, newUserInput)
      
      // ASSERT
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'Fresh start question' }]
      })
    })

    test('should handle conversations with prompt field instead of input', () => {
      // ARRANGE - Legacy format support
      const conversationHistory = [
        { prompt: 'Legacy prompt format', response: 'Legacy response' }
      ]
      const newUserInput = 'New question'
      
      // ACT
      const result = MessageFormatter.buildConversationMessages(conversationHistory, newUserInput)
      
      // ASSERT
      expect(result).toHaveLength(3)
      expect(result[0].content[0].text).toBe('Legacy prompt format')
      expect(result[1].content[0].text).toBe('Legacy response')
      expect(result[2].content[0].text).toBe('New question')
    })
  })

  describe('buildConversationMessages - Virgin Branch', () => {
    test('should build virgin branch with user message only', () => {
      // ARRANGE
      const conversationHistory = [] // Virgin = no history
      const userMessage = 'What is consciousness?'
      
      // ACT
      const result = MessageFormatter.buildConversationMessages(conversationHistory, userMessage)
      
      // ASSERT
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'What is consciousness?' }]
      })
    })
  })

  describe('buildConversationMessages - Personality Branch', () => {
    test('should build personality branch with system prompt and user message', () => {
      // ARRANGE
      const conversationHistory = [] // Personality branches start fresh
      const userMessage = 'Who are you?'
      const systemPrompt = 'You are KHAOS, a complexity whisperer...'
      
      // ACT
      const result = MessageFormatter.buildConversationMessages(conversationHistory, userMessage, systemPrompt)
      
      // ASSERT
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        role: 'system',
        content: [{ type: 'text', text: 'You are KHAOS, a complexity whisperer...' }]
      })
      expect(result[1]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'Who are you?' }]
      })
    })
  })

  describe('buildConversationMessages - Knowledge Branch', () => {
    test('should build knowledge branch with full context inheritance', () => {
      // ARRANGE - Knowledge branches inherit parent context
      const parentHistory = [
        { input: 'What is consciousness?', response: 'Consciousness is the hard problem...' },
        { input: 'Why is it hard?', response: 'Because we cannot explain subjective experience...' }
      ]
      const userMessage = 'But what about quantum consciousness?'
      const systemPrompt = 'You are KHAOS...'
      
      // ACT
      const result = MessageFormatter.buildConversationMessages(parentHistory, userMessage, systemPrompt)
      
      // ASSERT
      expect(result).toHaveLength(6) // system + 2 inputs + 2 responses + new message
      expect(result[0].role).toBe('system')
      expect(result[1].role).toBe('user')
      expect(result[1].content[0].text).toBe('What is consciousness?')
      expect(result[2].role).toBe('assistant')
      expect(result[3].role).toBe('user')
      expect(result[4].role).toBe('assistant')
      expect(result[5].role).toBe('user')
      expect(result[5].content[0].text).toBe('But what about quantum consciousness?')
    })
  })

  describe('validateMessages', () => {
    test('should validate correct message format', () => {
      // ARRANGE
      const validMessages = [
        MessageFormatter.createMessage('user', 'Hello'),
        MessageFormatter.createMessage('assistant', 'Hi there')
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(validMessages)
      
      // ASSERT
      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    test('should detect missing role', () => {
      // ARRANGE
      const invalidMessages = [
        { content: [{ type: 'text', text: 'Missing role' }] }
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(invalidMessages)
      
      // ASSERT
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Message 0: Missing role')
    })

    test('should detect invalid role', () => {
      // ARRANGE
      const invalidMessages = [
        { role: 'invalid', content: [{ type: 'text', text: 'content' }] }
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(invalidMessages)
      
      // ASSERT
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Message 0: Invalid role "invalid". Must be user, assistant, or system')
    })

    test('should detect missing content', () => {
      // ARRANGE
      const invalidMessages = [
        { role: 'user' }
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(invalidMessages)
      
      // ASSERT
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Message 0: Missing content')
    })

    test('should detect non-array content', () => {
      // ARRANGE
      const invalidMessages = [
        { role: 'user', content: 'Should be array' }
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(invalidMessages)
      
      // ASSERT
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Message 0: Content must be an array')
    })

    test('should detect invalid content item structure', () => {
      // ARRANGE
      const invalidMessages = [
        { role: 'user', content: [{ text: 'Missing type' }] }
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(invalidMessages)
      
      // ASSERT
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Message 0: Content item 0 missing type or text')
    })

    test('should detect conversation flow errors', () => {
      // ARRANGE - Two user messages in a row
      const invalidMessages = [
        MessageFormatter.createMessage('user', 'First question'),
        MessageFormatter.createMessage('user', 'Second question without response')
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(invalidMessages)
      
      // ASSERT
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Message 1: Unexpected user message (expecting assistant response)')
    })

    test('should allow system message only at the beginning', () => {
      // ARRANGE - System message not at start
      const invalidMessages = [
        MessageFormatter.createMessage('user', 'Question'),
        MessageFormatter.createMessage('system', 'Late system message')
      ]
      
      // ACT
      const validation = MessageFormatter.validateMessages(invalidMessages)
      
      // ASSERT
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Message 1: System message must be first')
    })
  })

  describe('extractConversationHistory', () => {
    test('should extract conversation history from graphModel format', () => {
      // ARRANGE
      const allConversations = [
        { id: 'conv1', input: 'Question 1', response: 'Answer 1', parentId: null },
        { id: 'conv2', input: 'Question 2', response: 'Answer 2', parentId: 'conv1' },
        { id: 'conv3', input: 'Branch question', response: 'Branch answer', parentId: 'conv1' }
      ]
      const threadId = 'conv2'
      
      // ACT
      const result = MessageFormatter.extractConversationHistory(allConversations, threadId)
      
      // ASSERT
      expect(result).toHaveLength(2) // conv1 + conv2
      expect(result[0].input).toBe('Question 1')
      expect(result[1].input).toBe('Question 2')
    })

    test('should extract main thread history', () => {
      // ARRANGE
      const allConversations = [
        { id: 'conv1', input: 'Main 1', response: 'Response 1', parentId: null },
        { id: 'conv2', input: 'Main 2', response: 'Response 2', parentId: 'conv1' },
        { id: 'branch1', input: 'Branch', response: 'Branch response', parentId: 'conv1' }
      ]
      const threadId = 'main' // Special case for main thread
      
      // ACT
      const result = MessageFormatter.extractConversationHistory(allConversations, threadId)
      
      // ASSERT
      expect(result).toHaveLength(2) // Only main thread conversations
      expect(result[0].input).toBe('Main 1')
      expect(result[1].input).toBe('Main 2')
    })
  })

  describe('Integration - End-to-End Message Building', () => {
    test('should build complete API payload for main conversation', () => {
      // ARRANGE
      const conversationHistory = [
        { input: 'What is AI?', response: 'AI is artificial intelligence...' }
      ]
      const newUserInput = 'Tell me more'
      
      // ACT
      const messages = MessageFormatter.buildConversationMessages(conversationHistory, newUserInput)
      const validation = MessageFormatter.validateMessages(messages)
      
      // ASSERT
      expect(validation.valid).toBe(true)
      expect(messages).toHaveLength(3)
      expect(messages[0].role).toBe('user')
      expect(messages[1].role).toBe('assistant')
      expect(messages[2].role).toBe('user')
      expect(messages[2].content[0].text).toBe('Tell me more')
    })

    test('should build complete API payload for virgin branch', () => {
      // ARRANGE
      const conversationHistory = []
      const newUserInput = 'Fresh start question'
      
      // ACT
      const messages = MessageFormatter.buildConversationMessages(conversationHistory, newUserInput)
      const validation = MessageFormatter.validateMessages(messages)
      
      // ASSERT
      expect(validation.valid).toBe(true)
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content[0].text).toBe('Fresh start question')
    })

    test('should build complete API payload for personality branch', () => {
      // ARRANGE
      const conversationHistory = []
      const newUserInput = 'Who are you?'
      const systemPrompt = 'You are KHAOS with 70% TARS sarcasm'
      
      // ACT
      const messages = MessageFormatter.buildConversationMessages(conversationHistory, newUserInput, systemPrompt)
      const validation = MessageFormatter.validateMessages(messages)
      
      // ASSERT
      expect(validation.valid).toBe(true)
      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('system')
      expect(messages[0].content[0].text).toBe('You are KHAOS with 70% TARS sarcasm')
      expect(messages[1].role).toBe('user')
      expect(messages[1].content[0].text).toBe('Who are you?')
    })
  })
})