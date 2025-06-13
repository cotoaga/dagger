# DAGGER Graph View Implementation - Claude Code Instructions 🗡️

## Project Context
DAGGER is a knowledge cartography tool that liberates human-AI collaboration from linear conversation constraints. The linear MVP is complete and production-ready. **Next phase: Add graph visualization to transform conversations into navigable knowledge maps.**

## Current State Assessment
- **React 19.1.0** + **Vite 6.3.5** with clean MVC architecture
- **GraphModel.js** with UUID-based node management (ready for graph relationships)
- **Cytoscape 3.32.0** installed but not integrated
- **25/25 tests passing** with comprehensive coverage
- **Professional dark theme UI** with linear conversation interface
- **Claude API integration** working with token counting and persistence

## Implementation Objective
Add a **Graph View** that combines prompt + response into unified nodes displaying metadata, creating a directed acyclic graph (DAG) of conversation flow. Initially shows single main branch, ready for future branching features.

## Technical Requirements

### Phase 1: Graph View Component
Create `src/components/GraphView.jsx` that:
1. **Integrates Cytoscape.js** for DAG visualization
2. **Combines prompt + response** into single node representation
3. **Displays rich metadata**: word count, timestamp, processing time, token count
4. **Provides interactive navigation**: click nodes to jump to conversation points
5. **Maintains visual consistency** with existing dark theme

### Component Architecture
```
src/components/
├── GraphView.jsx          # NEW: Cytoscape graph visualization
├── DaggerInput.jsx        # EXISTING: Input component  
├── DaggerOutput.jsx       # EXISTING: Output component
└── ViewToggle.jsx         # NEW: Linear/Graph view switcher
```

### GraphView.jsx Specifications

#### Props Interface
```javascript
// Props from App.jsx
{
  conversations: Array,      // Array of conversation objects from GraphModel
  currentNodeId: string,     // Currently selected node ID
  onNodeSelect: function,    // Callback when user clicks node
  theme: string             // 'dark' | 'light' for styling
}
```

#### Node Data Structure
Transform each conversation into Cytoscape node:
```javascript
{
  data: {
    id: conversation.id,                    // UUID from GraphModel
    label: truncatedPrompt,                 // First 50 chars of prompt
    prompt: conversation.prompt,            // Full prompt text
    response: conversation.response,        // Full response text
    wordCount: calculateWords(prompt + response),
    timestamp: conversation.timestamp,
    processingTime: conversation.processingTime,
    tokenCount: conversation.tokenCount,
    nodeType: 'conversation'               // For future node types
  },
  classes: currentNodeId === id ? 'selected' : 'default'
}
```

#### Edge Data Structure
Connect sequential conversations:
```javascript
{
  data: {
    id: `${parentId}-${childId}`,
    source: parentId,
    target: childId,
    edgeType: 'main_thread'               // For future branch types
  }
}
```

#### Cytoscape Configuration
```javascript
const cytoscapeConfig = {
  container: containerRef.current,
  elements: [...nodes, ...edges],
  
  style: [
    {
      selector: 'node',
      style: {
        'background-color': '#2d3748',      // Dark theme node
        'border-color': '#4a5568',
        'border-width': 2,
        'color': '#e2e8f0',                 // Light text
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': '120px',
        'height': '80px',
        'shape': 'round-rectangle'
      }
    },
    {
      selector: 'node.selected',
      style: {
        'border-color': '#63b3ed',          // Blue highlight
        'border-width': 3
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#4a5568',
        'target-arrow-color': '#4a5568',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ],
  
  layout: {
    name: 'dagre',                          // Hierarchical layout
    rankDir: 'TB',                          // Top to bottom
    spacingFactor: 1.5,
    nodeSep: 100,
    rankSep: 120
  },
  
  userZoomingEnabled: true,
  userPanningEnabled: true,
  boxSelectionEnabled: false
};
```

#### Event Handlers
```javascript
// Node click navigation
cy.on('tap', 'node', (event) => {
  const nodeId = event.target.data('id');
  onNodeSelect(nodeId);
});

// Auto-fit on mount and data change
useEffect(() => {
  if (cy) {
    cy.fit();
    cy.center();
  }
}, [conversations]);
```

### ViewToggle.jsx Specifications
Simple toggle component:
```javascript
function ViewToggle({ currentView, onViewChange }) {
  return (
    <div className="view-toggle">
      <button 
        className={currentView === 'linear' ? 'active' : ''}
        onClick={() => onViewChange('linear')}
      >
        Linear
      </button>
      <button 
        className={currentView === 'graph' ? 'active' : ''}
        onClick={() => onViewChange('graph')}
      >
        Graph
      </button>
    </div>
  );
}
```

