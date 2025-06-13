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

  // Enhanced branch creation with context inheritance
  addBranchFromPrompt(promptId, content, branchType = 'knowledge', summaryType = 'brief', inheritedSummary = null) {
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
    
    // Calculate depth based on parent
    const parentNode = this.getNode(promptId)
    const depth = (parentNode?.depth || 0) + 1
    
    const node = {
      id: branchId,
      internalId,
      content,
      timestamp: new Date(),
      type: 'user_prompt',
      parentId: promptId,
      depth,
      branchType,
      branchIndex: branchNumber,
      isBranch: true,
      
      context: {
        inheritedSummary,
        summaryType: branchType === 'knowledge' ? summaryType : null
      },
      
      mergeOptions: [],
      mergedFrom: [],
      status: 'active'
    }
    
    this.nodes.set(internalId, node)
    this.conversationIndex.set(branchId, internalId)
    
    // Add edge from parent prompt to branch
    const parentInternalId = this.conversationIndex.get(promptId)
    this.addEdge(parentInternalId, internalId)
    
    return node
  }

  // Merge branch back to main thread
  mergeBackToTarget(branchNodeId, targetNodeId, mergeContent, summaryType = 'brief') {
    const branchNode = this.getNode(branchNodeId)
    const targetNode = this.getNode(targetNodeId)
    
    if (!branchNode || !targetNode) {
      throw new Error(`Branch node ${branchNodeId} or target node ${targetNodeId} not found`)
    }
    
    // Mark branch as merged
    branchNode.status = 'merged'
    
    // Add merge content to target node
    if (!targetNode.mergedFrom) targetNode.mergedFrom = []
    targetNode.mergedFrom.push(branchNodeId)
    
    // Create merge summary node
    const mergeInternalId = uuidv4()
    const mergeId = `${targetNodeId.replace('>', '')}.merge`
    
    const mergeNode = {
      id: mergeId,
      internalId: mergeInternalId,
      content: mergeContent,
      timestamp: new Date(),
      type: 'merge_summary',
      sourceNodeId: branchNodeId,
      targetNodeId: targetNodeId,
      summaryType,
      isBranch: false
    }
    
    this.nodes.set(mergeInternalId, mergeNode)
    this.conversationIndex.set(mergeId, mergeInternalId)
    
    // Add merge edge
    const branchInternalId = this.conversationIndex.get(branchNodeId)
    const targetInternalId = this.conversationIndex.get(targetNodeId)
    this.addEdge(branchInternalId, targetInternalId, 'merge')
    
    return mergeNode
  }

  // Calculate valid merge targets for a branch
  calculateMergeTargets(branchNodeId) {
    const [mainNode, ...branches] = branchNodeId.replace('>', '').split('.')
    const branchDepth = branches.length
    
    const targets = []
    
    // Get all main thread nodes after the parent
    const mainThreadNodes = this.getAllNodes()
      .filter(node => node.type === 'user_prompt' && !node.isBranch)
      .filter(node => parseInt(node.id.replace('>', '')) > parseInt(mainNode))
      .sort((a, b) => parseInt(a.id.replace('>', '')) - parseInt(b.id.replace('>', '')))
    
    targets.push(...mainThreadNodes.map(node => ({
      id: node.id,
      preview: this.truncateContent(node.content, 100),
      mergeReason: 'Forward progression on main thread'
    })))
    
    // Get sibling branches at same level
    const siblings = this.getAllNodes()
      .filter(node => node.type === 'user_prompt' && node.isBranch && node.depth === branchDepth)
      .filter(node => node.id > branchNodeId)
    
    targets.push(...siblings.map(node => ({
      id: node.id,
      preview: this.truncateContent(node.content, 100),
      mergeReason: 'Sibling branch at same level'
    })))
    
    return targets
  }

  // Get conversation thread from root to given node
  getConversationThread(nodeId) {
    const thread = []
    let currentNode = this.getNode(nodeId)
    
    while (currentNode) {
      // Get the response for this prompt if it exists
      const response = this.getAllNodes().find(node => 
        node.type === 'ai_response' && node.promptId === currentNode.id
      )
      
      thread.unshift({
        id: currentNode.id,
        content: {
          prompt: currentNode.content,
          response: response?.content || '',
          timestamp: currentNode.timestamp,
          processingTime: response?.processingTimeMs || 0,
          tokenCount: response?.totalTokens || 0
        }
      })
      
      // Move to parent
      if (currentNode.parentId) {
        currentNode = this.getNode(currentNode.parentId)
      } else {
        break
      }
    }
    
    return thread
  }

  // Helper methods
  truncateContent(content, maxLength) {
    if (!content || content.length <= maxLength) return content
    return content.substring(0, maxLength - 3) + '...'
  }

  isLeafNode(nodeId) {
    const nodeInternalId = this.conversationIndex.get(nodeId)
    return !this.edges.some(edge => edge.from === nodeInternalId)
  }

  getMainThreadNodes() {
    return this.getAllNodes()
      .filter(node => node.type === 'user_prompt' && !node.isBranch)
      .sort((a, b) => parseInt(a.id.replace('>', '')) - parseInt(b.id.replace('>', '')))
  }

  getBranchNodes() {
    return this.getAllNodes()
      .filter(node => node.type === 'user_prompt' && node.isBranch)
      .sort((a, b) => a.id.localeCompare(b.id))
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
      depth: 0,
      branchType: null,
      branchIndex: null,
      isBranch: false,
      context: {
        inheritedSummary: null,
        summaryType: null
      },
      mergeOptions: [],
      mergedFrom: [],
      status: 'active'
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

  addEdge(fromInternalId, toInternalId, edgeType = 'conversation') {
    this.edges.push({ from: fromInternalId, to: toInternalId, type: edgeType })
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