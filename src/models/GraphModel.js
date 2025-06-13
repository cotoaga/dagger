import { v4 as uuidv4 } from 'uuid'

export class GraphModel {
  constructor() {
    this.nodes = new Map() // stores all nodes by their internal UUID
    this.conversationIndex = new Map() // maps conversation IDs (1>, >1, 2.1>, etc.) to internal UUIDs
    this.edges = []
    this.nextMainSequence = 1
    this.branchCounters = new Map() // tracks branch numbers per prompt
  }

  // User starts conversation or continues main thread
  addPromptNode(content) {
    return this._createPromptNode(content, this.nextMainSequence++)
  }

  // User continues main thread (alias for addPromptNode for clarity)
  addNextPrompt(content) {
    return this._createPromptNode(content, this.nextMainSequence++)
  }

  // AI responds to a specific prompt
  addResponseToPrompt(promptId, content) {
    if (!this.conversationIndex.has(promptId)) {
      throw new Error(`Prompt ${promptId} not found`)
    }

    const responseId = '>' + promptId.replace('>', '')
    const internalId = uuidv4()
    
    const node = {
      id: responseId,
      internalId,
      content,
      timestamp: new Date(),
      type: 'ai_response',
      promptId,
      isBranch: promptId.includes('.')
    }
    
    this.nodes.set(internalId, node)
    this.conversationIndex.set(responseId, internalId)
    
    // Add edge from prompt to response
    const promptInternalId = this.conversationIndex.get(promptId)
    this.addEdge(promptInternalId, internalId)
    
    return node
  }

  // User branches from an existing prompt
  addBranchFromPrompt(promptId, content) {
    if (!this.conversationIndex.has(promptId)) {
      throw new Error(`Prompt ${promptId} not found`)
    }

    const baseNumber = promptId.replace('>', '')
    
    // Get or initialize branch counter for this prompt
    if (!this.branchCounters.has(baseNumber)) {
      this.branchCounters.set(baseNumber, 0)
    }
    
    const branchNumber = this.branchCounters.get(baseNumber) + 1
    this.branchCounters.set(baseNumber, branchNumber)
    
    const branchId = `${baseNumber}.${branchNumber}>`
    const internalId = uuidv4()
    
    const node = {
      id: branchId,
      internalId,
      content,
      timestamp: new Date(),
      type: 'user_prompt',
      parentPromptId: promptId,
      isBranch: true
    }
    
    this.nodes.set(internalId, node)
    this.conversationIndex.set(branchId, internalId)
    
    // Add edge from parent prompt to branch
    const parentInternalId = this.conversationIndex.get(promptId)
    this.addEdge(parentInternalId, internalId)
    
    return node
  }

  // Private helper to create prompt nodes
  _createPromptNode(content, sequenceNumber) {
    const promptId = `${sequenceNumber}>`
    const internalId = uuidv4()
    
    const node = {
      id: promptId,
      internalId,
      content,
      timestamp: new Date(),
      type: 'user_prompt',
      isBranch: false
    }
    
    this.nodes.set(internalId, node)
    this.conversationIndex.set(promptId, internalId)
    
    return node
  }

  getNode(conversationId) {
    const internalId = this.conversationIndex.get(conversationId)
    return internalId ? this.nodes.get(internalId) : null
  }

  getAllNodes() {
    return Array.from(this.nodes.values())
  }

  addEdge(fromInternalId, toInternalId) {
    this.edges.push({ from: fromInternalId, to: toInternalId })
  }

  // For compatibility with existing App.jsx - maps to conversation IDs
  createNode(content, type) {
    if (type === 'input') {
      return this.addPromptNode(content.replace('**User:** ', ''))
    } else if (type === 'output') {
      // This is a fallback - ideally App should use addResponseToPrompt
      const responseId = `>${this.nextMainSequence - 1}`
      const internalId = uuidv4()
      
      const node = {
        id: responseId,
        internalId,
        displayNumber: (this.nextMainSequence - 1).toString(),
        content,
        timestamp: new Date(),
        type: 'output',
        isBranch: false
      }
      
      this.nodes.set(internalId, node)
      this.conversationIndex.set(responseId, internalId)
      return node
    }
  }

  // localStorage persistence methods
  save() {
    const data = {
      nodes: Array.from(this.nodes.entries()),
      conversationIndex: Array.from(this.conversationIndex.entries()),
      edges: this.edges,
      nextMainSequence: this.nextMainSequence,
      branchCounters: Array.from(this.branchCounters.entries())
    }
    localStorage.setItem('dagger-graph', JSON.stringify(data))
  }

  load() {
    const data = JSON.parse(localStorage.getItem('dagger-graph') || '{}')
    if (data.nodes) {
      // Reconstruct nodes with proper Date objects
      const nodesWithDates = data.nodes.map(([id, node]) => [
        id, 
        {
          ...node,
          timestamp: new Date(node.timestamp)
        }
      ])
      this.nodes = new Map(nodesWithDates)
      this.conversationIndex = new Map(data.conversationIndex || [])
      this.edges = data.edges || []
      this.nextMainSequence = data.nextMainSequence || 1
      this.branchCounters = new Map(data.branchCounters || [])
    }
  }
}