# DAGGER Graph Edge Fix - Correct Branch Connections 🔧

## Issue Analysis
The graph shows incorrect edge connections. Node 1.1.1 connects directly to node 1, skipping 1.1.0. This breaks the hierarchical visual flow.

## Root Cause: Edge Generation Logic Error

### Problem in GraphView.jsx Edge Creation

The edge generation is creating connections incorrectly. Find this code in GraphView.jsx:

```javascript
// CURRENT BROKEN LOGIC - find and fix this:
conversations.forEach(conv => {
  if (conv.parentId) {
    // ❌ WRONG: This connects to parent conversation ID, not display parent
    edges.push({
      data: {
        source: conv.parentId,  // This is wrong!
        target: conv.id
      }
    });
  }
});
```

**Problem:** `conv.parentId` is the UUID of the parent conversation, but the graph needs display number relationships.

### Solution: Fix Edge Generation Logic

Replace the edge generation with correct hierarchical logic:

```javascript
// REPLACE edge generation in GraphView.jsx createGraphElements():
const createGraphElements = (conversations) => {
  if (!conversations || conversations.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Create nodes (unchanged)
  const nodes = conversations.map(conv => ({
    data: {
      id: conv.id,
      label: String(conv.displayNumber),
      displayNumber: conv.displayNumber,
      // ... rest of node data
    },
    classes: getNodeClasses(conv, currentConversationId)
  }));

  // FIXED: Create edges based on display number hierarchy
  const edges = [];
  
  conversations.forEach(conv => {
    const displayNum = String(conv.displayNumber);
    
    if (displayNum.includes('.')) {
      // This is a branch node - find its display parent
      const parentDisplayNum = getDisplayParent(displayNum);
      const parentConv = conversations.find(c => String(c.displayNumber) === parentDisplayNum);
      
      if (parentConv) {
        edges.push({
          data: {
            id: `branch-${parentConv.id}-${conv.id}`,
            source: parentConv.id,  // Connect to correct parent
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

// ADD helper function to get display parent
function getDisplayParent(displayNumber) {
  const parts = displayNumber.split('.');
  
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
}

// ADD helper for branch continuation parent
function getBranchContinuationParent(displayNumber) {
  const parts = displayNumber.split('.');
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
}
```

## Issue 2: Fix Missing 1.1.0 in Linear View

### Check Branch Context Logic

The issue might be in how branch context is determined. Add debugging to App.jsx:

```javascript
// ADD debugging in handleConversationSelect in App.jsx
const handleConversationSelect = (conversationId) => {
  const conversation = graphModel.getConversation(conversationId);
  if (!conversation) return;
  
  console.log(`🔍 Selected conversation:`, conversation);
  console.log(`🔍 Display number:`, conversation.displayNumber);
  console.log(`🔍 Is branch:`, graphModel.isBranchId(conversation.displayNumber));
  
  setCurrentConversationId(conversationId);
  
  if (graphModel.isBranchId(conversation.displayNumber)) {
    // Get all conversations in this branch thread
    const branchConversations = graphModel.getBranchThread(conversation.displayNumber);
    console.log(`🔍 Branch thread:`, branchConversations.map(c => c.displayNumber));
    
    setCurrentBranchContext(conversation.displayNumber.split('.').slice(0, 2).join('.'));
  } else {
    setCurrentBranchContext(null);
  }
  
  setCurrentView('linear');
};
```

### Add getBranchThread Method to GraphModel

```javascript
// ADD to GraphModel.js
getBranchThread(displayNumber) {
  const branchPrefix = this.getBranchPrefix(displayNumber);
  
  return Array.from(this.conversations.values())
    .filter(conv => {
      const convDisplay = String(conv.displayNumber);
      return convDisplay.startsWith(branchPrefix);
    })
    .sort((a, b) => {
      const aParts = String(a.displayNumber).split('.');
      const bParts = String(b.displayNumber).split('.');
      const aLast = parseInt(aParts[aParts.length - 1]);
      const bLast = parseInt(bParts[bParts.length - 1]);
      return aLast - bLast;
    });
}

getBranchPrefix(displayNumber) {
  const parts = String(displayNumber).split('.');
  if (parts.length >= 3) {
    // "1.1.2" → "1.1."
    return parts.slice(0, 2).join('.') + '.';
  }
  return displayNumber;
}
```

### Update Linear View to Show Branch Thread

```javascript
// UPDATE conversation display in Linear view
const getDisplayConversations = () => {
  if (currentBranchContext) {
    // Show all conversations in this branch thread
    const branchThread = graphModel.getBranchThread(currentBranchContext + '.0');
    console.log(`📋 Displaying branch thread:`, branchThread.map(c => c.displayNumber));
    return branchThread;
  } else {
    // Show main thread only
    return graphModel.getAllConversations(); // Main thread conversations
  }
};

// Use this in your JSX:
{getDisplayConversations().map(conv => (
  <div key={conv.id} className="conversation-item">
    {/* conversation display */}
  </div>
))}
```

## Test the Fixes

### Expected Graph Layout After Fix:
```
0
↓
1
├─→ 1.1.0 → 1.1.1  (correct branch chain)
└─→ 2
    ├─→ 2.1.0      (correct branch connection)
    └─→ 2.1.0      (duplicate? check this)
```

### Expected Linear View:
- **Click node 1.1.1**: Should show branch thread [1.1.0, 1.1.1]
- **Both nodes visible**: 1.1.0 and 1.1.1 should appear
- **Proper context**: Branch context indicator shows "1.1"

## Debug Steps

1. **Check edge connections**: Verify 1.1.1 connects to 1.1.0, not 1
2. **Check linear display**: Ensure 1.1.0 appears when viewing branch
3. **Check console logs**: Verify branch thread detection
4. **Test branch navigation**: Click different nodes, check context switching

**This should fix the visual hierarchy to match the logical structure!** 🗡️