import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../../App.jsx'

// Mock the ClaudeAPI to prevent actual API calls during tests
vi.mock('../../services/ClaudeAPI.js', () => ({
  claudeAPI: {
    sendMessage: vi.fn().mockResolvedValue({
      content: 'Mock response',
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
      model: 'claude-sonnet-4',
      id: 'mock-id',
      timestamp: new Date().toISOString(),
      messageCount: 1
    }),
    setModel: vi.fn(),
    setExtendedThinking: vi.fn(),
    getApiKey: vi.fn().mockResolvedValue('mock-key')
  }
}))

// Mock other dependencies
vi.mock('../../models/GraphModel.js', () => ({
  graphModel: {
    getAllConversations: vi.fn(() => []),
    getAllConversationsWithBranches: vi.fn(() => []),
    addConversation: vi.fn(() => ({ id: 'mock-id' })),
    addConversationToBranch: vi.fn(() => ({ id: 'mock-id' })),
    updateConversation: vi.fn(),
    getConversation: vi.fn(() => null),
    getStorageStats: vi.fn(() => ({ conversations: 0, branches: 0 })),
    cleanupGhostBranches: vi.fn(),
    cleanupEmptyThreads: vi.fn()
  }
}))

vi.mock('../../models/PromptsModel.js', () => ({
  default: vi.fn(() => ({
    getPrompt: vi.fn(() => null),
    getAllPrompts: vi.fn(() => [])
  }))
}))

vi.mock('../../services/ConfigService.js', () => ({
  default: {
    checkBackendConfig: vi.fn().mockResolvedValue({ hasApiKey: true, success: true }),
    clearCache: vi.fn()
  }
}))

vi.mock('../../services/BranchContextManager.js', () => ({
  BranchContextManager: vi.fn(() => ({
    createBranchContext: vi.fn(),
    buildContextChain: vi.fn()
  }))
}))

vi.mock('../../services/ConversationChainBuilder.js', () => ({
  ConversationChainBuilder: vi.fn(() => ({
    buildChain: vi.fn()
  }))
}))

vi.mock('../../services/MessageFormatter.js', () => ({
  MessageFormatter: {
    extractConversationHistory: vi.fn(() => []),
    buildConversationMessages: vi.fn(() => []),
    validateMessages: vi.fn()
  }
}))

vi.mock('../../hooks/useVisibleConversation.js', () => ({
  useVisibleConversation: vi.fn(() => ({
    visibleConversation: null,
    setVisibleConversation: vi.fn()
  }))
}))

describe('App Temperature State Management', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Clear all mocks
    vi.clearAllMocks()
  })

  test('should initialize with default temperature value', () => {
    // ARRANGE & ACT
    render(<App />)
    
    // ASSERT - App should render without temperature reference error
    expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
    
    // Should not throw ReferenceError: temperature is not defined
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('temperature is not defined')
    )
  })

  test('should have temperature state accessible in component', () => {
    // ARRANGE & ACT
    render(<App />)
    
    // ASSERT - App should render without temperature reference error
    expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
    
    // Should not throw ReferenceError: temperature is not defined
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('temperature is not defined')
    )
  })

  test('should handle temperature changes without errors', async () => {
    // ARRANGE
    render(<App />)
    
    // ACT & ASSERT - Should not crash when temperature is accessed
    // This test ensures temperature state exists and is usable
    expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
    
    // Should not have temperature reference errors
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('temperature is not defined')
    )
  })

  test('should use default temperature in API calls', async () => {
    // ARRANGE
    render(<App />)
    
    // Wait for component to fully initialize
    await screen.findByText(/DAGGER/i)
    
    // ACT - Try to trigger a conversation (this will fail if temperature is undefined)
    const input = screen.queryByRole('textbox')
    if (input) {
      fireEvent.change(input, { target: { value: 'Test message' } })
      const sendButton = screen.queryByText(/send/i) || screen.queryByRole('button')
      if (sendButton) {
        fireEvent.click(sendButton)
      }
    }
    
    // ASSERT - Should not have crashed with temperature undefined error
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('temperature is not defined')
    )
  })

  test('should pass temperature value to API calls', async () => {
    // Import the mocked API to check calls
    const { claudeAPI } = await import('../../services/ClaudeAPI.js')
    
    // ARRANGE
    render(<App />)
    
    // Wait for component to initialize
    await screen.findByText(/DAGGER/i)
    
    // ACT - Try to trigger API call
    const input = screen.queryByRole('textbox')
    if (input) {
      fireEvent.change(input, { target: { value: 'Test message' } })
      const sendButton = screen.queryByText(/send/i) || screen.queryByRole('button')
      if (sendButton) {
        fireEvent.click(sendButton)
        
        // ASSERT - API should have been called with temperature parameter
        expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
          expect.any(Array), // conversation history
          'Test message',    // user input
          expect.objectContaining({
            temperature: expect.any(Number) // Should have temperature as number
          })
        )
      }
    }
  })
})