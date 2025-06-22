/**
 * Cross-View Navigation Helpers for DAGGER
 * Utilities for seamless synchronization between linear and graph views
 */

export const ViewSyncHelpers = {
  /**
   * Switch from graph to linear view with specific conversation selected
   * @param {string} nodeId - The conversation ID to focus on
   * @param {function} setViewMode - State setter for current view
   * @param {function} setSelectedNodeId - State setter for selected node
   */
  switchToLinearWithSelection: (nodeId, setViewMode, setSelectedNodeId) => {
    console.log(`🔄 Switching to linear view with selection: ${nodeId}`);
    setViewMode('linear');
    setSelectedNodeId(nodeId);
    // Auto-scroll will be handled by useEffect in App.jsx
  },

  /**
   * Switch from linear to graph view with specific conversation selected
   * @param {string} nodeId - The conversation ID to focus on
   * @param {function} setViewMode - State setter for current view
   * @param {function} setSelectedNodeId - State setter for selected node
   */
  switchToGraphWithSelection: (nodeId, setViewMode, setSelectedNodeId) => {
    console.log(`🗺️ Switching to graph view with selection: ${nodeId}`);
    setViewMode('graph');
    setSelectedNodeId(nodeId);
    // Graph centering will be handled by GraphView component
  },

  /**
   * Scroll linear view to specific conversation
   * @param {string} nodeId - The conversation ID to scroll to
   * @param {Object} conversationRefs - Ref object containing conversation DOM elements
   */
  scrollToConversation: (nodeId, conversationRefs) => {
    if (!nodeId || !conversationRefs.current[nodeId]) {
      console.warn(`⚠️ Cannot scroll to conversation ${nodeId} - element not found`);
      return;
    }

    const element = conversationRefs.current[nodeId];
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
    console.log(`📍 Scrolled to conversation: ${nodeId}`);
  },

  /**
   * Get the path to a conversation for breadcrumb navigation
   * @param {string} nodeId - The conversation ID
   * @param {Array} conversations - All conversations
   * @returns {Array} Array of conversation IDs from root to target
   */
  getPathToConversation: (nodeId, conversations) => {
    if (!nodeId || !conversations) return [];
    
    const conversation = conversations.find(c => c.id === nodeId);
    if (!conversation) return [];
    
    const path = [nodeId];
    const displayNum = String(conversation.displayNumber);
    
    // Build path back to root
    if (displayNum.includes('.')) {
      // This is a branch node
      const parts = displayNum.split('.');
      const mainThreadNum = parts[0];
      
      // Add the main thread node this branched from
      const mainConv = conversations.find(c => String(c.displayNumber) === mainThreadNum);
      if (mainConv) {
        path.unshift(mainConv.id);
        
        // Add path to main thread root
        const mainNum = parseInt(mainThreadNum);
        for (let i = mainNum - 1; i >= 0; i--) {
          const ancestorConv = conversations.find(c => String(c.displayNumber) === String(i));
          if (ancestorConv) {
            path.unshift(ancestorConv.id);
          }
        }
      }
    } else {
      // This is a main thread node
      const currentNum = parseInt(displayNum);
      for (let i = currentNum - 1; i >= 0; i--) {
        const ancestorConv = conversations.find(c => String(c.displayNumber) === String(i));
        if (ancestorConv) {
          path.unshift(ancestorConv.id);
        }
      }
    }
    
    return path;
  },

  /**
   * Determine if a conversation is in the main branch or a side branch
   * @param {Object} conversation - The conversation object
   * @returns {boolean} True if main branch, false if side branch
   */
  isMainBranch: (conversation) => {
    return !String(conversation.displayNumber).includes('.');
  },

  /**
   * Get conversation metadata for context display
   * @param {string} nodeId - The conversation ID
   * @param {Array} conversations - All conversations
   * @returns {Object} Metadata object with branch type, position, etc.
   */
  getConversationMetadata: (nodeId, conversations) => {
    if (!nodeId || !conversations) return null;
    
    const conversation = conversations.find(c => c.id === nodeId);
    if (!conversation) return null;
    
    const isMainBranch = ViewSyncHelpers.isMainBranch(conversation);
    const pathToRoot = ViewSyncHelpers.getPathToConversation(nodeId, conversations);
    
    return {
      conversation,
      isMainBranch,
      branchType: isMainBranch ? 'Main Branch' : 'Side Branch',
      displayNumber: conversation.displayNumber,
      pathToRoot,
      depth: pathToRoot.length - 1,
      status: conversation.status,
      timestamp: conversation.timestamp,
      tokenCount: conversation.tokenCount,
      processingTime: conversation.processingTime
    };
  },

  /**
   * Create a debounced version of a function
   * @param {function} func - Function to debounce
   * @param {number} wait - Delay in milliseconds
   * @returns {function} Debounced function
   */
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Check if a conversation is currently visible in the viewport
   * @param {string} nodeId - The conversation ID
   * @param {Object} conversationRefs - Ref object containing conversation DOM elements
   * @returns {boolean} True if visible, false otherwise
   */
  isConversationVisible: (nodeId, conversationRefs) => {
    if (!nodeId || !conversationRefs.current[nodeId]) return false;
    
    const element = conversationRefs.current[nodeId];
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Consider visible if at least 30% of the element is in viewport
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const elementHeight = rect.height;
    const visibilityRatio = visibleHeight / elementHeight;
    
    return visibilityRatio >= 0.3;
  },

  /**
   * Get all currently visible conversations
   * @param {Array} conversations - All conversations
   * @param {Object} conversationRefs - Ref object containing conversation DOM elements
   * @returns {Array} Array of visible conversation IDs
   */
  getVisibleConversations: (conversations, conversationRefs) => {
    if (!conversations || !conversationRefs.current) return [];
    
    return conversations
      .map(c => c.id)
      .filter(id => ViewSyncHelpers.isConversationVisible(id, conversationRefs));
  }
};