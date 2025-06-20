import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { formatISODateTime } from '../models/GraphModel.js';

// Register dagre layout
cytoscape.use(dagre);

/**
 * GraphView v2.0 - Works with clean conversation model
 * One conversation = one node with prompt + response
 * Added drag-to-merge functionality for Beta MVP
 */
export function GraphView({ conversations, currentConversationId, onConversationSelect, onMergeNodes, graphModel, theme }) {
  const containerRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  // Transform clean conversations to Cytoscape elements
  const createGraphElements = (conversations) => {
    if (!conversations || conversations.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Create nodes (including branches)
    const nodes = conversations.map(conv => ({
      data: {
        id: conv.id,
        label: String(conv.displayNumber),
        displayNumber: conv.displayNumber,
        prompt: truncateText(conv.prompt || 'New branch (ready)', 80),
        response: truncateText(conv.response || 'Ready for conversation', 120),
        timestamp: formatTimestamp(conv.timestamp),
        processingTime: conv.processingTime,
        tokenCount: conv.tokenCount,
        status: conv.status,
        branchType: conv.branchType,
        depth: conv.depth || 0
      },
      classes: getNodeClasses(conv, currentConversationId)
    }));

    // Create edges based on display number hierarchy
    const edges = [];
    
    conversations.forEach(conv => {
      const displayNum = String(conv.displayNumber);
      
      if (displayNum.includes('.')) {
        // This is a branch node - determine the correct parent
        let parentDisplayNum;
        const parts = displayNum.split('.');
        const lastNum = parseInt(parts[parts.length - 1]);
        
        if (lastNum === 0) {
          // Branch start (like 1.1.0) - parent is main thread node
          parentDisplayNum = getDisplayParent(displayNum);
        } else {
          // Branch continuation (like 1.1.1) - parent is previous in branch
          parentDisplayNum = getBranchContinuationParent(displayNum);
        }
        
        const parentConv = conversations.find(c => String(c.displayNumber) === parentDisplayNum);
        
        if (parentConv) {
          edges.push({
            data: {
              id: `branch-${parentConv.id}-${conv.id}`,
              source: parentConv.id,
              target: conv.id
            },
            classes: 'branch-edge'
          });
        }
      } else {
        // Main thread node - connect to previous main thread node
        const currentNum = parseInt(displayNum);
        if (currentNum > 0) {
          const prevDisplayNum = String(currentNum - 1);
          const prevConv = conversations.find(c => String(c.displayNumber) === prevDisplayNum);
          
          if (prevConv) {
            edges.push({
              data: {
                id: `main-${prevConv.id}-${conv.id}`,
                source: prevConv.id,
                target: conv.id
              },
              classes: 'main-thread-edge'
            });
          }
        }
      }
    });

    return { nodes, edges };
  };

  // Helper functions for display hierarchy
  const getDisplayParent = (displayNumber) => {
    const parts = String(displayNumber).split('.');
    
    if (parts.length === 3) {
      // Branch like "1.1.0" → parent is "1"
      return parts[0];
    } else if (parts.length > 3) {
      // Sub-branch like "1.1.2.1.0" → parent is "1.1.2"
      return parts.slice(0, -2).join('.');
    } else {
      // Invalid format
      return null;
    }
  };

  const getBranchContinuationParent = (displayNumber) => {
    const parts = String(displayNumber).split('.');
    const lastNum = parseInt(parts[parts.length - 1]);
    
    if (lastNum === 0) {
      // This is branch start (like 1.1.0) - parent is main thread
      return getDisplayParent(displayNumber);
    } else {
      // This is branch continuation (like 1.1.1) - parent is previous in branch
      const prevNum = lastNum - 1;
      parts[parts.length - 1] = String(prevNum);
      return parts.join('.');
    }
  };

  const truncateText = (text, maxLength) => {
    if (!text) return 'Empty';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatTimestamp = (timestamp) => {
    return formatISODateTime(timestamp);
  };

  const getNodeClasses = (conversation, currentId) => {
    const classes = ['conversation-node'];
    
    if (conversation.id === currentId) {
      classes.push('selected');
    }
    
    if (conversation.status === 'processing') {
      classes.push('processing');
    } else if (conversation.status === 'error') {
      classes.push('error');
    } else if (conversation.status === 'complete') {
      classes.push('complete');
    } else if (conversation.status === 'ready') {
      classes.push('ready');
    }

    // Add branch type classes
    if (conversation.branchType) {
      classes.push(`branch-${conversation.branchType}`);
    }

    // Add end node class (for merge functionality)
    if (graphModel && graphModel.isEndNode(conversation.id)) {
      classes.push('end-node');
    }

    // Add merged class
    if (graphModel && graphModel.isThreadMerged(conversation.displayNumber)) {
      classes.push('merged');
    }

    return classes.join(' ');
  };

  // Cytoscape configuration
  const createCytoscapeConfig = (elements) => ({
    container: containerRef.current,
    elements: [...elements.nodes, ...elements.edges],

    style: [
      // Base node style
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '16px',
          'font-weight': 'bold',
          'color': '#e2e8f0',
          'background-color': '#2d3748',
          'border-color': '#4a5568',
          'border-width': 2,
          'width': '60px',
          'height': '60px',
          'shape': 'round-rectangle'
        }
      },

      // Selected node
      {
        selector: 'node.selected',
        style: {
          'border-color': '#f59e0b',
          'border-width': 4,
          'background-color': '#1e40af'
        }
      },

      // Processing node
      {
        selector: 'node.processing',
        style: {
          'background-color': '#7c3aed',
          'border-color': '#8b5cf6'
        }
      },

      // Error node
      {
        selector: 'node.error',
        style: {
          'background-color': '#dc2626',
          'border-color': '#ef4444'
        }
      },

      // Complete node
      {
        selector: 'node.complete',
        style: {
          'background-color': '#059669',
          'border-color': '#10b981'
        }
      },

      // Ready node (for branches waiting for input)
      {
        selector: 'node.ready',
        style: {
          'background-color': '#374151',
          'border-color': '#6b7280',
          'border-style': 'dashed'
        }
      },

      // Branch nodes - different colors by type
      {
        selector: 'node.branch-virgin',
        style: {
          'background-color': '#7c3aed',
          'border-color': '#8b5cf6'
        }
      },

      {
        selector: 'node.branch-personality',
        style: {
          'background-color': '#2563eb',
          'border-color': '#3b82f6'
        }
      },

      {
        selector: 'node.branch-knowledge',
        style: {
          'background-color': '#059669',
          'border-color': '#10b981'
        }
      },

      // Branch edges - dashed lines
      {
        selector: 'edge.branch-edge',
        style: {
          'width': 3,
          'line-color': '#f59e0b',
          'target-arrow-color': '#f59e0b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dashed'
        }
      },

      // Enhanced drag-to-merge visual states
      {
        selector: 'node.dragging-source',
        style: {
          'border-color': '#ff6b6b',
          'border-width': 4,
          'opacity': 0.8
        }
      },

      {
        selector: 'node.valid-merge-target',
        style: {
          'border-color': '#50e3c2',
          'border-width': 2,
          'border-style': 'dashed'
        }
      },

      {
        selector: 'node.merge-target-hover',
        style: {
          'background-color': '#50e3c2',
          'border-color': '#50e3c2',
          'border-width': 4,
          'border-style': 'solid'
        }
      },

      // End node indicator (nodes that can be merged)
      {
        selector: 'node.end-node',
        style: {
          'border-color': '#f59e0b',
          'border-width': 4
        }
      },

      // Merged node visual state
      {
        selector: 'node.merged',
        style: {
          'opacity': 0.6,
          'border-style': 'dashed',
          'background-color': '#f3f4f6'
        }
      },

      // Edges
      {
        selector: 'edge.main-thread-edge',
        style: {
          'width': 3,
          'line-color': '#4a5568',
          'target-arrow-color': '#4a5568',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      }
    ],

    layout: {
      name: 'dagre',
      rankDir: 'TB',        // Top to bottom
      spacingFactor: 1.5,
      nodeSep: 80,          // Horizontal spacing
      rankSep: 120,         // Vertical spacing
      animate: true,
      animationDuration: 500
    },

    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
    autoungrabify: false  // Allow node dragging for merge functionality
  });

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || !conversations) return;

    const elements = createGraphElements(conversations);
    if (elements.nodes.length === 0) return;

    const cyInstance = cytoscape(createCytoscapeConfig(elements));

    // Event handlers
    cyInstance.on('tap', 'node', (event) => {
      const nodeId = event.target.data('id');
      if (onConversationSelect) {
        onConversationSelect(nodeId);
      }
    });

    // Improved drag-to-merge functionality
    let dragSourceNode = null;
    let validDropTarget = null;

    // Start drag - only for end nodes
    cyInstance.on('grab', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      
      console.log('🎯 Grabbed node:', nodeId, 'isEndNode:', graphModel ? graphModel.isEndNode(nodeId) : 'no graphModel');
      
      if (graphModel && graphModel.isEndNode(nodeId)) {
        dragSourceNode = nodeId;
        setDragSource(nodeId);
        node.addClass('dragging-source');
        console.log('✅ Started dragging end node:', nodeId);
        
        // Highlight all valid merge targets
        cyInstance.nodes().forEach(targetNode => {
          const targetId = targetNode.id();
          if (targetId !== nodeId && graphModel.canMergeNodes(nodeId, targetId)) {
            targetNode.addClass('valid-merge-target');
            console.log('🎯 Valid merge target:', targetId);
          }
        });
      }
    });

    // During drag - detect hover over valid targets
    cyInstance.on('drag', 'node', (event) => {
      if (!dragSourceNode || !graphModel) return;
      
      const draggedNode = event.target;
      const position = draggedNode.position();
      
      // Clear previous hover states
      cyInstance.nodes('.merge-target-hover').removeClass('merge-target-hover');
      validDropTarget = null;
      
      // Find nodes within drop distance
      cyInstance.nodes('.valid-merge-target').forEach(targetNode => {
        const targetPos = targetNode.position();
        const distance = Math.sqrt(
          Math.pow(targetPos.x - position.x, 2) + 
          Math.pow(targetPos.y - position.y, 2)
        );
        
        console.log('📏 Distance to', targetNode.id(), ':', distance);
        
        if (distance < 60) { // Increased drop zone
          targetNode.addClass('merge-target-hover');
          validDropTarget = targetNode.id();
          console.log('🎯 Hovering over valid target:', validDropTarget);
        }
      });
    });

    // End drag - perform merge if over valid target
    cyInstance.on('free', 'node', (event) => {
      console.log('🏁 Drag ended. Source:', dragSourceNode, 'Target:', validDropTarget);
      
      if (dragSourceNode && validDropTarget) {
        console.log('🔀 Attempting merge:', dragSourceNode, '→', validDropTarget);
        
        try {
          onMergeNodes && onMergeNodes(dragSourceNode, validDropTarget);
          console.log('✅ Merge successful!');
        } catch (error) {
          console.error('❌ Merge failed:', error);
          alert(`Merge failed: ${error.message}`);
        }
      } else if (dragSourceNode) {
        console.log('❌ No valid drop target found');
      }
      
      // Clean up all classes
      cyInstance.nodes().removeClass('dragging-source valid-merge-target merge-target-hover');
      dragSourceNode = null;
      validDropTarget = null;
      setDragSource(null);
    });

    // Auto-fit and center
    cyInstance.fit();
    cyInstance.center();

    setCy(cyInstance);

    // Cleanup
    return () => {
      if (cyInstance) {
        cyInstance.destroy();
      }
    };
  }, [conversations, currentConversationId]);

  // Add tooltip on hover
  useEffect(() => {
    if (!cy) return;

    // Simple tooltip using node title
    cy.nodes().forEach(node => {
      const data = node.data();
      const tooltip = `Conversation ${data.displayNumber}
Prompt: ${data.prompt}
Response: ${data.response}
Time: ${data.timestamp}
Tokens: ${data.tokenCount}
Status: ${data.status}`;
      
      node.data('title', tooltip);
    });

  }, [cy, conversations]);

  return (
    <div className="graph-view">
      <div className="graph-header">
        <h3>🗡️ Knowledge Graph</h3>
        <span className="conversation-count">
          {conversations?.length || 0} conversations
        </span>
      </div>
      <div className="graph-container">
        <div 
          ref={containerRef} 
          className="cytoscape-container"
          style={{ 
            width: '100%', 
            height: '100%',
            background: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '8px'
          }}
        />
        {dragSource && (
          <div className="merge-instructions">
            🔀 Drag to merge with another end node
          </div>
        )}
      </div>
    </div>
  );
}