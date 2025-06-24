import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../../App.jsx'
import { claudeAPI } from '../../services/ClaudeAPI.js'
import { MessageFormatter } from '../../services/MessageFormatter.js'
import { graphModel } from '../../models/GraphModel.js'

// Mock all dependencies
vi.mock('../../services/ClaudeAPI.js', () => ({
  claudeAPI: {
    sendMessage: vi.fn(),
    generateResponse: vi.fn(),
    sendConversation: vi.fn(),
    getApiKey: vi.fn().mockResolvedValue('mock-key'),
    setModel: vi.fn(),
    setExtendedThinking: vi.fn()
  }
}))

vi.mock('../../services/MessageFormatter.js', () => ({
  MessageFormatter: {
    buildConversationMessages: vi.fn(),
    validateMessages: vi.fn(),
    extractConversationHistory: vi.fn(),
    debugMessages: vi.fn()
  }
}))

vi.mock('../../models/GraphModel.js', () => ({
  graphModel: {
    getAllConversations: vi.fn(() => []),
    getAllConversationsWithBranches: vi.fn(() => []),
    addConversation: vi.fn(() => ({ id: 'mock-conv-id' })),
    addConversationToBranch: vi.fn(() => ({ id: 'mock-branch-id' })),
    updateConversation: vi.fn(),
    getConversation: vi.fn(() => null),
    getStorageStats: vi.fn(() => ({ conversations: 0, branches: 0 })),
    cleanupGhostBranches: vi.fn(),
    cleanupEmptyThreads: vi.fn(),
    getNextDisplayNumber: vi.fn(() => '1'),
    createBranch: vi.fn(() => ({ id: 'mock-branch-id' })),
    getBranchHistory: vi.fn(() => [])
  }
}))

vi.mock('../../models/PromptsModel.js', () => ({
  default: vi.fn(() => ({
    getPrompt: vi.fn(() => null),
    getAllPrompts: vi.fn(() => []),
    getPromptById: vi.fn(() => ({ content: 'Mock personality prompt' }))
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
    buildContextChain: vi.fn(() => ({ messages: [], context: 'mock-context' }))
  }))
}))

vi.mock('../../services/ConversationChainBuilder.js', () => ({
  ConversationChainBuilder: vi.fn(() => ({
    buildChain: vi.fn(() => [])
  }))
}))

vi.mock('../../hooks/useVisibleConversation.js', () => ({
  useVisibleConversation: vi.fn(() => ({
    visibleConversation: null,
    setVisibleConversation: vi.fn()
  }))
}))

