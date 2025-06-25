import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { formatISODateTime } from '../models/GraphModel.js';
import NavigationOverlay from './NavigationOverlay.jsx';

// Register dagre layout
cytoscape.use(dagre);

/**
 * GraphView v2.0 - Works with clean conversation model
 * One conversation = one node with prompt + response
 * Added drag-to-merge functionality for Beta MVP
 */
export function GraphView({ conversations, currentConversationId, onConversationSelect, onMergeNodes, graphModel, theme, onViewChange, currentView }) {
  const containerRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(currentConversationId);
  const [internalSelection, setInternalSelection] = useState(false);
  const [focusState, setFocusState] = useState({
    selectedNodeId: currentConversationId || null,
    pathToRoot: [],
    dimmedNodes: [],
    highlightedPath: []
  });

  // Stable function references using refs
  const onConversationSelectRef = useRef(onConversationSelect);
  const onMergeNodesRef = useRef(onMergeNodes);

  // Debug: Props change detection
  useEffect(() => {
    console.log('🔍 GraphView props changed:', {
      conversations: conversations?.length,
      currentConversationId,
      onConversationSelect: typeof onConversationSelect,
      onMergeNodes: typeof onMergeNodes,
      graphModel: !!graphModel,
      theme,
      timestamp: new Date().toISOString()
    });
  }, [conversations, currentConversationId, onConversationSelect, onMergeNodes, graphModel, theme]);

  // Update refs when props change
  useEffect(() => {
    onConversationSelectRef.current = onConversationSelect;
    onMergeNodesRef.current = onMergeNodes;
  }, [onConversationSelect, onMergeNodes]);

  // Update selected node visually when selection changes
  useEffect(() => {
    if (!cy) return;
    
    // Clear all selections
    cy.nodes().removeClass('selected');
    
    // Select the current node
    if (selectedNodeId) {
      const targetNode = cy.getElementById(selectedNodeId);
      if (targetNode.length > 0) {
        targetNode.addClass('selected');
        console.log('✅ Visual selection applied to node:', selectedNodeId);
      } else {
        console.warn('⚠️ Could not find node to select:', selectedNodeId);
      }
    }
  }, [cy, selectedNodeId, currentConversationId]);

  // Sync with external selection changes
  useEffect(() => {
    if (currentConversationId !== selectedNodeId) {
      setSelectedNodeId(currentConversationId);
    }
  }, [currentConversationId, selectedNodeId]);

  // Transform clean conversations to Cytoscape elements
  const createGraphElements = (conversations) => {
    if (!conversations || conversations.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Debug: Verify conversations have valid IDs
    console.log('🔍 Creating graph elements from conversations:', 
      conversations.map(c => ({ id: c.id, displayNumber: c.displayNumber, hasId: !!c.id }))
    );

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

  // Focus state management functions
  const getPathToRoot = (nodeId) => {
    if (!conversations || !nodeId) return [];
    
    const conversation = conversations.find(c => c.id === nodeId);
    if (!conversation) return [];
    
    const path = [nodeId];
    const displayNum = String(conversation.displayNumber);
    
    // Build path back to root
    if (displayNum.includes('.')) {
      // This is a branch node
      const parts = displayNum.split('.');
      const mainThreadNum = parts[0];
      
      // Add the main thread node this branched from
      const mainConv = conversations.find(c => String(c.displayNumber) === mainThreadNum);
      if (mainConv) {
        path.unshift(mainConv.id);
        
        // Add path to main thread root
        const mainNum = parseInt(mainThreadNum);
        for (let i = mainNum - 1; i >= 0; i--) {
          const ancestorConv = conversations.find(c => String(c.displayNumber) === String(i));
          if (ancestorConv) {
            path.unshift(ancestorConv.id);
          }
        }
      }
    } else {
      // This is a main thread node
      const currentNum = parseInt(displayNum);
      for (let i = currentNum - 1; i >= 0; i--) {
        const ancestorConv = conversations.find(c => String(c.displayNumber) === String(i));
        if (ancestorConv) {
          path.unshift(ancestorConv.id);
        }
      }
    }
    
    return path;
  };

  const selectNode = (nodeId) => {
    console.log('🎯 selectNode called with:', nodeId);
    
    if (!nodeId || !conversations) {
      console.log('❌ selectNode early return - missing nodeId or conversations');
      return;
    }
    
    // Mark this as internal selection
    setInternalSelection(true);
    
    const pathToRoot = getPathToRoot(nodeId);
    const allNodeIds = conversations.map(c => c.id);
    const dimmedNodes = allNodeIds.filter(id => !pathToRoot.includes(id));
    
    const newFocusState = {
      selectedNodeId: nodeId,
      pathToRoot: pathToRoot,
      dimmedNodes: dimmedNodes,
      highlightedPath: [] // Could add edge highlighting here
    };
    
    console.log('🎯 Setting focus state:', newFocusState);
    setFocusState(newFocusState);
    
    // Notify parent of selection change
    console.log('🎯 Calling onConversationSelect with:', nodeId);
    if (onConversationSelectRef.current) {
      onConversationSelectRef.current(nodeId);
    } else {
      console.error('❌ onConversationSelect callback is missing!');
    }
  };

  const centerView = () => {
    if (cy && focusState.selectedNodeId) {
      const selectedNode = cy.getElementById(focusState.selectedNodeId);
      if (selectedNode.length > 0) {
        cy.center(selectedNode);
        cy.fit(selectedNode, 50);
      }
    } else if (cy) {
      cy.fit();
    }
  };

  const getNodeClasses = (conversation, currentId) => {
    const classes = ['conversation-node'];
    
    // Determine if this is a main branch or side branch node
    const isMainBranch = !String(conversation.displayNumber).includes('.');
    
    if (isMainBranch) {
      classes.push('main-branch');
    } else {
      classes.push('side-branch');
    }
    
    // Focus state classes
    if (conversation.id === focusState.selectedNodeId) {
      classes.push('selected');
    }
    
    if (focusState.dimmedNodes.includes(conversation.id)) {
      classes.push('dimmed');
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
      // Base node style with interaction fixes
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
          'shape': 'round-rectangle',
          
          // CRITICAL: Ensure events work
          'events': 'yes',
          'pointer-events': 'all',
          'overlay-opacity': 0,
          
          // Interaction feedback
          'cursor': 'pointer',
          'transition-property': 'background-color, border-color, border-width',
          'transition-duration': '0.2s'
        }
      },

      // Hover state for better feedback
      {
        selector: 'node:hover',
        style: {
          'border-color': '#63b3ed',
          'border-width': 3,
          'background-color': '#3182ce'
        }
      },

      // Selected node with stronger visual feedback
      {
        selector: 'node.selected',
        style: {
          'border-color': '#f6e05e',
          'border-width': 4,
          'background-color': '#d69e2e',
          'color': '#1a202c'
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

      // Main Branch Nodes (Green - Primary Spine)
      {
        selector: 'node.main-branch.complete',
        style: {
          'background-color': '#10b981', // emerald-500
          'border-color': '#059669', // emerald-600
          'color': 'white',
          'font-weight': 'bold'
        }
      },

      // Side Branch Nodes (Gray - Subtle)
      {
        selector: 'node.side-branch.complete',
        style: {
          'background-color': '#6b7280', // gray-500
          'border-color': '#9ca3af', // gray-400
          'border-style': 'dashed',
          'color': 'white',
          'opacity': 0.7
        }
      },

      // Fallback complete node
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

      // Dimmed nodes (when something else is selected)
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.4,
          'background-opacity': 0.4,
          'border-opacity': 0.4,
          'text-opacity': 0.4
        }
      },

      // Main thread edges - strong green lines
      {
        selector: 'edge.main-thread-edge',
        style: {
          'width': 3,
          'line-color': '#10b981', // emerald-500
          'target-arrow-color': '#10b981',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      },

      // Branch edges - subtle gray dashed lines
      {
        selector: 'edge.branch-edge',
        style: {
          'width': 2,
          'line-color': '#9ca3af', // gray-400
          'target-arrow-color': '#9ca3af',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dashed',
          'opacity': 0.6
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

  // Memoize graph elements creation to prevent unnecessary regeneration
  const elements = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return { nodes: [], edges: [] };
    }
    return createGraphElements(conversations);
  }, [conversations]);

  // RESTORED VERSION - With full event handlers and debugging
  useEffect(() => {
    console.log('🔄 GraphView useEffect TRIGGERED');
    console.log('📊 Conversations count:', conversations?.length);
    console.log('🎯 Current conversation ID:', currentConversationId);
    console.log('📍 Container ref:', !!containerRef.current);
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    if (!containerRef.current || !conversations) {
      console.log('❌ Early return - missing container or conversations');
      return;
    }

    if (elements.nodes.length === 0) return;

    const cyInstance = cytoscape(createCytoscapeConfig(elements));

    // DEBUG: Verify event handlers are attached
    console.log('🎯 Attaching Cytoscape event handlers...');

    // Node tap/click handler with detailed debugging
    cyInstance.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      const nodeData = node.data();
      
      console.log('🎯 RAW NODE CLICK DEBUG:', {
        clickedNodeId: nodeId,
        nodeData: nodeData,
        currentConversationId: currentConversationId,
        conversations: conversations?.map(c => ({ id: c.id, displayNumber: c.displayNumber }))
      });
      
      // Verify this node exists in conversations array
      const foundConversation = conversations?.find(c => c.id === nodeId);
      if (foundConversation) {
        console.log('✅ Found conversation for clicked node:', foundConversation);
      } else {
        console.error('❌ NO CONVERSATION FOUND for node ID:', nodeId);
        console.log('Available conversation IDs:', conversations?.map(c => c.id));
      }
      
      // Update internal selection state
      setSelectedNodeId(nodeId);
      
      // Notify parent component
      if (onConversationSelectRef.current) {
        console.log('✅ Calling onConversationSelect with:', nodeId);
        onConversationSelectRef.current(nodeId);
      } else {
        console.error('❌ onConversationSelect callback is missing!');
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
        console.log('🎯 About to update drag source:', nodeId);
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
          onMergeNodesRef.current && onMergeNodesRef.current(dragSourceNode, validDropTarget);
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
      console.log('🎯 About to update drag source:', null);
      setDragSource(null);
    });

    // Background tap handler
    cyInstance.on('tap', (event) => {
      if (event.target === cyInstance) {
        console.log('📍 Background tap detected - clearing selection');
        setSelectedNodeId(null);
        if (onConversationSelectRef.current) {
          onConversationSelectRef.current(null);
        }
        const newFocusState = {
          selectedNodeId: null,
          pathToRoot: [],
          dimmedNodes: [],
          highlightedPath: []
        };
        console.log('🎯 About to update focus state:', newFocusState);
        setFocusState(newFocusState);
      }
    });

    // Auto-fit and center
    cyInstance.fit();
    cyInstance.center();

    // DEBUG: Test if nodes are selectable
    console.log('🔍 Node selectability test:');
    cyInstance.nodes().forEach(node => {
      console.log(`Node ${node.id()}: selectable=${node.selectable()}, grabbable=${node.grabbable()}`);
    });

    setCy(cyInstance);

    // Cleanup
    return () => {
      if (cyInstance) {
        cyInstance.destroy();
      }
    };
  }, [conversations, currentConversationId]);

  // MINIMAL TEST VERSION - Commented out now that render loop is fixed
  /*
  useEffect(() => {
    console.log('🔄 MINIMAL GraphView useEffect - START');
    
    if (!containerRef.current || !conversations) {
      console.log('❌ MINIMAL: Early return');
      return;
    }
    
    if (elements.nodes.length === 0) {
      console.log('❌ MINIMAL: No elements');
      return;
    }
    
    console.log('🔧 MINIMAL: Creating Cytoscape with', elements.nodes.length, 'nodes');
    
    // Destroy existing instance
    if (cy) {
      console.log('🗑️ MINIMAL: Destroying existing Cytoscape');
      cy.destroy();
    }
    
    // Create minimal Cytoscape with NO event handlers
    const cyInstance = cytoscape({
      container: containerRef.current,
      elements: [...elements.nodes, ...elements.edges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'width': '60px',
            'height': '60px',
            'background-color': '#2d3748',
            'color': '#fff'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle'
          }
        }
      ],
      layout: { 
        name: 'dagre',
        rankDir: 'TB'
      }
    });
    
    console.log('✅ MINIMAL: Cytoscape created successfully');
    setCy(cyInstance);
    
    return () => {
      console.log('🧹 MINIMAL: Cleanup');
      if (cyInstance) {
        cyInstance.destroy();
      }
    };
  }, [conversations]); // ONLY conversations dependency
  */


  // Sync GraphView focus state with external selection changes
  useEffect(() => {
    if (currentConversationId && currentConversationId !== focusState.selectedNodeId) {
      console.log('🔄 GraphView syncing to external selection:', currentConversationId);
      
      // Update internal focus state to match external selection
      if (conversations) {
        const pathToRoot = getPathToRoot(currentConversationId);
        const allNodeIds = conversations.map(c => c.id);
        const dimmedNodes = allNodeIds.filter(id => !pathToRoot.includes(id));
        
        setFocusState({
          selectedNodeId: currentConversationId,
          pathToRoot: pathToRoot,
          dimmedNodes: dimmedNodes,
          highlightedPath: []
        });
      }
    }
  }, [currentConversationId, conversations]);

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
        <NavigationOverlay
          selectedNodeId={focusState.selectedNodeId}
          pathToRoot={focusState.pathToRoot}
          totalNodes={conversations?.length || 0}
          currentView={currentView}
          graphModel={graphModel}
          onNavigate={selectNode}
          onCenterView={centerView}
          onViewChange={onViewChange}
        />
        
        <div 
          ref={containerRef} 
          className="cytoscape-container"
          style={{ 
            width: '100%', 
            height: '100%',
            background: '#1a202c',
            border: '1px solid #4a5568',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseDown={(e) => {
            // Prevent container mousedown from interfering with Cytoscape
            e.stopPropagation();
          }}
          onClick={(e) => {
            // Only handle clicks that reach the container (background clicks)
            if (e.target === containerRef.current) {
              console.log('📍 Graph background clicked');
              setSelectedNodeId(null);
              if (onConversationSelectRef.current) {
                onConversationSelectRef.current(null);
              }
            }
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