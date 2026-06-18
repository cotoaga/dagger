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
   * @param {Object} options - Additional options
   * @param {boolean} options.useRootPrompt - Whether to prepend root system prompt (default: true)
   * @param {Object} options.branchMetadata - Branch metadata for template variables
   * @returns {Object} Complete message chain for Claude API
   */
  buildContextChain(parentNodeId, promptTemplateId, userInput, options = {}) {
    const { useRootPrompt = true, branchMetadata = {} } = options;

    const branchContext = this.createBranchContext(parentNodeId, promptTemplateId)
    const chainBuilder = new ConversationChainBuilder()

    // Prepare system prompts (root + personality)
    let systemPrompt = branchContext.systemPrompt;

    if (useRootPrompt) {
      const rootPrompt = this.getRootSystemPrompt(parentNodeId, branchMetadata);
      if (rootPrompt) {
        // Prepend root prompt to personality prompt
        systemPrompt = systemPrompt
          ? `${rootPrompt}\n\n---\n\n${systemPrompt}`
          : rootPrompt;
      }
    }

    return chainBuilder.buildChain(
      systemPrompt,
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
   * Get root system prompt with template variable replacement
   *
   * @private
   * @param {string|null} parentNodeId - Parent node ID for context
   * @param {Object} branchMetadata - Additional metadata about the current conversation
   * @returns {string} Root system prompt with variables replaced
   */
  getRootSystemPrompt(parentNodeId, branchMetadata = {}) {
    const rootPrompt = this.promptsModel.getRootSystemPrompt?.();
    if (!rootPrompt) {
      return '';
    }

    let promptText = rootPrompt.systemPrompt;

    // Build branch context description for template variable
    const branchContextDesc = this.buildBranchContextDescription(parentNodeId, branchMetadata);

    // Replace template variables
    promptText = promptText.replace('{{BRANCH_CONTEXT}}', branchContextDesc);

    return promptText;
  }

  /**
   * Build a human-readable description of the current branch context
   *
   * @private
   * @param {string|null} parentNodeId - Parent node ID
   * @param {Object} branchMetadata - Branch metadata
   * @returns {string} Formatted branch context description
   */
  buildBranchContextDescription(parentNodeId, branchMetadata) {
    const { displayNumber, branchType, depth = 0 } = branchMetadata;

    let contextParts = [];

    // Branch type information
    if (branchType) {
      contextParts.push(`- **Branch Type**: ${branchType}`);

      if (branchType === 'virgin') {
        contextParts.push(`- **Context Inheritance**: None (fresh start)`);
      } else if (branchType === 'personality') {
        contextParts.push(`- **Context Inheritance**: Custom prompt only (no history)`);
      } else if (branchType === 'knowledge') {
        contextParts.push(`- **Context Inheritance**: Full conversation history`);
      }
    } else {
      contextParts.push(`- **Branch Type**: Main thread`);
      contextParts.push(`- **Context Inheritance**: N/A (main conversation)`);
    }

    // Display number
    if (displayNumber !== undefined) {
      contextParts.push(`- **Display Number**: ${displayNumber}`);
    }

    // Depth information
    contextParts.push(`- **Branch Depth**: ${depth}`);

    // Parent information
    if (parentNodeId) {
      const parent = this.graphModel.getConversation(parentNodeId);
      if (parent) {
        contextParts.push(`- **Parent Node**: ${parent.displayNumber}`);
      }
    }

    return contextParts.join('\n');
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