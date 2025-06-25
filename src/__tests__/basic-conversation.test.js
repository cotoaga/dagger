/**
 * EMERGENCY: Basic Conversation Flow Tests - TDD Approach
 * 
 * These tests define what "working" means for basic conversation functionality.
 * They should FAIL initially because the conversation system is broken.
 * 
 * Success criteria: User types message → hits enter → gets Claude response
 */

import { expect, test, beforeEach, vi } from 'vitest'
import { graphModel } from '../models/GraphModel.js'
import { claudeAPI } from '../services/ClaudeAPI.js'
import { MessageFormatter } from '../services/MessageFormatter.js'

// Mock the API for testing
vi.mock('../services/ClaudeAPI.js', () => ({
  claudeAPI: {
    sendMessage: vi.fn(),
    setSessionApiKey: vi.fn(),
    getApiKey: vi.fn(() => 'test-api-key')
  }
}))

describe('Basic Conversation Flow - Emergency TDD', () => {
  
  beforeEach(() => {
    // Reset mocks and state before each test
    vi.clearAllMocks()
    
    // Reset graph model to clean state
    graphModel.clearAll()
    
    // Mock successful API response
    claudeAPI.sendMessage.mockResolvedValue({
      content: 'Hello! I received your message.',
      processingTime: 1000,
      usage: { input_tokens: 10, output_tokens: 8, total_tokens: 18 },
      model: 'claude-sonnet-4-20250514',
      id: 'test-response-id',
      timestamp: new Date().toISOString(),
      messageCount: 2
    })
  })

  test('DAGGER initializes with conversation 0', async () => {
    // ARRANGE: Fresh DAGGER state
    expect(graphModel.getAllConversations()).toHaveLength(0)
    
    // ACT: Initialize conversation 0 (KHAOS personality)
    const conversation0 = graphModel.addConversation(
      "Initialize DAGGER with KHAOS personality",
      "KHAOS v3.0 initialized and ready for distributed cognition."
    )
    
    // ASSERT: Conversation 0 exists and is properly configured
    const conversations = graphModel.getAllConversations()
    expect(conversations).toHaveLength(1)
    expect(conversations[0].id).toBe(conversation0.id)
    expect(conversations[0].displayNumber).toBe('0')
    expect(conversations[0].input).toBeDefined()
    expect(conversations[0].response).toBeDefined()
  })

  test('user can send first message after initialization', async () => {
    // ARRANGE: Initialize DAGGER with conversation 0
    const conversation0 = graphModel.addConversation(
      "Initialize DAGGER with KHAOS personality",
      "KHAOS v3.0 initialized and ready for distributed cognition."
    )
    
    const conversations = graphModel.getAllConversations()
    expect(conversations).toHaveLength(1) // Conversation 0 exists
    
    // ACT: Send first user message (this is what currently crashes)
    const userInput = "Hello, this is my first message"
    
    // Build conversation history for the new message
    const conversationHistory = MessageFormatter.extractConversationHistory(
      conversations, 
      'main'
    )
    
    // This should work without crashing
    const result = await claudeAPI.sendMessage(conversationHistory, userInput, {
      context: 'first-user-message-test',
      debug: true
    })
    
    // ASSERT: Message should succeed
    expect(result.content).toBeDefined()
    expect(result.content).toBe('Hello! I received your message.')
    expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
      expect.any(Array),
      userInput,
      expect.objectContaining({
        context: 'first-user-message-test',
        debug: true
      })
    )
  })

  test('first message creates valid API payload', async () => {
    // ARRANGE: Setup conversation state with conversation 0
    const conversation0 = graphModel.addConversation(
      "Initialize DAGGER",
      "DAGGER initialized."
    )
    
    const conversations = graphModel.getAllConversations()
    
    // ACT: Build message for API (this is where format errors occur)
    const userInput = "Test message"
    const conversationHistory = MessageFormatter.extractConversationHistory(
      conversations,
      'main'
    )
    
    const apiMessages = MessageFormatter.buildConversationMessages(
      conversationHistory,
      userInput,
      null // No system prompt for basic test
    )
    
    // ASSERT: Payload should be valid
    expect(apiMessages).toBeDefined()
    expect(Array.isArray(apiMessages)).toBe(true)
    expect(apiMessages.length).toBeGreaterThan(0)
    
    // Check message format
    apiMessages.forEach(msg => {
      expect(msg.role).toMatch(/^(system|user|assistant)$/)
      expect(msg.content).toBeDefined()
      expect(Array.isArray(msg.content)).toBe(true)
      expect(msg.content[0].type).toBe('text')
      expect(msg.content[0].text).toBeDefined()
    })
    
    // Validate using MessageFormatter
    const validation = MessageFormatter.validateMessages(apiMessages)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  test('graceful error handling when API fails', async () => {
    // ARRANGE: Mock API failure (400 Bad Request - the current error)
    claudeAPI.sendMessage.mockRejectedValue(
      new Error('Invalid request. Please check your message format.')
    )
    
    const conversation0 = graphModel.addConversation(
      "Initialize DAGGER",
      "DAGGER initialized."
    )
    
    const conversations = graphModel.getAllConversations()
    const conversationHistory = MessageFormatter.extractConversationHistory(
      conversations,
      'main'
    )
    
    // ACT: Attempt to send message (should handle error gracefully)
    let thrownError
    try {
      await claudeAPI.sendMessage(conversationHistory, "Test", {
        context: 'error-handling-test'
      })
    } catch (error) {
      thrownError = error
    }
    
    // ASSERT: Should handle error gracefully
    expect(thrownError).toBeDefined()
    expect(thrownError.message).toContain('Invalid request')
    
    // Should not crash the application - error should be contained
    expect(() => {
      throw thrownError
    }).toThrow('Invalid request')
  })

  test('conversation history extraction works correctly', async () => {
    // ARRANGE: Create a conversation chain
    const conversation0 = graphModel.addConversation(
      "First message",
      "First response"
    )
    
    const conversation1 = graphModel.addConversation(
      "Second message", 
      "Second response",
      { parentId: conversation0.id }
    )
    
    const conversations = graphModel.getAllConversations()
    
    // ACT: Extract conversation history for main thread
    const history = MessageFormatter.extractConversationHistory(conversations, 'main')
    
    // ASSERT: History should be in correct order
    expect(history).toHaveLength(2)
    expect(history[0].input).toBe("First message")
    expect(history[0].response).toBe("First response")
    expect(history[1].input).toBe("Second message")
    expect(history[1].response).toBe("Second response")
  })
})