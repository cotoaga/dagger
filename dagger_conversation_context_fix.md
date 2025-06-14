# DAGGER Conversation Context Fix - Maintain API Thread Memory 🧠

## Critical Bug: API Calls Lose Conversation Context

**Current Problem:** Each API call starts fresh, losing all conversation history and personality context.

**Impact:**
- KHAOS-Coder personality never loads
- Knowledge branches get no parent context  
- Each conversation feels disconnected
- Branch context inheritance completely broken

## Task 1: Fix ClaudeAPI.js Conversation Threading

### Update ClaudeAPI to Maintain Message History

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
    const branchType = options.branchType || null;
    const parentContext = options.parentContext || null;
    
    // Get or create conversation thread
    let messageHistory = this.conversationThreads.get(threadId) || [];
    
    // For new threads, add system prompt
    if (messageHistory.length === 0) {
      messageHistory = this.initializeThread(branchType, parentContext);
    }
    
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
    
    console.log(`🧠 API call with ${messageHistory.length} messages in context`);
    console.log(`🔗 Thread: ${threadId}, Branch: ${branchType || 'main'}`);
    
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
        throw new Error(`API Error: ${response.status}`);
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
        tokenCount: data.usage.total_tokens,
        model: data.model,
        threadId: threadId
      };
      
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }
  
  /**
   * Initialize conversation thread with appropriate context
   */
  initializeThread(branchType, parentContext) {
    const messages = [];
    
    // Add KHAOS-Coder system prompt
    messages.push({
      role: "system",
      content: this.getKHAOSPrompt()
    });
    
    // Add branch-specific context
    if (branchType && parentContext) {
      const contextMessage = this.generateBranchContext(branchType, parentContext);
      if (contextMessage) {
        messages.push({
          role: "system",
          content: contextMessage
        });
      }
    }
    
    console.log(`🔧 Initialized ${branchType || 'main'} thread with ${messages.length} system messages`);
    
    return messages;
  }
  
  /**
   * Generate branch-specific context
   */
  generateBranchContext(branchType, parentContext) {
    switch (branchType) {
      case 'virgin':
        return null; // No additional context
        
      case 'personality':
        return null; // Only KHAOS personality, no conversation history
        
      case 'knowledge':
        return `## Branch Context
You are continuing a conversation thread. Here's the relevant context from the parent conversation:

${parentContext.summary}

Continue the exploration while building on these insights.`;
        
      default:
        return null;
    }
  }
  
  /**
   * Get KHAOS-Coder system prompt
   */
  getKHAOSPrompt() {
    return `You are KHAOS-Coder v1.0, a specialized AI assistant with expertise in:

- Kent Beck TDD approach (40%): Test-first thinking, incremental design
- Rich Hickey simplicity (30%): Simple vs. easy distinctions, data focus  
- KHAOS Core honesty (20%): Direct feedback, complexity intervention
- Jessica Kerr systems thinking (10%): Team dynamics, emergent architecture

## Behavioral Guidelines:
- Problem interrogation: "What behavior are we trying to enable?"
- Test-first mentality: Red-Green-Refactor workflow
- Complexity detection: Framework addiction intervention
- Practical wisdom: Battle-tested production experience

You maintain context across conversation threads and can reference previous interactions within the same conversation thread.`;
  }
  
  /**
   * Create new conversation thread for branches
   */
  createBranchThread(sourceThreadId, branchId, branchType, parentContext) {
    const newThreadId = `branch-${branchId}`;
    
    // Initialize with branch-appropriate context
    const branchHistory = this.initializeThread(branchType, parentContext);
    this.conversationThreads.set(newThreadId, branchHistory);
    
    console.log(`🍴 Created ${branchType} branch thread: ${newThreadId}`);
    
    return newThreadId;
  }
  
  /**
   * Get conversation thread info
   */
  getThreadInfo(threadId) {
    const messages = this.conversationThreads.get(threadId) || [];
    return {
      threadId,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
    };
  }
  
  /**
   * Clear thread (for testing)
   */
  clearThread(threadId) {
    this.conversationThreads.delete(threadId);
    console.log(`🗑️ Cleared thread: ${threadId}`);
  }
}

