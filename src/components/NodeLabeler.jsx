// NodeLabeler.jsx - Hierarchical numbering system utilities

export class NodeLabeler {
  constructor(graph) {
    this.graph = graph
  }

  // Generate new node ID based on parent and existing siblings
  generateNodeId(parentId, existingSiblings = []) {
    if (!parentId) {
      // Main thread nodes: 1, 2, 3, 4, 5...
      const mainThreadNodes = this.graph.getMainThreadNodes()
      const maxMainNode = mainThreadNodes.length > 0 
        ? Math.max(...mainThreadNodes.map(n => parseInt(n.id.replace('>', ''))))
        : 0
      return `${maxMainNode + 1}>`
    }
    
    // Branch nodes: 2.1>, 2.2>, 3.1>, 4.2.1>, etc.
    const baseNumber = parentId.replace('>', '')
    const siblingCount = existingSiblings.length
    return `${baseNumber}.${siblingCount + 1}>`
  }

  // Calculate valid merge targets for a branch node
  calculateMergeTargets(branchNodeId) {
    const [mainNode, ...branches] = branchNodeId.replace('>', '').split('.')
    const branchDepth = branches.length
    
    const targets = []
    
    // 1. Sibling branches at same depth (must be after current branch)
    const siblingBranches = this.getSiblingBranches(branchNodeId)
    targets.push(...siblingBranches.filter(s => s.id > branchNodeId))
    
    // 2. Parent level continuations
    const parentContinuations = this.getParentContinuations(mainNode, branchDepth)
    targets.push(...parentContinuations)
    
    // 3. Main thread forward progression (nodes after the branch parent)
    const mainThreadTargets = this.graph.getMainThreadNodes()
      .filter(n => parseInt(n.id.replace('>', '')) > parseInt(mainNode))
    targets.push(...mainThreadTargets)
    
    return targets.map(t => ({
      id: t.id,
      preview: this.graph.truncateContent(t.content, 100),
      mergeReason: this.calculateMergeReason(branchNodeId, t.id)
    }))
  }

  // Get sibling branches at the same level
  getSiblingBranches(branchNodeId) {
    const parts = branchNodeId.replace('>', '').split('.')
    const basePath = parts.slice(0, -1).join('.')
    const currentIndex = parseInt(parts[parts.length - 1])
    
    return this.graph.getBranchNodes()
      .filter(node => {
        const nodeParts = node.id.replace('>', '').split('.')
        const nodeBasePath = nodeParts.slice(0, -1).join('.')
        const nodeIndex = parseInt(nodeParts[nodeParts.length - 1])
        
        return (
          nodeBasePath === basePath && 
          nodeParts.length === parts.length && 
          nodeIndex > currentIndex
        )
      })
  }

  // Get continuation points at parent levels
  getParentContinuations(mainNode, branchDepth) {
    const continuations = []
    
    // Look for branches at shallower depths that come after this branch
    for (let depth = branchDepth - 1; depth >= 1; depth--) {
      const parentBranches = this.graph.getBranchNodes()
        .filter(node => {
          const parts = node.id.replace('>', '').split('.')
          const nodeMainNode = parts[0]
          const nodeDepth = parts.length - 1
          
          return (
            parseInt(nodeMainNode) >= parseInt(mainNode) &&
            nodeDepth === depth
          )
        })
      
      continuations.push(...parentBranches)
    }
    
    return continuations
  }

  // Calculate the reason why a merge is valid
  calculateMergeReason(branchNodeId, targetId) {
    const branchParts = branchNodeId.replace('>', '').split('.')
    const targetParts = targetId.replace('>', '').split('.')
    
    const branchMainNode = parseInt(branchParts[0])
    const branchDepth = branchParts.length - 1
    const targetMainNode = parseInt(targetParts[0])
    const targetDepth = targetParts.length - 1
    
    // Same main thread, different branch levels
    if (branchMainNode === targetMainNode) {
      if (targetDepth < branchDepth) {
        return 'Merge up to parent level'
      } else if (targetDepth === branchDepth) {
        return 'Merge to sibling branch'
      } else {
        return 'Merge down to sub-branch'
      }
    }
    
    // Different main threads
    if (targetMainNode > branchMainNode) {
      if (targetDepth === 0) {
        return 'Forward progression on main thread'
      } else {
        return 'Forward progression to future branch'
      }
    }
    
    return 'Valid merge target'
  }

