import { v4 as uuidv4 } from 'uuid'

export class GraphModel {
  constructor() {
    this.nodes = new Map()
    this.edges = []
    this.nextSequence = 1
    this.branchCounters = new Map() // tracks branch numbers per parent
  }

  createNode(content, type = 'interaction') {
    const id = uuidv4()
    const displayNumber = this.nextSequence.toString()
    this.nextSequence++
    
    const node = {
      id,
      displayNumber,
      content,
      timestamp: new Date(),
      type,
      parentId: null,
      isBranch: false
    }
    
    this.nodes.set(id, node)
    return node
  }

  createBranch(parentId, content, type = 'interaction') {
    const parent = this.nodes.get(parentId)
    if (!parent) {
      throw new Error(`Parent node ${parentId} not found`)
    }
    
    // Get or initialize branch counter for this parent
    if (!this.branchCounters.has(parentId)) {
      this.branchCounters.set(parentId, 0)
    }
    
    const branchNumber = this.branchCounters.get(parentId) + 1
    this.branchCounters.set(parentId, branchNumber)
    
    const id = uuidv4()
    const displayNumber = `${parent.displayNumber}.${branchNumber}`
    
    const node = {
      id,
      displayNumber,
      content,
      timestamp: new Date(),
      type,
      parentId,
      isBranch: true
    }
    
    this.nodes.set(id, node)
    return node
  }

  getNode(id) {
    return this.nodes.get(id)
  }

  getAllNodes() {
    return Array.from(this.nodes.values())
  }

  addEdge(fromId, toId) {
    this.edges.push({ from: fromId, to: toId })
  }

  // localStorage persistence methods
  save() {
    const data = {
      nodes: Array.from(this.nodes.entries()),
      edges: this.edges,
      nextSequence: this.nextSequence,
      branchCounters: Array.from(this.branchCounters.entries())
    }
    localStorage.setItem('dagger-graph', JSON.stringify(data))
  }

  load() {
    const data = JSON.parse(localStorage.getItem('dagger-graph') || '{}')
    if (data.nodes) {
      this.nodes = new Map(data.nodes)
      this.edges = data.edges || []
      this.nextSequence = data.nextSequence || 1
      this.branchCounters = new Map(data.branchCounters || [])
    }
  }
}