import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { graphModel } from '../models/GraphModel.js';

const UIContext = createContext(null);

/**
 * UIContext manages all user interface state:
 * - View mode (linear/graph/prompts)
 * - Theme (dark/light)
 * - Modal states (welcome screen, branch menu, tokenizer)
 * - UI preferences with localStorage persistence
 */
export function UIProvider({ children }) {
  // View state
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('dagger-view') || 'linear';
  });

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('dagger-dark-mode');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  // Welcome screen state
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
    return graphModel.getAllConversations().length === 0;
  });

  // Personality selection state
  const [selectedPersonality, setSelectedPersonality] = useState(null);

  // Branch menu state
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [branchSourceId, setBranchSourceId] = useState(null);

  // Tokenizer popup state
  const [tokenizerState, setTokenizerState] = useState({
    isOpen: false,
    content: '',
    conversationId: null
  });

  // View change handler
  const handleViewChange = useCallback((view) => {
    console.log('📱 View change:', currentView, '→', view);
    setCurrentView(view);
    localStorage.setItem('dagger-view', view);
  }, [currentView]);

  // Theme toggle handler
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('dagger-dark-mode', JSON.stringify(newMode));
      console.log('🎨 Dark mode toggled:', newMode);
      return newMode;
    });
  }, []);

  // Tokenizer handlers
  const handleOpenTokenizer = useCallback((content, conversationId) => {
    console.log('🔢 Opening tokenizer for conversation:', conversationId);
    setTokenizerState({
      isOpen: true,
      content: content,
      conversationId: conversationId
    });
  }, []);

  const handleCloseTokenizer = useCallback(() => {
    console.log('🔢 Closing tokenizer');
    setTokenizerState({
      isOpen: false,
      content: '',
      conversationId: null
    });
  }, []);

  // Branch menu handlers
  const handleOpenBranchMenu = useCallback((sourceId) => {
    console.log('🌿 Opening branch menu for:', sourceId);
    setShowBranchMenu(true);
    setBranchSourceId(sourceId);
  }, []);

  const handleCloseBranchMenu = useCallback(() => {
    console.log('🌿 Closing branch menu');
    setShowBranchMenu(false);
    setBranchSourceId(null);
  }, []);

  // Welcome screen handlers
  const handleHideWelcomeScreen = useCallback(() => {
    console.log('👋 Hiding welcome screen');
    setShowWelcomeScreen(false);
  }, []);

  const handleResetWelcomeScreen = useCallback(() => {
    const hasConversations = graphModel.getAllConversations().length > 0;
    setShowWelcomeScreen(!hasConversations);
  }, []);

  // Personality selection handler
  const handleSelectPersonality = useCallback((personalityId) => {
    console.log('🎭 Personality selected:', personalityId);
    setSelectedPersonality(personalityId);
  }, []);

  const handleClearPersonality = useCallback(() => {
    console.log('🎭 Clearing personality selection');
    setSelectedPersonality(null);
  }, []);

  // Apply dark mode class to document root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Debug logging
  useEffect(() => {
    console.log('🎨 UIContext state:', {
      currentView,
      darkMode,
      showWelcomeScreen,
      showBranchMenu,
      tokenizerOpen: tokenizerState.isOpen,
      selectedPersonality
    });
  }, [currentView, darkMode, showWelcomeScreen, showBranchMenu, tokenizerState.isOpen, selectedPersonality]);

  const value = {
    // View state
    currentView,
    handleViewChange,

    // Theme state
    darkMode,
    toggleDarkMode,

    // Welcome screen state
    showWelcomeScreen,
    setShowWelcomeScreen,
    handleHideWelcomeScreen,
    handleResetWelcomeScreen,

    // Personality state
    selectedPersonality,
    setSelectedPersonality,
    handleSelectPersonality,
    handleClearPersonality,

    // Branch menu state
    showBranchMenu,
    branchSourceId,
    setShowBranchMenu,
    setBranchSourceId,
    handleOpenBranchMenu,
    handleCloseBranchMenu,

    // Tokenizer state
    tokenizerState,
    setTokenizerState,
    handleOpenTokenizer,
    handleCloseTokenizer
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/**
 * Hook to access UI context
 * @returns {Object} UI context with state and handlers
 * @throws {Error} If used outside UIProvider
 */
export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export default UIContext;
