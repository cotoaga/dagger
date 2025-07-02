/**
 * MessageFormatter - Single Source of Truth for Claude API Messages
 * 
 * CRITICAL: This is the ONLY place where Claude API message format is defined.
 * All conversation types (main, branch, virgin, personality) use this formatter.
 * 
 * Claude API Message Format (as of 2025):
 * {
 *   "role": "user" | "assistant" | "system",
 *   "content": [
 *     {
 *       "type": "text",
 *       "text": "actual message content"
 *     }
 *   ]
 * }
 */

import Logger from '../utils/logger.js';

class MessageFormatter {
  
  /**
   * Create a properly formatted Claude API message
   * 
   * @param {string} role - "user", "assistant", or "system"
   * @param {string} content - The actual message text
   * @returns {Object} Properly formatted Claude API message
   */
  static createMessage(role, content) {
    // Validate role
    if (!['user', 'assistant', 'system'].includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be user, assistant, or system`)
    }
    
    // Validate content
    if (!content || content === '' || content === null || content === undefined) {
      throw new Error('Content must be a non-empty string')
    }
    
    if (typeof content !== 'string') {
      throw new Error('Content must be a non-empty string')
    }
    
    return {
      role: role,
      content: [
        {
          type: "text",
          text: content.trim()
        }
      ]
    }
  }
  
  /**
   * Build complete conversation message array for Claude API
   * 
   * @param {Array} conversationHistory - Array of conversation objects with {input, response}
   * @param {string} newUserInput - New user input to add
   * @param {string} systemPrompt - Optional system prompt (personality, etc.)
   * @returns {Array} Array of properly formatted Claude API messages
   */
  static buildConversationMessages(conversationHistory = [], newUserInput = null, systemPrompt = null) {
    const messages = []
    
    Logger.debug('MessageFormatter.buildConversationMessages', {
      conversationHistoryType: typeof conversationHistory,
      conversationHistoryIsArray: Array.isArray(conversationHistory),
      newUserInputType: typeof newUserInput,
      systemPromptType: typeof systemPrompt
    });
    
    // Add system prompt if provided (personality prompts, etc.)
    if (systemPrompt && systemPrompt.trim()) {
      messages.push(this.createMessage('system', systemPrompt))
    }
    
    // Add conversation history with defensive programming
    let workingHistory = conversationHistory;
    
    if (!Array.isArray(conversationHistory)) {
      Logger.debug('conversationHistory is not an array, attempting recovery');
      
      // Common recovery patterns
      if (conversationHistory === null || conversationHistory === undefined) {
        workingHistory = [];
      }
      else if (conversationHistory.conversations && Array.isArray(conversationHistory.conversations)) {
        workingHistory = conversationHistory.conversations;
      }
      else if (conversationHistory.values && typeof conversationHistory.values === 'function') {
        workingHistory = Array.from(conversationHistory.values());
      }
      else if (typeof conversationHistory === 'object') {
        workingHistory = Object.values(conversationHistory);
      }
      else {
        Logger.error('Cannot convert conversationHistory to array');
        throw new Error(`conversationHistory is ${typeof conversationHistory}, expected array`);
      }
    }
    
    Logger.debug('Working with history', {
      type: typeof workingHistory,
      isArray: Array.isArray(workingHistory),
      length: workingHistory.length
    });
    
    // Add conversation history (main thread + any branch history)
    workingHistory.forEach(conv => {
      if (conv.input || conv.prompt) {
        const userContent = conv.input || conv.prompt
        messages.push(this.createMessage('user', userContent))
      }
      if (conv.response) {
        messages.push(this.createMessage('assistant', conv.response))
      }
    })
    
    // Add new user input
    if (newUserInput && newUserInput.trim()) {
      messages.push(this.createMessage('user', newUserInput))
    }
    
    return messages
  }
  
  /**
   * Convert legacy message format to new Claude API format
   * Handles both old ConversationChainBuilder format and mixed formats
   * 
   * @param {Array} legacyMessages - Messages in old format
   * @returns {Array} Messages in proper Claude API format
   */
  static convertLegacyMessages(legacyMessages) {
    if (!Array.isArray(legacyMessages)) {
      throw new Error('MessageFormatter: Legacy messages must be an array')
    }
    
    return legacyMessages.map(msg => {
      // If message is already in correct format, return as-is
      if (Array.isArray(msg.content) && msg.content[0]?.type === 'text') {
        return msg
      }
      
      // If message is in old string format, convert it
      if (typeof msg.content === 'string') {
        return this.createMessage(msg.role, msg.content)
      }
      
      // Handle any other formats by attempting to extract text
      const content = msg.content?.text || msg.content?.toString() || ''
      return this.createMessage(msg.role, content)
    })
  }
  
  /**
   * Validate message array before sending to Claude API
   * 
   * @param {Array} messages - Array of messages to validate
   * @returns {Object} Validation result with {valid: boolean, errors: Array}
   */
  static validateMessages(messages) {
    const errors = []
    
    if (!Array.isArray(messages)) {
      errors.push('Messages must be an array')
      return { valid: false, errors }
    }
    
    if (messages.length === 0) {
      errors.push('Messages array cannot be empty')
      return { valid: false, errors }
    }
    
    // Validate each message structure
    messages.forEach((msg, index) => {
      if (!msg.role) {
        errors.push(`Message ${index}: Missing role`)
      } else if (!['user', 'assistant', 'system'].includes(msg.role)) {
        errors.push(`Message ${index}: Invalid role "${msg.role}". Must be user, assistant, or system`)
      }
      
      if (!msg.content) {
        errors.push(`Message ${index}: Missing content`)
      } else if (!Array.isArray(msg.content)) {
        errors.push(`Message ${index}: Content must be an array`)
      } else if (msg.content.length > 0) {
        msg.content.forEach((contentBlock, blockIndex) => {
          if (!contentBlock.type || !contentBlock.text) {
            errors.push(`Message ${index}: Content item ${blockIndex} missing type or text`)
          }
        })
      }
    })
    
    // Validate conversation flow (user/assistant alternation)
    let expectingAssistant = false
    let systemMessageSeen = false
    
    messages.forEach((msg, index) => {
      if (msg.role === 'system') {
        if (index !== 0) {
          errors.push(`Message ${index}: System message must be first`)
        }
        systemMessageSeen = true
        return
      }
      
      if (msg.role === 'user') {
        if (expectingAssistant && index > 0) {
          errors.push(`Message ${index}: Unexpected user message (expecting assistant response)`)
        }
        expectingAssistant = true
      }
      
      if (msg.role === 'assistant') {
        if (!expectingAssistant && index > 0) {
          errors.push(`Message ${index}: Unexpected assistant message (expecting user)`)
        }
        expectingAssistant = false
      }
    })
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Debug helper - log message structure for troubleshooting
   * 
   * @param {Array} messages - Messages to debug
   * @param {string} context - Context description (e.g., "main thread", "branch 1.1")
   */
  static debugMessages(messages, context = 'unknown') {
    console.group(`🔍 MessageFormatter Debug: ${context}`)
    console.log(`📊 Total messages: ${messages.length}`)
    
    messages.forEach((msg, index) => {
      const content = msg.content[0]?.text || 'No content'
      const preview = content.length > 50 ? content.substring(0, 50) + '...' : content
      console.log(`${index}: ${msg.role} - "${preview}"`)
    })
    
    const validation = this.validateMessages(messages)
    if (!validation.valid) {
      console.error('❌ Validation errors:', validation.errors)
    } else {
      console.log('✅ Messages valid')
    }
    
    console.groupEnd()
  }
  
  /**
   * Extract conversation history from DAGGER conversation objects
   * Builds conversation chain by following parentId relationships
   * 
   * @param {Array} conversations - Array of DAGGER conversation objects
   * @param {string} threadId - Thread ID to build chain for
   * @returns {Array} Ordered conversation history chain
   */
  static extractConversationHistory(conversations, threadId) {
    if (!Array.isArray(conversations)) {
      return []
    }
    
    if (threadId === 'main') {
      // For main thread, build the linear chain starting from root (parentId: null)
      const mainChain = []
      const rootConversation = conversations.find(conv => !conv.parentId)
      
      if (rootConversation) {
        mainChain.push(rootConversation)
        
        // Follow the main chain by finding conversations that continue linearly
        let currentId = rootConversation.id
        let foundNext = true
        
        while (foundNext) {
          foundNext = false
          // Look for conversation that has the current conversation as parent
          // but is not branching (there should be only one main continuation)
          const possibleContinuations = conversations.filter(conv => conv.parentId === currentId)
          
          if (possibleContinuations.length === 1) {
            // Single continuation = main thread continues
            mainChain.push(possibleContinuations[0])
            currentId = possibleContinuations[0].id
            foundNext = true
          } else if (possibleContinuations.length > 1) {
            // Multiple continuations = branching occurred, main thread ends here
            // In DAGGER, we might need additional logic to determine which is "main"
            // For now, let's take the first one as main continuation
            const mainContinuation = possibleContinuations[0] // Could be based on timestamp or other criteria
            mainChain.push(mainContinuation)
            currentId = mainContinuation.id
            foundNext = true
          }
        }
      }
      
      return mainChain
    }
    
    // Build conversation chain by following parentId relationships
    const conversationChain = []
    let currentId = threadId
    
    // Build the chain backwards from target conversation to root
    const visitedIds = new Set()
    while (currentId && !visitedIds.has(currentId)) {
      visitedIds.add(currentId)
      const conversation = conversations.find(conv => conv.id === currentId)
      
      if (conversation) {
        conversationChain.unshift(conversation) // Add to beginning
        currentId = conversation.parentId
      } else {
        break
      }
    }
    
    return conversationChain
  }
}

export { MessageFormatter };