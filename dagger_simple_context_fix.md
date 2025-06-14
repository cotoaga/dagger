# DAGGER Simple Context Fix - Thread Memory Only 🧠

## Objective
Fix conversation context continuity by maintaining message history in API calls. NO personality integration, NO system prompts - just conversation threading.

## Task 1: Update ClaudeAPI.js for Message History

### Replace API Class with Simple Threading

```javascript
// REPLACE ClaudeAPI class with conversation-aware version:
class ClaudeAPI {
  constructor() {
    this.apiKey = localStorage.getItem('claude-api-key');
    this.baseURL = 'https://api.anthropic.com/v1/messages';
    this.conversationThreads = new Map(); // Thread ID -> message history
  }
  
  /**
   * Generate response with full conversation context
   */
  async generateResponse(prompt, options = {}) {
    const threadId = options.threadId || 'main';
    const startTime = Date.now();
    
    // Get or create conversation thread
    let messageHistory = this.conversationThreads.get(threadId) || [];
    
    // Add current user message
    messageHistory.push({
      role: "user",
      content: prompt
    });
    
    const requestBody = {
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.max_tokens || 4000,
      temperature: options.temperature || 0.7,
      messages: messageHistory // FULL conversation context!
    };
    
    console.log(`🧠 API call with ${messageHistory.length} messages in thread: ${threadId}`);
    
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error ${response.status}: ${errorData}`);
      }
      
      const data = await response.json();
      const assistantMessage = data.content[0].text;
      
      // Add assistant response to thread history
      messageHistory.push({
        role: "assistant", 
        content: assistantMessage
      });
      
      // Update thread storage
      this.conversationThreads.set(threadId, messageHistory);
      
      console.log(`✅ Response generated, thread now has ${messageHistory.length} messages`);
      
      return {
        content: assistantMessage,
        processingTime: Date.now() - startTime,
        tokenCount: data.usage?.total_tokens || 0,
        model: data.model,
        threadId: threadId
      };
      
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }
  
  /**
   * Create new conversation thread for branches
   */
  createBranchThread(branchId) {
    const newThreadId = `branch-${branchId}`;
    
    // Initialize empty thread (no system prompts)
    this.conversationThreads.set(newThreadId, []);
    
    console.log(`🍴 Created branch thread: ${newThreadId}`);
    
    return newThreadId;
  }
  
  /**
   * Get conversation thread info for debugging
   */
  getThreadInfo(threadId) {
    const messages = this.conversationThreads.get(threadId) || [];
    return {
      threadId,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || 'Empty'
    };
  }
  
  /**
   * Clear thread (for testing)
   */
  clearThread(threadId) {
    this.conversationThreads.delete(threadId);
    console.log(`🗑️ Cleared thread: ${threadId}`);
  }
  
  /**
   * Get all active threads (for debugging)
   */
  getAllThreads() {
    return Array.from(this.conversationThreads.keys()).map(threadId => 
      this.getThreadInfo(threadId)
    );
  }
}

// Export singleton
export const ClaudeAPI = new ClaudeAPI();
```

## Task 2: Update ISO DateTime Formatting

### Fix All Date Displays to ISO Format

```javascript
// ADD to GraphModel.js or utility file:
export function formatISODateTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatISODate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
```

### Update All DateTime Displays

```jsx
// REPLACE all date formatting in conversation displays:

// OLD: new Date(conv.timestamp).toLocaleString()
// NEW: formatISODateTime(conv.timestamp)

// In conversation headers:
<span className="conversation-timestamp">
  {formatISODateTime(conv.timestamp)}
</span>

// In conversation metadata:
<div className="conversation-metadata">
  <span>{conv.processingTime}ms</span>
  <span>{conv.tokenCount} tokens</span>
  <span>{formatISODateTime(conv.timestamp)}</span>
