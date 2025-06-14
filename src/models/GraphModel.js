import { v4 as uuidv4 } from 'uuid';

// ISO DateTime formatting utilities
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
    
    // Merge state management
    this.mergedBranches = new Set();    // Track closed branches
    this.mergeHistory = new Map();      // Track merge operations
    
    this.loadFromStorage();
  }
  
  /**
   * Add a new conversation to the main thread
   */
  addConversation(prompt, response = '', metadata = {}) {
    const id = uuidv4();
    
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
      temperature: metadata.temperature || 0.7,
      
      // Thread structure
      parentId: null,                   // Main thread has no parent
      branchType: null,                 // 'virgin', 'personality', 'knowledge'
      depth: 0,                         // Main thread depth = 0
      
      // Status
      status: 'active'                  // 'active', 'processing', 'complete', 'error'
    };
    
    this.conversations.set(id, conversation);
    this.mainThread.push(id);
    this.conversationCounter++; // Increment after assignment for zero-indexing
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
   * Get friendly display name for model
   */
  getModelDisplayName(model) {
    switch (model) {
      case 'claude-sonnet-4-20250514': return '🧠 Claude Sonnet 4';
      case 'claude-opus-4-20250514': return '🚀 Claude Opus 4';
      case 'claude-3-5-sonnet-20241022': return '⚙️ Claude 3.5 Sonnet (Legacy)';
      case 'claude-3-5-haiku-20241022': return '🍃 Claude 3.5 Haiku (Legacy)';
      case 'claude-3-opus-20240229': return '🎵 Claude 3 Opus (Legacy)';
      default:
        if (model?.includes('sonnet-4')) return '🧠 Claude Sonnet 4';
        if (model?.includes('opus-4')) return '🚀 Claude Opus 4';
        if (model?.includes('sonnet')) return '🎭 Claude Sonnet';
        if (model?.includes('haiku')) return '🍃 Claude Haiku';
        if (model?.includes('opus')) return '🎵 Claude Opus';
        return model || 'Unknown Model';
    }
  }

  /**
   * Export to clean markdown format
   */
  exportToMarkdown() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const conversations = this.getAllConversations();
    
    let markdown = `# DAGGER Conversation Export v2.0\n`;
    markdown += `**Exported:** ${formatISODateTime(Date.now())}\n`;
    markdown += `**Total Conversations:** ${conversations.length}\n\n`;
    
    conversations.forEach((conv, index) => {
      markdown += `## ${conv.displayNumber}. Conversation\n`;
      markdown += `**Model:** ${this.getModelDisplayName(conv.model)}\n`;
      markdown += `**ID:** \`${conv.id}\`\n`;
      markdown += `**Timestamp:** ${formatISODateTime(conv.timestamp)}\n\n`;
      
      markdown += `**Prompt:**\n${conv.prompt}\n\n`;
      
      if (conv.response) {
        markdown += `**Response:**\n${conv.response}\n\n`;
      }
      
      markdown += `**Metadata:**\n`;
      markdown += `- Processing Time: ${conv.processingTime}ms\n`;
      markdown += `- Tokens: ${conv.tokenCount}\n`;
      markdown += `- Model: ${this.getModelDisplayName(conv.model)} (\`${conv.model}\`)\n`;
      markdown += `- Temperature: ${conv.temperature}\n`;
      markdown += `- Status: ${conv.status}\n\n`;
      
      markdown += `---\n\n`;
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
        mergedBranches: Array.from(this.mergedBranches),
        mergeHistory: Array.from(this.mergeHistory.entries()),
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
      this.mergedBranches = new Set(data.mergedBranches || []);
      this.mergeHistory = new Map(data.mergeHistory || []);
      
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

  /**
   * Generate hierarchical branch ID following pattern: parent.branch.0
   */
  generateBranchId(parentDisplayNumber) {
    // Count existing branches from this parent
    const existingBranches = Array.from(this.conversations.values())
      .filter(conv => {
        if (!conv.parentDisplayNumber) return false;
        return conv.parentDisplayNumber === String(parentDisplayNumber);
      })
      .length;
    
    const branchNumber = existingBranches + 1; // 1, 2, 3...
    return `${parentDisplayNumber}.${branchNumber}.0`;
  }

  /**
   * Generate next ID in branch thread
   */
  generateNextInBranch(currentBranchId) {
    const parts = String(currentBranchId).split('.');
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

  /**
   * Create a branch from an existing conversation
   */
  createBranch(parentId, branchType, summaryType = 'brief') {
    const parentConversation = this.conversations.get(parentId);
    if (!parentConversation) {
      throw new Error(`Parent conversation ${parentId} not found`);
    }

    const branchId = uuidv4();
    
    // Generate hierarchical display number
    const parentDisplayNumber = parentConversation.displayNumber;
    const branchDisplayNumber = this.generateBranchId(parentDisplayNumber);
    
    // Create branch conversation
    const branchConversation = {
      id: branchId,
      displayNumber: branchDisplayNumber, // e.g., "2.1.0"
      prompt: '', // Will be filled when user starts conversation
      response: '',
      timestamp: Date.now(),
      
      // Branch metadata
      parentId: parentId,
      parentDisplayNumber: parentDisplayNumber,
      branchType: branchType, // 'virgin', 'personality', 'knowledge'
      depth: this.calculateDepth(parentId) + 1,
      
      // Conversation metadata
      processingTime: 0,
      tokenCount: 0,
      model: 'unknown',
      temperature: 0.7,
      
      // Status
      status: 'ready' // 'ready', 'active', 'processing', 'complete'
    };

    // Store the branch
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

  /**
   * Add conversation to existing branch (for branch continuation)
   */
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
      temperature: metadata.temperature || 0.7,
      status: response ? 'complete' : 'processing'
    };
    
    this.conversations.set(newId, newConversation);
    this.saveToStorage();
    
    return newConversation;
  }

  /**
   * Calculate depth in branch hierarchy
   */
  calculateDepth(conversationId) {
    let depth = 0;
    let current = this.conversations.get(conversationId);
    
    while (current && current.parentId) {
      depth++;
      current = this.conversations.get(current.parentId);
    }
    
    return depth;
  }

  /**
   * Get all conversations including branches for graph display
   */
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

  /**
   * Get the root conversation of a branch
   */
  getBranchRoot(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;
    
    if (!this.isBranchId(conversation.displayNumber)) {
      return conversation; // Already at root
    }
    
    // Find the first conversation in this branch thread
    const displayParts = this.parseHierarchicalId(conversation.displayNumber);
    displayParts[displayParts.length - 1] = 0; // Set to .0
    const rootDisplayNumber = displayParts.join('.');
    
    // Find conversation with this display number
    for (const conv of this.conversations.values()) {
      if (String(conv.displayNumber) === rootDisplayNumber) {
        return conv;
      }
    }
    
    return conversation; // Fallback
  }

  /**
   * Get all conversations in a branch thread
   */
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

  /**
   * Get branch prefix for finding thread conversations
   */
  getBranchPrefix(displayNumber) {
    const parts = String(displayNumber).split('.');
    if (parts.length >= 3) {
      // "1.1.2" → "1.1."
      return parts.slice(0, 2).join('.') + '.';
    }
    return displayNumber;
  }

  // =================== MERGE FUNCTIONALITY ===================

  /**
   * Calculate node hierarchy level (0 = main, 1 = first branch, etc.)
   */
  getHierarchyLevel(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return -1;
    
    if (!this.isBranchId(conversation.displayNumber)) {
      return 0; // Main thread
    }
    
    const displayParts = this.parseHierarchicalId(conversation.displayNumber);
    return Math.floor((displayParts.length - 1) / 2); // branch = 1, sub-branch = 2
  }

  /**
   * Check if a merge is valid according to hierarchy rules
   */
  canMergeNodes(sourceConversationId, targetConversationId) {
    const sourceConv = this.conversations.get(sourceConversationId);
    const targetConv = this.conversations.get(targetConversationId);
    
    if (!sourceConv || !targetConv) return false;
    if (!this.isEndNode(sourceConversationId) || !this.isEndNode(targetConversationId)) return false;
    if (sourceConversationId === targetConversationId) return false;
    
    const sourceLevel = this.getHierarchyLevel(sourceConversationId);
    const targetLevel = this.getHierarchyLevel(targetConversationId);
    
    // Can only merge to main branch or up the hierarchy
    return targetLevel === 0 || targetLevel <= sourceLevel;
  }

  /**
   * Check if conversation is an end node (no children in its branch)
   */
  isEndNode(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    
    // For main thread, check if it's the last in mainThread array
    if (!this.isBranchId(conversation.displayNumber)) {
      const lastMainId = this.mainThread[this.mainThread.length - 1];
      return lastMainId === conversationId;
    }
    
    // For branches, check if it's the last in the branch thread
    const branchThread = this.getBranchThread(conversation.displayNumber);
    const lastInBranch = branchThread[branchThread.length - 1];
    return lastInBranch?.id === conversationId;
  }

  /**
   * Perform the merge operation
   */
  mergeNodes(sourceConversationId, targetConversationId) {
    if (!this.canMergeNodes(sourceConversationId, targetConversationId)) {
      throw new Error('Invalid merge operation - check hierarchy rules');
    }

    const sourceConv = this.conversations.get(sourceConversationId);
    const targetConv = this.conversations.get(targetConversationId);

    // Create merge record
    const mergeId = uuidv4();
    const mergeRecord = {
      id: mergeId,
      sourceConversationId: sourceConversationId,
      targetConversationId: targetConversationId,
      sourceDisplayNumber: sourceConv.displayNumber,
      targetDisplayNumber: targetConv.displayNumber,
      timestamp: Date.now(),
      type: 'merge'
    };

    // Mark the source branch as merged
    const sourceBranchPrefix = this.getBranchPrefix(sourceConv.displayNumber);
    this.mergedBranches.add(sourceBranchPrefix);
    
    this.mergeHistory.set(sourceConversationId, {
      targetConversationId: targetConversationId,
      targetDisplayNumber: targetConv.displayNumber,
      timestamp: Date.now(),
      sourceBranchPrefix: sourceBranchPrefix
    });

    this.saveToStorage();
    
    console.log(`✅ Merged ${sourceConv.displayNumber} into ${targetConv.displayNumber}`);
    
    return mergeId;
  }

  /**
   * Get merge info for a conversation
   */
  getMergeInfo(conversationId) {
    return this.mergeHistory.get(conversationId);
  }

  /**
   * Check if a branch thread is merged (closed)
   */
  isThreadMerged(displayNumber) {
    if (!this.isBranchId(displayNumber)) return false;
    
    const branchPrefix = this.getBranchPrefix(displayNumber);
    return this.mergedBranches.has(branchPrefix);
  }

  /**
   * Get all end nodes (for UI highlighting)
   */
  getAllEndNodes() {
    const endNodes = [];
    
    for (const [id, conversation] of this.conversations) {
      if (this.isEndNode(id) && !this.isThreadMerged(conversation.displayNumber)) {
        endNodes.push({
          id: id,
          displayNumber: conversation.displayNumber,
          hierarchyLevel: this.getHierarchyLevel(id)
        });
      }
    }
    
    return endNodes;
  }

  // =================== BRANCH MANAGEMENT FIXES ===================

  /**
   * Create branch only when first message is added (prevents ghost branches)
   */
  createBranchInfo(fromNodeId, branchName = null) {
    const fromConversation = this.conversations.get(fromNodeId);
    if (!fromConversation) {
      throw new Error(`Cannot create branch: conversation ${fromNodeId} not found`);
    }

    // Generate branch display number based on parent
    const parentDisplayNumber = fromConversation.displayNumber;
    const branchDisplayNumber = this.generateBranchId(parentDisplayNumber);
    
    console.log('🌿 Creating branch info:', branchDisplayNumber, 'from conversation:', fromNodeId);
    
    // DON'T create the conversation yet - wait for first message
    return {
      branchDisplayNumber: branchDisplayNumber,
      parentConversationId: fromNodeId,
      parentDisplayNumber: parentDisplayNumber
    };
  }

  /**
   * Add first message to branch (this actually creates the branch conversation)
   */
  addBranchMessage(branchInfo, content, options = {}) {
    const conversationId = uuidv4();
    
    const conversation = {
      id: conversationId,
      displayNumber: branchInfo.branchDisplayNumber,
      prompt: content,
      response: '',
      timestamp: Date.now(),
      
      // Branch metadata
      parentId: branchInfo.parentConversationId,
      parentDisplayNumber: branchInfo.parentDisplayNumber,
      branchType: options.branchType || 'virgin',
      depth: this.calculateDepth(branchInfo.parentConversationId) + 1,
      
      // Conversation metadata
      processingTime: 0,
      tokenCount: 0,
      model: options.model || 'claude-sonnet-4-20250514',
      temperature: options.temperature || 0.7,
      status: 'processing'
    };

    this.conversations.set(conversationId, conversation);
    
    // Track branch relationship
    if (!this.branches.has(branchInfo.parentConversationId)) {
      this.branches.set(branchInfo.parentConversationId, []);
    }
    this.branches.get(branchInfo.parentConversationId).push(conversationId);
    
    console.log('✅ Branch conversation created:', branchInfo.branchDisplayNumber, 'with first message');
    this.saveToStorage();
    return conversation;
  }

  /**
   * Clean up empty threads and ghost branches
   */
  cleanupEmptyThreads() {
    const conversationsWithContent = new Set();
    
    // Find all conversations that have actual content
    for (const [id, conversation] of this.conversations) {
      if (conversation.prompt && conversation.prompt.trim()) {
        conversationsWithContent.add(id);
      }
    }
    
    console.log('🧹 Conversations with content:', conversationsWithContent.size);
    
    // Remove any empty conversations (shouldn't happen with proper flow)
    for (const [id, conversation] of this.conversations) {
      if (!conversation.prompt || !conversation.prompt.trim()) {
        console.log('🗑️ Removing empty conversation:', id, conversation.displayNumber);
        this.conversations.delete(id);
      }
    }
    
    this.saveToStorage();
  }

  /**
   * Get thread summary for debugging
   */
  getThreadSummary() {
    const threadGroups = new Map();
    
    // Group conversations by thread (main vs branches)
    for (const [id, conversation] of this.conversations) {
      let threadKey;
      
      if (this.isBranchId(conversation.displayNumber)) {
        // Branch conversation - group by branch prefix
        threadKey = this.getBranchPrefix(conversation.displayNumber);
      } else {
        // Main thread conversation
        threadKey = 'main';
      }
      
      if (!threadGroups.has(threadKey)) {
        threadGroups.set(threadKey, {
          id: threadKey,
          messageCount: 0,
          lastMessage: null,
          conversations: []
        });
      }
      
      const thread = threadGroups.get(threadKey);
      thread.messageCount++;
      thread.lastMessage = conversation.prompt;
      thread.conversations.push(conversation);
    }
    
    return Array.from(threadGroups.values());
  }
}

// Export singleton instance
export const graphModel = new GraphModel();