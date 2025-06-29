import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    getApiKey: vi.fn().mockResolvedValue('mock-key'),
    MODELS: {
      'claude-sonnet-4-20250514': {
        name: 'Claude Sonnet 4',
        supportsExtendedThinking: true
      }
    }
  }
}))

// Mock other dependencies
vi.mock('../../models/GraphModel.js', () => ({
  graphModel: {
    getAllConversations: vi.fn(() => [
      {
        id: 'conv-1',
        displayNumber: '1',
        prompt: 'Test prompt that is long enough to trigger expand/collapse functionality\nwith multiple lines\nto ensure proper testing\nof the unified toolbar',
        response: 'Test response',
        timestamp: Date.now(),
        status: 'complete'
      }
    ]),
    getAllConversationsWithBranches: vi.fn(() => []),
    addConversation: vi.fn(() => ({ id: 'mock-id' })),
    addConversationToBranch: vi.fn(() => ({ id: 'mock-id' })),
    updateConversation: vi.fn(),
    getConversation: vi.fn(() => null),
    getStorageStats: vi.fn(() => ({ conversations: 1, branches: 0 })),
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
    checkBackendConfig: vi.fn().mockResolvedValue({ 
      apiKeyConfigured: true, 
      hasApiKey: true, 
      success: true,
      configSource: 'test' 
    }),
    clearCache: vi.fn()
  },
  ConfigService: vi.fn(() => ({
    checkBackendConfig: vi.fn().mockResolvedValue({ 
      apiKeyConfigured: true, 
      hasApiKey: true, 
      success: true,
      configSource: 'test' 
    }),
    clearCache: vi.fn()
  }))
}))

// Mock additional dependencies
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

// Mock SessionApiKeyInput to prevent it from showing
vi.mock('../../components/SessionApiKeyInput.jsx', () => ({
  default: vi.fn(() => null)
}))

