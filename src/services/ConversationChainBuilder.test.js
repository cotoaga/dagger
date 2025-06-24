import { describe, test, expect } from 'vitest'
import { ConversationChainBuilder } from './ConversationChainBuilder.js'

describe('ConversationChainBuilder - API Message Construction', () => {
  test('should build proper message chain for Claude API', () => {
    // ARRANGE: Branch context components
    const systemPrompt = 'You are KHAOS - complexity whisperer...'
    const parentHistory = [
      { role: 'user', content: 'What is microservices?' },
      { role: 'assistant', content: 'Microservices are distributed systems...' }
    ]
    const userInput = 'who are you?'
    
    // ACT: Build message chain
    const builder = new ConversationChainBuilder()
    const messageChain = builder.buildChain(systemPrompt, parentHistory, userInput)
    
    // ASSERT: Proper Claude API format
    expect(messageChain.messages).toHaveLength(4)
    expect(messageChain.messages[0]).toEqual({
      role: 'system',
      content: systemPrompt
    })
    expect(messageChain.messages[3]).toEqual({
      role: 'user', 
      content: userInput
    })
  })

  test('should handle missing system prompt gracefully', () => {
    // ARRANGE: No system prompt
    const parentHistory = [{ role: 'user', content: 'test' }]
    const userInput = 'new question'
    
    // ACT: Build chain without system prompt
    const builder = new ConversationChainBuilder()
    const messageChain = builder.buildChain('', parentHistory, userInput)
    
    // ASSERT: No system message in chain
    expect(messageChain.messages[0].role).toBe('user')
    expect(messageChain.messages).not.toContain({ role: 'system', content: '' })
  })

  test('should preserve message order and role alternation', () => {
    // ARRANGE: Complex conversation history
    const parentHistory = [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
      { role: 'assistant', content: 'A2' }
    ]
    
    // ACT: Build chain
    const builder = new ConversationChainBuilder()
    const messageChain = builder.buildChain('system prompt', parentHistory, 'Q3')
    
    // ASSERT: Proper role alternation maintained
    expect(messageChain.messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
      { role: 'assistant', content: 'A2' },
      { role: 'user', content: 'Q3' }
    ])
  })

  test('should include metadata about chain construction', () => {
    // ARRANGE: Test data
    const systemPrompt = 'You are KHAOS'
    const parentHistory = [{ role: 'user', content: 'test' }]
    const userInput = 'question'
    
    // ACT: Build chain
    const builder = new ConversationChainBuilder()
    const messageChain = builder.buildChain(systemPrompt, parentHistory, userInput)
    
    // ASSERT: Metadata included
    expect(messageChain.metadata).toHaveProperty('totalMessages', 3)
    expect(messageChain.metadata).toHaveProperty('hasSystemPrompt', true)
    expect(messageChain.metadata).toHaveProperty('parentHistoryLength', 1)
    expect(messageChain.metadata).toHaveProperty('createdAt')
  })

  test('should validate message chain structure', () => {
    // ARRANGE: Valid message chain
    const builder = new ConversationChainBuilder()
    const messageChain = builder.buildChain('system', [], 'user input')
    
    // ACT: Validate chain
    const validation = builder.validateChain(messageChain)
    
    // ASSERT: Valid chain
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  test('should detect invalid message chain structure', () => {
    // ARRANGE: Invalid message chain
    const builder = new ConversationChainBuilder()
    const invalidChain = { messages: [] }
    
    // ACT: Validate chain
    const validation = builder.validateChain(invalidChain)
    
    // ASSERT: Invalid chain detected
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Message chain cannot be empty')
  })

  test('should handle role alternation violations', () => {
    // ARRANGE: Chain with role violations
    const builder = new ConversationChainBuilder()
    const invalidChain = {
      messages: [
        { role: 'user', content: 'Q1' },
        { role: 'user', content: 'Q2' } // Should be assistant
      ]
    }
    
    // ACT: Validate chain
    const validation = builder.validateChain(invalidChain)
    
    // ASSERT: Role violation detected
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(error => error.includes('Expected assistant message'))).toBe(true)
  })
})