import { describe, test, expect } from 'vitest'
import { MessageFormatter } from './MessageFormatter.js'

describe('MessageFormatter - Single Source of Truth', () => {
  
  test('should create valid Claude API message format', () => {
    const message = MessageFormatter.createMessage('user', 'Hello Claude')
    
    expect(message).toEqual({
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Hello Claude'
        }
      ]
    })
  })
  
  test('should validate input parameters', () => {
    expect(() => MessageFormatter.createMessage('', 'content')).toThrow('Invalid input')
    expect(() => MessageFormatter.createMessage('user', '')).toThrow('Invalid input')
    expect(() => MessageFormatter.createMessage('invalid', 'content')).toThrow('Invalid role')
    expect(() => MessageFormatter.createMessage('user', 123)).toThrow('Content must be string')
  })
  
  test('should build conversation messages for main thread', () => {
    const history = [
      { input: 'What is AI?', response: 'AI is artificial intelligence...' },
      { input: 'How does it work?', response: 'AI works through...' }
    ]
    
    const messages = MessageFormatter.buildConversationMessages(
      history, 
      'Tell me more', 
      'You are a helpful AI assistant'
    )
    
    expect(messages).toHaveLength(6) // system + 2 exchanges + new input
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    expect(messages[2].role).toBe('assistant')
    expect(messages[5].content[0].text).toBe('Tell me more')
  })
  
  test('should build conversation messages for branch (grown conversation)', () => {
    const branchHistory = [
      { input: 'Original question', response: 'Original answer' },
      { input: 'Branch question', response: 'Branch answer' }
    ]
    
    const messages = MessageFormatter.buildConversationMessages(
      branchHistory,
      'Continue branch',
      'You are KHAOS - complexity whisperer'
    )
    
    // From Claude's perspective, this is just another conversation
    expect(messages).toHaveLength(6) // system + 2 exchanges + new input
    expect(messages[0].content[0].text).toContain('KHAOS')
    expect(messages[5].content[0].text).toBe('Continue branch')
  })
  
  test('should handle legacy "prompt" field in conversations', () => {
    const history = [
      { prompt: 'Legacy question', response: 'Legacy answer' },
      { input: 'New question', response: 'New answer' }
    ]
    
    const messages = MessageFormatter.buildConversationMessages(history, 'Latest input')
    
    expect(messages).toHaveLength(5) // 2 exchanges + new input
    expect(messages[0].content[0].text).toBe('Legacy question')
    expect(messages[2].content[0].text).toBe('New question')
    expect(messages[4].content[0].text).toBe('Latest input')
  })
  
  test('should validate message structure correctly', () => {
    const validMessages = [
      MessageFormatter.createMessage('user', 'Hello'),
      MessageFormatter.createMessage('assistant', 'Hi there')
    ]
    
    const validation = MessageFormatter.validateMessages(validMessages)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })
  
  test('should detect invalid message format', () => {
    const invalidMessages = [
      { role: 'user', content: 'Wrong format' }, // Missing content structure
      { role: 'assistant', content: [{ text: 'Missing type' }] }
    ]
    
    const validation = MessageFormatter.validateMessages(invalidMessages)
    expect(validation.valid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
  })
  
  test('should validate conversation flow', () => {
    const invalidFlow = [
      MessageFormatter.createMessage('user', 'First'),
      MessageFormatter.createMessage('user', 'Second'), // Should be assistant
      MessageFormatter.createMessage('assistant', 'Third')
    ]
    
    const validation = MessageFormatter.validateMessages(invalidFlow)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(err => err.includes('Unexpected user message'))).toBe(true)
  })
  
  test('should handle virgin conversation (no history)', () => {
    const messages = MessageFormatter.buildConversationMessages(
      [], // No history
      'Fresh start',
      null // No system prompt
    )
    
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content[0].text).toBe('Fresh start')
  })
  
  test('should handle personality conversation (system prompt only)', () => {
    const messages = MessageFormatter.buildConversationMessages(
      [], // No history
      'Who are you?',
      'You are KHAOS - a complexity whisperer with 70% TARS sarcasm'
    )
    
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content[0].text).toContain('KHAOS')
    expect(messages[1].role).toBe('user')
    expect(messages[1].content[0].text).toBe('Who are you?')
  })
  
  test('should convert legacy message formats', () => {
    const legacyMessages = [
      { role: 'user', content: 'Old string format' },
      { role: 'assistant', content: [{ type: 'text', text: 'Already correct' }] },
      { role: 'user', content: { text: 'Object format' } }
    ]
    
    const converted = MessageFormatter.convertLegacyMessages(legacyMessages)
    
    expect(converted).toHaveLength(3)
    expect(converted[0].content[0].text).toBe('Old string format')
    expect(converted[1].content[0].text).toBe('Already correct')
    expect(converted[2].content[0].text).toBe('Object format')
  })
  
  test('should extract conversation history with thread filtering', () => {
    const conversations = [
      { input: 'Main 1', response: 'Response 1', threadId: 'main' },
      { input: 'Branch 1', response: 'Branch Response 1', threadId: 'branch-123', branchContext: 'ctx-1' },
      { input: 'Main 2', response: 'Response 2', threadId: 'main' },
      { input: 'Branch 2', response: 'Branch Response 2', threadId: 'branch-456', branchContext: 'ctx-2' }
    ]
    
    // Test main thread filtering
    const mainHistory = MessageFormatter.extractConversationHistory(conversations, 'main')
    expect(mainHistory).toHaveLength(2)
    expect(mainHistory[0].input).toBe('Main 1')
    
    // Test branch filtering
    const branchHistory = MessageFormatter.extractConversationHistory(conversations, 'branch-123', 'ctx-1')
    expect(branchHistory).toHaveLength(1)
    expect(branchHistory[0].input).toBe('Branch 1')
  })
  
  test('should handle empty or invalid conversation arrays', () => {
    expect(MessageFormatter.extractConversationHistory(null)).toEqual([])
    expect(MessageFormatter.extractConversationHistory(undefined)).toEqual([])
    expect(MessageFormatter.extractConversationHistory([])).toEqual([])
    expect(MessageFormatter.extractConversationHistory('invalid')).toEqual([])
  })
  
  test('should handle edge cases in message building', () => {
    // Empty system prompt should be ignored
    const messages1 = MessageFormatter.buildConversationMessages([], 'test', '')
    expect(messages1).toHaveLength(1)
    expect(messages1[0].role).toBe('user')
    
    // Whitespace-only system prompt should be ignored
    const messages2 = MessageFormatter.buildConversationMessages([], 'test', '   ')
    expect(messages2).toHaveLength(1)
    
    // Empty user input should be ignored
    const messages3 = MessageFormatter.buildConversationMessages([], '', 'system')
    expect(messages3).toHaveLength(1)
    expect(messages3[0].role).toBe('system')
  })
  
  test('should trim content in messages', () => {
    const message = MessageFormatter.createMessage('user', '  Hello World  ')
    expect(message.content[0].text).toBe('Hello World')
    
    const messages = MessageFormatter.buildConversationMessages(
      [],
      '  User input  ',
      '  System prompt  '
    )
    expect(messages[0].content[0].text).toBe('System prompt')
    expect(messages[1].content[0].text).toBe('User input')
  })
  
  test('should validate empty messages array', () => {
    const validation = MessageFormatter.validateMessages([])
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Messages array cannot be empty')
  })
  
  test('should validate non-array input', () => {
    const validation = MessageFormatter.validateMessages('not an array')
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Messages must be an array')
  })
  
  test('should handle system message placement validation', () => {
    const validSystemFirst = [
      MessageFormatter.createMessage('system', 'System'),
      MessageFormatter.createMessage('user', 'User'),
      MessageFormatter.createMessage('assistant', 'Assistant')
    ]
    
    const validation1 = MessageFormatter.validateMessages(validSystemFirst)
    expect(validation1.valid).toBe(true)
    
    const invalidSystemLater = [
      MessageFormatter.createMessage('user', 'User'),
      MessageFormatter.createMessage('system', 'System'), // Should be first
      MessageFormatter.createMessage('assistant', 'Assistant')
    ]
    
    const validation2 = MessageFormatter.validateMessages(invalidSystemLater)
    expect(validation2.valid).toBe(false)
    expect(validation2.errors.some(err => err.includes('System message should be first'))).toBe(true)
  })
})