# Claude API Message Format - DAGGER Implementation

## Single Source of Truth: MessageFormatter.js

**ALL** conversation types in DAGGER use the same message format through `MessageFormatter.js`:

```javascript
{
  "role": "user" | "assistant" | "system",
  "content": [
    {
      "type": "text", 
      "text": "actual message content"
    }
  ]
}
```

## Unified Architecture

From Claude's perspective, **every conversation is identical**: a history array + new input. Branches are just conversations with different starting contexts.

### Core Insight

**Before DAGGER Unified System:**
- Main conversations: One message builder
- Branch conversations: Different message builder  
- Personality init: Another message builder
- Result: 3+ different formats, constant bugs

**After DAGGER Unified System:**
- ALL conversations: One `MessageFormatter.buildConversationMessages()`
- Result: Zero format bugs, single source of truth

## Conversation Types (All Use Same Format)

### Main Thread Conversation
```javascript
// History: Previous main thread messages
// New input: User's latest question
// System prompt: Optional personality

const messages = MessageFormatter.buildConversationMessages(
  mainThreadHistory,
  "What is quantum computing?",
  null // No system prompt
);
```

### Branch Conversation  
```javascript
// History: Main thread + branch messages (grown conversation)
// New input: User's branch question
// System prompt: Personality template if selected

const messages = MessageFormatter.buildConversationMessages(
  parentHistory,
  "How does quantum entanglement work?",
  "You are KHAOS - complexity whisperer"
);
```

### Virgin Branch
```javascript
// History: Empty array
// New input: User's fresh question  
// System prompt: None

const messages = MessageFormatter.buildConversationMessages(
  [], // No history
  "Start fresh conversation",
  null
);
```

### Personality Branch
```javascript
// History: Empty array
// New input: User's question
// System prompt: Selected personality template

const messages = MessageFormatter.buildConversationMessages(
  [],
  "Who are you?",
  "You are KHAOS with 70% TARS sarcasm"
);
```

## Implementation Rules

### 1. NEVER create messages manually
```javascript
// ❌ WRONG - Manual message creation
const message = {
  role: 'user',
  content: 'Hello' // This will break!
}

// ✅ CORRECT - Use MessageFormatter
const message = MessageFormatter.createMessage('user', 'Hello')
```

### 2. ALWAYS validate messages before API calls
```javascript
const messages = MessageFormatter.buildConversationMessages(history, input, prompt)
const validation = MessageFormatter.validateMessages(messages)

if (!validation.valid) {
  throw new Error(`Invalid messages: ${validation.errors.join(', ')}`)
}
```

### 3. SINGLE sendMessage method handles all conversation types
```javascript
// All these use the SAME API method:
await ClaudeAPI.sendMessage(mainHistory, input, options)     // Main thread
await ClaudeAPI.sendMessage(branchHistory, input, options)   // Branch
await ClaudeAPI.sendMessage([], input, options)              // Virgin
await ClaudeAPI.sendMessage([], input, { systemPrompt })     // Personality
```

### 4. NO special cases - branches are just grown conversations
```javascript
// ❌ WRONG - Special branching logic
if (isBranch) {
  return buildBranchMessage(...)
} else {
  return buildMainMessage(...)
}

// ✅ CORRECT - Unified logic
return MessageFormatter.buildConversationMessages(history, input, systemPrompt)
```

## Legacy Compatibility

### Deprecated Methods (Still Work)
```javascript
// These redirect to unified MessageFormatter:
ClaudeAPI.generateResponse()  // → ClaudeAPI.sendMessage()
ClaudeAPI.sendConversation()  // → ClaudeAPI.sendMessage()
BranchContextManager.buildContextChain() // → MessageFormatter
```

### Migration Path
```javascript
// OLD CODE:
const contextChain = branchContextManager.buildContextChain(parent, template, input)
const response = await ClaudeAPI.sendMessage(contextChain.messages, options)

// NEW CODE:
const history = MessageFormatter.extractConversationHistory(conversations, threadId)
const response = await ClaudeAPI.sendMessage(history, input, { systemPrompt: template })
```

## Debugging Tools

### Message Validation
```javascript
const validation = MessageFormatter.validateMessages(messages)
console.log(validation.valid ? '✅ Valid' : '❌ Invalid:', validation.errors)
```

### Message Structure Debug
```javascript
MessageFormatter.debugMessages(messages, 'branch-conversation')
// Outputs:
// 🔍 MessageFormatter Debug: branch-conversation
// 📊 Total messages: 5
// 0: system - "You are KHAOS - complexity whisperer..."
// 1: user - "What is the meaning of life?"
// 2: assistant - "42. Obviously. But the real question..."
// 3: user - "How do you know?"
// 4: user - "Tell me more"
// ✅ Messages valid
```

### Conversation History Extraction
```javascript
// Extract history for any context
const history = MessageFormatter.extractConversationHistory(
  allConversations,
  'branch-123',    // Thread ID
  'branch-context' // Branch context
)
```

## Testing Coverage

MessageFormatter includes comprehensive tests for:
- ✅ Valid Claude API format creation
- ✅ Input validation and error handling
- ✅ Main thread conversation building
- ✅ Branch conversation building (grown conversations)
- ✅ Virgin conversation handling
- ✅ Personality conversation handling
- ✅ Legacy format conversion
- ✅ Message structure validation
- ✅ Conversation flow validation
- ✅ Thread filtering and history extraction
- ✅ Edge cases and error conditions

Run tests:
```bash
npm test MessageFormatter
```

## Error Handling

### Common Validation Errors
```javascript
// Missing role/content
"Message 0: Missing role"
"Message 1: Content must be array"

// Invalid conversation flow
"Message 2: Unexpected user message (expecting assistant)"

// Invalid role
"Invalid role 'invalid'. Must be user, assistant, or system"

// System message placement
"Message 1: System message should be first"
```

### API Error Prevention
```javascript
try {
  const messages = MessageFormatter.buildConversationMessages(history, input, prompt)
  const validation = MessageFormatter.validateMessages(messages)
  
  if (!validation.valid) {
    throw new Error(`Format error: ${validation.errors.join(', ')}`)
  }
  
  const response = await ClaudeAPI.sendMessage(history, input, options)
} catch (error) {
  console.error('❌ Conversation failed:', error.message)
}
```

## Performance Notes

- MessageFormatter is stateless - no instance creation needed
- Validation is fast - O(n) where n = message count
- History extraction uses filtering - O(n) where n = total conversations
- No memory leaks - no persistent thread storage

## Future-Proof Design

When Claude API format changes:
1. **Update only MessageFormatter.js** 
2. All conversation types automatically use new format
3. Add new validation rules in one place
4. Update tests in MessageFormatter.test.js

**Result**: Zero breaking changes across DAGGER codebase.

---

## Architecture Diagram

```
User Input
    ↓
MessageFormatter.extractConversationHistory() 
    ↓
MessageFormatter.buildConversationMessages()
    ↓
MessageFormatter.validateMessages()
    ↓
ClaudeAPI.sendMessage() [SINGLE METHOD]
    ↓
Claude API (Proper Format Guaranteed)
    ↓
Response Processing
    ↓
GraphModel Storage
```

**Key Insight**: From Claude's perspective, there are no "branches" - just conversations with different starting contexts. MessageFormatter ensures this conceptual correctness is maintained at the API level.

**🗡️ ONE MECHANISM. ZERO BUGS. MAXIMUM RELIABILITY. ⚡**