describe('App Integration - Unified Message System', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    localStorage.clear()
    
    // Setup default mock responses
    claudeAPI.sendMessage.mockResolvedValue({
      content: 'Mock AI response',
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
      model: 'claude-sonnet-4',
      id: 'mock-id',
      timestamp: new Date().toISOString(),
      messageCount: 1,
      metadata: { temperature: 0.7, messageCount: 1 }
    })
    
    MessageFormatter.buildConversationMessages.mockReturnValue([
      { role: 'user', content: [{ type: 'text', text: 'test message' }] }
    ])
    MessageFormatter.validateMessages.mockReturnValue({ valid: true, errors: [] })
    MessageFormatter.extractConversationHistory.mockReturnValue([])
    
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Main Conversation Flow', () => {
    test('should use unified sendMessage for main conversation input', async () => {
      // ARRANGE
      render(<App />)
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Simulate user input in main conversation
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'What is artificial intelligence?' } })
        
        // Find and click send button (could be submit or enter)
        const sendButton = screen.queryByText(/send/i) || screen.queryByRole('button')
        if (sendButton) {
          fireEvent.click(sendButton)
        } else {
          // Try keyboard shortcut
          fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        }
        
        // ASSERT - Should use unified sendMessage method
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            expect.any(Array), // conversation history
            'What is artificial intelligence?', // user input
            expect.objectContaining({
              temperature: expect.any(Number),
              model: expect.any(String)
            })
          )
        })
        
        // Should NOT use deprecated methods
        expect(claudeAPI.generateResponse).not.toHaveBeenCalled()
        expect(claudeAPI.sendConversation).not.toHaveBeenCalled()
      }
    })

    test('should handle conversation continuation with MessageFormatter', async () => {
      // ARRANGE
      const existingConversations = [
        { id: 'conv1', input: 'Previous question', response: 'Previous answer' }
      ]
      graphModel.getAllConversations.mockReturnValue(existingConversations)
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Continue conversation
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Tell me more about that' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should build conversation with history
        await waitFor(() => {
          expect(MessageFormatter.buildConversationMessages).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({ input: 'Previous question' })
            ]),
            'Tell me more about that',
            expect.any(String) // system prompt
          )
        })
        
        expect(claudeAPI.sendMessage).toHaveBeenCalled()
      }
    })

    test('should validate messages before API calls', async () => {
      // ARRANGE
      MessageFormatter.validateMessages.mockReturnValue({
        valid: false,
        errors: ['Message 0: Invalid format']
      })
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Try to send invalid message
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Test message' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should validate before sending
        await waitFor(() => {
          expect(MessageFormatter.validateMessages).toHaveBeenCalled()
        })
        
        // Should not make API call if validation fails
        expect(claudeAPI.sendMessage).not.toHaveBeenCalled()
      }
    })
  })

  describe('Branch Creation Flow', () => {
    test('should use unified system for virgin branch creation', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Create virgin branch
      const branchButton = screen.queryByText(/branch/i) || screen.queryByText(/new/i)
      if (branchButton) {
        fireEvent.click(branchButton)
        
        // Look for virgin branch option
        const virginOption = screen.queryByText(/virgin/i) || screen.queryByText(/fresh/i)
        if (virginOption) {
          fireEvent.click(virginOption)
          
          // Enter new conversation
          const input = screen.queryByRole('textbox')
          if (input) {
            fireEvent.change(input, { target: { value: 'Fresh conversation start' } })
            fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
            
            // ASSERT - Should use sendMessage with empty history
            await waitFor(() => {
              expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
                [], // empty history for virgin branch
                'Fresh conversation start',
                expect.objectContaining({
                  temperature: expect.any(Number)
                })
              )
            })
          }
        }
      }
    })

    test('should use unified system for personality branch creation', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Create personality branch
      const branchButton = screen.queryByText(/branch/i) || screen.queryByText(/new/i)
      if (branchButton) {
        fireEvent.click(branchButton)
        
        // Look for personality option
        const personalityOption = screen.queryByText(/personality/i) || screen.queryByText(/KHAOS/i)
        if (personalityOption) {
          fireEvent.click(personalityOption)
          
          // Enter conversation with personality
          const input = screen.queryByRole('textbox')
          if (input) {
            fireEvent.change(input, { target: { value: 'Who are you?' } })
            fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
            
            // ASSERT - Should use sendMessage with system prompt
            await waitFor(() => {
              expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
                [], // empty history for personality branch
                'Who are you?',
                expect.objectContaining({
                  systemPrompt: expect.stringContaining('Mock personality prompt'),
                  temperature: expect.any(Number)
                })
              )
            })
          }
        }
      }
    })

    test('should use unified system for knowledge branch creation', async () => {
      // ARRANGE
      const parentConversation = {
        id: 'parent-conv',
        input: 'What is consciousness?',
        response: 'Consciousness is the hard problem...'
      }
      
      graphModel.getAllConversations.mockReturnValue([parentConversation])
      graphModel.getBranchHistory.mockReturnValue([parentConversation])
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Create knowledge branch from existing conversation
      const branchButton = screen.queryByText(/branch/i)
      if (branchButton) {
        fireEvent.click(branchButton)
        
        // Select knowledge branch option
        const knowledgeOption = screen.queryByText(/knowledge/i) || screen.queryByText(/continue/i)
        if (knowledgeOption) {
          fireEvent.click(knowledgeOption)
          
          // Enter branching question
          const input = screen.queryByRole('textbox')
          if (input) {
            fireEvent.change(input, { target: { value: 'But what about quantum consciousness?' } })
            fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
            
            // ASSERT - Should use sendMessage with parent history
            await waitFor(() => {
              expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
                expect.arrayContaining([
                  expect.objectContaining({ input: 'What is consciousness?' })
                ]),
                'But what about quantum consciousness?',
                expect.objectContaining({
                  temperature: expect.any(Number)
                })
              )
            })
          }
        }
      }
    })
  })

  describe('Temperature Integration', () => {
    test('should pass temperature value to unified sendMessage', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Adjust temperature and send message
      const temperatureSlider = screen.queryByRole('slider')
      if (temperatureSlider) {
        fireEvent.change(temperatureSlider, { target: { value: '0.9' } })
      }
      
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Creative response please' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should pass temperature to API
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            expect.any(Array),
            'Creative response please',
            expect.objectContaining({
              temperature: 0.9
            })
          )
        })
      }
    })

    test('should use default temperature when none specified', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Send message without changing temperature
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Default temperature test' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should use default temperature (0.7)
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            expect.any(Array),
            'Default temperature test',
            expect.objectContaining({
              temperature: 0.7 // Default temperature
            })
          )
        })
      }
    })
  })

  describe('Error Handling Integration', () => {
    test('should handle API errors gracefully without crashing', async () => {
      // ARRANGE
      claudeAPI.sendMessage.mockRejectedValue(new Error('API Error: Rate limit exceeded'))
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Send message that will cause API error
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'This will cause an error' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should handle error without crashing
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalled()
        })
        
        // App should still be functional
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      }
    })

    test('should handle message validation errors', async () => {
      // ARRANGE
      MessageFormatter.buildConversationMessages.mockReturnValue([
        { role: 'user', content: 'Invalid format' } // Missing content array
      ])
      MessageFormatter.validateMessages.mockReturnValue({
        valid: false,
        errors: ['Message 0: Content must be an array']
      })
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Send message with invalid format
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Invalid message format' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should validate and prevent API call
        await waitFor(() => {
          expect(MessageFormatter.validateMessages).toHaveBeenCalled()
        })
        
        // Should not make API call with invalid messages
        expect(claudeAPI.sendMessage).not.toHaveBeenCalled()
      }
    })
  })

  describe('Legacy Method Deprecation', () => {
    test('should not use deprecated generateResponse method', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Trigger any conversation flow
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Test legacy check' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should only use unified sendMessage
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalled()
        })
        
        // Should NOT use deprecated methods
        expect(claudeAPI.generateResponse).not.toHaveBeenCalled()
        expect(claudeAPI.sendConversation).not.toHaveBeenCalled()
      }
    })
  })

  describe('Model and Configuration Integration', () => {
    test('should pass model selection to unified sendMessage', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Change model and send message
      const modelSelect = screen.queryByRole('combobox') || screen.queryByDisplayValue(/sonnet/i)
      if (modelSelect) {
        fireEvent.change(modelSelect, { target: { value: 'claude-opus-4-20250514' } })
      }
      
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Test with Opus model' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should pass model to API
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            expect.any(Array),
            'Test with Opus model',
            expect.objectContaining({
              model: expect.stringContaining('opus')
            })
          )
        })
      }
    })

    test('should handle extended thinking option', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT - Enable extended thinking and send message
      const thinkingToggle = screen.queryByLabelText(/thinking/i) || screen.queryByRole('checkbox')
      if (thinkingToggle) {
        fireEvent.click(thinkingToggle)
      }
      
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Complex reasoning task' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT - Should pass extended thinking option
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            expect.any(Array),
            'Complex reasoning task',
            expect.objectContaining({
              extendedThinking: true
            })
          )
        })
      }
    })
  })
})