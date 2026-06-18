import { createContext, useContext, useState, useCallback } from 'react';

const DebugContext = createContext(null);

/**
 * DebugContext manages debug panel state and visibility
 * - DEV mode only features
 * - Debug panel visibility
 * - Test template panel visibility
 * - Current conversation selection for debugging
 */
export function DebugProvider({ children }) {
  // Panel visibility states
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);
  const [templatePanelVisible, setTemplatePanelVisible] = useState(false);

  // Currently selected conversation for debugging
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  // Toggle debug panel
  const toggleDebugPanel = useCallback(() => {
    setDebugPanelVisible(prev => !prev);
  }, []);

  // Toggle template panel
  const toggleTemplatePanel = useCallback(() => {
    setTemplatePanelVisible(prev => !prev);
  }, []);

  // Select conversation for debugging
  const selectConversation = useCallback((conversationId) => {
    setSelectedConversationId(conversationId);
    if (conversationId && !debugPanelVisible) {
      setDebugPanelVisible(true);
    }
  }, [debugPanelVisible]);

  const value = {
    // Panel visibility
    debugPanelVisible,
    setDebugPanelVisible,
    toggleDebugPanel,

    templatePanelVisible,
    setTemplatePanelVisible,
    toggleTemplatePanel,

    // Current selection
    selectedConversationId,
    setSelectedConversationId,
    selectConversation
  };

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
}

/**
 * Hook to access debug context
 * @returns {Object} Debug context with state and handlers
 * @throws {Error} If used outside DebugProvider
 */
export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

export default DebugContext;
