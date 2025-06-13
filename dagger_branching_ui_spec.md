# DAGGER Branching UI Implementation - Complete Specification 🗡️

## Executive Summary
Implement the distributed cognition branching system with KHAOS-Summary buddies, hierarchical node numbering, and topologically-correct merge-back functionality. This transforms DAGGER from linear conversation tool to **Mentat-level thinking interface**.

## Architecture Overview

### Core Components to Implement
```
src/components/
├── BranchMenu.jsx           # NEW: Branch creation interface
├── MergeMenu.jsx            # NEW: Merge-back selection interface  
├── NodeLabeler.jsx          # NEW: Hierarchical numbering system
├── SummaryGenerator.jsx     # NEW: KHAOS-Brief/Detail integration
└── GraphView.jsx            # MODIFY: Enhanced with branching support
```

### Data Model Extensions
```javascript
// Enhanced ConversationNode
{
  id: "2.1",                    // Hierarchical ID
  parentId: "2",                // Parent node reference
  depth: 1,                     // Branch depth (0=main, 1=first level, etc)
  branchType: 'knowledge',      // 'virgin' | 'personality' | 'knowledge'
  branchIndex: 1,               // Sibling order (2.1, 2.2, 2.3...)
  
  content: {
    prompt: string,
    response: string,
    timestamp: number,
    processingTime: number,
    tokenCount: number
  },
  
  context: {
    inheritedSummary: string,   // From KHAOS-Brief/Detail
    summaryType: 'brief' | 'detailed' | null
  },
  
  mergeOptions: string[],       // Valid forward merge targets
  mergedFrom: string[],         // Branches that merged into this node
  
  status: 'active' | 'merged' | 'abandoned'
}
```

## UI Component Specifications

### 1. BranchMenu.jsx - Branch Creation Interface

#### Trigger Mechanism
```jsx
// Add to each node in GraphView
<div className="node-actions" onMouseEnter={showBranchMenu}>
  <button className="branch-btn">⑃</button>  {/* Branch icon */}
</div>
```

