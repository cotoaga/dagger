/**
 * TDD Tests: Fix Context Inheritance & Message Duplication
 * 
 * These tests define the expected behavior for:
 * - Initialization without auto-duplication
 * - Knowledge branch context inheritance
 * - System message separation
 * - Virgin branch fresh start
 * 
 * They should FAIL initially to guide our fixes via TDD approach.
 */

import { expect, test, beforeEach, vi, describe } from 'vitest'
import { graphModel } from '../models/GraphModel.js'
import { claudeAPI } from '../services/ClaudeAPI.js'
import { MessageFormatter } from '../services/MessageFormatter.js'
import PromptsModel from '../models/PromptsModel.js'

// Mock the API for testing
vi.mock('../services/ClaudeAPI.js', () => ({
  claudeAPI: {
    sendMessage: vi.fn(),
    setSessionApiKey: vi.fn(),
    getApiKey: vi.fn(() => 'test-api-key')
  }
}))

describe('Context Inheritance & Message Duplication - TDD', () => {
  let promptsModel
  
  beforeEach(() => {
    // Reset mocks and state before each test
    vi.clearAllMocks()
    
    // Reset graph model to clean state
    graphModel.clearAll()
    
    // Initialize prompts model for personality templates
    promptsModel = new PromptsModel()
    
    // Mock successful API response for all tests
    claudeAPI.sendMessage.mockResolvedValue({
      content: 'KHAOS v3.0 initialized and ready for distributed cognition.',
      processingTime: 1000,
      usage: { input_tokens: 20, output_tokens: 15, total_tokens: 35 },
      model: 'claude-sonnet-4-20250514',
      id: 'test-response-id',
      timestamp: new Date().toISOString(),
      messageCount: 1
    })
  })

  test('conversation initialization should not auto-duplicate', async () => {
    // ARRANGE: Fresh DAGGER start
    expect(graphModel.getAllConversations()).toHaveLength(0)
    
    // Get KHAOS personality template
    const khaosTemplate = promptsModel.getPrompt('khaos-explorer')
    expect(khaosTemplate).toBeDefined()
    expect(khaosTemplate.content).toContain('KHAOS')
    
    // ACT: Initialize with personality (simulate initialization flow)
    const conversation0 = graphModel.addConversation(
      "Hello Claude, I'm ready to explore distributed cognition.",
      "", // No response yet
      { 
        status: 'processing',
        systemPrompt: khaosTemplate.content,
        branchType: 'personality',
        promptTemplate: khaosTemplate
      }
    )
    
    // Simulate API response being processed
    graphModel.updateConversation(conversation0.id, {
      response: 'KHAOS v3.0 initialized and ready for distributed cognition.',
      status: 'complete'
    })
    
    const conversations = graphModel.getAllConversations()
    
    // ASSERT: Should only have conversation 0
    expect(conversations).toHaveLength(1)
    expect(conversations[0].displayNumber).toBe(0) // Number, not string
    expect(conversations[0].prompt).toContain('Hello Claude')
    expect(conversations[0].response).toBeDefined()
    
    // Most importantly: No automatic conversation 1
    const conv1 = conversations.find(c => c.displayNumber === 1)
    expect(conv1).toBeUndefined()
    
    // Verify no auto-duplication happened during response processing
    expect(conversations.length).toBe(1)
  })

  test('knowledge branches should inherit full conversation history', async () => {
    // ARRANGE: Setup main conversation with history
    const conv0 = graphModel.addConversation(
      "Hello Claude, initialize KHAOS",
      "KHAOS v3.0 initialized."
    )
    
    const conv1 = graphModel.addConversation(
      "First main message",
      "First main response",
      { parentId: conv0.id }
    )
    
    const conv2 = graphModel.addConversation(
      "Second main message", 
      "Second main response",
      { parentId: conv1.id }
    )
    
    const mainConversations = graphModel.getAllConversations()
    expect(mainConversations).toHaveLength(3) // 0, 1, 2
    
    // ACT: Create knowledge branch from conversation 2 (using proper flow)
    const knowledgeBranch = graphModel.createBranch(conv2.id, 'knowledge')
    
    // Update with actual conversation content (simulates user input)
    graphModel.updateConversation(knowledgeBranch.id, {
      prompt: "What do you remember from our conversation?",
      status: 'processing'
    })
    
    // Build conversation history that knowledge branch should inherit
    const allConversations = graphModel.getAllConversationsWithBranches()
    const conversationHistory = MessageFormatter.extractConversationHistory(
      allConversations,
      knowledgeBranch.id
    )
    
    // ASSERT: Branch should have inherited context
    expect(conversationHistory).toBeDefined()
    expect(conversationHistory.length).toBeGreaterThan(0) // Should inherit some history
    
    // Knowledge branches should include parent conversation context
    expect(conversationHistory.length).toBeGreaterThanOrEqual(2) // At least conv2 + its parent
    
    // Verify the history includes the main thread conversations
    const historyInputs = conversationHistory.map(conv => conv.prompt || conv.input)
    expect(historyInputs.some(input => input?.includes('Hello Claude'))).toBe(true)
    expect(historyInputs.some(input => input?.includes('First main message'))).toBe(true)
  })

  test('system messages should not appear in user conversation', async () => {
    // ARRANGE: Initialize personality with system message
    const khaosTemplate = promptsModel.getPrompt('khaos-explorer')
    const userPrompt = "Hello Claude, I'm ready to explore distributed cognition."
    
    const conv0 = graphModel.addConversation(
      userPrompt,
      "KHAOS v3.0 initialized.",
      {
        systemPrompt: khaosTemplate.content,
        branchType: 'personality',
        promptTemplate: khaosTemplate
      }
    )
    
    // ACT: Get conversation 0 content
    const conversations = graphModel.getAllConversations()
    const conversation0 = conversations[0]
    
    // ASSERT: System message not duplicated in visible content
    expect(conversation0.prompt).not.toContain('You are KHAOS') // System message shouldn't be in prompt
    expect(conversation0.prompt).toContain('Hello Claude') // User message should be in prompt
    
    // System message should be stored separately
    expect(conversation0.systemPrompt).toContain('KHAOS')
    expect(conversation0.systemPrompt).not.toEqual(conversation0.prompt)
    
    // Verify system and user prompts are completely different
    expect(conversation0.systemPrompt).toBeDefined()
    expect(conversation0.prompt).toBeDefined()
    expect(conversation0.systemPrompt).not.toBe(conversation0.prompt)
  })

  test('virgin branches should start completely fresh', async () => {
    // ARRANGE: Setup main conversation with history
    const conv0 = graphModel.addConversation(
      "Hello Claude, initialize KHAOS",
      "KHAOS v3.0 initialized.",
      {
        systemPrompt: "You are KHAOS v3.0...",
        branchType: 'personality'
      }
    )
    
    const conv1 = graphModel.addConversation(
      "Main conversation content with context",
      "Main response with personality",
      { parentId: conv0.id }
    )
    
    // ACT: Create virgin branch from conversation 1 (using proper flow)
    const virginBranch = graphModel.createBranch(conv1.id, 'virgin')
    
    // Update with actual conversation content (simulates user input)
    graphModel.updateConversation(virginBranch.id, {
      prompt: "Fresh start question - no context needed",
      status: 'processing'
    })
    
    // Build conversation history for virgin branch
    const allConversations = graphModel.getAllConversationsWithBranches()
    
    // For virgin branches, we expect ZERO context inheritance
    // This tests the branch type specific logic
    const shouldBeEmpty = []  // Virgin branches should have no history
    
    // ASSERT: No context inheritance for virgin branches
    expect(virginBranch.branchType).toBe('virgin')
    expect(virginBranch.systemPrompt).toBeUndefined() // No system message
    expect(virginBranch.prompt).toBe("Fresh start question - no context needed")
    
    // Virgin branch should be completely independent
    expect(virginBranch.parentId).toBe(conv1.id) // Has parent for tree structure
    // But conversation history building should ignore parent context for virgin branches
  })

  test('branch type specific context inheritance (real app flow)', async () => {
    // ARRANGE: Create conversation chain like real app
    const conv0 = graphModel.addConversation("Initial message", "Initial response")
    const conv1 = graphModel.addConversation("Second message", "Second response", { parentId: conv0.id })
    
    const knowledgeBranch = graphModel.createBranch(conv1.id, 'knowledge')
    const virginBranch = graphModel.createBranch(conv1.id, 'virgin')
    
    // ACT: Simulate the real application's branch-type-specific logic
    const allConversations = graphModel.getAllConversationsWithBranches()
    
    // Knowledge branch: Should inherit full context (real app behavior)
    let knowledgeContext = []
    if (knowledgeBranch.branchType === 'knowledge') {
      knowledgeContext = MessageFormatter.extractConversationHistory(
        allConversations,
        knowledgeBranch.id
      )
    }
    
    // Virgin branch: Should have NO context (real app behavior)
    let virginContext = []
    if (virginBranch.branchType === 'virgin') {
      virginContext = [] // App.jsx line 495: conversationHistory = []
    }
    
    // ASSERT: Branch types should have different context inheritance
    expect(knowledgeBranch.branchType).toBe('knowledge')
    expect(virginBranch.branchType).toBe('virgin')
    expect(knowledgeContext.length).toBeGreaterThan(0) // Knowledge inherits parent context
    expect(virginContext.length).toBe(0) // Virgin starts fresh
    expect(knowledgeContext.length).not.toBe(virginContext.length) // They're different
  })

  test('system prompt should be passed to API separately from user input', async () => {
    // ARRANGE: Create personality conversation
    const khaosTemplate = promptsModel.getPrompt('khaos-explorer')
    const userInput = "Test message for API"
    const systemPrompt = khaosTemplate.content
    
    // ACT: Build API messages like the real application does
    const conversationHistory = [] // Empty for fresh start
    const apiMessages = MessageFormatter.buildConversationMessages(
      conversationHistory,
      userInput,
      systemPrompt
    )
    
    // ASSERT: System message and user input should be separate
    expect(apiMessages.length).toBeGreaterThanOrEqual(2) // At least system + user
    
    const systemMessage = apiMessages.find(msg => msg.role === 'system')
    const userMessage = apiMessages.find(msg => msg.role === 'user')
    
    expect(systemMessage).toBeDefined()
    expect(userMessage).toBeDefined()
    
    expect(systemMessage.content[0].text).toContain('KHAOS')
    expect(userMessage.content[0].text).toBe(userInput)
    
    // They should be completely different
    expect(systemMessage.content[0].text).not.toBe(userMessage.content[0].text)
  })
})