</div>
```

### Update Export Format

```javascript
// UPDATE exportToMarkdown in GraphModel.js:
exportToMarkdown() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const conversations = this.getAllConversations();
  
  let markdown = `# DAGGER Conversation Export v2.0\n`;
  markdown += `**Exported:** ${formatISODateTime(Date.now())}\n`;
  markdown += `**Total Conversations:** ${conversations.length}\n\n`;
  
  conversations.forEach((conv, index) => {
    markdown += `## ${conv.displayNumber}. Conversation\n`;
    markdown += `**ID:** \`${conv.id}\`\n`;
    markdown += `**Timestamp:** ${formatISODateTime(conv.timestamp)}\n\n`;
    
    // ... rest unchanged
  });
  
  return {
    markdown,
    filename: `dagger-export-${timestamp}.md`,
    rawData: {
      conversations: conversations,
      exportedAt: formatISODateTime(Date.now()),
      version: '2.0'
    }
  };
}
```

## Task 3: Update App.jsx for Thread Management

### Simple Thread-Aware Conversation Handling

```javascript
// UPDATE handleNewConversation in App.jsx:
const handleNewConversation = async (prompt) => {
  if (!prompt.trim() || isProcessing) return;
  
  setIsProcessing(true);
  
  let newConversation;
  let threadId = 'main';
  
  if (currentBranchContext) {
    // Add to current branch thread
    threadId = `branch-${currentBranchContext}`;
    newConversation = graphModel.addConversationToBranch(
      currentConversationId, 
      prompt, 
      '', 
      { 
        status: 'processing',
        threadId: threadId
      }
    );
  } else {
    // Add to main thread
    newConversation = graphModel.addConversation(
      prompt, 
      '', 
      { 
        status: 'processing',
        threadId: 'main'
      }
    );
  }
  
  setConversations(graphModel.getAllConversationsWithBranches());
  setCurrentConversationId(newConversation.id);
  
  try {
    // Call API with thread context
    const response = await ClaudeAPI.generateResponse(prompt, {
      threadId: threadId,
      model: 'claude-sonnet-4-20250514'
    });
    
    // Update with response
    graphModel.updateConversation(newConversation.id, {
      response: response.content,
      processingTime: response.processingTime,
      tokenCount: response.tokenCount,
      model: response.model,
      status: 'complete'
    });
    
    setConversations(graphModel.getAllConversationsWithBranches());
    
    console.log(`✅ Conversation added to thread: ${threadId}`);
    console.log(`🧵 Thread info:`, ClaudeAPI.getThreadInfo(threadId));
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    graphModel.updateConversation(newConversation.id, {
      response: `Error: ${error.message}`,
      status: 'error'
    });
    
    setConversations(graphModel.getAllConversationsWithBranches());
  } finally {
    setIsProcessing(false);
  }
};
```

### Simple Branch Thread Creation

```javascript
// UPDATE handleCreateFork to create branch threads:
const handleCreateFork = async (sourceId, branchType) => {
  try {
    console.log(`🍴 Creating ${branchType} branch from conversation ${sourceId}`);
    
    // Create branch in data model
    const newBranch = graphModel.createBranch(sourceId, branchType);
    
    // Create dedicated thread for this branch
    const branchThreadId = ClaudeAPI.createBranchThread(newBranch.id);
    
    // Update branch with thread ID
    graphModel.updateConversation(newBranch.id, {
      threadId: branchThreadId
    });
    
    setConversations(graphModel.getAllConversationsWithBranches());
    setCurrentConversationId(newBranch.id);
    setCurrentBranchContext(newBranch.displayNumber.split('.').slice(0, 2).join('.'));
    
    setShowForkMenu(false);
    setForkSourceId(null);
    
    console.log(`✅ Created branch with thread: ${branchThreadId}`);
    
  } catch (error) {
    console.error('❌ Fork creation failed:', error);
  }
};
```

## Task 4: Add Thread Debugging (Optional)

### Simple Debug Panel

```jsx
// ADD simple thread debugging (development only):
{process.env.NODE_ENV === 'development' && (
  <div className="thread-debug" style={{
    position: 'fixed', 
    bottom: '10px', 
    right: '10px', 
    background: '#2d3748', 
    padding: '10px', 
    borderRadius: '6px',
    fontSize: '12px',
    color: '#e2e8f0'
  }}>
    <strong>🧵 Threads:</strong>
    {ClaudeAPI.getAllThreads().map(thread => (
      <div key={thread.threadId}>
        {thread.threadId}: {thread.messageCount} msgs
      </div>
    ))}
  </div>
)}
```

## Success Criteria

✅ **Conversation continuity**: Second message references first message  
✅ **Thread separation**: Main and branch conversations maintain separate contexts  
✅ **ISO datetime**: All timestamps show `2025-06-14 16:45` format  
✅ **Memory persistence**: Threads survive across conversation additions  
✅ **Branch threading**: Each branch maintains its own conversation context  

## Testing Steps

1. **Start conversation**: Add first message to main thread
2. **Continue conversation**: Add second message, should reference first
3. **Create branch**: Fork from main, should start new thread  
4. **Branch conversation**: Add message to branch, separate from main
5. **Switch contexts**: Main and branch should have independent memory
6. **Check datetime**: All displays should use ISO format

## Expected Results

**Main Thread:**
```
Conversation 1: "Hello, who are you?"
Conversation 2: "Do you remember what I just asked?" 
Response: "Yes, you asked who I am..."  (CONTEXT MAINTAINED!)
```

**Branch Thread:**  
```
Branch 1.1.0: "Let's explore coding"
Branch 1.1.1: "What about the previous topic?"
Response: "You asked about coding..." (SEPARATE CONTEXT!)
```

**Datetime Display:**
```
OLD: "6/14/2025, 4:45:32 PM"  
NEW: "2025-06-14 16:45"
```

**This implements simple conversation threading without complexity - just memory continuity!** 🧠🗡️