  // Parse node depth from ID
  getNodeDepth(nodeId) {
    const parts = nodeId.replace('>', '').split('.')
    return parts.length - 1
  }

  // Get the parent ID for a node
  getParentId(nodeId) {
    const parts = nodeId.replace('>', '').split('.')
    if (parts.length === 1) {
      return null // Main thread node has no parent
    }
    
    const parentParts = parts.slice(0, -1)
    return parentParts.join('.') + '>'
  }

  // Check if a node is a leaf (has no children)
  isLeafNode(nodeId) {
    return this.graph.isLeafNode(nodeId)
  }

  // Get all child nodes of a given node
  getChildNodes(nodeId) {
    const baseNumber = nodeId.replace('>', '')
    
    return this.graph.getAllNodes()
      .filter(node => {
        if (!node.isBranch) return false
        const nodeBase = node.id.replace('>', '').split('.').slice(0, -1).join('.')
        return nodeBase === baseNumber
      })
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  // Get the main thread position for a node
  getMainThreadPosition(nodeId) {
    const mainNode = nodeId.replace('>', '').split('.')[0]
    return parseInt(mainNode)
  }

  // Check if two nodes are siblings
  areSiblings(nodeId1, nodeId2) {
    const parts1 = nodeId1.replace('>', '').split('.')
    const parts2 = nodeId2.replace('>', '').split('.')
    
    // Must be same depth
    if (parts1.length !== parts2.length) return false
    
    // Must have same parent path
    const parent1 = parts1.slice(0, -1).join('.')
    const parent2 = parts2.slice(0, -1).join('.')
    
    return parent1 === parent2
  }

  // Get the branch index for a node (the number after the last dot)
  getBranchIndex(nodeId) {
    const parts = nodeId.replace('>', '').split('.')
    return parseInt(parts[parts.length - 1])
  }

  // Generate a human-readable path description
  getNodePath(nodeId) {
    const parts = nodeId.replace('>', '').split('.')
    
    if (parts.length === 1) {
      return `Main thread conversation ${parts[0]}`
    }
    
    const mainThread = parts[0]
    const branchPath = parts.slice(1).join('.')
    
    return `Branch ${branchPath} from conversation ${mainThread}`
  }
}

// Utility functions for working with node IDs
export const NodeUtils = {
  // Extract display number for UI (removes the >)
  getDisplayNumber: (nodeId) => {
    return nodeId.replace('>', '')
  },
  
  // Add > back to display number to get node ID
  formatAsNodeId: (displayNumber) => {
    return displayNumber + '>'
  },
  
  // Check if a node ID represents a main thread node
  isMainThread: (nodeId) => {
    return !nodeId.includes('.')
  },
  
  // Check if a node ID represents a branch
  isBranch: (nodeId) => {
    return nodeId.includes('.')
  },
  
  // Get the root node ID for any branch
  getRootNodeId: (nodeId) => {
    const mainNode = nodeId.replace('>', '').split('.')[0]
    return mainNode + '>'
  },
  
  // Compare two node IDs for sorting
  compareNodeIds: (a, b) => {
    const aParts = a.replace('>', '').split('.').map(x => parseInt(x))
    const bParts = b.replace('>', '').split('.').map(x => parseInt(x))
    
    // Compare each level
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0
      const bVal = bParts[i] || 0
      
      if (aVal !== bVal) {
        return aVal - bVal
      }
    }
    
    // If all levels are equal, shorter path comes first
    return aParts.length - bParts.length
  }
}

export default NodeLabeler