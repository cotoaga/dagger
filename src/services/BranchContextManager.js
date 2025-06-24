import { ConversationChainBuilder } from './ConversationChainBuilder.js'

/**
 * BranchContextManager - Handles context inheritance for conversation branches
 * 
 * Responsibilities:
 * - Extract parent conversation history
 * - Apply selected prompt templates
 * - Build complete context chains for API calls
 */
export class BranchContextManager {
  constructor(graphModel, promptsModel) {
    this.graphModel = graphModel
    this.promptsModel = promptsModel
  }

  /**
   * Create branch context with inherited parent history + prompt template
   * 
   * @param {string|null} parentNodeId - Parent node to inherit from (null for virgin branch)
   * @param {string|null} promptTemplateId - Prompt template to apply (null for no template)
   * @returns {Object} Branch context with parentHistory and systemPrompt
   */
  createBranchContext(parentNodeId, promptTemplateId) {
    const parentHistory = this.extractParentHistory(parentNodeId)
    const systemPrompt = this.getSystemPrompt(promptTemplateId)
    
    return {
      parentHistory,
      systemPrompt,
      branchMetadata: {
        parentNodeId,
        promptTemplateId,
        createdAt: new Date().toISOString()
      }
    }
  }

  /**
   * Build complete context chain for Claude API call
   * 
   * @param {string|null} parentNodeId - Parent node to inherit from
   * @param {string|null} promptTemplateId - Prompt template to apply
   * @param {string} userInput - New user input for the branch
   * @returns {Object} Complete message chain for Claude API
   */
  buildContextChain(parentNodeId, promptTemplateId, userInput) {
    const branchContext = this.createBranchContext(parentNodeId, promptTemplateId)
    const chainBuilder = new ConversationChainBuilder()
    
    return chainBuilder.buildChain(
      branchContext.systemPrompt,
      branchContext.parentHistory,
      userInput
    )
  }

  /**
   * Extract conversation history from parent node up to branch point
   * 
   * @private
   * @param {string|null} parentNodeId - Parent node ID to extract history from
   * @returns {Array} Conversation history as message objects
   */
  extractParentHistory(parentNodeId) {
    if (!parentNodeId) {
      return [] // Virgin branch - no parent context
    }

    const conversations = this.graphModel.getAllConversations()
    const parentHistory = []

    // Find all conversations up to and including parent node
    for (const conversation of conversations) {
      if (this.isNodeInParentChain(conversation.id, parentNodeId)) {
        // Add user prompt
        parentHistory.push({
          role: 'user',
          content: conversation.prompt,
          nodeId: conversation.id,
          timestamp: conversation.timestamp
        })

        // Add AI response if exists
        if (conversation.response) {
          parentHistory.push({
            role: 'assistant', 
            content: conversation.response,
            nodeId: `>${conversation.displayNumber}`,
            timestamp: conversation.timestamp
          })
        }
      }

      // Stop at parent node
      if (conversation.id === parentNodeId) {
        break
      }
    }

    return parentHistory
  }

  /**
   * Get system prompt from prompt template
   * 
   * @private
   * @param {string|null} promptTemplateId - Prompt template ID
   * @returns {string} System prompt content
   */
  getSystemPrompt(promptTemplateId) {
    if (!promptTemplateId) {
      return '' // No template selected
    }

    const promptTemplate = this.promptsModel.getPrompt(promptTemplateId)
    return promptTemplate ? promptTemplate.content : ''
  }

  /**
   * Check if node is in parent chain leading to target node
   * 
   * @private
   * @param {string} nodeId - Node to check
   * @param {string} targetNodeId - Target parent node
   * @returns {boolean} True if node is in parent chain
   */
  isNodeInParentChain(nodeId, targetNodeId) {
    // Main thread nodes: 1>, 2>, 3>, 4>
    // Branch nodes: 3.1>, 3.2>, 4.1>, etc.
    
    const nodeNumber = this.extractNodeNumber(nodeId)
    const targetNumber = this.extractNodeNumber(targetNodeId)
    
    // Include all nodes up to target
    return nodeNumber <= targetNumber
  }

  /**
   * Extract numeric part from node ID for comparison
   * 
   * @private
   * @param {string} nodeId - Node ID like "3>" or "4.1>"
   * @returns {number} Numeric part for comparison
   */
  extractNodeNumber(nodeId) {
    const match = nodeId.match(/^(\d+)/)
    return match ? parseInt(match[1]) : 0
  }
}