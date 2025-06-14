# DAGGER Zero-Indexed Hierarchical Numbering System - Complete Specification 🧬

## Objective
Implement scientifically consistent zero-indexed conversation numbering with unambiguous hierarchical branching. No exceptions, no arbitrary starting points, clean mathematical progression.

## Core Numbering Rules

### Main Thread: Zero-Indexed Sequential
```
0 → 1 → 2 → 3 → 4 → 5 → 6...
```

### Branch Creation: Parent.Branch.0
```
From node 2:
├── 2.1.0 (first branch from 2)
├── 2.2.0 (second branch from 2)  
├── 2.3.0 (third branch from 2)
└── 2.N.0 (Nth branch from 2)
```

### Branch Continuation: Increment Last Number
```
Branch thread progression:
2.1.0 → 2.1.1 → 2.1.2 → 2.1.3 → 2.1.4...
2.2.0 → 2.2.1 → 2.2.2 → 2.2.3 → 2.2.4...
```

### Sub-Branch Creation: Recursive Pattern
```
From branch node 2.1.2:
├── 2.1.2.1.0 (first sub-branch)
├── 2.1.2.2.0 (second sub-branch)
└── 2.1.2.3.0 (third sub-branch)

Sub-branch continuation:
2.1.2.1.0 → 2.1.2.1.1 → 2.1.2.1.2...
```

## Implementation Tasks

### Task 1: Update GraphModel.js Numbering

#### Replace conversation counter initialization:
```javascript
// CHANGE FROM:
this.conversationCounter = 0;

// TO:
this.conversationCounter = 0; // Already correct, but ensure it starts at 0

// CHANGE FROM:
this.conversationCounter++;
const conversation = {
  displayNumber: this.conversationCounter, // This was 1, 2, 3...

// TO:
const conversation = {
  displayNumber: this.conversationCounter, // This is 0, 1, 2...
};
this.conversationCounter++;
```

#### Add hierarchical ID generation methods:
```javascript
/**
 * Generate hierarchical branch ID following pattern: parent.branch.0
 */
generateBranchId(parentId) {
  // Count existing branches from this parent
  const existingBranches = Array.from(this.conversations.values())
    .filter(conv => conv.parentId === parentId)
    .length;
  
  const branchNumber = existingBranches + 1; // 1, 2, 3...
  return `${parentId}.${branchNumber}.0`;
}

/**
 * Generate next ID in branch thread
 */
generateNextInBranch(currentBranchId) {
  const parts = currentBranchId.split('.');
  const lastIndex = parts.length - 1;
  const currentNumber = parseInt(parts[lastIndex]);
  parts[lastIndex] = String(currentNumber + 1);
  
  return parts.join('.');
}

/**
 * Check if ID represents a branch (contains dots)
 */
isBranchId(displayNumber) {
  return String(displayNumber).includes('.');
}

/**
 * Get parent ID from hierarchical ID
 */
getParentDisplayNumber(displayNumber) {
  const str = String(displayNumber);
  if (!str.includes('.')) return null; // Main thread has no parent
  
  const parts = str.split('.');
  if (parts.length === 3) {
    // Branch like "2.1.0" → parent is "2"
    return parts[0];
  } else {
    // Sub-branch like "2.1.2.1.0" → parent is "2.1.2"
    return parts.slice(0, -2).join('.');
  }
}

/**
 * Parse hierarchical display number for sorting
 */
parseHierarchicalId(displayNumber) {
  const str = String(displayNumber);
  if (!str.includes('.')) {
    // Main thread: "2" → [2]
    return [parseInt(str)];
  }
  
  // Branch: "2.1.3" → [2, 1, 3]
  return str.split('.').map(n => parseInt(n));
}
```

### Task 2: Update Branch Creation Logic

#### Modify createBranch method:
```javascript
createBranch(parentId, branchType, summaryType = 'brief') {
  const parentConversation = this.conversations.get(parentId);
  if (!parentConversation) {
    throw new Error(`Parent conversation ${parentId} not found`);
  }

  const branchId = uuidv4();
  
  // Generate hierarchical display number
  const parentDisplayNumber = parentConversation.displayNumber;
  const branchDisplayNumber = this.generateBranchId(parentDisplayNumber);
  
  const branchConversation = {
    id: branchId,
    displayNumber: branchDisplayNumber, // e.g., "2.1.0"
    prompt: '', // Will be filled when user starts conversation
    response: '',
    timestamp: Date.now(),
    
    // Branch metadata
    parentId: parentId,
    parentDisplayNumber: parentDisplayNumber,
    branchType: branchType,
    depth: this.calculateDepth(parentId) + 1,
    
    // Standard metadata
    processingTime: 0,
    tokenCount: 0,
    model: 'unknown',
    status: 'ready'
  };

  this.conversations.set(branchId, branchConversation);
  
  // Track branch relationship
  if (!this.branches.has(parentId)) {
    this.branches.set(parentId, []);
  }
  this.branches.get(parentId).push(branchId);
  
  this.saveToStorage();
  
  console.log(`✅ Created ${branchType} branch ${branchDisplayNumber} from ${parentDisplayNumber}`);
  
  return branchConversation;
}
```

### Task 3: Update Conversation Addition for Branches