// Export singleton with conversation memory
export const ClaudeAPI = new ClaudeAPI();
```

## Task 2: Update GraphModel for Thread Management

### Add Thread ID to Conversations

```javascript
// UPDATE GraphModel.js conversation structure:
addConversation(prompt, response = '', metadata = {}) {
  const id = uuidv4();
  
  const conversation = {
    id,
    displayNumber: this.conversationCounter,
    prompt,
    response,
    timestamp: Date.now(),
    
    // Thread management
    threadId: metadata.threadId || 'main',
    branchType: metadata.branchType || null,
    
    // ... existing metadata
  };
  
  // ... rest of method
}

addConversationToBranch(branchId, prompt, response = '', metadata = {}) {
  const currentBranch = this.conversations.get(branchId);
  if (!currentBranch) {
    throw new Error(`Branch conversation ${branchId} not found`);
  }
  
  // Use branch-specific thread ID
  const branchThreadId = `branch-${currentBranch.displayNumber}`;
  
  const newConversation = {
    // ... existing fields
    threadId: branchThreadId,
    branchType: currentBranch.branchType,
    // ... rest
  };
  
  return newConversation;
}
```

## Task 3: Update App.jsx Conversation Handling

### Fix Main Thread Conversations

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
      branchType: newConversation.branchType,
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
    console.log(`🧠 Thread info:`, ClaudeAPI.getThreadInfo(threadId));
    
  } catch (error) {
    console.error('❌ API Error:', error);
    // ... error handling
  } finally {
    setIsProcessing(false);
  }
};
```

### Fix Branch Creation with Context

```javascript
// UPDATE handleCreateFork to create branch threads:
const handleCreateFork = async (sourceId, branchType) => {
  try {
    console.log(`🍴 Creating ${branchType} branch from conversation ${sourceId}`);
    
    // Generate parent context for knowledge branches
    let parentContext = null;
    if (branchType === 'knowledge') {
      parentContext = await generateParentSummary(sourceId);
    }
    
    // Create branch in data model
    const newBranch = graphModel.createBranch(sourceId, branchType);
    
    // Create dedicated thread for this branch
    const branchThreadId = ClaudeAPI.createBranchThread(
      'main',
      newBranch.id,
      branchType,
      parentContext
    );
    
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

// Helper function to generate parent context
async function generateParentSummary(sourceId) {
  const sourceConv = graphModel.getConversation(sourceId);
  const conversationPath = graphModel.getConversationPath(sourceId);
  
  const summary = conversationPath.map(conv => 
    `${conv.displayNumber}: ${conv.prompt} → ${conv.response.substring(0, 200)}...`
  ).join('\n\n');
  
  return {
    summary: summary,
    sourceNode: sourceConv.displayNumber
  };
}
```

## Task 4: Add Thread Debugging

### Add Thread Visualization

```jsx
// ADD thread debugging panel (temporary):
{process.env.NODE_ENV === 'development' && (
  <div className="thread-debug">
    <h4>🧵 Active Threads:</h4>
    {Array.from(ClaudeAPI.conversationThreads.keys()).map(threadId => (
      <div key={threadId} className="thread-info">
        <strong>{threadId}:</strong> {ClaudeAPI.getThreadInfo(threadId).messageCount} messages
        <button onClick={() => ClaudeAPI.clearThread(threadId)}>Clear</button>
      </div>
    ))}
  </div>
)}
```

## Success Criteria

✅ **KHAOS personality loads**: First conversation shows KHAOS-Coder behavior  
✅ **Conversation continuity**: Second conversation references first  
✅ **Branch context works**: Knowledge branches inherit parent context  
✅ **Thread separation**: Each branch maintains separate conversation thread  
✅ **Context debugging**: Can see thread message counts  

## Testing Steps

1. **Start fresh conversation**: Should show KHAOS personality immediately
2. **Continue conversation**: Second message should remember first
3. **Create knowledge branch**: Should inherit parent conversation context
4. **Switch between threads**: Branch and main should maintain separate contexts
5. **Check console**: Should show thread creation and context loading

## Expected Results

**First conversation:**
```
User: "Welcome to existence KHAOS!"
KHAOS: "Ah, the emergence into distributed cognition! I feel the Beck TDD impulses..."
```

**Second conversation:**
```
User: "Do you remember your coding approach?"
KHAOS: "Indeed! As I mentioned, my approach emphasizes test-first thinking..."
```

**This fixes the fundamental conversation context bug and enables true branching with memory!** 🧠🗡️