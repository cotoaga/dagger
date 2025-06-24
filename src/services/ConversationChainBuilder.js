/**
 * ConversationChainBuilder - Constructs Claude API message chains
 * 
 * Responsibilities:
 * - Combine system prompt + parent history + user input
 * - Format for Claude API requirements
 * - Handle edge cases (missing prompts, empty history)
 */
export class ConversationChainBuilder {
  
  /**
   * Build complete message chain for Claude API
   * 
   * @param {string} systemPrompt - System prompt (empty string if none)
   * @param {Array} parentHistory - Parent conversation history
   * @param {string} userInput - New user input
   * @returns {Object} Message chain formatted for Claude API
   */
  buildChain(systemPrompt, parentHistory, userInput) {
    const messages = []

    // Add system prompt if provided
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: systemPrompt.trim()
      })
    }

    // Add parent conversation history
    for (const historyMessage of parentHistory) {
      messages.push({
        role: historyMessage.role,
        content: historyMessage.content
      })
    }

    // Add new user input
    messages.push({
      role: 'user',
      content: userInput
    })

    return {
      messages,
      metadata: {
        totalMessages: messages.length,
        hasSystemPrompt: !!systemPrompt,
        parentHistoryLength: parentHistory.length,
        createdAt: new Date().toISOString()
      }
    }
  }

  /**
   * Validate message chain structure
   * 
   * @param {Object} messageChain - Built message chain
   * @returns {Object} Validation result with errors
   */
  validateChain(messageChain) {
    const errors = []

    if (!messageChain.messages || !Array.isArray(messageChain.messages)) {
      errors.push('Messages must be an array')
      return { valid: false, errors }
    }

    if (messageChain.messages.length === 0) {
      errors.push('Message chain cannot be empty')
    }

    // Check role alternation (system can be first, then user/assistant alternating)
    let expectingUser = true
    for (let i = 0; i < messageChain.messages.length; i++) {
      const message = messageChain.messages[i]
      
      if (i === 0 && message.role === 'system') {
        continue // System prompt can be first
      }

      if (expectingUser && message.role !== 'user') {
        errors.push(`Expected user message at index ${i}, got ${message.role}`)
      } else if (!expectingUser && message.role !== 'assistant') {
        errors.push(`Expected assistant message at index ${i}, got ${message.role}`)
      }

      if (message.role === 'user' || message.role === 'assistant') {
        expectingUser = !expectingUser
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}