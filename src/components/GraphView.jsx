import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { formatISODateTime } from '../models/GraphModel.js';
import NavigationOverlay from './NavigationOverlay.jsx';
import { SummaryGenerator } from './SummaryGenerator.jsx';
import { MergePromptSelector } from './MergePromptSelector.jsx';
import { claudeAPI } from '../services/ClaudeAPI.js';
import Logger from '../utils/logger.js';

// Register dagre layout
cytoscape.use(dagre);

/**
 * GraphView v2.0 - Works with clean conversation model
 * One conversation = one node with prompt + response
 * Added drag-to-merge functionality for Beta MVP
 */
export function GraphView({ conversations, currentConversationId, onConversationSelect, onMergeNodes, graphModel, theme, onViewChange, currentView, promptsModel }) {
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

  // Merge prompt selector state
  const [mergePromptState, setMergePromptState] = useState({
    isVisible: false,
    sourceNode: null,
    targetNode: null
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
          // Determine edge styling based on branch type
          let edgeClasses = 'branch-edge';
          if (conv.branchType) {
            edgeClasses += ` branch-${conv.branchType}-edge`;
          }
          
          edges.push({
            data: {
              id: `branch-${parentConv.id}-${conv.id}`,
              source: parentConv.id,
              target: conv.id,
              branchType: conv.branchType // Store for debugging
            },
            classes: edgeClasses
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

      // Create merge edge for auto-generated integration nodes
      if (conv.isAutoGenerated && conv.mergeSource) {
        const mergeSourceConv = conversations.find(c => c.id === conv.mergeSource);
        if (mergeSourceConv) {
          edges.push({
            data: {
              id: `merge-${conv.mergeSource}-${conv.id}`,
              source: conv.mergeSource,
              target: conv.id,
              type: 'merge',
              mergePrompt: conv.mergePrompt
            },
            classes: 'merge-edge'
          });
          console.log(`🔗 Added merge edge: ${mergeSourceConv.displayNumber} → ${conv.displayNumber}`);
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

      // Branch type styling removed - edge styling indicates branch type instead

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

      // Temporary merge edge - orange dashed line for drag feedback
      {
        selector: 'edge.temporary-merge-edge',
        style: {
          'width': 4,
          'line-color': '#f59e0b', // amber-500 (orange)
          'target-arrow-color': '#f59e0b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dashed',
          'opacity': 0.8,
          'z-index': 100 // Ensure it appears above other edges
        }
      },

      // Permanent merge edge - solid orange line for completed merges
      {
        selector: 'edge.merge-edge',
        style: {
          'width': 4,
          'line-color': '#f59e0b', // amber-500 (orange)
          'target-arrow-color': '#f59e0b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'solid',
          'opacity': 1.0,
          'z-index': 90, // Above normal edges but below temporary
          'source-endpoint': 'outside-to-node',
          'target-endpoint': 'outside-to-node'
        }
      },

      // Branch edges - subtle gray dashed lines (default)
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

      // Virgin branch edges - dotted lines
      {
        selector: 'edge.branch-virgin-edge',
        style: {
          'width': 2,
          'line-color': '#7c3aed', // purple-600
          'target-arrow-color': '#7c3aed',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dotted',
          'opacity': 0.8
        }
      },

      // Personality branch edges - dashed lines
      {
        selector: 'edge.branch-personality-edge',
        style: {
          'width': 2,
          'line-color': '#2563eb', // blue-600
          'target-arrow-color': '#2563eb',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dashed',
          'opacity': 0.8
        }
      },

      // Knowledge branch edges - solid lines (like main thread)
      {
        selector: 'edge.branch-knowledge-edge',
        style: {
          'width': 2,
          'line-color': '#059669', // emerald-600
          'target-arrow-color': '#059669',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'solid',
          'opacity': 0.8
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
          'border-color': '#f59e0b', // amber-500 (orange)
          'border-width': 4,
          'border-style': 'solid',
          // Add subtle pulsing animation effect
          'transition-property': 'border-color, border-width',
          'transition-duration': '0.3s'
        }
      },

      // Enhanced end node when not being dragged (subtle glow effect)
      {
        selector: 'node.end-node:hover',
        style: {
          'border-color': '#f97316', // amber-600 (brighter orange)
          'border-width': 5,
          'box-shadow': '0 0 20px #f59e0b'
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

  // Handle merge with intelligent prompt selection
  const handleMergeWithSummarization = useCallback(async (sourceNodeId, targetNodeId) => {
    try {
      const sourceConv = graphModel?.getConversation(sourceNodeId);
      const targetConv = graphModel?.getConversation(targetNodeId);
      
      if (!sourceConv || !targetConv) {
        throw new Error(`Conversation not found: source=${sourceConv?.id}, target=${targetConv?.id}`);
      }

      // Check if source is a branch that should be summarized
      const shouldSummarize = graphModel?.isBranchId(sourceConv.displayNumber);
      
      if (shouldSummarize && promptsModel) {
        console.log('🔗 Branch merge detected - opening prompt selector...');
        
        // Show the merge prompt selector
        setMergePromptState({
          isVisible: true,
          sourceNode: sourceConv,
          targetNode: targetConv
        });
        
      } else {
        // Not a branch merge, proceed normally
        console.log('✅ Regular merge (no prompt selection needed)');
        onMergeNodesRef.current && onMergeNodesRef.current(sourceNodeId, targetNodeId);
      }
      
    } catch (error) {
      console.error('❌ Merge initialization failed:', error);
      alert(`Merge failed: ${error.message}`);
    }
  }, [graphModel, promptsModel, onMergeNodesRef]);

  // Helper function to execute AI merge call
  const executeAIMergeCall = useCallback(async (selectedPrompt, branchThread, branchContext, sourceNode, targetNode) => {
    try {
      const fullPrompt = `${selectedPrompt.content}\n\nBranch conversation to analyze:\n\n${branchContext}`;
      
      Logger.debug('SENDING TO CLAUDE API', {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        inputLength: fullPrompt.length
      });
      
      // Record timing
      const startTime = performance.now();
      
      console.log('⏱️ Making API call...');
      
      const summaryResponse = await claudeAPI.sendMessage([], fullPrompt, { 
        model: 'claude-sonnet-4-20250514', 
        temperature: 0.7 
      });
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      Logger.debug('RECEIVED FROM CLAUDE API', {
        duration: `${duration}ms`,
        responseLength: summaryResponse.content.length
      });
      
      Logger.success('Merge summary generated successfully');
      
      onMergeNodesRef.current && onMergeNodesRef.current(sourceNode.id, targetNode.id, {
        summary: summaryResponse.content,
        summaryType: selectedPrompt.id === 'khaos-squeezer' ? 'integration' : 'deep-focus',
        branchThread: branchThread,
        mergePrompt: selectedPrompt.name
      });
      
      console.log('✅ MERGE COMPLETED SUCCESSFULLY!');
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ API CALL FAILED:');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check if it's a network error
      if (error.message.includes('fetch')) {
        console.error('🌐 Network connectivity issue detected');
      }
      
      // Check if it's an API limit error
      if (error.message.includes('token') || error.message.includes('limit')) {
        console.error('📏 Token/size limit issue detected');
      }
      
      console.groupEnd();
      throw error;
    }
  }, [onMergeNodesRef]);

  // Size analysis helper for diagnosing large content issues
  const analyzeMergeSize = useCallback((branchThread, selectedPrompt) => {
    const branchContext = branchThread.map(conv => 
      `**${conv.displayNumber}**\nUser: ${conv.prompt}\nAssistant: ${conv.response}\n`
    ).join('\n---\n');
    
    const fullPrompt = `${selectedPrompt.content}\n\nBranch conversation to analyze:\n\n${branchContext}`;
    
    const analysis = {
      branchConversations: branchThread.length,
      branchContextChars: branchContext.length,
      promptChars: selectedPrompt.content.length,
      fullPromptChars: fullPrompt.length,
      estimatedTokens: Math.ceil(fullPrompt.length / 4),
      isLarge: fullPrompt.length > 50000,
      isVeryLarge: fullPrompt.length > 100000,
      maxCharsSafe: 100000,
      percentOfMax: Math.round((fullPrompt.length / 100000) * 100)
    };
    
    console.table(analysis);
    
    if (analysis.isVeryLarge) {
      console.warn('⚠️ Request may be too large for API limits');
    } else if (analysis.isLarge) {
      console.info('ℹ️ Request is large but should be within limits');
    } else {
      console.log('✅ Request size is reasonable');
    }
    
    return analysis;
  }, []);

  // Handle merge prompt selection
  const handleMergePromptSelect = useCallback(async (selectedPrompt, sourceNode, targetNode) => {
    try {
      Logger.debug('MERGE OPERATION INITIATED', {
        source: sourceNode.displayNumber,
        target: targetNode.displayNumber, 
        prompt: selectedPrompt.name
      });
      
      // Close the prompt selector
      setMergePromptState({ isVisible: false, sourceNode: null, targetNode: null });
      
      // Check GraphModel state first
      if (!graphModel) {
        Logger.error('graphModel is null/undefined');
        throw new Error('GraphModel not available');
      }
      
      const branchThread = graphModel.getBranchThread(sourceNode.displayNumber);
      
      Logger.debug('Branch data analysis', {
        branch: sourceNode.displayNumber,
        conversations: branchThread?.length || 0
      });
      
      // Defensive programming for branchThread
      if (!branchThread) {
        Logger.error('branchThread is null/undefined');
        throw new Error('Branch thread not found for summarization');
      }
      
      if (!Array.isArray(branchThread)) {
        Logger.error('branchThread is not an array', {
          type: typeof branchThread,
          constructor: branchThread?.constructor?.name
        });
        
        Logger.debug('Attempting data recovery...');
        let recoveredThread = null;
        
        // Try common object-to-array conversions
        if (branchThread.conversations && Array.isArray(branchThread.conversations)) {
          recoveredThread = branchThread.conversations;
          console.log('✅ Recovered from .conversations property');
        }
        else if (branchThread.values && typeof branchThread.values === 'function') {
          recoveredThread = Array.from(branchThread.values());
          console.log('✅ Recovered using .values() method');
        }
        else if (typeof branchThread === 'object' && branchThread !== null) {
          recoveredThread = Object.values(branchThread);
          console.log('✅ Recovered using Object.values()');
        }
        
        if (recoveredThread && Array.isArray(recoveredThread)) {
          console.log('🔧 Using recovered thread:', recoveredThread);
          
          if (recoveredThread.length === 0) {
            throw new Error('Branch thread is empty after recovery');
          }
          
          // Format the branch conversation for the AI prompt
          const branchContext = recoveredThread.map(conv => 
            `${conv.displayNumber}> ${conv.prompt}\n${conv.response}`
          ).join('\n\n---\n\n');
          
          console.log('Step 6 - Formatted context preview:', branchContext.substring(0, 200) + '...');
          console.groupEnd();
          
          // Continue with the AI call using recovered data
          return await executeAIMergeCall(selectedPrompt, recoveredThread, branchContext, sourceNode, targetNode);
        } else {
          console.error('❌ Cannot recover branchThread data');
          throw new Error('branchThread is not an array and cannot be converted');
        }
      }
      
      if (branchThread.length === 0) {
        console.error('🚨 branchThread is empty array');
        throw new Error('Branch thread is empty');
      }
      
      // Build the context string with visibility
      const branchContext = branchThread.map(conv => 
        `**${conv.displayNumber}**\nUser: ${conv.prompt}\nAssistant: ${conv.response}\n`
      ).join('\n---\n');
      
      console.log('\n📝 CONTEXT STRING ANALYSIS:');
      console.log(`Total context length: ${branchContext.length} characters`);
      console.log(`Estimated tokens: ~${Math.ceil(branchContext.length / 4)}`);
      
      // Show the selected prompt
      console.log('\n🎭 SELECTED MERGE PROMPT:');
      console.log(`Prompt name: ${selectedPrompt.name}`);
      console.log(`Prompt content (${selectedPrompt.content.length} chars):`);
      console.log(selectedPrompt.content);
      
      // Build the final API input
      const fullPrompt = `${selectedPrompt.content}\n\nBranch conversation to analyze:\n\n${branchContext}`;
      
      console.log('\n🚀 FINAL API INPUT:');
      console.log(`Total input length: ${fullPrompt.length} characters`);
      console.log(`Estimated total tokens: ~${Math.ceil(fullPrompt.length / 4)}`);
      console.log('Full prompt:');
      console.log(fullPrompt);
      
      // Run size analysis
      console.log('\n📏 SIZE ANALYSIS:');
      analyzeMergeSize(branchThread, selectedPrompt);
      
      console.groupEnd();
      
      // Continue with the AI call
      await executeAIMergeCall(selectedPrompt, branchThread, branchContext, sourceNode, targetNode);
      
    } catch (error) {
      console.error('❌ Merge execution failed:', error);
      alert(`Merge failed: ${error.message}`);
      // Reset state on error
      setMergePromptState({ isVisible: false, sourceNode: null, targetNode: null });
    }
  }, [graphModel, onMergeNodesRef]);

  // Handle merge prompt cancellation
  const handleMergePromptCancel = useCallback(() => {
    console.log('🚫 Merge cancelled by user');
    setMergePromptState({ isVisible: false, sourceNode: null, targetNode: null });
  }, []);

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

    // Enhanced drag-to-merge functionality with visual feedback
    let dragSourceNode = null;
    let validDropTarget = null;
    let temporaryMergeEdge = null;

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

    // During drag - detect hover over valid targets and show merge edges
    cyInstance.on('drag', 'node', (event) => {
      if (!dragSourceNode || !graphModel) return;
      
      const draggedNode = event.target;
      const position = draggedNode.position();
      
      // Clear previous hover states and temporary merge edge
      cyInstance.nodes('.merge-target-hover').removeClass('merge-target-hover');
      if (temporaryMergeEdge) {
        cyInstance.remove(temporaryMergeEdge);
        temporaryMergeEdge = null;
      }
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
          
          // Add temporary merge edge visualization
          const mergeEdgeElement = {
            data: {
              id: `temp-merge-${dragSourceNode}-${validDropTarget}`,
              source: dragSourceNode,
              target: validDropTarget
            },
            classes: 'temporary-merge-edge'
          };
          
          temporaryMergeEdge = cyInstance.add(mergeEdgeElement);
          console.log('🔗 Added temporary merge edge');
        }
      });
    });

    // End drag - perform merge if over valid target
    cyInstance.on('free', 'node', (event) => {
      console.log('🏁 Drag ended. Source:', dragSourceNode, 'Target:', validDropTarget);
      
      if (dragSourceNode && validDropTarget) {
        console.log('🔀 Attempting merge:', dragSourceNode, '→', validDropTarget);
        
        // Handle merge with optional summarization
        handleMergeWithSummarization(dragSourceNode, validDropTarget);
      } else if (dragSourceNode) {
        console.log('❌ No valid drop target found - triggering snap-back');
        
        // Snap-back behavior: Use layout re-run instead of position tracking
        const snapBackLayout = cyInstance.layout({
          name: 'dagre',
          rankDir: 'TB',
          spacingFactor: 1.5,
          nodeSep: 80,
          rankSep: 120,
          animate: true,
          animationDuration: 500
        });
        snapBackLayout.run();
        console.log('🔄 Snap-back layout triggered');
      }
      
      // Clean up all visual states
      cyInstance.nodes().removeClass('dragging-source valid-merge-target merge-target-hover');
      if (temporaryMergeEdge) {
        cyInstance.remove(temporaryMergeEdge);
        temporaryMergeEdge = null;
        console.log('🔗 Removed temporary merge edge');
      }
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

      {/* Merge Prompt Selector */}
      <MergePromptSelector
        sourceNode={mergePromptState.sourceNode}
        targetNode={mergePromptState.targetNode}
        onSelect={handleMergePromptSelect}
        onCancel={handleMergePromptCancel}
        isVisible={mergePromptState.isVisible}
        promptsModel={promptsModel}
      />
    </div>
  );
}