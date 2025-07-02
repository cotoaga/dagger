import { v4 as uuidv4 } from 'uuid';
import Logger from '../utils/logger.js';

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
      status: 'active',                 // 'active', 'processing', 'complete', 'error'
      
      // Copy all additional metadata fields (systemPrompt, promptTemplate, etc.)
      ...metadata
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
    
    // Clear merge state
    this.mergedBranches.clear();
    this.mergeHistory.clear();
    
    // Clear localStorage completely for clean test state
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('dagger-graph-data');
    }
    
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
      
      console.group('🔄 GraphModel.loadFromStorage() Debug');
      
      const data = JSON.parse(stored);
      console.log('Step 1 - Raw data keys:', Object.keys(data));
      console.log('Step 1.1 - Raw data structure:', {
        conversations: data.conversations?.length || 'missing',
        branches: data.branches?.length || 'missing',
        mainThread: data.mainThread?.length || 'missing',
        mergedBranches: data.mergedBranches?.length || 'missing',
        conversationCounter: data.conversationCounter || 'missing'
      });
      
      // Restore conversations
      this.conversations = new Map(data.conversations || []);
      console.log('Step 2 - Conversations restored:', this.conversations.size);
      
      this.mainThread = data.mainThread || [];
      console.log('Step 3 - Main thread restored:', this.mainThread.length);
      
      this.branches = new Map(data.branches || []);
      console.log('Step 4 - Branches restored:', this.branches.size);
      
      this.conversationCounter = data.conversationCounter || 0;
      console.log('Step 5 - Counter restored:', this.conversationCounter);
      
      this.mergedBranches = new Set(data.mergedBranches || []);
      this.mergeHistory = new Map(data.mergeHistory || []);
      
      // Check for branch conversations in the restored data
      const allConversations = Array.from(this.conversations.values());
      const branchConvs = allConversations.filter(c => c.parentId || (c.displayNumber && c.displayNumber.toString().includes('.')));
      console.log('Step 6 - Branch conversations found after restore:', branchConvs.length);
      
      if (branchConvs.length > 0) {
        console.log('Step 6.1 - Branch conversation examples:', branchConvs.slice(0, 3).map(c => ({
          id: c.id,
          displayNumber: c.displayNumber,
          parentId: c.parentId,
          prompt: c.prompt?.substring(0, 50) + '...'
        })));
      }
      
      console.log(`✅ Loaded ${this.conversations.size} conversations from localStorage`);
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      console.groupEnd();
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
   * 
   * STRATEGIC FIX: Prevents duplicate branch IDs by checking existing display numbers
   * directly rather than just counting branches. This resolves the issue where
   * rapid branch creation or race conditions could create duplicates like "3.1.0" 
   * appearing twice in the graph.
   */
  generateBranchId(parentDisplayNumber) {
    // Count existing branches from this parent
    const allConversations = Array.from(this.conversations.values());
    const existingBranches = allConversations
      .filter(conv => {
        if (!conv.parentDisplayNumber) return false;
        return conv.parentDisplayNumber === String(parentDisplayNumber);
      });
    
    // DIAGNOSTIC: Log the branch counting process
    Logger.debug('BRANCH ID GENERATION', {
      parentDisplayNumber,
      existingBranchCount: existingBranches.length
    });
    
    // ROBUST SOLUTION: Find the next available branch number by checking existing display numbers
    let branchNumber = 1;
    let generatedId;
    let attempts = 0;
    const maxAttempts = 100; // Safety limit
    
    do {
      generatedId = `${parentDisplayNumber}.${branchNumber}.0`;
      const existingWithSameId = allConversations.find(conv => conv.displayNumber === generatedId);
      
      if (!existingWithSameId) {
        // Found a unique ID
        break;
      }
      
      console.warn(`⚠️ Branch ID ${generatedId} already exists, trying next number...`);
      branchNumber++;
      attempts++;
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      console.error('❌ FAILED TO GENERATE UNIQUE BRANCH ID after', maxAttempts, 'attempts');
      // Fallback: Add timestamp to ensure uniqueness
      generatedId = `${parentDisplayNumber}.${branchNumber}.${Date.now()}`;
    }
    
    console.log('✅ Generated unique branch ID:', generatedId, `(attempt ${attempts + 1})`);
    return generatedId;
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
    // Force fresh load if data seems incomplete (session restoration fix)
    if (this.conversations.size === 0 && localStorage.getItem('dagger-conversations-v2')) {
      console.log('🔄 Detected incomplete state during getAllConversationsWithBranches, forcing reload...');
      this.loadFromStorage();
    }
    
    // Additional check: if we have localStorage data but no branch conversations, reload
    const currentConversations = Array.from(this.conversations.values());
    const branchCount = currentConversations.filter(c => c.parentId || (c.displayNumber && c.displayNumber.toString().includes('.'))).length;
    
    if (branchCount === 0 && localStorage.getItem('dagger-conversations-v2')) {
      const storedData = localStorage.getItem('dagger-conversations-v2');
      try {
        const parsed = JSON.parse(storedData);
        const storedBranchCount = parsed.conversations?.filter(([id, conv]) => conv.parentId || conv.displayNumber?.includes('.')).length || 0;
        
        if (storedBranchCount > 0) {
          console.log('🔄 Detected missing branches in memory but present in storage, forcing reload...');
          console.log(`Storage has ${storedBranchCount} branches, memory has ${branchCount}`);
          this.loadFromStorage();
        }
      } catch (error) {
        console.warn('⚠️ Could not parse localStorage for branch check:', error);
      }
    }
    
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
    console.group('🔍 getBranchThread DEBUG');
    
    console.log('Input displayNumber:', displayNumber, typeof displayNumber);
    
    // Step 1: Check getBranchPrefix
    const branchPrefix = this.getBranchPrefix(displayNumber);
    console.log('Step 1 - branchPrefix:', branchPrefix);
    
    // Step 2: Check this.conversations
    console.log('Step 2 - this.conversations:', {
      type: typeof this.conversations,
      isMap: this.conversations instanceof Map,
      size: this.conversations.size,
      firstKey: Array.from(this.conversations.keys())[0],
      firstValue: Array.from(this.conversations.values())[0]
    });
    
    // Step 3: Check Array.from conversion
    const conversationsArray = Array.from(this.conversations.values());
    console.log('Step 3 - conversationsArray:', {
      type: typeof conversationsArray,
      isArray: Array.isArray(conversationsArray),
      length: conversationsArray.length
    });
    
    // Step 4: Check filter operation
    const filtered = conversationsArray.filter(conv => {
      const convDisplay = String(conv.displayNumber);
      const matches = convDisplay.startsWith(branchPrefix);
      if (matches) {
        console.log('Filter match:', { convDisplay, branchPrefix, conv });
      }
      return matches;
    });
    
    console.log('Step 4 - filtered result:', {
      type: typeof filtered,
      isArray: Array.isArray(filtered),
      length: filtered.length,
      items: filtered
    });
    
    // Step 5: Check sort operation
    const sorted = filtered.sort((a, b) => {
      const aParts = String(a.displayNumber).split('.');
      const bParts = String(b.displayNumber).split('.');
      const aLast = parseInt(aParts[aParts.length - 1]);
      const bLast = parseInt(bParts[bParts.length - 1]);
      return aLast - bLast;
    });
    
    console.log('Step 5 - final sorted result:', {
      type: typeof sorted,
      isArray: Array.isArray(sorted),
      length: sorted.length,
      result: sorted
    });
    
    console.groupEnd();
    return sorted;
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

  // ========================================
  // CONVERSATIONAL API LAYER
  // Clean interface for prompt/response flows
  // ========================================

  /**
   * Add a user prompt node (1>, 2>, 3>, etc.)
   * Returns: { id: '1>', type: 'user_prompt', content, timestamp }
   */
  addPromptNode(content) {
    // Create conversation with prompt but no response yet
    const conversation = this.addConversation(content, '');
    
    // Use the actual display number that was assigned (1-indexed for UI)
    const displayId = `${conversation.displayNumber + 1}>`;
    
    return {
      id: displayId,
      type: 'user_prompt',
      content: content,
      timestamp: new Date(),
      _internalId: conversation.id // For internal tracking
    };
  }

  /**
   * Add the next prompt in main thread (auto-increment)
   * Returns: { id: '2>', type: 'user_prompt', content, timestamp }
   */
  addNextPrompt(content) {
    return this.addPromptNode(content);
  }

  /**
   * Add AI response to a prompt (>1, >2, >2.1, etc.)
   * Returns: { id: '>1', type: 'ai_response', content, timestamp }
   */
  addResponseToPrompt(promptId, content) {
    // Extract number from promptId (e.g., '2>' -> '2', '2.1>' -> '2.1')
    const promptNumber = promptId.replace('>', '');
    const responseId = `>${promptNumber}`;
    
    // Convert 1-indexed prompt number to 0-indexed display number for lookup
    let displayNumberForLookup;
    if (promptNumber.includes('.')) {
      // Branch: '2.1' -> convert first part: (2-1).1 = '1.1'
      const parts = promptNumber.split('.');
      const mainPart = parseInt(parts[0]) - 1;
      displayNumberForLookup = `${mainPart}.${parts[1]}`;
    } else {
      // Main thread: '2' -> '1' (2-1)
      displayNumberForLookup = String(parseInt(promptNumber) - 1);
    }
    
    // Find the conversation by adjusted display number
    const conversation = this.getConversationByDisplayNumber(displayNumberForLookup);
    if (!conversation) {
      throw new Error(`Prompt ${promptId} not found (looked for display number ${displayNumberForLookup})`);
    }
    
    // Update conversation with response
    this.updateConversation(conversation.id, { response: content });
    
    return {
      id: responseId,
      type: 'ai_response',
      content: content,
      timestamp: new Date(),
      _internalId: conversation.id
    };
  }

  /**
   * Create a branch from a prompt (2> -> 2.1>, 2.2>, etc.)
   * Returns: { id: '2.1>', type: 'user_prompt', content, timestamp, isBranch: true }
   */
  addBranchFromPrompt(promptId, content) {
    // Extract base number from promptId (e.g., '2>' -> '2')
    const baseNumber = promptId.replace('>', '');
    
    // Convert 1-indexed prompt number to 0-indexed display number for parent lookup
    const parentDisplayNumber = String(parseInt(baseNumber) - 1);
    
    // Find existing branches for this base (use original baseNumber for branch counting)
    const existingBranches = this.getAllBranchesForBase(baseNumber);
    const branchNumber = existingBranches.length + 1;
    const branchId = `${baseNumber}.${branchNumber}>`;
    
    // Find parent conversation using adjusted display number
    const parentConversation = this.getConversationByDisplayNumber(parentDisplayNumber);
    if (!parentConversation) {
      throw new Error(`Parent prompt ${promptId} not found (looked for display number ${parentDisplayNumber})`);
    }
    
    // Create branch conversation using existing createBranch method
    const branchConversation = this.createBranch(parentConversation.id, 'exploration');
    this.updateConversation(branchConversation.id, { prompt: content });
    
    return {
      id: branchId,
      type: 'user_prompt',
      content: content,
      timestamp: new Date(),
      isBranch: true,
      _internalId: branchConversation.id
    };
  }

  /**
   * Helper: Get all existing branches for a base number
   * Looks for internal format like "1.1.0", "1.2.0" from base "1"
   */
  getAllBranchesForBase(baseNumber) {
    const branches = [];
    for (const [id, conversation] of this.conversations) {
      const displayNum = String(conversation.displayNumber);
      // Look for pattern: baseNumber.X.0 (e.g., "1.1.0", "1.2.0")
      const pattern = new RegExp(`^${baseNumber}\\.(\\d+)\\.0$`);
      if (pattern.test(displayNum)) {
        branches.push(conversation);
      }
    }
    return branches;
  }

  /**
   * Helper: Get conversation by display number (as string)
   * Handles both main thread ('2') and branch ('2.1') formats
   */
  getConversationByDisplayNumber(displayNumber) {
    // Convert string to proper numeric format
    const numericDisplay = parseFloat(displayNumber);
    
    // First try exact numeric match
    const conversation = this.getConversationByNumber(numericDisplay);
    if (conversation) return conversation;
    
    // If not found, search through all conversations manually
    // This handles edge cases where display numbers don't match exactly
    for (const [id, conv] of this.conversations) {
      if (String(conv.displayNumber) === String(displayNumber) || 
          parseFloat(conv.displayNumber) === numericDisplay) {
        return conv;
      }
    }
    
    return null;
  }

  /**
   * Close a branch by marking it as merged
   */
  closeBranch(displayNumber) {
    console.log('🔒 Closing branch:', displayNumber);
    
    if (!this.isBranchId(displayNumber)) {
      console.warn('Cannot close main thread');
      return false;
    }
    
    const branchPrefix = this.getBranchPrefix(displayNumber);
    this.mergedBranches.add(branchPrefix);
    
    console.log('✅ Branch closed:', branchPrefix);
    this.saveToStorage();
    return true;
  }

  /**
   * Add a merge edge to track merge relationships
   */
  addMergeEdge(sourceNodeId, targetNodeId) {
    console.log('🔗 Adding merge edge:', sourceNodeId, '→', targetNodeId);
    
    const sourceConv = this.conversations.get(sourceNodeId);
    const targetConv = this.conversations.get(targetNodeId);
    
    if (!sourceConv || !targetConv) {
      console.error('Cannot add merge edge: invalid node IDs');
      return false;
    }
    
    const mergeInfo = {
      sourceId: sourceNodeId,
      sourceDisplayNumber: sourceConv.displayNumber,
      targetId: targetNodeId,
      targetDisplayNumber: targetConv.displayNumber,
      timestamp: Date.now()
    };
    
    this.mergeHistory.set(sourceNodeId, mergeInfo);
    
    console.log('✅ Merge edge added:', mergeInfo);
    this.saveToStorage();
    return true;
  }
}

// Export singleton instance
export const graphModel = new GraphModel();