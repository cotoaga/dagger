# DAGGER Redesign - Chunk 3: BURN IT DOWN & BUILD RIGHT 🔥

## KHAOS Mode Activated 😈

**Time to delete Claude Code's mess and build a proper conversation tree.**

## Task: Complete GraphModel Redesign

### 1. **NUKE the existing GraphModel.js**

Replace the ENTIRE contents of `src/models/GraphModel.js` with this clean architecture:

```javascript
import { v4 as uuidv4 } from 'uuid';

/**
 * DAGGER GraphModel v2.0 - Clean Architecture
 * One conversation = One node (prompt + response)
 * Proper UUID tracking, working localStorage, branching ready
 */
export class GraphModel {
  constructor() {
    this.conversations = new Map();     // UUID -> Conversation
    this.mainThread = [];               // Ordered array of main thread UUIDs
    this.branches = new Map();          // parentUUID -> [childUUIDs]
    this.conversationCounter = 0;       // For display numbers
    
    this.loadFromStorage();
  }
  
  /**
   * Add a new conversation to the main thread
   */
  addConversation(prompt, response = '', metadata = {}) {
    const id = uuidv4();
    this.conversationCounter++;
    
    const conversation = {
      id,
      displayNumber: this.conversationCounter,
      prompt,
      response,
      timestamp: Date.now(),
      
      // Conversation metadata
      processingTime: metadata.processingTime || 0,
      tokenCount: metadata.tokenCount || 0,
      model: metadata.model || 'unknown',
      
      // Thread structure
      parentId: null,                   // Main thread has no parent
      branchType: null,                 // 'virgin', 'personality', 'knowledge'
      depth: 0,                         // Main thread depth = 0
      
      // Status
      status: 'active'                  // 'active', 'processing', 'complete', 'error'
    };
    
    this.conversations.set(id, conversation);
    this.mainThread.push(id);
    this.saveToStorage();
    
    return conversation;
  }
  
  /**
   * Update an existing conversation (e.g., add response after API call)
   */
  updateConversation(id, updates) {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation ${id} not found`);
    }
    
    Object.assign(conversation, updates);
    this.saveToStorage();
    
    return conversation;
  }
  
  /**
   * Get all conversations for display (main thread only for now)
   */
  getAllConversations() {
    return this.mainThread.map(id => this.conversations.get(id));
  }
  
  /**
   * Get conversation by ID
   */
  getConversation(id) {
    return this.conversations.get(id);
  }
  
  /**
   * Get conversation by display number
   */
  getConversationByNumber(displayNumber) {
    const conversations = this.getAllConversations();
    return conversations.find(c => c.displayNumber === displayNumber);
  }
  
  /**
   * Clear all data (for testing/reset)
   */
  clearAll() {
    this.conversations.clear();
    this.mainThread = [];
    this.branches.clear();
    this.conversationCounter = 0;
    this.saveToStorage();
  }
  
  /**
   * Export to clean markdown format
   */
  exportToMarkdown() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const conversations = this.getAllConversations();
    
    let markdown = `# DAGGER Conversation Export v2.0\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
    markdown += `**Total Conversations:** ${conversations.length}\n\n`;
    
    conversations.forEach((conv, index) => {
      markdown += `## ${conv.displayNumber}. Conversation\n`;
      markdown += `**ID:** \`${conv.id}\`\n`;
      markdown += `**Timestamp:** ${new Date(conv.timestamp).toLocaleString()}\n\n`;
      
      markdown += `**Prompt:**\n${conv.prompt}\n\n`;
      
      if (conv.response) {
        markdown += `**Response:**\n${conv.response}\n\n`;
      }
      
      markdown += `**Metadata:**\n`;
      markdown += `- Processing Time: ${conv.processingTime}ms\n`;
      markdown += `- Tokens: ${conv.tokenCount}\n`;
      markdown += `- Model: ${conv.model}\n`;
      markdown += `- Status: ${conv.status}\n\n`;
      
      markdown += `---\n\n`;
    });
    
    return {
      markdown,
      filename: `dagger-export-v2-${timestamp}.md`,
      rawData: {
        conversations: conversations,
        exportedAt: timestamp,
        version: '2.0'
      }
    };
  }
  
  /**
   * Save to localStorage (WORKING version)
   */
  saveToStorage() {
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        mainThread: this.mainThread,
        branches: Array.from(this.branches.entries()),
        conversationCounter: this.conversationCounter,
        version: '2.0',
        savedAt: Date.now()
      };
      
      localStorage.setItem('dagger-conversations-v2', JSON.stringify(data));
      console.log(`✅ Saved ${this.conversations.size} conversations to localStorage`);
      
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);
    }
  }
  
  /**
   * Load from localStorage (WORKING version)
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('dagger-conversations-v2');
      if (!stored) {
        console.log('📝 No existing conversations found');
        return;
      }
      
      const data = JSON.parse(stored);
      
      // Restore conversations
      this.conversations = new Map(data.conversations || []);
      this.mainThread = data.mainThread || [];
      this.branches = new Map(data.branches || []);
      this.conversationCounter = data.conversationCounter || 0;
      
      console.log(`✅ Loaded ${this.conversations.size} conversations from localStorage`);
      
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      // Don't throw - just start fresh
    }
  }
  
  /**
   * Get storage statistics
   */
  getStorageStats() {
    const stored = localStorage.getItem('dagger-conversations-v2');
    return {
      conversations: this.conversations.size,
      storageSize: stored ? stored.length : 0,
      storageFormatted: stored ? `${(stored.length / 1024).toFixed(1)}KB` : '0KB'
    };
  }
}

