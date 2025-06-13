import { useRef, useEffect, useState } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { BranchMenu } from './BranchMenu.jsx'
import { MergeMenu } from './MergeMenu.jsx'
import { SummaryGenerator } from './SummaryGenerator.jsx'
import { NodeLabeler } from './NodeLabeler.jsx'

// Register the dagre layout
cytoscape.use(dagre)

export function GraphView({ 
  conversations, 
  currentNodeId, 
  onNodeSelect, 
  theme = 'dark',
  graph,
  claudeAPI,
  onBranchCreate,
  onMergeBack
}) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Modal states
  const [showBranchMenu, setShowBranchMenu] = useState(false)
  const [showMergeMenu, setShowMergeMenu] = useState(false)
  const [selectedNodeForBranch, setSelectedNodeForBranch] = useState(null)
  const [selectedNodeForMerge, setSelectedNodeForMerge] = useState(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Enhanced transformation for branching conversations
  const transformConversations = (conversations) => {
    const nodes = []
    const edges = []
    
    // Get all user prompts (both main thread and branches)
    const userPrompts = conversations.filter(c => c.type === 'user_prompt')
    console.log('All user prompts:', userPrompts.map(p => ({ id: p.internalId || p.id, isBranch: p.isBranch })))
    
    userPrompts.forEach(prompt => {
      const response = conversations.find(c => 
        c.type === 'ai_response' && 
        c.promptId === prompt.id
      )
      
      const promptText = prompt.content || ''
      const responseText = response?.content || 'No response yet'
      
      // Truncate for label display
      const label = promptText.length > 40 
        ? promptText.substring(0, 37) + '...'
        : promptText

      const wordCount = calculateWordCount(promptText + ' ' + responseText)
      
      // Create display label with only node number
      const nodeNumber = prompt.internalId || prompt.id
      const cleanNodeNumber = nodeNumber.replace('>', '')
      const displayLabel = cleanNodeNumber
      
      // Create conversation node
      nodes.push({
        data: {
          id: prompt.internalId || prompt.id,
          label: displayLabel,
          prompt: promptText,
          response: responseText,
          wordCount,
          timestamp: prompt.timestamp,
          processingTime: response?.processingTimeMs || 0,
          tokenCount: response?.totalTokens || 0,
          nodeType: 'conversation',
          promptId: prompt.id,
          
          // Enhanced branching metadata
          depth: prompt.depth || 0,
          branchType: prompt.branchType || null,
          branchIndex: prompt.branchIndex || null,
          parentId: prompt.parentId || null,
          status: prompt.status || 'active',
          isBranch: prompt.isBranch || false,
          isLeaf: graph ? graph.isLeafNode(prompt.id) : false,
          inheritedSummary: prompt.context?.inheritedSummary || null
        },
        classes: getNodeClasses(prompt, currentNodeId)
      })
    })

    // Create edges for conversation flow
    if (graph && graph.edges && graph.edges.length > 0) {
      graph.edges.forEach(edge => {
        const sourceNode = conversations.find(c => c.internalId === edge.from)
        const targetNode = conversations.find(c => c.internalId === edge.to)
        
        if (sourceNode && targetNode) {
          edges.push({
            data: {
              id: `${edge.from}-${edge.to}`,
              source: edge.from,
              target: edge.to,
              edgeType: edge.type || 'conversation'
            },
            classes: getEdgeClasses(edge.type)
          })
        }
      })
    } else {
      // Fallback: create sequential edges for main conversation flow
      const sortedPrompts = userPrompts
        .filter(p => !p.isBranch) // Only main thread for now
        .sort((a, b) => {
          // Extract numeric part for proper sorting
          const aId = (a.internalId || a.id).replace('>', '')
          const bId = (b.internalId || b.id).replace('>', '')
          const aNum = parseInt(aId.split('.')[0])
          const bNum = parseInt(bId.split('.')[0])
          return aNum - bNum
        })
      
      console.log('Sorted prompts for edges:', sortedPrompts.map(p => p.internalId || p.id))
      
      for (let i = 0; i < sortedPrompts.length - 1; i++) {
        const currentPrompt = sortedPrompts[i]
        const nextPrompt = sortedPrompts[i + 1]
        
        edges.push({
          data: {
            id: `${currentPrompt.internalId || currentPrompt.id}-${nextPrompt.internalId || nextPrompt.id}`,
            source: currentPrompt.internalId || currentPrompt.id,
            target: nextPrompt.internalId || nextPrompt.id,
            edgeType: 'conversation'
          },
          classes: getEdgeClasses('conversation')
        })
      }
    }

    return { nodes, edges }
  }

  // Get CSS classes for nodes based on their properties
  const getNodeClasses = (prompt, currentNodeId) => {
    const classes = ['conversation-node']
    
    if (currentNodeId === (prompt.internalId || prompt.id)) {
      classes.push('selected')
    }
    
    if (prompt.isBranch) {
      classes.push('branch-node')
      classes.push(`branch-${prompt.branchType || 'knowledge'}`)
      classes.push(`depth-${prompt.depth || 1}`)
    } else {
      classes.push('main-thread')
    }
    
    if (prompt.status === 'merged') {
      classes.push('merged')
    }
    
    return classes.join(' ')
  }

  // Get CSS classes for edges based on their type
  const getEdgeClasses = (edgeType) => {
    const classes = ['conversation-edge']
    
    switch (edgeType) {
      case 'merge':
        classes.push('merge-edge')
        break
      case 'branch':
        classes.push('branch-edge')
        break
      case 'conversation':
      default:
        classes.push('main-edge')
    }
    
    return classes.join(' ')
  }

  // Calculate word count helper
  const calculateWordCount = (text) => {
    if (!text?.trim()) return 0
    return text.trim().split(/\s+/).length
  }

  // Enhanced Cytoscape configuration with branching support
  const getCytoscapeConfig = (elements) => ({
    container: containerRef.current,
    elements,
    
    style: [
      // Base node styles
      {
        selector: 'node.conversation-node',
        style: {
          'background-color': theme === 'dark' ? '#2d3748' : '#e2e8f0',
          'border-color': theme === 'dark' ? '#4a5568' : '#cbd5e0',
          'border-width': 2,
          'color': theme === 'dark' ? '#ffffff' : '#1a202c',
          'font-size': '12px',
          'font-weight': 'bold',
          'text-valign': 'center',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': '110px',
          'width': '130px',
          'height': '90px',
          'shape': 'round-rectangle',
          'label': 'data(label)',
          'text-outline-width': 1,
          'text-outline-color': theme === 'dark' ? '#000000' : '#ffffff',
          'text-outline-opacity': 0.8
        }
      },
      
      // Main thread nodes
      {
        selector: 'node.main-thread',
        style: {
          'background-color': theme === 'dark' ? '#2d3748' : '#f7fafc',
          'border-color': theme === 'dark' ? '#4a5568' : '#cbd5e0',
          'border-width': 3
        }
      },
      
      // Branch nodes - Virgin (purple)
      {
        selector: 'node.branch-virgin',
        style: {
          'background-color': theme === 'dark' ? '#553c9a' : '#9f7aea',
          'border-color': theme === 'dark' ? '#6b46c1' : '#805ad5',
          'color': '#ffffff'
        }
      },
      
      // Branch nodes - Personality (blue)
      {
        selector: 'node.branch-personality',
        style: {
          'background-color': theme === 'dark' ? '#2b6cb0' : '#4299e1',
          'border-color': theme === 'dark' ? '#3182ce' : '#3182ce',
          'color': '#ffffff'
        }
      },
      
      // Branch nodes - Knowledge (green)
      {
        selector: 'node.branch-knowledge',
        style: {
          'background-color': theme === 'dark' ? '#2f855a' : '#48bb78',
          'border-color': theme === 'dark' ? '#38a169' : '#38a169',
          'color': '#ffffff'
        }
      },
      
      // Merged nodes
      {
        selector: 'node.merged',
        style: {
          'shape': 'diamond',
          'background-color': theme === 'dark' ? '#744210' : '#f6ad55',
          'border-color': theme === 'dark' ? '#92400e' : '#ed8936',
          'opacity': 0.7
        }
      },
      
      // Selected nodes
      {
        selector: 'node.selected',
        style: {
          'border-color': '#63b3ed',
          'border-width': 4,
          'overlay-color': '#63b3ed',
          'overlay-opacity': 0.3,
          'overlay-padding': 10
        }
      },
      
      // Main conversation edges
      {
        selector: 'edge.main-edge',
        style: {
          'width': 3,
          'line-color': theme === 'dark' ? '#4a5568' : '#a0aec0',
          'target-arrow-color': theme === 'dark' ? '#4a5568' : '#a0aec0',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 1.2
        }
      },
      
      // Branch edges
      {
        selector: 'edge.branch-edge',
        style: {
          'width': 2,
          'line-color': theme === 'dark' ? '#63b3ed' : '#4299e1',
          'target-arrow-color': theme === 'dark' ? '#63b3ed' : '#4299e1',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dashed'
        }
      },
      
      // Merge edges
      {
        selector: 'edge.merge-edge',
        style: {
          'width': 4,
          'line-color': '#f6ad55',
          'target-arrow-color': '#f6ad55',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dotted',
          'arrow-scale': 1.5
        }
      }
    ],
    
    layout: {
      name: 'dagre',
      rankDir: 'TB',
      spacingFactor: 1.2,
      nodeSep: 80,
      rankSep: 100,
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 20
    },
    
    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
    autoungrabify: false,
    minZoom: 0.2,
    maxZoom: 4
  })

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    const { nodes, edges } = transformConversations(conversations)
    const elements = [...nodes, ...edges]
    
    const config = getCytoscapeConfig(elements)
    const cy = cytoscape(config)
    
    // Store reference
    cyRef.current = cy
    
    // Apply custom positioning after layout completes (for branches only)
    cy.on('layoutstop', () => {
      cy.nodes().forEach(node => {
        const nodeData = node.data()
        if (nodeData.depth > 0 && nodeData.isBranch) {
          // Only slightly offset branch nodes horizontally to show branching
          const pos = node.position()
          const newPos = {
            x: pos.x + (nodeData.depth * 80),
            y: pos.y
          }
          node.position(newPos)
        }
      })
    })

    // Enhanced event listeners with branching support
    cy.on('tap', 'node', (event) => {
      const nodeData = event.target.data()
      if (onNodeSelect) {
        onNodeSelect(nodeData.id, nodeData)
      }
    })

    // Hover effects
    cy.on('mouseover', 'node', (event) => {
      const node = event.target
      node.style({
        'border-color': '#90cdf4',
        'border-width': 3
      })
      containerRef.current.style.cursor = 'pointer'
    })

    cy.on('mouseout', 'node', (event) => {
      const node = event.target
      const nodeData = node.data()
      
      // Reset to original border color based on node type
      let originalBorderColor = theme === 'dark' ? '#4a5568' : '#cbd5e0'
      if (nodeData.isBranch) {
        switch (nodeData.branchType) {
          case 'virgin':
            originalBorderColor = theme === 'dark' ? '#6b46c1' : '#805ad5'
            break
          case 'personality':
            originalBorderColor = theme === 'dark' ? '#3182ce' : '#3182ce'
            break
          case 'knowledge':
            originalBorderColor = theme === 'dark' ? '#38a169' : '#38a169'
            break
        }
      }
      
      node.style({
        'border-color': originalBorderColor,
        'border-width': nodeData.isBranch ? 2 : (nodeData.classes?.includes('main-thread') ? 3 : 2)
      })
      containerRef.current.style.cursor = 'default'
    })

    // Right-click context menu for branching
    cy.on('cxttap', 'node', (event) => {
      event.preventDefault()
      const nodeData = event.target.data()
      
      // Only allow branching from user prompts
      if (nodeData.nodeType === 'conversation') {
        setSelectedNodeForBranch(nodeData.promptId)
        setShowBranchMenu(true)
      }
    })

    // Enhanced tooltip with branching info (separate from hover styling)
    cy.on('mouseover', 'node', (event) => {
      const node = event.target
      const data = node.data()
      const renderedPosition = node.renderedPosition()
      
      // Remove any existing tooltips first
      const existingTooltips = containerRef.current.querySelectorAll('.graph-tooltip')
      existingTooltips.forEach(tooltip => tooltip.remove())
      
      // Create enhanced tooltip
      const tooltip = document.createElement('div')
      tooltip.className = 'graph-tooltip enhanced'
      
      let branchInfo = ''
      if (data.isBranch) {
        const branchTypeIcons = {
          virgin: '🌱',
          personality: '🎭', 
          knowledge: '🧠'
        }
        const icon = branchTypeIcons[data.branchType] || '🌿'
        branchInfo = `<div class="branch-info"><strong>${icon} ${data.branchType} branch</strong></div>`
      }
      
      let mergeInfo = ''
      if (data.isLeaf && data.isBranch) {
        mergeInfo = '<div class="merge-hint">Right-click to merge back</div>'
      }
      
      tooltip.innerHTML = `
        <div class="tooltip-content">
          <div><strong>ID:</strong> ${data.promptId}</div>
          <div><strong>Prompt:</strong> ${data.prompt.substring(0, 80)}${data.prompt.length > 80 ? '...' : ''}</div>
          ${branchInfo}
          <div class="stats-row">
            <span><strong>Words:</strong> ${data.wordCount}</span>
            <span><strong>Tokens:</strong> ${data.tokenCount}</span>
          </div>
          <div><strong>Time:</strong> ${data.processingTime}ms</div>
          ${data.inheritedSummary ? '<div class="inherited-badge">📋 Has context summary</div>' : ''}
          ${mergeInfo}
          <div class="action-hint">Right-click to create branch</div>
        </div>
      `
      
      tooltip.style.position = 'absolute'
      tooltip.style.left = `${renderedPosition.x + 10}px`
      tooltip.style.top = `${renderedPosition.y - 10}px`
      tooltip.style.background = theme === 'dark' ? '#1a202c' : '#ffffff'
      tooltip.style.color = theme === 'dark' ? '#e2e8f0' : '#2d3748'
      tooltip.style.padding = '12px'
      tooltip.style.borderRadius = '8px'
      tooltip.style.fontSize = '11px'
      tooltip.style.maxWidth = '300px'
      tooltip.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)'
      tooltip.style.border = `1px solid ${theme === 'dark' ? '#4a5568' : '#e2e8f0'}`
      tooltip.style.zIndex = '1000'
      tooltip.style.pointerEvents = 'none'
      
      containerRef.current.appendChild(tooltip)
    })

    cy.on('mouseout', 'node', () => {
      const tooltips = containerRef.current.querySelectorAll('.graph-tooltip')
      tooltips.forEach(tooltip => tooltip.remove())
    })
    
    // Fit and center after initial render
    cy.ready(() => {
      cy.fit()
      cy.center()
    })
    
    setIsInitialized(true)
    
    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
      setIsInitialized(false)
    }
  }, []) // Only run once on mount

  // Update graph when conversations or selection changes
  useEffect(() => {
    if (!cyRef.current || !isInitialized) return

    const { nodes, edges } = transformConversations(conversations)
    const elements = [...nodes, ...edges]
    
    // Update elements
    cyRef.current.elements().remove()
    cyRef.current.add(elements)
    
    // Update selected class
    cyRef.current.nodes().removeClass('selected')
    if (currentNodeId) {
      cyRef.current.getElementById(currentNodeId).addClass('selected')
    }
    
    // Re-layout
    cyRef.current.layout({
      name: 'dagre',
      rankDir: 'TB',
      spacingFactor: 1.2,
      nodeSep: 80,
      rankSep: 100,
      animate: true,
      animationDuration: 300,
      fit: true,
      padding: 20
    }).run()
    
    // Fit and center after layout update
    cyRef.current.one('layoutstop', () => {
      cyRef.current.fit()
      cyRef.current.center()
    })
    
  }, [conversations, currentNodeId, theme, isInitialized])

  // Modal handler functions
  const handleBranchCreate = async (branchType, summaryType) => {
    if (!selectedNodeForBranch || !graph || !claudeAPI) return
    
    setIsGeneratingSummary(true)
    
    try {
      let inheritedSummary = null
      
      // Generate summary for knowledge branches
      if (branchType === 'knowledge') {
        const conversationThread = graph.getConversationThread(selectedNodeForBranch)
        
        // Use SummaryGenerator to create the summary
        const prompt = summaryType === 'brief' 
          ? 'Create a brief summary of key insights for branch context'
          : 'Create a detailed summary of exploration findings for branch context'
        
        // This would normally use the SummaryGenerator component
        // For now, create a simple summary
        inheritedSummary = `Summary: Conversation context from ${conversationThread.length} exchanges`
      }
      
      // Call the app-level branch creation handler
      if (onBranchCreate) {
        await onBranchCreate(selectedNodeForBranch, branchType, summaryType, inheritedSummary)
      }
      
    } catch (error) {
      console.error('Branch creation failed:', error)
    } finally {
      setIsGeneratingSummary(false)
      setShowBranchMenu(false)
      setSelectedNodeForBranch(null)
    }
  }

  const handleMergeBack = async (targetNodeId, summaryType) => {
    if (!selectedNodeForMerge || !graph || !claudeAPI) return
    
    setIsGeneratingSummary(true)
    
    try {
      // Generate merge summary
      const conversationThread = graph.getConversationThread(selectedNodeForMerge)
      
      // Call the app-level merge handler
      if (onMergeBack) {
        await onMergeBack(selectedNodeForMerge, targetNodeId, summaryType, conversationThread)
      }
      
    } catch (error) {
      console.error('Merge back failed:', error)
    } finally {
      setIsGeneratingSummary(false)
      setShowMergeMenu(false)
      setSelectedNodeForMerge(null)
    }
  }

  const handleShowMergeMenu = (nodeId) => {
    if (!graph) return
    
    const mergeTargets = graph.calculateMergeTargets(nodeId)
    if (mergeTargets.length > 0) {
      setSelectedNodeForMerge(nodeId)
      setShowMergeMenu(true)
    }
  }

  return (
    <>
      <div className="graph-view">
        <div className="graph-header">
          <h3>🗺️ Knowledge Map</h3>
          <div className="graph-stats">
            {conversations.length > 0 && (
              <>
                <span>{conversations.filter(c => c.type === 'user_prompt').length} conversations</span>
                <span>{conversations.filter(c => c.type === 'user_prompt' && c.isBranch).length} branches</span>
              </>
            )}
          </div>
          <div className="graph-legend">
            <span className="legend-item main">◼️ Main Thread</span>
            <span className="legend-item virgin">🌱 Virgin Branch</span>
            <span className="legend-item personality">🎭 Personality Branch</span>
            <span className="legend-item knowledge">🧠 Knowledge Branch</span>
            <span className="legend-item merged">💎 Merged</span>
            <span className="legend-hint">Right-click nodes to branch</span>
          </div>
        </div>
        
        <div 
          ref={containerRef} 
          className="graph-container"
          role="region"
          aria-label="Conversation knowledge graph with branching support"
        />
        
        {conversations.length === 0 && (
          <div className="graph-empty">
            <div className="empty-content">
              <span className="empty-icon">🌐</span>
              <h4>Knowledge Map Empty</h4>
              <p>Start a conversation to see your knowledge cartography</p>
              <small>Right-click nodes to create branches and explore ideas</small>
            </div>
          </div>
        )}
        
        {isGeneratingSummary && (
          <div className="summary-overlay">
            <div className="summary-progress">
              <span className="spinner">⟳</span>
              <span>Generating context summary...</span>
            </div>
          </div>
        )}
      </div>

      {/* Branch Creation Modal */}
      {showBranchMenu && selectedNodeForBranch && (
        <BranchMenu
          sourceNodeId={selectedNodeForBranch}
          onBranchCreate={handleBranchCreate}
          onClose={() => {
            setShowBranchMenu(false)
            setSelectedNodeForBranch(null)
          }}
        />
      )}

      {/* Merge Back Modal */}
      {showMergeMenu && selectedNodeForMerge && graph && (
        <MergeMenu
          branchNodeId={selectedNodeForMerge}
          availableTargets={graph.calculateMergeTargets(selectedNodeForMerge)}
          onMergeBack={handleMergeBack}
          onClose={() => {
            setShowMergeMenu(false)
            setSelectedNodeForMerge(null)
          }}
          graph={graph}
        />
      )}
    </>
  )
}

