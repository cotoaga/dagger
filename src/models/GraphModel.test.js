import { describe, test, expect, beforeEach } from 'vitest'
import { GraphModel } from './GraphModel.js'

describe('DAGGER Conversational Numbering', () => {
  let graph

  beforeEach(() => {
    graph = new GraphModel()
  })

  test('user starts conversation with prompt 1>', () => {
    const startNode = graph.addPromptNode('Hello')
    expect(startNode.id).toBe('1>')
    expect(startNode.type).toBe('user_prompt')
  })

  test('AI responds to user prompt with >1', () => {
    graph.addPromptNode('Hello')
    const responseNode = graph.addResponseToPrompt('1>', 'Hi there!')
    expect(responseNode.id).toBe('>1')
    expect(responseNode.type).toBe('ai_response')
  })

  test('user continues main thread with 2>', () => {
    graph.addPromptNode('First prompt')
    graph.addResponseToPrompt('1>', 'First response')
    const nextPrompt = graph.addNextPrompt('How about this?')
    expect(nextPrompt.id).toBe('2>')
    expect(nextPrompt.type).toBe('user_prompt')
  })

  test('user branches from prompt with 3.1>', () => {
    graph.addPromptNode('First')
    graph.addNextPrompt('Second') 
    graph.addNextPrompt('Third')
    const branch = graph.addBranchFromPrompt('3>', 'Branch from third')
    expect(branch.id).toBe('3.1>')
    expect(branch.type).toBe('user_prompt')
    expect(branch.isBranch).toBe(true)
  })

  test('AI responds to branch with >3.1', () => {
    graph.addPromptNode('Main')
    graph.addNextPrompt('Main2')
    graph.addNextPrompt('Main3')
    graph.addBranchFromPrompt('3>', 'Branch content')
    const response = graph.addResponseToPrompt('3.1>', 'Branch response')
    expect(response.id).toBe('>3.1')
    expect(response.type).toBe('ai_response')
  })

  test('multiple branches from same prompt: 2.1>, 2.2>', () => {
    graph.addPromptNode('First')
    graph.addNextPrompt('Second')
    const branch1 = graph.addBranchFromPrompt('2>', 'First branch')
    const branch2 = graph.addBranchFromPrompt('2>', 'Second branch')
    expect(branch1.id).toBe('2.1>')
    expect(branch2.id).toBe('2.2>')
  })

  test('conversation flow: 1> >1 2> >2 2.1> >2.1', () => {
    const prompt1 = graph.addPromptNode('What is AI?')
    expect(prompt1.id).toBe('1>')
    
    const response1 = graph.addResponseToPrompt('1>', 'AI is...')
    expect(response1.id).toBe('>1')
    
    const prompt2 = graph.addNextPrompt('How does it work?')
    expect(prompt2.id).toBe('2>')
    
    const response2 = graph.addResponseToPrompt('2>', 'It works by...')
    expect(response2.id).toBe('>2')
    
    const branch = graph.addBranchFromPrompt('2>', 'But what about ethics?')
    expect(branch.id).toBe('2.1>')
    
    const branchResponse = graph.addResponseToPrompt('2.1>', 'Ethics are important...')
    expect(branchResponse.id).toBe('>2.1')
  })
})