// Export singleton instance
export const graphModel = new GraphModel();
```

### 2. **Update App.jsx to use clean model**

Replace conversation handling in `App.jsx`:

```javascript
// REPLACE existing GraphModel usage with:
import { graphModel } from './models/GraphModel.js';

// In App.jsx state:
const [conversations, setConversations] = useState([]);
const [currentConversationId, setCurrentConversationId] = useState(null);
const [isProcessing, setIsProcessing] = useState(false);

// Load conversations on mount
useEffect(() => {
  const loadedConversations = graphModel.getAllConversations();
  setConversations(loadedConversations);
  console.log('📊 Storage stats:', graphModel.getStorageStats());
}, []);

// CLEAN conversation handler
const handleNewConversation = async (prompt) => {
  if (!prompt.trim() || isProcessing) return;
  
  setIsProcessing(true);
  
  // Create conversation with prompt
  const newConversation = graphModel.addConversation(prompt, '', {
    status: 'processing'
  });
  
  // Update UI immediately
  setConversations(graphModel.getAllConversations());
  setCurrentConversationId(newConversation.id);
  
  try {
    // Call Claude API (your existing ClaudeAPI code)
    const response = await ClaudeAPI.generateResponse(prompt);
    
    // Update with response
    graphModel.updateConversation(newConversation.id, {
      response: response.content,
      processingTime: response.processingTime,
      tokenCount: response.tokenCount,
      model: response.model,
      status: 'complete'
    });
    
    // Refresh UI
    setConversations(graphModel.getAllConversations());
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    graphModel.updateConversation(newConversation.id, {
      response: `Error: ${error.message}`,
      status: 'error'
    });
    
    setConversations(graphModel.getAllConversations());
  } finally {
    setIsProcessing(false);
  }
};

// TEST: Add reset button for development
const handleReset = () => {
  graphModel.clearAll();
  setConversations([]);
  setCurrentConversationId(null);
  console.log('🔥 All conversations cleared');
};
```

### 3. **Add Test Export Button**

Add to header for testing:

```jsx
<div className="header-actions">
  <button onClick={() => {
    const exportData = graphModel.exportToMarkdown();
    console.log('📤 Export:', exportData.rawData);
    
    // Download file
    const blob = new Blob([exportData.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.filename;
    a.click();
    URL.revokeObjectURL(url);
  }}>
    📤 Export Clean
  </button>
  
  <button onClick={handleReset} style={{color: 'red'}}>
    🔥 Reset All
  </button>
</div>
```

## Success Criteria

1. **Clean localStorage** - proper storage size, not 2 characters
2. **One conversation = one node** - prompt + response together
3. **Sequential display numbers** - 1, 2, 3, 4 in graph
4. **Working export** - clean markdown with unified conversations
5. **Ready for branching** - clean foundation for hierarchical IDs

## Test the Rebuild

1. Clear browser localStorage completely
2. Start fresh conversations
3. Export should show unified conversation nodes
4. Storage stats should show real size

**This nukes Claude Code's over-engineered mess and builds a proper foundation for branching.** 🗡️