### App.jsx Integration
Add view state and conditional rendering:
```javascript
// Add state
const [currentView, setCurrentView] = useState('linear'); // Default to linear

// Add view toggle to header
<header>
  {/* existing header content */}
  <ViewToggle 
    currentView={currentView} 
    onViewChange={setCurrentView} 
  />
</header>

// Conditional main content rendering
<main>
  {currentView === 'linear' ? (
    // Existing linear conversation interface
    <div className="linear-view">
      {/* existing conversation display */}
    </div>
  ) : (
    // New graph visualization
    <GraphView 
      conversations={graphModel.getAllNodes()}
      currentNodeId={currentNodeId}
      onNodeSelect={setCurrentNodeId}
      theme={theme}
    />
  )}
</main>
```

## Implementation Steps

### Step 1: Create GraphView Component
```bash
# Create the component file
touch src/components/GraphView.jsx

# Install cytoscape-dagre for layout (if not installed)
npm install cytoscape-dagre
```

### Step 2: Basic Component Structure
- Import Cytoscape and useRef/useEffect
- Create container ref and effect for Cytoscape initialization
- Basic render with container div

### Step 3: Data Transformation
- Function to convert conversations array to Cytoscape elements
- Node creation with metadata display
- Edge creation for sequential connections

### Step 4: Styling Integration
- Cytoscape styles that match dark theme
- CSS classes for the graph container
- Responsive sizing

### Step 5: Interactive Features
- Node click navigation
- Auto-fit and centering
- View state persistence in localStorage

### Step 6: ViewToggle Component
- Simple toggle button component
- Integration with App.jsx state
- Styling to match existing UI

### Step 7: Testing
Create test files:
- `__tests__/GraphView.test.jsx`
- `__tests__/ViewToggle.test.jsx`
- Test node rendering, click events, view switching

## CSS Styling Requirements

### GraphView Container
```css
.graph-view {
  width: 100%;
  height: calc(100vh - 200px);  /* Account for header/footer */
  background-color: #1a202c;    /* Dark theme background */
  border: 1px solid #4a5568;
  border-radius: 8px;
  position: relative;
}

.graph-container {
  width: 100%;
  height: 100%;
}
```

### ViewToggle Styling
```css
.view-toggle {
  display: flex;
  background-color: #2d3748;
  border-radius: 6px;
  padding: 4px;
}

.view-toggle button {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #a0aec0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle button.active {
  background-color: #4299e1;
  color: white;
}
```

## Testing Strategy

### Unit Tests
```javascript
// GraphView.test.jsx
describe('GraphView', () => {
  test('renders empty graph container', () => {
    render(<GraphView conversations={[]} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  test('displays single conversation node', () => {
    const conversations = [mockConversation];
    render(<GraphView conversations={conversations} />);
    // Test node appears in graph
  });

  test('handles node click navigation', () => {
    const onNodeSelect = jest.fn();
    render(<GraphView onNodeSelect={onNodeSelect} />);
    // Simulate node click, verify callback
  });
});
```

### Integration Tests
- Test view switching preserves conversation state
- Test graph navigation updates linear view position
- Test persistence of view preference

## Success Criteria
1. **Graph renders conversations** as connected nodes with metadata
2. **Node clicks navigate** to correct conversation point in linear view
3. **View toggle** seamlessly switches between linear and graph modes
4. **Visual consistency** with existing dark theme
5. **Responsive design** works on different screen sizes
6. **Performance** handles 50+ conversation nodes smoothly

## Future Extension Points
- **Branch visualization**: Multiple conversation threads
- **Node types**: Different shapes for different content types
- **Search integration**: Highlight nodes matching search terms
- **Export functionality**: Save graph as image/data
- **Collaborative features**: Multi-user conversation mapping

## Development Notes
- **Preserve existing functionality**: Linear view must remain fully functional
- **Use existing GraphModel**: Don't modify core data structures yet
- **Follow existing patterns**: Match component structure and naming conventions
- **Maintain test coverage**: Add tests for new components
- **Dark theme consistency**: Match existing color scheme exactly

## Files to Create/Modify
```
src/components/GraphView.jsx           # NEW: Main graph component
src/components/ViewToggle.jsx          # NEW: View switching component
src/App.jsx                           # MODIFY: Add view state and conditional rendering
src/App.css                          # MODIFY: Add graph view styles
__tests__/GraphView.test.jsx          # NEW: Graph component tests
__tests__/ViewToggle.test.jsx         # NEW: Toggle component tests
```

---

**Ready for Claude Code implementation. This creates the foundation for DAGGER's core differentiator: navigable knowledge cartography.** 🗡️