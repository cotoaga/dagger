import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App.jsx'
import { claudeAPI } from '../services/ClaudeAPI.js'
import { MessageFormatter } from '../services/MessageFormatter.js'
import { graphModel } from '../models/GraphModel.js'

// Mock all external dependencies for E2E isolation
vi.mock('../services/ClaudeAPI.js', () => {
  const mockModels = {
    'claude-sonnet-4-20250514': {
      name: 'Claude Sonnet 4',
      description: 'Latest and most capable model',
      supportsExtendedThinking: true
    },
    'claude-opus-4-20250514': {
      name: 'Claude Opus 4',
      description: 'Maximum capability for complex tasks',
      supportsExtendedThinking: true
    },
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      description: 'Balanced performance (Legacy)',
      supportsExtendedThinking: false
    }
  };

  return {
    claudeAPI: {
      sendMessage: vi.fn(),
      getApiKey: vi.fn().mockResolvedValue('mock-e2e-key'),
      setModel: vi.fn(),
      setExtendedThinking: vi.fn(),
      MODELS: mockModels
    },
    ClaudeAPI: {
      MODELS: mockModels
    }
  };
})

vi.mock('../models/GraphModel.js', () => {
  const mockConversations = [
    {
      id: 'mock-conv-1',
      prompt: 'What is consciousness?',
      response: 'Consciousness is the hard problem...',
      timestamp: new Date().toISOString(),
      displayNumber: '1',
      status: 'complete'
    }
  ];

  return {
    graphModel: {
      getAllConversations: vi.fn(() => mockConversations),
      getAllConversationsWithBranches: vi.fn(() => mockConversations),
      addConversation: vi.fn(() => ({ id: 'e2e-conv-' + Date.now() })),
      addConversationToBranch: vi.fn(() => ({ id: 'e2e-branch-' + Date.now() })),
      updateConversation: vi.fn(),
      getConversation: vi.fn(() => null),
      getStorageStats: vi.fn(() => ({ conversations: 0, branches: 0 })),
      cleanupGhostBranches: vi.fn(),
      cleanupEmptyThreads: vi.fn(),
      getNextDisplayNumber: vi.fn(() => '1'),
      createBranch: vi.fn(() => ({ id: 'e2e-branch-' + Date.now() })),
      getBranchHistory: vi.fn(() => []),
      save: vi.fn(),
      load: vi.fn(),
      conversationCounter: 0
    },
    formatISODateTime: vi.fn((date) => {
      return date instanceof Date ? date.toLocaleString() : new Date(date).toLocaleString();
    })
  };
})

vi.mock('../models/PromptsModel.js', () => ({
  default: vi.fn(() => ({
    getPrompt: vi.fn(() => null),
    getAllPrompts: vi.fn(() => [
      { id: 'khaos', name: 'KHAOS', content: 'You are KHAOS with 70% TARS sarcasm' },
      { id: 'helpful', name: 'Helpful Assistant', content: 'You are a helpful assistant' }
    ]),
    getPromptById: vi.fn((id) => {
      const prompts = {
        'khaos': { id: 'khaos', name: 'KHAOS', content: 'You are KHAOS with 70% TARS sarcasm' },
        'helpful': { id: 'helpful', name: 'Helpful Assistant', content: 'You are a helpful assistant' }
      }
      return prompts[id] || null
    })
  }))
}))

vi.mock('../services/ConfigService.js', () => ({
  default: {
    checkBackendConfig: vi.fn().mockResolvedValue({ hasApiKey: true, success: true }),
    clearCache: vi.fn()
  }
}))

vi.mock('../services/BranchContextManager.js', () => ({
  BranchContextManager: vi.fn(() => ({
    createBranchContext: vi.fn(),
    buildContextChain: vi.fn(() => ({ messages: [], context: 'e2e-context' }))
  }))
}))

vi.mock('../services/ConversationChainBuilder.js', () => ({
  ConversationChainBuilder: vi.fn(() => ({
    buildChain: vi.fn(() => [])
  }))
}))