#### Branch Menu Modal
```jsx
function BranchMenu({ sourceNodeId, onBranchCreate, onClose }) {
  const [branchType, setBranchType] = useState('knowledge');
  const [summaryType, setSummaryType] = useState('brief');
  
  return (
    <div className="branch-modal">
      <h3>Create Branch from Node {sourceNodeId}</h3>
      
      {/* Branch Type Selection */}
      <div className="branch-type-selector">
        <label>
          <input type="radio" value="virgin" onChange={e => setBranchType(e.target.value)} />
          <div className="option-card">
            <strong>🌱 Virgin Chat</strong>
            <p>Fresh start, no context inheritance</p>
          </div>
        </label>
        
        <label>
          <input type="radio" value="personality" onChange={e => setBranchType(e.target.value)} />
          <div className="option-card">
            <strong>🎭 Personality Only</strong>
            <p>KHAOS-Coder loaded, no conversation history</p>
          </div>
        </label>
        
        <label>
          <input type="radio" value="knowledge" checked={branchType === 'knowledge'} onChange={e => setBranchType(e.target.value)} />
          <div className="option-card">
            <strong>🧠 Knowledge Inherited</strong>
            <p>Full context with summarized exploration history</p>
          </div>
        </label>
      </div>
      
      {/* Summary Type (only for knowledge branches) */}
      {branchType === 'knowledge' && (
        <div className="summary-type-selector">
          <label>
            <input type="radio" value="brief" checked={summaryType === 'brief'} onChange={e => setSummaryType(e.target.value)} />
            <span>📝 Brief Summary (KHAOS-Brief)</span>
          </label>
          <label>
            <input type="radio" value="detailed" onChange={e => setSummaryType(e.target.value)} />
            <span>📖 Detailed Briefing (KHAOS-Detail)</span>
          </label>
        </div>
      )}
      
      {/* Preview */}
      <div className="branch-preview">
        <strong>New node will be: {calculateNewNodeId(sourceNodeId)}</strong>
        <p>{getBranchDescription(branchType, summaryType)}</p>
      </div>
      
      <div className="modal-actions">
        <button onClick={() => onBranchCreate(branchType, summaryType)}>
          Create Branch
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

### 2. MergeMenu.jsx - Merge-Back Interface

#### Trigger from Branch Endpoints
```jsx
// Show merge option on branch leaf nodes
{isLeafNode && (
  <button className="merge-btn" onClick={showMergeMenu}>
    ⤴ Merge Back
  </button>
)}
```

#### Merge Target Selection
```jsx
function MergeMenu({ branchNodeId, availableTargets, onMergeBack, onClose }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [summaryType, setSummaryType] = useState('brief');
  
  return (
    <div className="merge-modal">
      <h3>Merge Branch {branchNodeId} Back to Main Thread</h3>
      
      {/* Valid Merge Targets */}
      <div className="merge-targets">
        <h4>Select Merge Destination:</h4>
        {availableTargets.map(target => (
          <label key={target.id}>
            <input 
              type="radio" 
              value={target.id} 
              onChange={e => setSelectedTarget(e.target.value)} 
            />
            <div className="target-option">
              <strong>Node {target.id}</strong>
              <p>{target.preview}</p>
              <small>Valid merge: {target.mergeReason}</small>
            </div>
          </label>
        ))}
      </div>
      
      {/* Summary Type Selection */}
      <div className="summary-type-selector">
        <h4>Integration Summary:</h4>
        <label>
          <input type="radio" value="brief" checked={summaryType === 'brief'} onChange={e => setSummaryType(e.target.value)} />
          <span>📝 Brief Integration (Key insights only)</span>
        </label>
        <label>
          <input type="radio" value="detailed" onChange={e => setSummaryType(e.target.value)} />
          <span>📖 Detailed Integration (Comprehensive findings)</span>
        </label>
      </div>
      
      {/* Merge Preview */}
      <div className="merge-preview">
        <strong>Branch Summary Preview:</strong>
        <div className="summary-preview">
          {generateMergePreview(branchNodeId, summaryType)}
        </div>
      </div>
      
      <div className="modal-actions">
        <button 
          onClick={() => onMergeBack(selectedTarget, summaryType)}
          disabled={!selectedTarget}
        >
          Merge Branch
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

### 3. NodeLabeler.jsx - Hierarchical Numbering System

#### ID Generation Logic
```jsx
function NodeLabeler() {
  const generateNodeId = (parentId, existingSiblings) => {
    if (!parentId) {
      // Main thread nodes: 1, 2, 3, 4, 5...
      const maxMainNode = Math.max(...getMainThreadNodes().map(n => parseInt(n.id)));
      return String(maxMainNode + 1);
    }
    
    // Branch nodes: 2.1, 2.2, 3.1, 4.2.1, etc.
    const siblingCount = existingSiblings.length;
    return `${parentId}.${siblingCount + 1}`;
  };
  
  const calculateMergeTargets = (branchNodeId) => {
    const [mainNode, ...branches] = branchNodeId.split('.');
    const branchDepth = branches.length;
    
    // Valid targets: forward on same level or parent levels
    const targets = [];
    
    // 1. Sibling branches at same depth
    const siblingBranches = getSiblingBranches(branchNodeId);
    targets.push(...siblingBranches.filter(s => s.id > branchNodeId));
    
    // 2. Parent level continuations  
    const parentContinuations = getParentContinuations(mainNode, branchDepth);
    targets.push(...parentContinuations);
    
    // 3. Main thread forward progression
    const mainThreadTargets = getMainThreadNodes().filter(n => parseInt(n.id) > parseInt(mainNode));
    targets.push(...mainThreadTargets);
    
    return targets.map(t => ({
      id: t.id,
      preview: truncate(t.content.prompt, 100),
      mergeReason: calculateMergeReason(branchNodeId, t.id)
    }));
  };
  
  return { generateNodeId, calculateMergeTargets };
}
```

### 4. SummaryGenerator.jsx - KHAOS Buddy Integration

#### KHAOS-Brief Prompt Template
```jsx
const KHAOS_BRIEF_PROMPT = `
# KHAOS-Brief v1.0 - Distill Essential Insights

You are KHAOS-Brief, specialized in extracting the essential discoveries from conversation explorations.

## Your Task
Analyze the conversation thread below and create a concise summary (200-300 tokens) that captures:
1. **Key insights discovered**
2. **Important decisions or conclusions reached**  
3. **Critical context needed for continuation**
4. **Actionable knowledge gained**

## Conversation Thread to Summarize:
{conversationThread}

## Output Format
**Essential Insights from Exploration:**
[Your concise summary here - focus on what someone continuing the main conversation needs to know]

Remember: You're preparing context for the main conversation thread. Include only what's truly valuable to carry forward.
`;

const KHAOS_DETAIL_PROMPT = `
# KHAOS-Detail v1.0 - Comprehensive Briefing

You are KHAOS-Detail, specialized in creating thorough briefings from conversation explorations.

## Your Task  
Analyze the conversation thread below and create a comprehensive briefing (800-1000 tokens) that includes:
1. **Complete exploration journey** - how the conversation evolved
2. **All significant insights and discoveries**
3. **Alternative approaches or solutions identified**
4. **Technical details and specifications discovered**
5. **Lessons learned and implications**
6. **Recommendations for next steps**

## Conversation Thread to Analyze:
{conversationThread}

## Output Format
**Comprehensive Briefing from Branch Exploration:**

**Journey Overview:** [How the exploration progressed]

**Key Discoveries:** [Major insights and findings]

**Technical Details:** [Specific implementations, solutions, or approaches]

**Implications:** [What this means for the broader context]

**Recommendations:** [Suggested next steps or applications]

Remember: This briefing will inform continued exploration. Be thorough but organized.
`;
```

#### Summary Generation Component
```jsx
function SummaryGenerator({ conversationThread, summaryType, onComplete }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState('');
  
  const generateSummary = async () => {
    setIsGenerating(true);
    
    const prompt = summaryType === 'brief' ? KHAOS_BRIEF_PROMPT : KHAOS_DETAIL_PROMPT;
    const threadText = conversationThread.map(node => 
      `**${node.id}:** ${node.content.prompt}\n**Response:** ${node.content.response}\n`
    ).join('\n---\n');
    
    const fullPrompt = prompt.replace('{conversationThread}', threadText);
    
    try {
      const response = await ClaudeAPI.generateResponse(fullPrompt);
      setSummary(response.content);
      onComplete(response.content);
    } catch (error) {
      console.error('Summary generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  useEffect(() => {
    generateSummary();
  }, [conversationThread, summaryType]);
  
  return (
    <div className="summary-generator">
      {isGenerating ? (
        <div className="generating">
          <span className="spinner">⟳</span>
          Generating {summaryType} summary...
        </div>
      ) : (
        <div className="summary-result">
          <h4>Generated Summary ({summaryType}):</h4>
          <div className="summary-content">{summary}</div>
        </div>
      )}
    </div>
  );
}
```

### 5. Enhanced GraphView.jsx - Branching Visualization

#### Node Shape and Color System
```jsx
const getNodeStyle = (node) => {
  const baseStyle = {
    'background-color': getNodeColor(node),
    'border-color': getBorderColor(node),
    'border-width': node.status === 'active' ? 3 : 2,
    'shape': getNodeShape(node),
    'width': getNodeWidth(node),
    'height': getNodeHeight(node)
  };
  
  return baseStyle;
};

const getNodeColor = (node) => {
  if (node.depth === 0) return '#2d3748';      // Main thread: dark gray
  if (node.branchType === 'virgin') return '#553c9a';     // Virgin: purple
  if (node.branchType === 'personality') return '#2b6cb0'; // Personality: blue  
  if (node.branchType === 'knowledge') return '#2f855a';   // Knowledge: green
  return '#2d3748';
};

const getNodeShape = (node) => {
  if (node.depth === 0) return 'round-rectangle';   // Main thread
  if (node.status === 'merged') return 'diamond';   // Merged branches
  return 'round-rectangle';                          // Active branches
};
```

#### Enhanced Layout Algorithm
```jsx
const cytoscapeConfig = {
  // ... existing config
  
  layout: {
    name: 'dagre',
    rankDir: 'TB',           // Top to bottom
    ranker: 'tight-tree',    // Minimize edge crossings
    nodeSep: 80,             // Horizontal spacing between nodes
    edgeSep: 20,             // Spacing between edges
    rankSep: 100,            // Vertical spacing between levels
    
    // Custom positioning for branches
    ready: function() {
      this.nodes().forEach(node => {
        const nodeData = node.data();
        if (nodeData.depth > 0) {
          // Offset branch nodes horizontally based on depth
          const pos = node.position();
          pos.x += (nodeData.depth * 150) + (nodeData.branchIndex * 100);
          node.position(pos);
        }
      });
    }
  }
};
```

#### Merge Connection Visualization
```jsx
// Add merge-back edges with special styling
const getMergeEdges = (nodes) => {
  return nodes
    .filter(node => node.mergedFrom && node.mergedFrom.length > 0)
    .flatMap(node => 
      node.mergedFrom.map(sourceId => ({
        data: {
          id: `merge-${sourceId}-${node.id}`,
          source: sourceId,
          target: node.id,
          edgeType: 'merge'
        },
        classes: 'merge-edge'
      }))
    );
};

// Special styling for merge edges
{
  selector: 'edge.merge-edge',
  style: {
    'line-color': '#f6ad55',           // Orange for merge connections
    'target-arrow-color': '#f6ad55',
    'line-style': 'dotted',
    'width': 3,
    'curve-style': 'bezier'
  }
}
```

## Integration Workflow

### Branch Creation Flow
```
1. User hovers over node → Branch button appears
2. User clicks branch button → BranchMenu modal opens
3. User selects branch type and summary type → Preview updates
4. User clicks "Create Branch" → SummaryGenerator runs (if knowledge type)
5. New branch node created with inherited context
6. Graph layout updates to show new branch
7. User can immediately start conversation in new branch
```

### Merge-Back Flow
```
1. User on branch leaf node → Merge button visible
2. User clicks merge → MergeMenu opens with valid targets
3. User selects target and summary type → Preview shows integration
4. User confirms merge → SummaryGenerator creates merge summary
5. Target node receives integration message with branch insights
6. Branch marked as 'merged', visual connection added
7. Graph layout updates to show merge relationship
```

## CSS Styling Requirements

### Branch Menu Modal
```css
.branch-modal, .merge-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #2d3748;
  border: 2px solid #4a5568;
  border-radius: 12px;
  padding: 24px;
  min-width: 500px;
  max-width: 700px;
  z-index: 1000;
  color: #e2e8f0;
}

.option-card {
  border: 2px solid #4a5568;
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: #63b3ed;
  background: #1a202c;
}

.branch-preview, .merge-preview {
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
}
```

### Node Action Buttons
```css
.node-actions {
  position: absolute;
  top: -30px;
  right: -10px;
  opacity: 0;
  transition: opacity 0.2s;
}

.cytoscape-node:hover .node-actions {
  opacity: 1;
}

.branch-btn, .merge-btn {
  background: #4299e1;
  border: none;
  border-radius: 4px;
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  margin: 0 2px;
}
```

## Testing Strategy

### Unit Tests
```javascript
describe('Branching System', () => {
  test('generates correct hierarchical node IDs', () => {
    expect(generateNodeId('2', [])).toBe('2.1');
    expect(generateNodeId('2.1', ['2.1.1'])).toBe('2.1.2');
  });
  
  test('calculates valid merge targets', () => {
    const targets = calculateMergeTargets('3.2');
    expect(targets).toContain('4');
    expect(targets).toContain('5');
    expect(targets).not.toContain('2.1'); // Invalid cross-branch
  });
  
  test('creates knowledge branch with summary', async () => {
    const branch = await createBranch('2', 'knowledge', 'brief');
    expect(branch.context.inheritedSummary).toBeTruthy();
    expect(branch.id).toBe('2.1');
  });
});
```

### Integration Tests
```javascript
describe('Branch-Merge Workflow', () => {
  test('complete branch creation and merge cycle', async () => {
    // Create branch
    const branch = await createBranch('2', 'knowledge', 'brief');
    
    // Add conversation to branch
    const branchConvo = await addConversation(branch.id, 'Test question');
    
    // Merge back
    const mergeResult = await mergeBack(branchConvo.id, '4', 'brief');
    
    expect(mergeResult.target.mergedFrom).toContain(branchConvo.id);
    expect(mergeResult.summary).toBeTruthy();
  });
});
```

## Success Metrics

1. **Branch Creation**: Users can create all three branch types successfully
2. **Context Inheritance**: Knowledge branches receive appropriate summarized context
3. **Visual Clarity**: Graph clearly shows branch relationships and merge connections  
4. **Navigation Flow**: Seamless movement between linear and graph views
5. **Merge Integration**: Branch insights properly integrated into target nodes
6. **Performance**: Handles 20+ nodes with multiple branch levels smoothly

## Future Enhancement Hooks

- **Branch Templates**: Predefined branch types for common exploration patterns
- **Collaborative Branching**: Multiple users exploring different branches simultaneously  
- **Branch Analytics**: Metrics on which branch types yield most valuable insights
- **Export/Import**: Save and share conversation trees as knowledge artifacts
- **AI Branch Suggestions**: KHAOS recommends when/where to branch based on conversation flow

---

**This implementation creates the foundation for true distributed human-AI cognition. Users can explore knowledge territory without losing the navigation map, and insights from side explorations enhance the main conversation thread.** 🗡️

**Ready for Claude Code deployment!**