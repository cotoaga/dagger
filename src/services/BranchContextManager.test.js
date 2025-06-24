import { describe, test, expect, beforeEach } from 'vitest'
import { BranchContextManager } from './BranchContextManager.js'
import { graphModel } from '../models/GraphModel.js'
import PromptsModel from '../models/PromptsModel.js'

describe('BranchContextManager - Context Inheritance', () => {
  let branchManager, promptsModel
  
  beforeEach(() => {
    // Clear existing data
    graphModel.clearAll()
    promptsModel = new PromptsModel()
    branchManager = new BranchContextManager(graphModel, promptsModel)
  })

  test('should inherit parent conversation history when creating branch', () => {
    // ARRANGE: Create parent conversation chain
    const conv1 = graphModel.addConversation('What is AI?', 'AI is machine intelligence')
    const conv2 = graphModel.addConversation('How does it work?', 'Through neural networks...')
    
    // ACT: Create branch from node 2>
    const branchContext = branchManager.createBranchContext(conv2.id, 'khaos-core')
    
    // ASSERT: Branch should inherit full parent history
    expect(branchContext.parentHistory).toHaveLength(4) // 1>, >1, 2>, >2
    expect(branchContext.parentHistory[0].content).toBe('What is AI?')
    expect(branchContext.parentHistory[3].content).toBe('Through neural networks...')
  })

  test('should apply selected prompt template to branch context', () => {
    // ARRANGE: Parent conversation + KHAOS prompt selection
    graphModel.addConversation('Basic question', 'Basic answer')
    
    // ACT: Create branch with KHAOS template
    const branchContext = branchManager.createBranchContext('1', 'khaos-core')
    
    // ASSERT: Branch should have KHAOS personality prompt
    expect(branchContext.systemPrompt).toContain('KHAOS')
    expect(branchContext.systemPrompt.length).toBeGreaterThan(100)
  })

  test('should build complete context chain for API call', () => {
    // ARRANGE: Complex conversation history
    const conv1 = graphModel.addConversation('Microservices question', 'Microservices have benefits...')
    
    // ACT: Build context chain for branch API call
    const contextChain = branchManager.buildContextChain(conv1.id, 'khaos-core', 'who are you?')
    
    // ASSERT: Complete context chain structure
    expect(contextChain).toHaveProperty('messages')
    expect(contextChain.messages[0].role).toBe('system') // KHAOS prompt
    expect(contextChain.messages[1].role).toBe('user')   // Parent: 'Microservices question'
    expect(contextChain.messages[2].role).toBe('assistant') // Parent: 'Microservices have benefits...'
    expect(contextChain.messages[3].role).toBe('user')   // New: 'who are you?'
  })

  test('should handle virgin branch with no parent context', () => {
    // ACT: Create virgin branch (no parent history)
    const branchContext = branchManager.createBranchContext(null, 'khaos-core')
    
    // ASSERT: Only system prompt, no parent history
    expect(branchContext.parentHistory).toHaveLength(0)
    expect(branchContext.systemPrompt).toContain('KHAOS')
  })

  test('should handle branch with no prompt template', () => {
    // ARRANGE: Parent conversation
    const conv1 = graphModel.addConversation('Question', 'Answer')
    
    // ACT: Create branch without prompt template
    const branchContext = branchManager.createBranchContext(conv1.id, null)
    
    // ASSERT: Parent history preserved, no system prompt
    expect(branchContext.parentHistory).toHaveLength(2) // user + assistant
    expect(branchContext.systemPrompt).toBe('')
  })
})