describe('Unified Toolbar Layout', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Set API key to enable the interface
    localStorage.setItem('claude-api-key', 'test-key')
    // Set session API key to bypass session screen
    localStorage.setItem('session-api-key', 'sk-ant-test-key')
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('Toolbar Container Layout', () => {
    test('should display all four buttons in a unified toolbar area', async () => {
      render(<App />)
      
      // Wait for the app to initialize and show conversation
      await screen.findByText(/Test prompt/)
      
      // Click on the conversation to select it (triggers SELECTED and Center in Graph buttons)
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      // All four buttons should be present
      expect(screen.getByText('📍 SELECTED')).toBeInTheDocument()
      expect(screen.getByText('🎯 Center in Graph')).toBeInTheDocument()
      expect(screen.getByText('🔍 Inspect Tokens')).toBeInTheDocument()
      expect(screen.getByText('📖 Expand')).toBeInTheDocument() // Collapse button
    })

    test('should maintain consistent button positioning', async () => {
      render(<App />)
      
      // Wait for the app to initialize
      await screen.findByText(/Test prompt/)
      
      // Select the conversation to trigger all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      // Find the unified toolbar container
      const unifiedToolbar = screen.getByTestId('unified-toolbar')
      expect(unifiedToolbar).toBeInTheDocument()
      
      // All buttons should be children of the unified toolbar
      const selectedButton = screen.getByText('📍 SELECTED')
      const centerButton = screen.getByText('🎯 Center in Graph')
      const inspectButton = screen.getByText('🔍 Inspect Tokens')
      const collapseButton = screen.getByText('📖 Expand')
      
      expect(unifiedToolbar).toContainElement(selectedButton)
      expect(unifiedToolbar).toContainElement(centerButton)
      expect(unifiedToolbar).toContainElement(inspectButton)
      expect(unifiedToolbar).toContainElement(collapseButton)
    })
  })

  describe('Typography Consistency', () => {
    test('should maintain consistent font sizes across all buttons', async () => {
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to show all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      const selectedButton = screen.getByText('📍 SELECTED')
      const centerButton = screen.getByText('🎯 Center in Graph')
      const inspectButton = screen.getByText('🔍 Inspect Tokens')
      const collapseButton = screen.getByText('📖 Expand')
      
      // All buttons should have consistent font sizes
      const selectedStyle = window.getComputedStyle(selectedButton)
      const centerStyle = window.getComputedStyle(centerButton)
      const inspectStyle = window.getComputedStyle(inspectButton)
      const collapseStyle = window.getComputedStyle(collapseButton)
      
      expect(selectedStyle.fontSize).toBe(centerStyle.fontSize)
      expect(centerStyle.fontSize).toBe(inspectStyle.fontSize)
      expect(inspectStyle.fontSize).toBe(collapseStyle.fontSize)
    })

    test('should have uniform button heights and padding', async () => {
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to show all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      const buttons = [
        screen.getByText('📍 SELECTED'),
        screen.getByText('🎯 Center in Graph'),
        screen.getByText('🔍 Inspect Tokens'),
        screen.getByText('📖 Expand')
      ]
      
      // All buttons should have consistent heights and padding
      const baseStyle = window.getComputedStyle(buttons[0])
      
      buttons.forEach(button => {
        const style = window.getComputedStyle(button)
        expect(style.height).toBe(baseStyle.height)
        expect(style.paddingTop).toBe(baseStyle.paddingTop)
        expect(style.paddingBottom).toBe(baseStyle.paddingBottom)
      })
    })
  })

  describe('Visual Weight Standardization', () => {
    test('should apply consistent styling classes to all buttons', async () => {
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to trigger all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      const buttons = [
        screen.getByText('📍 SELECTED'),
        screen.getByText('🎯 Center in Graph'),
        screen.getByText('🔍 Inspect Tokens'),
        screen.getByText('📖 Expand')
      ]
      
      // All buttons should have the unified toolbar button class
      buttons.forEach(button => {
        expect(button).toHaveClass('unified-toolbar-btn')
      })
    })

    test('should maintain consistent border and styling treatment', async () => {
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to show all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      const buttons = [
        screen.getByText('📍 SELECTED'),
        screen.getByText('🎯 Center in Graph'), 
        screen.getByText('🔍 Inspect Tokens'),
        screen.getByText('📖 Expand')
      ]
      
      // Check consistent border styling
      buttons.forEach(button => {
        const style = window.getComputedStyle(button)
        expect(style.borderRadius).toBe('6px')
        expect(style.transition).toContain('0.2s')
      })
    })
  })

  describe('Responsive Layout Behavior', () => {
    test('should handle narrow viewport gracefully', async () => {
      // Simulate narrow viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      })
      window.dispatchEvent(new Event('resize'))
      
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to show all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      const unifiedToolbar = screen.getByTestId('unified-toolbar')
      const style = window.getComputedStyle(unifiedToolbar)
      
      // Should maintain single row layout even on narrow screens
      expect(style.flexWrap).toBe('nowrap')
      expect(style.overflow).toBe('auto') // Should allow horizontal scrolling if needed
    })

    test('should maintain button visibility at all viewport sizes', async () => {
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to show all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      // All buttons should remain visible and accessible
      expect(screen.getByText('📍 SELECTED')).toBeVisible()
      expect(screen.getByText('🎯 Center in Graph')).toBeVisible()
      expect(screen.getByText('🔍 Inspect Tokens')).toBeVisible()
      expect(screen.getByText('📖 Expand')).toBeVisible()
    })
  })

  describe('Accessibility and Interaction', () => {
    test('should maintain keyboard accessibility for all buttons', async () => {
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to show all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      const buttons = [
        screen.getByText('📍 SELECTED'),
        screen.getByText('🎯 Center in Graph'),
        screen.getByText('🔍 Inspect Tokens'),
        screen.getByText('📖 Expand')
      ]
      
      // All buttons should be keyboard accessible
      buttons.forEach(button => {
        button.focus()
        expect(document.activeElement).toBe(button)
      })
    })

    test('should preserve individual button functionality', async () => {
      render(<App />)
      
      await screen.findByText(/Test prompt/)
      
      // Select conversation to show all buttons
      const conversationCard = screen.getByText(/Test prompt/).closest('.conversation-card')
      conversationCard.click()
      
      // Each button should still perform its specific function
      const centerButton = screen.getByText('🎯 Center in Graph')
      const inspectButton = screen.getByText('🔍 Inspect Tokens')
      const collapseButton = screen.getByText('📖 Expand')
      
      // Buttons should be clickable and maintain their individual behaviors
      expect(centerButton).not.toBeDisabled()
      expect(inspectButton).not.toBeDisabled()
      expect(collapseButton).not.toBeDisabled()
    })
  })
})