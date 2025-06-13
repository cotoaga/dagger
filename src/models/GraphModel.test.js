import { describe, test, expect, beforeEach } from 'vitest'
import { GraphModel } from './GraphModel.js'

describe('GraphModel', () => {
  let graph

  beforeEach(() => {
    graph = new GraphModel()
  })

  test('should generate unique UUIDs for node IDs', () => {
    const node1 = graph.createNode('First interaction')
    const node2 = graph.createNode('Second interaction') 
    
    // IDs should be UUIDs (different and follow UUID format)
    expect(node1.id).not.toBe(node2.id)
    expect(node1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(node2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  test('should maintain separate sequential numbering for display', () => {
    const node1 = graph.createNode('First interaction')
    const node2 = graph.createNode('Second interaction')
    const branch1 = graph.createBranch(node1.id, 'Branch from first')
    const branch2 = graph.createBranch(node1.id, 'Another branch from first')
    
    // Display numbers should be sequential/branching
    expect(node1.displayNumber).toBe('1')
    expect(node2.displayNumber).toBe('2')
    expect(branch1.displayNumber).toBe('1.1')
    expect(branch2.displayNumber).toBe('1.2')
  })

  test('should create nodes with proper metadata', () => {
    const content = 'Test interaction content'
    const node = graph.createNode(content)
    
    expect(node).toHaveProperty('id')
    expect(node).toHaveProperty('displayNumber')
    expect(node).toHaveProperty('content', content)
    expect(node).toHaveProperty('timestamp')
    expect(node).toHaveProperty('type', 'interaction')
    expect(node.timestamp).toBeInstanceOf(Date)
  })
})