// Enhanced CSS styles with branching support
const styles = `
.graph-view {
  width: 100%;
  height: calc(100vh - 200px);
  background-color: var(--bg-primary, #1a202c);
  border: 1px solid var(--border-color, #4a5568);
  border-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #4a5568);
  background: var(--bg-secondary, #2d3748);
}

.graph-header h3 {
  margin: 0;
  color: var(--text-primary, #e2e8f0);
  font-size: 16px;
  font-weight: 600;
}

.graph-stats {
  display: flex;
  gap: 16px;
  color: var(--text-secondary, #a0aec0);
  font-size: 12px;
}

.graph-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--legend-bg, rgba(255, 255, 255, 0.1));
}

.legend-item.main { color: #cbd5e0; }
.legend-item.virgin { color: #c084fc; }
.legend-item.personality { color: #60a5fa; }
.legend-item.knowledge { color: #4ade80; }
.legend-item.merged { color: #f6ad55; }

.legend-hint {
  color: var(--text-secondary, #a0aec0);
  font-style: italic;
  margin-left: 8px;
}

.graph-container {
  flex: 1;
  width: 100%;
  position: relative;
}

.graph-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--text-secondary, #a0aec0);
}

.empty-content {
  max-width: 300px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-content h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary, #e2e8f0);
  font-size: 18px;
}

.empty-content p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.empty-content small {
  font-size: 12px;
  opacity: 0.7;
}

.summary-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.summary-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary, #2d3748);
  padding: 16px 24px;
  border-radius: 8px;
  color: var(--text-primary, #e2e8f0);
}

.summary-progress .spinner {
  font-size: 20px;
  animation: spin 2s linear infinite;
  color: var(--accent-color, #4299e1);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.graph-tooltip.enhanced {
  border: 1px solid var(--border-color, #4a5568);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.4;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats-row {
  display: flex;
  gap: 12px;
}

.branch-info {
  color: var(--accent-color, #4299e1);
  font-size: 12px;
}

.inherited-badge {
  background: var(--success-bg, rgba(72, 187, 120, 0.2));
  color: var(--success-color, #48bb78);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.merge-hint {
  background: var(--warning-bg, rgba(246, 173, 85, 0.2));
  color: var(--warning-color, #f6ad55);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.action-hint {
  background: var(--info-bg, rgba(66, 153, 225, 0.2));
  color: var(--info-color, #4299e1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  text-align: center;
  margin-top: 4px;
}

/* Dark mode variables */
.app.dark {
  --bg-primary: #1a202c;
  --bg-secondary: #2d3748;
  --border-color: #4a5568;
  --text-primary: #e2e8f0;
  --text-secondary: #a0aec0;
  --accent-color: #4299e1;
  --legend-bg: rgba(255, 255, 255, 0.1);
  --success-bg: rgba(72, 187, 120, 0.2);
  --success-color: #48bb78;
  --warning-bg: rgba(246, 173, 85, 0.2);
  --warning-color: #f6ad55;
  --info-bg: rgba(66, 153, 225, 0.2);
  --info-color: #4299e1;
}

/* Light mode variables */
.app.light {
  --bg-primary: #ffffff;
  --bg-secondary: #f7fafc;
  --border-color: #e2e8f0;
  --text-primary: #2d3748;
  --text-secondary: #718096;
  --accent-color: #3182ce;
  --legend-bg: rgba(0, 0, 0, 0.05);
  --success-bg: rgba(72, 187, 120, 0.1);
  --success-color: #38a169;
  --warning-bg: rgba(237, 137, 54, 0.1);
  --warning-color: #ed8936;
  --info-bg: rgba(49, 130, 206, 0.1);
  --info-color: #3182ce;
}

/* Responsive design */
@media (max-width: 768px) {
  .graph-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .graph-legend {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .legend-hint {
    margin-left: 0;
    margin-top: 4px;
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}