#### Add method for continuing branch conversations:
```javascript
addConversationToBranch(branchId, prompt, response = '', metadata = {}) {
  const currentBranch = this.conversations.get(branchId);
  if (!currentBranch) {
    throw new Error(`Branch conversation ${branchId} not found`);
  }
  
  // If this is the first conversation in the branch (empty prompt), update it
  if (!currentBranch.prompt) {
    return this.updateConversation(branchId, {
      prompt: prompt,
      response: response,
      ...metadata,
      status: response ? 'complete' : 'processing'
    });
  }
  
  // Otherwise, create next conversation in branch
  const newId = uuidv4();
  const nextDisplayNumber = this.generateNextInBranch(currentBranch.displayNumber);
  
  const newConversation = {
    id: newId,
    displayNumber: nextDisplayNumber, // e.g., "2.1.1", "2.1.2"
    prompt: prompt,
    response: response,
    timestamp: Date.now(),
    
    // Inherit branch properties
    parentId: currentBranch.parentId,
    parentDisplayNumber: currentBranch.parentDisplayNumber,
    branchType: currentBranch.branchType,
    depth: currentBranch.depth,
    
    // Metadata
    processingTime: metadata.processingTime || 0,
    tokenCount: metadata.tokenCount || 0,
    model: metadata.model || 'unknown',
    status: response ? 'complete' : 'processing'
  };
  
  this.conversations.set(newId, newConversation);
  this.saveToStorage();
  
  return newConversation;
}
```

### Task 4: Update Conversation Sorting

#### Replace getAllConversationsWithBranches sorting:
```javascript
getAllConversationsWithBranches() {
  return Array.from(this.conversations.values())
    .sort((a, b) => {
      const aParts = this.parseHierarchicalId(a.displayNumber);
      const bParts = this.parseHierarchicalId(b.displayNumber);
      
      // Compare each level
      const maxLength = Math.max(aParts.length, bParts.length);
      for (let i = 0; i < maxLength; i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }
      
      return 0; // Equal
    });
}
```

### Task 5: Update App.jsx Conversation Handling

#### Handle branch context switching:
```javascript
// Add to App.jsx state
const [currentBranchContext, setCurrentBranchContext] = useState(null);

// Update conversation selection from graph
const handleConversationSelect = (conversationId) => {
  const conversation = graphModel.getConversation(conversationId);
  if (!conversation) return;
  
  setCurrentConversationId(conversationId);
  
  // Determine context based on conversation type
  if (graphModel.isBranchId(conversation.displayNumber)) {
    // Branch conversation - show branch context
    const branchRoot = graphModel.getBranchRoot(conversationId);
    setCurrentBranchContext(branchRoot);
    console.log(`📍 Switched to branch context: ${conversation.displayNumber}`);
  } else {
    // Main thread conversation - show main context
    setCurrentBranchContext(null);
    console.log(`📍 Switched to main thread: ${conversation.displayNumber}`);
  }
  
  // Switch to linear view to show selected conversation
  setCurrentView('linear');
};

// Update new conversation handler for context-aware addition
const handleNewConversation = async (prompt) => {
  if (!prompt.trim() || isProcessing) return;
  
  setIsProcessing(true);
  
  let newConversation;
  
  if (currentBranchContext) {
    // Add to current branch
    newConversation = graphModel.addConversationToBranch(
      currentConversationId, 
      prompt, 
      '', 
      { status: 'processing' }
    );
  } else {
    // Add to main thread
    newConversation = graphModel.addConversation(
      prompt, 
      '', 
      { status: 'processing' }
    );
  }
  
  // Update UI and continue with API call...
  setConversations(graphModel.getAllConversationsWithBranches());
  setCurrentConversationId(newConversation.id);
  
  // ... rest of API call logic
};
```

### Task 6: Update Linear View Display

#### Add context indicator in linear view:
```jsx
// Add branch context indicator to linear view
{currentBranchContext && (
  <div className="branch-context-indicator">
    <span className="context-label">Branch Context:</span>
    <span className="context-path">{currentBranchContext.displayNumber}</span>
    <button 
      onClick={() => {
        setCurrentBranchContext(null);
        setCurrentView('graph');
      }}
      className="return-to-graph-btn"
    >
      🗺️ View Full Graph
    </button>
  </div>
)}
```

## Examples and Test Cases

### Example 1: Basic Branching
```
Main thread: 0 → 1 → 2
Branch from 1: 1.1.0 → 1.1.1 → 1.1.2
Branch from 2: 2.1.0 → 2.1.1
Second branch from 2: 2.2.0
```

### Example 2: Deep Branching
```
Main: 0 → 1 → 2 → 3
Branch: 2.1.0 → 2.1.1 → 2.1.2
Sub-branch: 2.1.1.1.0 → 2.1.1.1.1
Sub-sub-branch: 2.1.1.1.1.1.0
```

### Example 3: Multiple Branches
```
From node 1:
├── 1.1.0 → 1.1.1 → 1.1.2 (first branch)
├── 1.2.0 → 1.2.1 (second branch)
└── 1.3.0 (third branch)
```

## Success Criteria

✅ **Main thread starts at 0**: First conversation is `0`, not `1`  
✅ **Branch creation**: `2.1.0`, `2.2.0`, `2.3.0` pattern  
✅ **Branch continuation**: `2.1.0 → 2.1.1 → 2.1.2` pattern  
✅ **Sub-branches work**: `2.1.2.1.0` from node `2.1.2`  
✅ **Sorting correct**: Hierarchical order maintained  
✅ **Context switching**: Graph click → Linear view with correct context  
✅ **No ambiguity**: Every ID is unique and parseable  

## CSS Updates for Context Indicator

```css
.branch-context-indicator {
  background: #1e40af;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.context-label {
  font-weight: bold;
}

.context-path {
  font-family: 'Monaco', 'Menlo', monospace;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
}

.return-to-graph-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
```

**This creates a mathematically clean, unambiguous hierarchical numbering system with perfect zero-indexing consistency throughout.** 🧬

**Fire when ready to implement the scientific precision!** 🗡️