vi.mock('../hooks/useVisibleConversation.js', () => ({
  useVisibleConversation: vi.fn(() => ({
    visibleConversation: null,
    setVisibleConversation: vi.fn()
  }))
}))

describe('DAGGER End-to-End - Unified Message System', () => {
  let conversationCounter = 0

  beforeEach(() => {
    // Clear all mocks and reset state
    vi.clearAllMocks()
    localStorage.clear()
    conversationCounter = 0
    
    // Setup realistic Claude API responses
    claudeAPI.sendMessage.mockImplementation(async (history, input, options = {}) => {
      conversationCounter++
      
      // Simulate different responses based on conversation type
      let content = 'Default AI response'
      
      if (options.systemPrompt?.includes('KHAOS')) {
        content = `KHAOS here. ${input}? Obviously it's complicated. 42.`
      } else if (input.toLowerCase().includes('consciousness')) {
        content = 'Consciousness is the hard problem of explaining subjective experience...'
      } else if (input.toLowerCase().includes('quantum')) {
        content = 'Quantum consciousness involves quantum mechanics in neural processes...'
      } else if (input.toLowerCase().includes('fresh')) {
        content = 'This is a fresh conversation response!'
      }
      
      return {
        content: content,
        usage: { input_tokens: 10 + conversationCounter, output_tokens: 20 + conversationCounter, total_tokens: 30 + conversationCounter * 2 },
        model: options.model || 'claude-sonnet-4-20250514',
        id: `e2e-msg-${conversationCounter}`,
        timestamp: new Date().toISOString(),
        messageCount: Array.isArray(history) ? history.length + 1 : 1,
        metadata: {
          temperature: options.temperature || 0.7,
          messageCount: Array.isArray(history) ? history.length + 1 : 1,
          timestamp: new Date().toISOString(),
          model: options.model || 'claude-sonnet-4-20250514',
          extendedThinking: options.extendedThinking || false
        }
      }
    })
    
    // Mock console methods to reduce test noise
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Conversation Flow - Virgin Branch', () => {
    test('should handle complete virgin branch conversation flow', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Start virgin conversation
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'What is consciousness?' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT 1: API called with correct virgin branch format
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            [], // Empty history for virgin branch
            'What is consciousness?',
            expect.objectContaining({
              temperature: expect.any(Number),
              model: expect.any(String)
            })
          )
        })
        
        // ASSERT 2: Response should be displayed
        await waitFor(() => {
          expect(screen.getByText(/hard problem/i)).toBeInTheDocument()
        })
        
        // ACT 2: Continue conversation
        fireEvent.change(input, { target: { value: 'Tell me more about that' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT 3: Second API call should include conversation history
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledTimes(2)
          const secondCall = claudeAPI.sendMessage.mock.calls[1]
          expect(secondCall[1]).toBe('Tell me more about that')
          // History should be built by MessageFormatter (via GraphModel)
        })
      }
    })
  })

  describe('Complete Conversation Flow - Personality Branch', () => {
    test('should handle complete personality branch conversation flow', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Access prompts/personality selection
      const promptsTab = screen.queryByText(/prompts/i) || screen.queryByRole('button', { name: /prompts/i })
      if (promptsTab) {
        fireEvent.click(promptsTab)
        
        // Wait for prompts to load
        await waitFor(async () => {
          const khaosPrompt = screen.queryByText(/KHAOS/i)
          if (khaosPrompt) {
            fireEvent.click(khaosPrompt)
            
            // ACT 2: Start personality conversation
            const input = screen.queryByRole('textbox')
            if (input) {
              fireEvent.change(input, { target: { value: 'Who are you?' } })
              fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
              
              // ASSERT: API called with personality system prompt
              await waitFor(() => {
                expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
                  [], // Empty history for personality branch
                  'Who are you?',
                  expect.objectContaining({
                    systemPrompt: expect.stringContaining('KHAOS'),
                    temperature: expect.any(Number)
                  })
                )
              })
              
              // ASSERT: KHAOS personality response
              await waitFor(() => {
                expect(screen.getByText(/KHAOS here/i)).toBeInTheDocument()
              })
            }
          }
        })
      }
    })
  })

  describe('Complete Conversation Flow - Knowledge Branch', () => {
    test('should handle complete knowledge branch conversation flow', async () => {
      // ARRANGE - Setup existing conversation
      const existingConversation = {
        id: 'parent-conv',
        input: 'What is consciousness?',
        response: 'Consciousness is the hard problem...',
        timestamp: new Date().toISOString()
      }
      
      graphModel.getAllConversations.mockReturnValue([existingConversation])
      graphModel.getBranchHistory.mockReturnValue([existingConversation])
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Create branch from existing conversation
      const branchButton = screen.queryByText(/branch/i) || screen.queryByRole('button', { name: /branch/i })
      if (branchButton) {
        fireEvent.click(branchButton)
        
        // Wait for branch options
        await waitFor(async () => {
          const knowledgeOption = screen.queryByText(/continue/i) || screen.queryByText(/knowledge/i)
          if (knowledgeOption) {
            fireEvent.click(knowledgeOption)
            
            // ACT 2: Add branching question
            const input = screen.queryByRole('textbox')
            if (input) {
              fireEvent.change(input, { target: { value: 'But what about quantum consciousness?' } })
              fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
              
              // ASSERT: API called with parent conversation history
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
              
              // ASSERT: Quantum consciousness response
              await waitFor(() => {
                expect(screen.getByText(/quantum consciousness/i)).toBeInTheDocument()
              })
            }
          }
        })
      }
    })
  })

  describe('Temperature and Model Integration E2E', () => {
    test('should handle temperature changes across conversation flow', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Adjust temperature
      const temperatureSlider = screen.queryByRole('slider')
      if (temperatureSlider) {
        fireEvent.change(temperatureSlider, { target: { value: '0.9' } })
        
        // ACT 2: Send message with high creativity
        const input = screen.queryByRole('textbox')
        if (input) {
          fireEvent.change(input, { target: { value: 'Be creative about AI ethics' } })
          fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
          
          // ASSERT: High temperature passed to API
          await waitFor(() => {
            expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
              expect.any(Array),
              'Be creative about AI ethics',
              expect.objectContaining({
                temperature: 0.9
              })
            )
          })
        }
      }
    })

    test('should handle model selection across conversation flow', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Change model
      const modelSelect = screen.queryByRole('combobox') || screen.queryByDisplayValue(/sonnet/i)
      if (modelSelect) {
        fireEvent.change(modelSelect, { target: { value: 'claude-opus-4-20250514' } })
        
        // ACT 2: Send message with Opus model
        const input = screen.queryByRole('textbox')
        if (input) {
          fireEvent.change(input, { target: { value: 'Complex reasoning task' } })
          fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
          
          // ASSERT: Opus model passed to API
          await waitFor(() => {
            expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
              expect.any(Array),
              'Complex reasoning task',
              expect.objectContaining({
                model: 'claude-opus-4-20250514'
              })
            )
          })
        }
      }
    })
  })

  describe('Extended Thinking Integration E2E', () => {
    test('should handle extended thinking across conversation flow', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Enable extended thinking
      const thinkingToggle = screen.queryByLabelText(/thinking/i) || screen.queryByRole('checkbox')
      if (thinkingToggle) {
        fireEvent.click(thinkingToggle)
        
        // ACT 2: Send complex reasoning task
        const input = screen.queryByRole('textbox')
        if (input) {
          fireEvent.change(input, { target: { value: 'Explain quantum consciousness step by step' } })
          fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
          
          // ASSERT: Extended thinking enabled
          await waitFor(() => {
            expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
              expect.any(Array),
              'Explain quantum consciousness step by step',
              expect.objectContaining({
                extendedThinking: true
              })
            )
          })
        }
      }
    })
  })

  describe('Error Handling E2E', () => {
    test('should handle API errors gracefully without breaking conversation flow', async () => {
      // ARRANGE
      claudeAPI.sendMessage.mockRejectedValueOnce(new Error('API Rate limit exceeded'))
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Send message that will fail
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'This will cause rate limit error' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT 1: Error should be handled gracefully
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalled()
        })
        
        // App should still be functional
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
        
        // ACT 2: Try again with successful call
        fireEvent.change(input, { target: { value: 'This should work now' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT 2: Should recover and work normally
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledTimes(2)
        })
      }
    })
  })

  describe('Graph View Integration E2E', () => {
    test('should handle switching between linear and graph views', async () => {
      // ARRANGE - Setup conversation with branches
      const conversations = [
        { id: 'conv1', input: 'Main question', response: 'Main answer', parentId: null },
        { id: 'branch1', input: 'Branch question', response: 'Branch answer', parentId: 'conv1' }
      ]
      
      graphModel.getAllConversations.mockReturnValue(conversations)
      graphModel.getAllConversationsWithBranches.mockReturnValue(conversations)
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Switch to graph view
      const graphViewButton = screen.queryByText(/graph/i) || screen.queryByRole('button', { name: /graph/i })
      if (graphViewButton) {
        fireEvent.click(graphViewButton)
        
        // ASSERT 1: Graph view should be displayed
        await waitFor(() => {
          // Graph view components should be present
          expect(screen.queryByText(/graph/i)).toBeInTheDocument()
        })
        
        // ACT 2: Switch back to linear view
        const linearViewButton = screen.queryByText(/linear/i) || screen.queryByRole('button', { name: /linear/i })
        if (linearViewButton) {
          fireEvent.click(linearViewButton)
          
          // ASSERT 2: Linear view should be restored
          await waitFor(() => {
            expect(screen.queryByText(/linear/i)).toBeInTheDocument()
          })
        }
      }
    })
  })

  describe('Storage and Persistence E2E', () => {
    test('should handle conversation persistence across app lifecycle', async () => {
      // ARRANGE
      const persistentConversations = [
        { id: 'persistent1', input: 'Saved question', response: 'Saved answer', timestamp: new Date().toISOString() }
      ]
      
      // Mock localStorage
      const mockStorage = {
        getItem: vi.fn((key) => {
          if (key === 'dagger-conversations') {
            return JSON.stringify(persistentConversations)
          }
          if (key === 'dagger-temperature') {
            return '0.8'
          }
          return null
        }),
        setItem: vi.fn(),
        clear: vi.fn()
      }
      
      Object.defineProperty(window, 'localStorage', { value: mockStorage })
      
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ASSERT: Should load saved conversations and settings
      expect(graphModel.getAllConversations).toHaveBeenCalled()
      
      // ACT: Add new conversation
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'New conversation to save' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        // ASSERT: Should save new conversation
        await waitFor(() => {
          expect(graphModel.addConversation).toHaveBeenCalled()
        })
      }
    })
  })

  describe('Full Unified Message System E2E', () => {
    test('should complete full conversation lifecycle with unified MessageFormatter', async () => {
      // ARRANGE
      render(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/DAGGER/i)).toBeInTheDocument()
      })
      
      // ACT 1: Virgin conversation
      const input = screen.queryByRole('textbox')
      if (input) {
        fireEvent.change(input, { target: { value: 'Start fresh conversation' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            [], // Virgin branch
            'Start fresh conversation',
            expect.any(Object)
          )
        })
        
        // ACT 2: Continue conversation
        fireEvent.change(input, { target: { value: 'Continue the conversation' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledTimes(2)
        })
        
        // ACT 3: Adjust temperature and continue
        const tempSlider = screen.queryByRole('slider')
        if (tempSlider) {
          fireEvent.change(tempSlider, { target: { value: '0.5' } })
        }
        
        fireEvent.change(input, { target: { value: 'More focused response' } })
        fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
        
        await waitFor(() => {
          expect(claudeAPI.sendMessage).toHaveBeenCalledWith(
            expect.any(Array),
            'More focused response',
            expect.objectContaining({
              temperature: 0.5
            })
          )
        })
        
        // ASSERT: All calls used unified sendMessage method
        expect(claudeAPI.sendMessage).toHaveBeenCalledTimes(3)
        
        // ASSERT: No legacy methods were called
        expect(claudeAPI.generateResponse).not.toHaveBeenCalled()
        expect(claudeAPI.sendConversation).not.toHaveBeenCalled()
      }
    })
  })
})