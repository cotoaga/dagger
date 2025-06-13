# DAGGER Redesign - Chunk 4: GRAPH VIEW RESURRECTION 🔥

## KHAOS Mode: GRAPH RESURRECTION 😈

**Time to connect the clean data model to the graph visualization and MAKE IT WORK.**

## Task: Update GraphView.jsx for Clean Data Model

### 1. **REPLACE GraphView.jsx completely**

Nuke the existing `src/components/GraphView.jsx` and replace with:

```javascript
import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

// Register dagre layout
cytoscape.use(dagre);

/**
 * GraphView v2.0 - Works with clean conversation model
 * One conversation = one node with prompt + response
 */
export function GraphView({ conversations, currentConversationId, onConversationSelect, theme }) {
  const containerRef = useRef(null);
  const [cy, setCy] = useState(null);

  // Transform clean conversations to Cytoscape elements
  const createGraphElements = (conversations) => {
    if (!conversations || conversations.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Create nodes from conversations
    const nodes = conversations.map(conv => ({
      data: {
        id: conv.id,
        label: String(conv.displayNumber),
        displayNumber: conv.displayNumber,
        prompt: truncateText(conv.prompt, 80),
        response: truncateText(conv.response, 120),
        timestamp: formatTimestamp(conv.timestamp),
        processingTime: conv.processingTime,
        tokenCount: conv.tokenCount,
        status: conv.status,
        model: conv.model
      },
      classes: getNodeClasses(conv, currentConversationId)
    }));

    // Create edges (sequential flow for now)
    const edges = [];
    for (let i = 0; i < conversations.length - 1; i++) {
      edges.push({
        data: {
          id: `edge-${conversations[i].id}-${conversations[i + 1].id}`,
          source: conversations[i].id,
          target: conversations[i + 1].id
        },
        classes: 'main-thread-edge'
      });
    }

    return { nodes, edges };
  };

  // Helper functions
  const truncateText = (text, maxLength) => {
    if (!text) return 'Empty';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
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
    autoungrabify: true
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
        <h3>Knowledge Map</h3>
        <span className="conversation-count">
          {conversations?.length || 0} conversations
        </span>
      </div>
      <div 
        ref={containerRef} 
        className="graph-container"
        style={{ 
          width: '100%', 
          height: 'calc(100% - 60px)',
          background: '#1a202c',
          border: '1px solid #4a5568',
          borderRadius: '8px'
        }}
      />
    </div>
  );
}
```

### 2. **Update App.jsx Graph Integration**

Add graph view support to `App.jsx`:

```javascript
// In App.jsx imports:
import { GraphView } from './components/GraphView.jsx';

// In App.jsx state (add to existing):
const [currentView, setCurrentView] = useState('linear'); // 'linear' | 'graph'

// Add view toggle handler:
const handleViewChange = (view) => {
  setCurrentView(view);
  console.log(`🔄 Switched to ${view} view`);
};

// Add conversation selection handler:
const handleConversationSelect = (conversationId) => {
  setCurrentConversationId(conversationId);
  const conversation = graphModel.getConversation(conversationId);
  console.log(`📍 Selected conversation ${conversation?.displayNumber}: ${conversation?.prompt}`);
};

// Update header with view toggle:
<header className="app-header">
  <h1>🗡️ DAGGER</h1>
  <p>Knowledge Cartography Tool</p>
  
  {/* View Toggle */}
  <div className="view-toggle">
    <button 
      className={currentView === 'linear' ? 'active' : ''}
      onClick={() => handleViewChange('linear')}
    >
      📝 Linear
    </button>
    <button 
      className={currentView === 'graph' ? 'active' : ''}
      onClick={() => handleViewChange('graph')}
    >
      🗺️ Graph
    </button>
  </div>

  {/* Existing buttons */}
  <div className="header-actions">
    <button onClick={handleExport}>📤 Export Clean</button>
    <button onClick={handleReset} style={{color: 'red'}}>🔥 Reset All</button>
  </div>
</header>

// Update main content with conditional rendering:
<main className="app-main">
  {currentView === 'linear' ? (
    <div className="linear-view">
      {/* Existing linear conversation display */}
      {conversations.map(conv => (
        <div key={conv.id} className="conversation-item">
          {/* Your existing conversation display */}
        </div>
      ))}
      
      {/* Input area */}
      <div className="input-area">
        {/* Your existing input component */}
      </div>
    </div>
  ) : (
    <GraphView 
      conversations={conversations}
      currentConversationId={currentConversationId}
      onConversationSelect={handleConversationSelect}
      theme="dark"
    />
  )}
</main>
```

### 3. **Add CSS for View Toggle**

Add to `App.css`:

```css
/* View Toggle Styles */
.view-toggle {
  display: flex;
  background: #2d3748;
  border-radius: 6px;
  padding: 4px;
  margin: 0 16px;
}

.view-toggle button {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #a0aec0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.view-toggle button.active {
  background: #4299e1;
  color: white;
}

.view-toggle button:hover:not(.active) {
  background: #4a5568;
  color: #e2e8f0;
}

/* Graph View Styles */
.graph-view {
  width: 100%;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: #1a202c;
  border-radius: 8px;
  overflow: hidden;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #2d3748;
  border-bottom: 1px solid #4a5568;
  color: #e2e8f0;
}

.graph-header h3 {
  margin: 0;
  font-size: 18px;
}

.conversation-count {
  font-size: 14px;
  color: #a0aec0;
}

.graph-container {
  flex: 1;
  position: relative;
}

/* Header Layout */
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: #2d3748;
  border-bottom: 1px solid #4a5568;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
```

### 4. **Test the Integration**

After implementing:

1. **Test Linear View**: Should work as before
2. **Test Graph View**: Click graph button, should show nodes 1, 2, 3...
3. **Test Node Selection**: Click nodes in graph, should log conversation details
4. **Test View Toggle**: Should smoothly switch between linear and graph
5. **Test with New Conversations**: Add conversations, both views should update

## Success Criteria

✅ **Graph button works** - switches to graph visualization  
✅ **Nodes display correctly** - shows 1, 2, 3, 4 with clean labels  
✅ **Node selection works** - clicking nodes logs conversation details  
✅ **View toggle smooth** - seamless switching between linear/graph  
✅ **Real-time updates** - new conversations appear in both views  

## Expected Results

**Linear View:** Clean conversation list (working already)  
**Graph View:** Beautiful DAG with numbered nodes, hover tooltips, click navigation  
**View Toggle:** Instant switching between perspectives  

**This connects the clean data model to visual graph navigation - the core DAGGER experience!** 🗡️

**Fire when ready!**