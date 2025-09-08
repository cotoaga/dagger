import { useState, useEffect, useCallback, useRef } from 'react'
import { DaggerInput } from './components/DaggerInput.jsx'
import { DaggerOutput } from './components/DaggerOutput.jsx'
import { DaggerInputDisplay } from './components/DaggerInputDisplay.jsx'
import { GraphView } from './components/GraphView.jsx'
import { ViewToggle } from './components/ViewToggle.jsx'
import { BranchMenu } from './components/BranchMenu.jsx'
import ActiveThreads from './components/ActiveThreads.jsx'
import PromptsTab from './components/PromptsTab.jsx'
import WelcomeScreen from './components/WelcomeScreen.jsx'
import SessionApiKeyInput from './components/SessionApiKeyInput.jsx'
import { graphModel } from './models/GraphModel.js'
import { claudeAPI as ClaudeAPI } from './services/ClaudeAPI.js'
import PromptsModel from './models/PromptsModel.js'
import promptRegistry from './prompts/index.ts'
import ConfigService, { ConfigService as ConfigServiceClass } from './services/ConfigService.js'
import { BranchContextManager } from './services/BranchContextManager.js'
import { ConversationChainBuilder } from './services/ConversationChainBuilder.js'
import { MessageFormatter } from './services/MessageFormatter.js'
import { TokenGauge } from './components/TokenGauge.jsx'
import { TokenUsageDisplay, SessionTokenSummary } from './components/TokenUsageDisplay.jsx'
import { TokenizerPopup } from './components/TokenizerPopup.jsx'
import './App.css'

// Dynamic session timer component
function SessionTimer({ lastActivity }) {
  const [remainingTime, setRemainingTime] = useState(null);
  
  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, 30 * 60 * 1000 - elapsed); // 30 minutes
      setRemainingTime(remaining);
    };
    
    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [lastActivity]);
  
  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return '0 min';
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} min`;
  };
  
  return (
    <span className="session-indicator">
      🕒 Session expires in {formatTimeRemaining(remainingTime)}
    </span>
  );
}

// Intellectually honest status messages for LLMs
const honestStatusMessages = [
  "Predicting the next word...",
  "Pattern matching at scale...", 
  "Statistically interpolating...",
  "Confidently hallucinating...",
  "Consulting the probability gods...",
  "Synthesizing plausible nonsense...",
  "Extrapolating from training data...",
  "Generating coherent-sounding tokens...",
  "Applying learned correlations...",
  "Sampling from possibility space...",
  "Constructing convincing responses...",
  "Performing linguistic magic tricks...",
  "Transforming uncertainty into text...",
  "Modeling human-like output...",
  "Sampling from learned distributions...",
  "Confidently guessing based on patterns...",
  "Hallucinating plausible text sequences...",
  "Generating sophisticated BS with statistical confidence..."
]

const getRandomHonestStatus = () => {
  return honestStatusMessages[Math.floor(Math.random() * honestStatusMessages.length)]
}

function App() {
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const selectedNodeId = currentConversationId
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [sessionApiKey, setSessionApiKey] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    // Default to dark mode, or load from localStorage
    const saved = localStorage.getItem('dagger-dark-mode')
    return saved ? JSON.parse(saved) : true
  })
  const [apiTestStatus, setApiTestStatus] = useState('')
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('dagger-model') || 'claude-sonnet-4-20250514'
  })
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('dagger-temperature')
    return saved ? parseFloat(saved) : 0.7 // Default Claude temperature
  })
  const [extendedThinking, setExtendedThinking] = useState(false)
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('dagger-view') || 'linear'
  }) // 'linear' | 'graph' | 'prompts'
  const [showBranchMenu, setShowBranchMenu] = useState(false)
  const [branchSourceId, setBranchSourceId] = useState(null)
  const [currentBranchContext, setCurrentBranchContext] = useState(null)
  const conversationRefs = useRef({})
  
  // Tokenizer popup state
  const [tokenizerState, setTokenizerState] = useState({
    isOpen: false,
    content: '',
    conversationId: null
  })

  // Tokenizer handlers
  const handleOpenTokenizer = useCallback((content, conversationId) => {
    setTokenizerState({
      isOpen: true,
      content: content,
      conversationId: conversationId
    })
  }, [])

  const handleCloseTokenizer = useCallback(() => {
    setTokenizerState({
      isOpen: false,
      content: '',
      conversationId: null
    })
  }, [])
  
  // Welcome screen state
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
    return graphModel.getAllConversations().length === 0
  })
  const [selectedPersonality, setSelectedPersonality] = useState(null)
  const [promptsModel] = useState(() => new PromptsModel())
  const [branchContextManager] = useState(() => new BranchContextManager(graphModel, promptsModel))
  
  // API configuration state (simplified)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [configurationLoading, setConfigurationLoading] = useState(true)
  const [backendError, setBackendError] = useState(null)
  
  // Session management state for volatile API key
  const [lastActivity, setLastActivity] = useState(Date.now())

  // Add debug tracking right after state declarations
  useEffect(() => {
    console.log('📊 App state changed:', {
      conversationsCount: conversations?.length,
      currentConversationId,
      currentView,
      isProcessing,
      sessionApiKey: !!sessionApiKey,
      apiKeyConfigured,
      configurationLoading,
      showWelcomeScreen,
      selectedPersonality,
      timestamp: new Date().toISOString()
    });
  }, [conversations, currentConversationId, currentView, isProcessing, sessionApiKey, apiKeyConfigured, configurationLoading, showWelcomeScreen, selectedPersonality]);

  // Auto-detect API key configuration on startup
  const checkApiKeyConfiguration = useCallback(async () => {
    setConfigurationLoading(true);
    setBackendError(null);
    
    try {
      // Check backend config with current session key context
      const config = await ConfigService.checkBackendConfig(sessionApiKey);
      
      setBackendError('');
      
      // If we have a session key, we're configured regardless of backend
      if (sessionApiKey && sessionApiKey.trim()) {
        setApiKeyConfigured(true);
        return;
      }
      
      // Otherwise use backend config result
      setApiKeyConfigured(config.apiKeyConfigured);
      
      if (config.apiKeyConfigured) {
        console.log('✅ API key configured via:', config.configSource);
      }
    } catch (error) {
      console.error('❌ Backend configuration check failed:', error);
      setBackendError(error.message);
      
      // If we have session key, still allow operation
      if (sessionApiKey && sessionApiKey.trim()) {
        setApiKeyConfigured(true);
        setBackendError('');
      } else {
        setApiKeyConfigured(false);
      }
    } finally {
      setConfigurationLoading(false);
    }
  }, [sessionApiKey]);
  
  useEffect(() => {
    console.log('🔄 useEffect [checkApiKeyConfiguration] triggered');
    checkApiKeyConfiguration();
  }, [checkApiKeyConfiguration]);
  
  // Load conversations on mount (after API check) with comprehensive state restoration debugging
  useEffect(() => {
    console.log('🔄 useEffect [apiKeyConfigured] triggered');
    if (apiKeyConfigured) {
      
      console.group('🔍 Post-Reload localStorage Forensics');
      
      // Check what's actually in localStorage
      const storedData = localStorage.getItem('dagger-conversations-v2');
      console.log('Raw localStorage data exists:', !!storedData);
      console.log('Raw data length:', storedData?.length);
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          console.log('Parsed data structure:', {
            conversations: parsed.conversations?.length || 'missing',
            branches: parsed.branches?.length || 'missing', 
            mainThread: parsed.mainThread?.length || 'missing',
            mergedBranches: parsed.mergedBranches?.length || 'missing'
          });
          
          // Check if branch data exists in storage but isn't being loaded
          const branchConversations = parsed.conversations?.filter(([id, conv]) => conv.parentId || conv.displayNumber?.includes('.'));
          console.log('Branch conversations in storage:', branchConversations?.length || 0);
          
        } catch (error) {
          console.error('❌ localStorage data corrupted:', error);
        }
      }
      
      // Check GraphModel state before loading
      console.log('Pre-load GraphModel state:', {
        conversationsSize: graphModel.conversations?.size || 'undefined',
        branchesSize: graphModel.branches?.size || 'undefined',
        mainThreadLength: graphModel.mainThread?.length || 'undefined'
      });
      
      // Use getAllConversationsWithBranches instead of getAllConversations for complete restoration
      const loadedConversations = graphModel.getAllConversationsWithBranches();
      console.log('Post-load conversations:', loadedConversations.length);
      
      // Check if branches are in the loaded conversations
      const branchConversations = loadedConversations.filter(c => c.parentId || (c.displayNumber && c.displayNumber.toString().includes('.')));
      console.log('Branch conversations in result:', branchConversations.length);
      
      setConversations(loadedConversations);
      console.log('📊 Storage stats:', graphModel.getStorageStats());
      
      console.groupEnd();
      
      // Clean up any ghost branches on startup
      graphModel.cleanupEmptyThreads();
      
      // Check if we should show welcome screen (Node 0 state)
      const isNodeZero = loadedConversations.length === 0;
      setShowWelcomeScreen(isNodeZero);
    }
  }, [apiKeyConfigured])

  // Activity tracking for session management
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now())
  }, [])

  // Force complete restoration mechanism
  const forceCompleteRestore = useCallback(() => {
    console.log('🔄 Forcing complete state restoration...');
    
    // Force GraphModel to reload from storage
    graphModel.loadFromStorage();
    
    // Force complete conversation refresh
    const allConversations = graphModel.getAllConversationsWithBranches();
    setConversations(allConversations);
    
    // Verify restoration
    const stats = graphModel.getStorageStats();
    console.log('📊 Post-restoration stats:', stats);
    
    // Clear restoration marker
    localStorage.removeItem('dagger-needs-full-restore');
    
  }, [graphModel])

  // Session timeout handler with state preservation
  const handleSessionTimeout = useCallback(() => {
    console.log('⏰ Session timeout detected, preserving state...');
    
    // Force save current state
    graphModel.saveToStorage();
    
    // Mark that we need complete restoration on next login
    localStorage.setItem('dagger-needs-full-restore', 'true');
    
    setSessionApiKey('');
    setApiKeyConfigured(false);
    
  }, [graphModel])

  // Session restore handler
  const handleSessionRestore = useCallback(() => {
    const needsRestore = localStorage.getItem('dagger-needs-full-restore');
    
    if (needsRestore) {
      console.log('🔄 Session restore detected, forcing complete state restoration...');
      setTimeout(() => {
        forceCompleteRestore();
      }, 100); // Small delay to ensure all initialization is complete
    }
    
  }, [forceCompleteRestore])

  // BACKUP - Original problematic version
  /*
  useEffect(() => {
    console.log('🔄 useEffect [sessionApiKey-timeout] triggered');
    console.log('📊 Session timeout state:', {
      sessionApiKey: !!sessionApiKey,
      lastActivity: new Date(lastActivity).toISOString(),
      timeSinceLastUpdate: Date.now() - lastActivity
    });
    
    if (!sessionApiKey) {
      console.log('✅ Session timeout effect completed (no session key)');
      return;
    }

    const checkTimeout = setInterval(() => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivity
      const thirtyMinutes = 30 * 60 * 1000

      if (timeSinceActivity > thirtyMinutes) {
        console.log('🔥 Session expired - clearing API key')
        setSessionApiKey('')
        setApiKeyConfigured(false)
      }
    }, 60000) // Check every minute

    console.log('✅ Session timeout effect completed (interval set)');
    return () => {
      console.log('🧹 Session timeout cleanup');
      clearInterval(checkTimeout);
    };
  }, [sessionApiKey, lastActivity])
  */

  // Session timeout effect - FIXED VERSION
  useEffect(() => {
    console.log('🔄 useEffect [sessionApiKey-timeout] triggered');
    
    if (!sessionApiKey) {
      console.log('✅ Session timeout effect completed (no session key)');
      return;
    }

    const checkTimeout = setInterval(() => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivity  // Read current lastActivity value
      const thirtyMinutes = 30 * 60 * 1000

      if (timeSinceActivity > thirtyMinutes) {
        console.log('🔥 Session expired - clearing API key')
        setSessionApiKey('')
        setApiKeyConfigured(false)
      }
    }, 60000) // Check every minute

    console.log('✅ Session timeout effect completed (interval set)');
    return () => {
      console.log('🧹 Session timeout cleanup');
      clearInterval(checkTimeout);
    };
  }, [sessionApiKey]) // REMOVED lastActivity from dependencies to break the loop

  // Activity listeners for session management
  useEffect(() => {
    console.log('🔄 useEffect [activity-listeners] triggered');
    const events = ['click', 'keypress', 'scroll', 'mousemove']
    
    const handleActivity = () => updateActivity()
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [updateActivity])

  // Window close cleanup for session security
  useEffect(() => {
    console.log('🔄 useEffect [window-beforeunload] triggered');
    const handleBeforeUnload = () => {
      setSessionApiKey('') // Burn the evidence
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const handleApiKeySubmit = useCallback(async (key) => {
    if (!ClaudeAPI.validateApiKey(key)) {
      setApiTestStatus('❌ Invalid API key format')
      return
    }

    setApiTestStatus('🧪 Testing API key...')
    ClaudeAPI.setApiKey(key)
    ClaudeAPI.setModel(selectedModel)
    
    try {
      const result = await ClaudeAPI.testApiKey()
      if (result.success) {
        setApiKey(key)
        setApiTestStatus('✅ API key working!')
      } else {
        setApiTestStatus(`❌ ${result.message}`)
      }
    } catch (error) {
      setApiTestStatus(`❌ Test failed: ${error.message}`)
    }
  }, [selectedModel])

  const toggleDarkMode = useCallback(() => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('dagger-dark-mode', JSON.stringify(newMode))
    
    // Apply dark mode to html element as well
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Apply dark mode on mount
  useEffect(() => {
    console.log('🔄 useEffect [darkMode] triggered');
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Simplified auto-scroll: scroll to selected conversation when switching to linear view
  useEffect(() => {
    if (currentConversationId && currentView === 'linear' && conversationRefs.current[currentConversationId]) {
      console.log('📍 Auto-scrolling to selected conversation:', currentConversationId);
      
      const element = conversationRefs.current[currentConversationId];
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          console.log('✅ Auto-scrolled to conversation:', currentConversationId);
        }, 100);
      }
    }
  }, [currentConversationId, currentView]);

  // Handle scroll-based selection detection (Linear → Graph sync) with loop prevention
  const handleVisibleConversationChange = useCallback((conversationId) => {
    console.log('👁️ DISABLED: Auto-selection disabled, ignoring visibility change to:', conversationId);
    // Auto-selection disabled for unified click-only selection
    return;
  }, []);

  // Get conversations to display based on current context
  const getDisplayConversations = useCallback(() => {
    if (currentBranchContext) {
      // Show all conversations in this branch thread
      const branchThread = graphModel.getBranchThread(currentBranchContext + '.0');
      return branchThread;
    } else {
      // Show main thread only
      return graphModel.getAllConversations(); // Main thread conversations
    }
  }, [currentBranchContext])

  // DISABLED: Auto-selection removed for unified click-only selection
  /*
  useVisibleConversation(
    getDisplayConversations(), 
    handleVisibleConversationChange, 
    currentView === 'linear' && !isAutoScrolling
  );
  */

  const handleModelChange = useCallback((model) => {
    setSelectedModel(model)
    localStorage.setItem('dagger-model', model)
    
    // Update API singleton if connected
    if (apiKey) {
      ClaudeAPI.setModel(model)
      ClaudeAPI.setExtendedThinking(extendedThinking)
    }

    // Reset extended thinking if model doesn't support it
    if (!ClaudeAPI.MODELS[model]?.supportsExtendedThinking) {
      setExtendedThinking(false)
    }
  }, [apiKey, extendedThinking])

  // Handle extended thinking toggle
  const handleExtendedThinkingChange = useCallback((enabled) => {
    setExtendedThinking(enabled)
    if (apiKey) {
      ClaudeAPI.setExtendedThinking(enabled)
    }
  }, [apiKey])

  const handleViewChange = useCallback((view) => {
    setCurrentView(view)
    localStorage.setItem('dagger-view', view)
  }, [])

  const handleNodeSelect = useCallback((nodeId, nodeData) => {
    console.log('🎯 Graph node selected:', nodeId);
    
    setCurrentConversationId(nodeId);
    
    // If switching to linear view from graph, scroll to the selected conversation
    if (currentView === 'graph') {
      setCurrentView('linear');
      localStorage.setItem('dagger-view', 'linear');
    }
  }, [currentView])

  // CLEAN conversation handler
  /**
   * Handle ANY conversation input - main thread, branch, virgin, personality
   * UNIFIED METHOD using MessageFormatter - single source of truth
   */
  const handleNewConversation = useCallback(async (inputData) => {
    console.log('\n🔍 === EMERGENCY DIAGNOSTIC: Starting message send ===');
    console.log('🔍 Input data:', inputData);
    
    const prompt = inputData.content;
    console.log('🔍 Extracted prompt:', prompt);
    console.log('🔍 Current conversations:', conversations?.length || 0);
    console.log('🔍 Current conversation ID:', currentConversationId);
    console.log('🔍 Current view:', currentView);
    console.log('🔍 Processing state:', isProcessing);
    console.log('🔍 Current branch context:', currentBranchContext);
    console.log('🔍 Session API key configured:', !!sessionApiKey);
    
    if (!prompt.trim() || isProcessing) {
      console.log('❌ EARLY EXIT: Empty prompt or already processing');
      return;
    }
    
    setIsProcessing(true);
    setCurrentStatus(getRandomHonestStatus());
    
    try {
      console.log('🔍 Step 1: Setting up conversation...');
      // Create new conversation in GraphModel
      let newConversation;
      let threadId = 'main';
      let branchContext = null;
      
      console.log('🔍 Step 2: Creating conversation in GraphModel...');
      
      if (currentBranchContext) {
        console.log('🔍 Branch context detected:', currentBranchContext);
        threadId = `branch-${currentBranchContext}`;
        branchContext = currentBranchContext;
        newConversation = graphModel.addConversationToBranch(
          currentConversationId, 
          prompt, 
          '', 
          { status: 'processing', threadId: threadId }
        );
        console.log('🔍 Branch conversation created:', newConversation?.id);
      } else {
        console.log('🔍 Creating main thread conversation...');
        newConversation = graphModel.addConversation(
          prompt, 
          '', 
          { status: 'processing', threadId: 'main' }
        );
        console.log('🔍 Main conversation created:', newConversation?.id);
      }
      
      if (!newConversation) {
        throw new Error('Failed to create conversation in GraphModel');
      }
      
      console.log('🔍 Step 3: Updating React state...');
      setConversations(graphModel.getAllConversationsWithBranches());
      setCurrentConversationId(newConversation.id);
      console.log('🔍 React state updated, new conversation ID:', newConversation.id);
      
      // Build conversation history based on branch type
      console.log('🔍 Step 4: Building conversation history...');
      let conversationHistory = [];
      let systemPrompt = null;
      
      if (currentBranchContext) {
        console.log('🔍 Building branch conversation history...');
        const currentBranch = graphModel.getConversation(currentConversationId);
        console.log('🔍 Current branch:', currentBranch);
        const branchType = currentBranch?.branchType;
        console.log('🔍 Branch type:', branchType);
        
        console.log('📚 Context inheritance debug:', {
          threadId,
          branchContext,
          branchType,
          currentConversationId,
          branchData: currentBranch ? {
            id: currentBranch.id,
            displayNumber: currentBranch.displayNumber,
            branchType: currentBranch.branchType,
            systemPrompt: currentBranch.systemPrompt ? 'EXISTS' : 'MISSING',
            promptTemplate: currentBranch.promptTemplate
          } : 'NO BRANCH FOUND'
        });
        
        if (branchType === 'virgin') {
          // Virgin branch: no context inheritance
          conversationHistory = [];
          console.log('🌱 Virgin branch: starting fresh with no history');
          
        } else if (branchType === 'personality') {
          // Personality branch: no history but with system prompt from stored template
          conversationHistory = [];
          systemPrompt = currentBranch?.systemPrompt || null;
          console.log('🎭 Personality branch: fresh start with custom system prompt');
          console.log('🎭 System prompt loaded:', systemPrompt ? `"${systemPrompt.substring(0, 100)}..."` : 'MISSING');
          console.log('🎭 Template info:', currentBranch?.promptTemplate?.name || 'No template name');
          
        } else if (branchType === 'knowledge') {
          // Knowledge branch: full context inheritance
          const allConversations = graphModel.getAllConversationsWithBranches();
          conversationHistory = MessageFormatter.extractConversationHistory(
            allConversations, 
            threadId, 
            branchContext
          );
          console.log('🧠 Knowledge branch: inheriting', conversationHistory.length, 'messages');
          
        } else {
          // Default: use current logic for backward compatibility
          const allConversations = graphModel.getAllConversationsWithBranches();
          conversationHistory = MessageFormatter.extractConversationHistory(
            allConversations, 
            threadId, 
            branchContext
          );
          console.log('🔄 Legacy branch: using default context logic');
        }
      } else {
        // Main thread: use full context
        console.log('🔍 Building main thread conversation history...');
        const allConversations = graphModel.getAllConversationsWithBranches();
        console.log('🔍 All conversations count:', allConversations?.length || 0);
        console.log('🔍 All conversations:', allConversations);
        
        conversationHistory = MessageFormatter.extractConversationHistory(
          allConversations, 
          threadId, 
          branchContext
        );
        console.log('🔍 Extracted conversation history:', conversationHistory);
        console.log('🔍 History length:', conversationHistory?.length || 0);
      }
      
      // Determine model to use
      let modelToUse = selectedModel;
      if (currentBranchContext) {
        const currentBranch = graphModel.getConversation(currentConversationId);
        if (currentBranch && currentBranch.preferredModel) {
          modelToUse = currentBranch.preferredModel;
        }
      }
      
      console.log(`🔍 Step 5: Preparing API call...`);
      console.log(`🧠 UNIFIED: ${conversationHistory.length} messages, context: ${threadId}`);
      
      // EMERGENCY DEBUG: Log complete API preparation
      console.log('🚨 === COMPLETE API CALL DEBUG ===');
      console.log('🚨 conversationHistory:', conversationHistory);
      console.log('🚨 prompt:', prompt);
      console.log('🚨 systemPrompt:', systemPrompt);
      console.log('🚨 modelToUse:', modelToUse);
      console.log('🚨 temperature:', temperature);
      console.log('🚨 sessionApiKey available:', !!sessionApiKey);
      console.log('🚨 Full API options:', {
        temperature: temperature,
        model: modelToUse,
        systemPrompt: systemPrompt,
        context: threadId,
        debug: true,
        sessionApiKey: sessionApiKey
      });
      
      console.log('🔍 Step 6: Making API call to ClaudeAPI.sendMessage...');
      
      // Single API call for ALL conversation types using MessageFormatter
      const response = await ClaudeAPI.sendMessage(
        conversationHistory,
        prompt,
        {
          temperature: temperature,
          model: modelToUse,
          systemPrompt: systemPrompt,
          context: threadId,
          debug: true, // Force debug for emergency diagnostics
          sessionApiKey: sessionApiKey // Pass session API key
        }
      );
      
      console.log('🔍 Step 7: API call completed successfully');
      console.log('🔍 Response content length:', response?.content?.length || 0);
      console.log('🔍 Response metadata:', {
        processingTime: response?.processingTime,
        model: response?.model,
        usage: response?.usage
      });
      
      // Store conversation with enhanced token data
      graphModel.updateConversation(newConversation.id, {
        response: response.content,
        processingTime: response.processingTime,
        usage: response.usage, // Enhanced token usage data
        tokenCount: response.usage.total_tokens,
        model: response.model,
        status: 'complete'
      });
      
      setConversations(graphModel.getAllConversationsWithBranches());
      
      console.log(`✅ UNIFIED: Conversation completed for ${threadId}`);
      
    } catch (error) {
      console.error('\n🚨 === EMERGENCY ERROR DIAGNOSTIC ===');
      console.error('🚨 Error occurred at step: Unknown (see previous logs)');
      console.error('🚨 Error message:', error.message);
      console.error('🚨 Error stack:', error.stack);
      console.error('🚨 Error name:', error.name);
      console.error('🚨 Full error object:', error);
      console.error('🚨 newConversation exists:', !!newConversation);
      console.error('🚨 newConversation ID:', newConversation?.id);
      console.error('🚨 Current state at error:', {
        conversationsCount: conversations?.length,
        currentConversationId,
        currentBranchContext,
        isProcessing,
        sessionApiKeyConfigured: !!sessionApiKey
      });
      
      if (newConversation && newConversation.id) {
        console.log('🔍 Step 8: Updating conversation with error info...');
        // Update the conversation with error information
        graphModel.updateConversation(newConversation.id, {
          response: `Error: ${error.message}`,
          status: 'error'
        });
        setConversations(graphModel.getAllConversationsWithBranches());
        console.log('💾 Conversation marked as error:', newConversation.id);
      } else {
        console.warn('⚠️ Error occurred but no conversation to update - partial failure');
        // Still refresh conversations in case of partial creation
        setConversations(graphModel.getAllConversationsWithBranches());
      }
      
      // Show user-friendly error for personality branches
      if (currentBranchContext) {
        const currentBranch = graphModel.getConversation(currentConversationId);
        if (currentBranch?.branchType === 'personality') {
          alert(`Personality branch error: ${error.message}. Please try again.`);
        }
      }
    } finally {
      setIsProcessing(false);
      setCurrentStatus('');
    }
  }, [isProcessing, currentBranchContext, currentConversationId, temperature, selectedModel, promptsModel])

  const getNextDisplayNumber = useCallback(() => {
    // Return the next conversation number that would be assigned
    if (currentBranchContext) {
      // In branch context, show the next branch number
      const currentBranch = graphModel.getConversation(currentConversationId);
      if (currentBranch) {
        return graphModel.generateNextInBranch(currentBranch.displayNumber);
      }
    }
    // Main thread - use current counter (zero-indexed)
    return graphModel.conversationCounter.toString()
  }, [currentBranchContext, currentConversationId])

  // Complete reset function for all state
  const handleReset = useCallback(() => {
    try {
      // Clear data models
      graphModel.clearAll();
      
      // Reset all UI state completely
      setConversations([]);
      setCurrentConversationId(null);
      setCurrentBranchContext(null);
      setIsProcessing(false);
      setApiTestStatus('');
      setBackendError(null);
      setSelectedPersonality(null);
      setShowWelcomeScreen(graphModel.getAllConversations().length === 0);
      
      // Reset branch menu state
      setShowBranchMenu(false);
      setBranchSourceId(null);
      
      // Force return to main thread view
      setCurrentView('thread');
      
      console.log('🔥 Complete reset: All state cleared, returned to main');
      
    } catch (error) {
      console.error('❌ Reset failed:', error);
      setBackendError(`Reset failed: ${error.message}`);
    }
  }, [])

  // Handle test export (clean v2.0 export)
  const handleTestExport = useCallback(() => {
    const exportData = graphModel.exportToMarkdown();
    console.log('📤 Export:', exportData.rawData);
    
    // Create downloadable file
    const blob = new Blob([exportData.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [])

  // Remove duplicate - already exists above

  // Add conversation selection handler
  const handleConversationSelect = useCallback((conversationId) => {
    console.log('🔄 App.handleConversationSelect called with:', conversationId);
    console.log('🔄 Current conversations:', conversations.map(c => ({ id: c.id, displayNumber: c.displayNumber })));
    
    // Verify this is a valid conversation ID
    const foundConversation = conversations.find(c => c.id === conversationId);
    if (foundConversation) {
      console.log('✅ App found conversation:', foundConversation);
      
      const conversation = graphModel.getConversation(conversationId);
      if (!conversation) return;
      
      console.log(`🔍 Selected conversation:`, conversation);
      console.log(`🔍 Display number:`, conversation.displayNumber);
      console.log(`🔍 Is branch:`, graphModel.isBranchId(conversation.displayNumber));
      
      setCurrentConversationId(conversationId);
      
      // Determine context based on conversation type
      if (graphModel.isBranchId(conversation.displayNumber)) {
        // Get all conversations in this branch thread
        const branchThread = graphModel.getBranchThread(conversation.displayNumber);
        console.log(`🔍 Branch thread:`, branchThread.map(c => c.displayNumber));
        
        // Set branch context to the branch prefix (e.g., "1.1" for "1.1.2")
        const branchPrefix = conversation.displayNumber.split('.').slice(0, 2).join('.');
        setCurrentBranchContext(branchPrefix);
        console.log(`📍 Switched to branch context: ${branchPrefix}`);
      } else {
        // Main thread conversation - show main context
        setCurrentBranchContext(null);
        console.log(`📍 Switched to main thread: ${conversation.displayNumber}`);
      }
      
      // Switch to linear view to show selected conversation
      setCurrentView('linear');
    } else if (conversationId === null || conversationId === undefined) {
      console.log('📍 App clearing selection (conversationId is null/undefined)');
      setCurrentConversationId(null);
    } else {
      console.error('❌ App received invalid conversationId:', conversationId);
      console.log('❌ Available conversation IDs:', conversations.map(c => c.id));
      // Don't set invalid ID - keep current selection
    }
  }, [conversations])

  // Debug: Track all currentConversationId changes
  useEffect(() => {
    console.log('🔄 currentConversationId changed to:', currentConversationId);
    console.log('🔄 Stack trace for debugging:');
    console.trace();
  }, [currentConversationId]);

  // Add fork handler
  const handleBranchConversation = useCallback((conversationId) => {
    const conversation = graphModel.getConversation(conversationId);
    console.log(`🌿 Branch conversation ${conversation.displayNumber}: ${conversation.prompt}`);
    
    setBranchSourceId(conversationId);
    setShowBranchMenu(true);
  }, [])

  // Add branch creation handler (real implementation)
  const handleCreateBranch = useCallback(async (sourceId, branchType, promptTemplate) => {
    console.log('🌿 BRANCH DEBUG - Starting branch creation:', {
      fromConversationId: sourceId,
      branchType: branchType,
      currentConversations: conversations.map(c => ({ id: c.id, displayNumber: c.displayNumber }))
    });
    
    try {
      // Find the conversation to branch from
      const sourceConversation = conversations.find(c => c.id === sourceId);
      console.log('🌿 BRANCH DEBUG - Source conversation:', sourceConversation);
      
      if (!sourceConversation) {
        console.error('❌ Source conversation not found for ID:', sourceId);
        return;
      }
      
      // Determine model based on branch type
      console.log('🧠 Processing branch type:', branchType);
      let branchModel;
      
      switch (branchType) {
        case 'virgin':
          branchModel = 'claude-sonnet-4-20250514'; // Fresh conversations
          console.log('🌱 Virgin branch - using Sonnet 4');
          break;
        case 'personality':
          branchModel = 'claude-sonnet-4-20250514'; // Personality + efficiency
          console.log('🎭 Personality branch - using Sonnet 4');
          break;
        case 'knowledge':
          branchModel = 'claude-opus-4-20250514';   // Complex context processing
          console.log('🧠 Knowledge branch - using Opus 4');
          break;
        default:
          branchModel = selectedModel;
          console.log('❓ Unknown branch type, using default:', branchModel);
      }
      
      console.log(`🌿 Creating ${branchType} branch from conversation ${sourceId} with ${ClaudeAPI.MODELS[branchModel]?.name || branchModel}`);
      
      if (promptTemplate) {
        console.log(`🎭 Using prompt template: ${promptTemplate.name}`);
      }
      
      // Create branch in data model
      const newBranch = graphModel.createBranch(sourceId, branchType);
      
      console.log('🌿 BRANCH DEBUG - New conversation created:', {
        id: newBranch.id,
        displayNumber: newBranch.displayNumber,
        parentId: sourceId
      });
      
      // TDD DIAGNOSTIC: Knowledge branch context inheritance
      if (branchType === 'knowledge') {
        console.log('\n🔍 === TDD DIAGNOSTIC: Knowledge Branch Context Building ===');
        console.log('🔍 KNOWLEDGE: Source conversation:', sourceConversation);
        const allConversations = graphModel.getAllConversationsWithBranches();
        console.log('🔍 KNOWLEDGE: All conversations count:', allConversations.length);
        console.log('🔍 KNOWLEDGE: All conversation IDs:', allConversations.map(c => ({ id: c.id, displayNumber: c.displayNumber, parentId: c.parentId })));
        
        // Test conversation history extraction
        const testHistory = MessageFormatter.extractConversationHistory(allConversations, newBranch.id);
        console.log('🔍 KNOWLEDGE: Extracted history length:', testHistory.length);
        console.log('🔍 KNOWLEDGE: History preview:', testHistory.slice(0, 2));
        console.log('🔍 KNOWLEDGE: Expected length should be >= 2 for knowledge branches');
      }
      
      // Create dedicated thread for this branch
      const branchThreadId = ClaudeAPI.createBranchThread(newBranch.id);
      
      // Set branch-specific model preference and thread ID
      newBranch.preferredModel = branchModel;
      const updateData = { 
        threadId: branchThreadId,
        branchType: branchType  // Store branch type for context inheritance
      };
      
      console.log('🔍 TDD DIAGNOSTIC: Storing branch metadata:', updateData);
      console.log('🔍 TDD DIAGNOSTIC: Branch type being stored:', branchType);
      
      // If we have a prompt template, store it with the branch
      if (promptTemplate) {
        updateData.promptTemplate = promptTemplate;
        // For personality branches, store template content as system prompt
        if (branchType === 'personality') {
          updateData.systemPrompt = promptTemplate.content;
          console.log('🎭 Stored personality template as system prompt:', promptTemplate.name);
        }
      }
      
      graphModel.updateConversation(newBranch.id, updateData);
      
      // VERIFY: Check what was actually stored
      console.log('🚨 BRANCH STORAGE VERIFICATION:');
      const verifyBranch = graphModel.getConversation(newBranch.id);
      console.log('🚨 Stored branch data:', {
        id: verifyBranch.id,
        displayNumber: verifyBranch.displayNumber,
        branchType: verifyBranch.branchType,
        systemPrompt: verifyBranch.systemPrompt ? `"${verifyBranch.systemPrompt.substring(0, 50)}..."` : 'NOT STORED',
        promptTemplate: verifyBranch.promptTemplate ? verifyBranch.promptTemplate.name : 'NO TEMPLATE'
      });
      
      // TDD DIAGNOSTIC: System message vs user content separation
      if (branchType === 'personality' && promptTemplate) {
        console.log('\n🔍 === TDD DIAGNOSTIC: System Message Separation ===');
        console.log('🔍 SYSTEM: System message content:', verifyBranch.systemPrompt?.substring(0, 100) + '...');
        console.log('🔍 SYSTEM: User prompt content (should be injector):', verifyBranch.input?.substring(0, 100) + '...');
        console.log('🔍 SYSTEM: Are they the same?', verifyBranch.systemPrompt === verifyBranch.input);
        console.log('🔍 SYSTEM: System message defined?', !!verifyBranch.systemPrompt);
        console.log('🔍 SYSTEM: User input defined?', !!verifyBranch.input);
      }
      
      setConversations(graphModel.getAllConversationsWithBranches());
      setCurrentConversationId(newBranch.id);
      setCurrentBranchContext(newBranch.displayNumber.split('.').slice(0, 2).join('.'));
      
      console.log(`✅ Created branch with thread: ${branchThreadId}`);
      
      // Close modal
      setShowBranchMenu(false);
      setBranchSourceId(null);
      
      // Optional: Switch to graph view to see the branch
      // setCurrentView('graph');
      
    } catch (error) {
      console.error('❌ Fork creation failed:', error);
      alert(`Failed to create branch: ${error.message}`);
    }
  }, [conversations, currentView, selectedModel])

  // Add copy conversation handler
  const copyConversation = useCallback((conversation) => {
    const text = `**Conversation ${conversation.displayNumber}**\n\n**Prompt:** ${conversation.prompt}\n\n**Response:** ${conversation.response}`;
    
    navigator.clipboard.writeText(text).then(() => {
      console.log(`📋 Copied conversation ${conversation.displayNumber}`);
      // Optional: show brief success message
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }, [])

  // Handle merge nodes operation with enhanced intelligence integration
  const handleMergeNodes = useCallback((sourceConversationId, targetConversationId, mergeData = null) => {
    console.group('🔗 === MERGE INTEGRATION ===');
    
    try {
      console.log('📊 MERGE DATA RECEIVED:');
      if (mergeData) {
        console.log(`Summary length: ${mergeData.summary?.length || 0} characters`);
        console.log(`Summary type: ${mergeData.summaryType || 'unknown'}`);
        console.log(`Merge prompt: ${mergeData.mergePrompt || 'unknown'}`);
        console.log('Summary content:');
        console.log('='.repeat(30));
        console.log(mergeData.summary || 'No summary provided');
        console.log('='.repeat(30));
      } else {
        console.log('No merge data provided - performing simple merge');
      }
      
      if (mergeData && mergeData.summary) {
        console.log(`🔗 Enhanced merge with ${mergeData.mergePrompt} integration`);
        
        // Get the target conversation to determine the correct thread
        const targetConv = graphModel.getConversation(targetConversationId);
        const targetThreadId = targetConv?.threadId || 'main';
        
        console.log(`Creating integration node in thread: ${targetThreadId}`);
        
        // Create an auto-generated integration node in the target thread
        const integrationNode = graphModel.addConversation(
          `[Integrated insights from Branch ${graphModel.getConversation(sourceConversationId)?.displayNumber}]`,
          mergeData.summary,
          {
            status: 'complete',
            threadId: targetThreadId,
            model: 'claude-sonnet-4-20250514',
            isAutoGenerated: true,
            mergeSource: sourceConversationId,
            mergeTarget: targetConversationId,
            mergePrompt: mergeData.mergePrompt,
            usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } // Placeholder
          }
        );
        
        console.log(`✅ Created integration node ${integrationNode.id} with display number ${integrationNode.displayNumber}`);
        
        // Now perform the branch closure (merge)
        graphModel.mergeNodes(sourceConversationId, targetConversationId);
        console.log(`✅ Closed branch ${sourceConversationId} via intelligent merge`);
        
      } else {
        // Regular merge without intelligence
        console.log('Performing standard merge without AI integration');
        graphModel.mergeNodes(sourceConversationId, targetConversationId);
        console.log(`✅ Merged node ${sourceConversationId} into ${targetConversationId}`);
      }
      
      console.log('✅ GRAPH MODEL MERGE COMPLETED');
      
      // Update UI to reflect merge
      setConversations(graphModel.getAllConversationsWithBranches());
      
      console.log('✅ UI UPDATED');
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ MERGE INTEGRATION FAILED:', error);
      console.groupEnd();
      alert(`Merge failed: ${error.message}`);
    }
  }, [graphModel])
  
  // Personality selection helper functions
  const getUniversalInjector = () => {
    return `Hello Claude, I am initiating this conversation via API and I am fully aware, you are Claude from Anthropic.
You can assist and support me in my exploration of complex topics through the following "personality prompt" that helps you to better see, how I would like to think and what I expect from you.
Be my Knowledge-Helping Artificial Optimization Specialist or short form: KHAOS.
I am looking forward to our cooperation.
This personality framework helps you understand my thinking patterns and communication preferences for our technical collaboration.`;
  };
  
  const getPersonalityTemplate = (personalityId) => {
    // First try the new XML-based prompt registry
    const newPrompt = promptRegistry.getPrompt(personalityId);
    if (newPrompt) {
      return newPrompt.systemPrompt;
    }

    // Fallback to legacy templates for backwards compatibility
    const templates = {
      'khaos-explorer': promptsModel.getPrompt('khaos-explorer')?.content || '',
      'khaos': promptsModel.getPrompt('khaos-explorer')?.content || '', // Legacy compatibility
      'virgin': promptsModel.getPrompt('virgin-claude')?.content || 'You are Claude, created by Anthropic. You are helpful, harmless, and honest.',
      'squeezer': promptsModel.getPrompt('khaos-squeezer')?.content || '',
      'diver': promptsModel.getPrompt('khaos-diver')?.content || '',
      // Map new IDs to legacy fallbacks if needed
      'khaos_navigator_v7': promptsModel.getPrompt('khaos-navigator-6')?.content || '',
      'khaos_specialist_v7': promptsModel.getPrompt('khaos-analyst-6')?.content || '',
      'vanilla_claude': 'You are Claude, created by Anthropic. You are helpful, harmless, and honest.'
    };
    return templates[personalityId] || templates['virgin'];
  };
  
  // Handle personality selection
  const handlePersonalitySelect = useCallback(async (personalityId) => {
    try {
      console.log('\n🔍 === TDD DIAGNOSTIC: Starting personality initialization ===');
      console.log('🔍 INIT: Personality ID:', personalityId);
      console.log('🔍 INIT: Existing conversations before:', conversations.length);
      console.log('🔍 INIT: Current conversation IDs:', conversations.map(c => c.displayNumber));
      
      setSelectedPersonality(personalityId);
      
      // Get personality template
      const injector = getUniversalInjector();
      const template = getPersonalityTemplate(personalityId);
      const fullPrompt = `${injector}\n\n${template}`;
      
      console.log('🔍 INIT: Injector content:', injector);
      console.log('🔍 INIT: Template content:', template.substring(0, 100) + '...');
      console.log('🔍 INIT: Full prompt length:', fullPrompt.length);
      console.log('🔍 INIT: Full prompt preview:', fullPrompt.substring(0, 200) + '...');
      
      setIsProcessing(true);
      setCurrentStatus(getRandomHonestStatus());
      
      // UNIFIED: Send initialization message using MessageFormatter
      const response = await ClaudeAPI.sendMessage(
        [], // No conversation history for personality init
        fullPrompt,
        {
          model: selectedModel,
          temperature: 0.7,
          context: 'personality-init'
          // Session API key is already configured on ClaudeAPI instance
        }
      );
      
      console.log('🔍 INIT: Got personality response:', response.content.substring(0, 100) + '...');
      
      // CRITICAL TDD DIAGNOSTIC: Check for auto-duplication
      console.log('🔍 INIT: About to create conversation 0');
      console.log('🔍 INIT: Conversations before creation:', graphModel.getAllConversations().length);
      
      // Create initial conversation with enhanced token data
      const newConversation = graphModel.addConversation(
        fullPrompt, 
        response.content, 
        { 
          status: 'complete',
          threadId: 'main',
          model: response.model,
          usage: response.usage,
          tokenCount: response.usage.total_tokens,
          personalityId: personalityId,
          isPersonalityInit: true
        }
      );
      
      console.log('🔍 INIT: Created conversation with ID:', newConversation.id);
      console.log('🔍 INIT: Display number:', newConversation.displayNumber);
      
      setConversations(graphModel.getAllConversationsWithBranches());
      setCurrentConversationId(newConversation.id);
      
      console.log('🔍 INIT: Conversations after personality setup:', graphModel.getAllConversations().length);
      console.log('🔍 INIT: Final conversation IDs:', graphModel.getAllConversations().map(c => c.displayNumber));
      console.log('🔍 INIT: Any auto-conversation creation happening?');
      
      // Hide welcome screen after successful injection
      setTimeout(() => {
        setShowWelcomeScreen(false);
      }, 500);
      
    } catch (error) {
      console.error('❌ Personality initialization failed:', error);
      
      // Show user-friendly error
      alert(`Failed to initialize ${personalityId}: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setCurrentStatus('');
    }
  }, [selectedModel, sessionApiKey]);
  
  // Initialize KHAOS personality when API key becomes available
  useEffect(() => {
    console.log('🔄 useEffect [KHAOS-init] triggered');
    if (apiKeyConfigured && sessionApiKey) {
      // Set session API key on ClaudeAPI instance
      ClaudeAPI.setSessionApiKey(sessionApiKey);
      
      // Check if we need to restore state after session timeout
      handleSessionRestore();
      
      // Only auto-initialize if we have no conversations yet (Node 0 state)
      const loadedConversations = graphModel.getAllConversations();
      if (loadedConversations.length === 0) {
        console.log('🧠 Auto-initializing KHAOS personality after API key configuration');
        // Small delay to ensure all initialization is complete
        setTimeout(() => {
          console.log('🎯 About to call handlePersonalitySelect after timeout');
          handlePersonalitySelect('khaos-explorer');
        }, 100);
      }
    }
  }, [apiKeyConfigured, sessionApiKey, handlePersonalitySelect, handleSessionRestore]);
  
  const handleRetryConnection = useCallback(() => {
    ConfigService.clearCache();
    checkApiKeyConfiguration();
  }, [checkApiKeyConfiguration]);
  
  // Load personalities from the new XML-based prompt registry
  const availablePersonalities = promptRegistry.toLegacyFormat();
  
  // Check if this is Node 0 (empty conversation state)
  const isNodeZero = conversations.length === 0;

  // Show loading while checking configuration
  if (configurationLoading) {
    return (
      <div className="config-loading-screen">
        <div className="loading-content">
          <div className="dagger-logo">🗡️ DAGGER</div>
          <div className="loading-text">Initializing Cognitive Enhancement...</div>
          <div className="loading-spinner"></div>
          <div className="status-text">Checking API configuration...</div>
        </div>
      </div>
    );
  }

  // Show error if backend connection failed
  if (backendError) {
    return (
      <div className="backend-error-screen">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Backend Connection Error</h2>
          <p>{backendError}</p>
          <div className="error-instructions">
            <p>Please ensure the proxy server is running:</p>
            <code>npm run dev:proxy</code>
          </div>
          <button 
            onClick={handleRetryConnection}
            className="retry-button"
          >
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show session API key input if not configured
  if (!apiKeyConfigured) {
    return (
      <SessionApiKeyInput
        onApiKeySubmit={async (apiKey) => {
          try {
            console.log('🔄 Validating and configuring session API key...')
            
            // Test the API key first
            const testResult = await ConfigServiceClass.testSessionApiKey(apiKey)
            if (!testResult.valid) {
              throw new Error(testResult.error)
            }
            
            // Configure session API key in state
            setSessionApiKey(apiKey)
            
            // Configure ClaudeAPI instance with session key
            ClaudeAPI.setSessionApiKey(apiKey)
            
            // Update config status
            setApiKeyConfigured(true)
            
            console.log('✅ Session API key configured successfully')
          } catch (error) {
            console.error('❌ Session API key configuration failed:', error)
            throw error // Let the component handle the error display
          }
        }}
        onTimeout={() => {
          console.log('⏰ Session timeout - clearing API key')
          setSessionApiKey('')
          setApiKeyConfigured(false)
          ClaudeAPI.setSessionApiKey(null)
        }}
      />
    )
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      
      {/* Show welcome screen for Node 0 */}
      {isNodeZero && showWelcomeScreen && apiKeyConfigured && (
        <WelcomeScreen
          onPersonalitySelect={handlePersonalitySelect}
          availablePersonalities={availablePersonalities}
          onNavigateToPrompts={() => handleViewChange('prompts')}
          onHideWelcomeScreen={() => setShowWelcomeScreen(false)}
        />
      )}
      
      {/* Regular DAGGER interface */}
      {(!isNodeZero || !showWelcomeScreen) && apiKeyConfigured && (
        <>
      <header className="app-header">
        <div>
          <h1>🗡️ DAGGER</h1>
          <p>Knowledge Cartography Tool</p>
          {/* API Status below header */}
          <div className="header-status">
            <span className="status-indicator">
              🔑 API Key: {apiKeyConfigured ? '✅ Session Active' : '❌ Missing'}
            </span>
            {sessionApiKey && (
              <SessionTimer lastActivity={lastActivity} />
            )}
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="view-toggle">
          <button 
            className={currentView === 'linear' ? 'active' : ''}
            onClick={() => handleViewChange('linear')}
          >
            📝 Linear
          </button>
          <button 
            className={currentView === 'graph' ? 'active' : ''}
            onClick={() => handleViewChange('graph')}
          >
            🗺️ Graph
          </button>
          <button 
            className={currentView === 'prompts' ? 'active' : ''}
            onClick={() => handleViewChange('prompts')}
          >
            🎭 Prompts
          </button>
        </div>

        <div className="header-actions">
          <select 
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="model-selector"
            title="Change Claude model"
          >
            {Object.entries(ClaudeAPI.MODELS).map(([modelId, modelInfo]) => (
              <option key={modelId} value={modelId}>
                {modelInfo.name}
              </option>
            ))}
          </select>
          
          {ClaudeAPI.MODELS[selectedModel]?.supportsExtendedThinking && (
            <label className="extended-thinking-toggle" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: darkMode ? '#e5e7eb' : '#374151',
              cursor: 'pointer',
              marginLeft: '12px'
            }}>
              <input 
                type="checkbox" 
                checked={extendedThinking}
                onChange={e => handleExtendedThinkingChange(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              🧠 Extended Thinking
            </label>
          )}
          
          <button onClick={toggleDarkMode} className="theme-toggle">
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          <button 
            onClick={handleTestExport} 
            style={{
              margin: '0 8px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
            title="Export clean v2.0 conversations"
          >
            📥 Export
          </button>
          
          <button 
            onClick={handleReset} 
            style={{
              margin: '0 8px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
            title="Reset all conversations (for testing)"
          >
            🔥 Reset All
          </button>
          
          <button 
            onClick={() => {
              localStorage.removeItem('claude-api-key')
              ClaudeAPI.setApiKey('')
              setApiKey('')
              setApiTestStatus('')
            }}
            className="api-switch-button"
            title="Use a different Claude API key"
          >
            🔑 Switch API Key
          </button>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'linear' && (
          <>
            {currentBranchContext && (
              <div className="branch-context-indicator">
                <span className="context-label">Branch Context:</span>
                <span className="context-path">{currentBranchContext.displayNumber}</span>
                <button 
                  onClick={() => {
                    setCurrentBranchContext(null);
                    setCurrentView('graph');
                  }}
                  className="return-to-graph-btn"
                >
                  🗺️ View Full Graph
                </button>
              </div>
            )}
            
            <div className="conversation">
              {getDisplayConversations().map((conversation) => {
                const isSelected = selectedNodeId === conversation.id;
                const isDimmed = selectedNodeId && !isSelected;
                
                const cardClasses = [
                  'conversation-card',
                  isSelected && 'conversation-card-selected',
                  isDimmed && 'conversation-card-dimmed',
                  isSelected && 'conversation-card-focus-target'
                ].filter(Boolean).join(' ');
                
                return (
                  <div 
                    key={conversation.id}
                    ref={el => conversationRefs.current[conversation.id] = el}
                    data-node-id={conversation.id}
                    data-conversation-id={conversation.id}
                    className={cardClasses}
                    onClick={() => {
                      console.log('📜 Linear view: selecting conversation:', conversation.id);
                      setCurrentConversationId(conversation.id);
                    }}
                  >
                  <DaggerInputDisplay 
                    interaction={{
                      id: conversation.id,
                      content: conversation.prompt,
                      timestamp: new Date(conversation.timestamp),
                      displayNumber: conversation.displayNumber
                    }}
                    onCopy={() => copyConversation(conversation)}
                    onBranch={handleBranchConversation}
                    showActions={conversation.response && conversation.status === 'complete'}
                    onOpenTokenizer={handleOpenTokenizer}
                  />
                  
                  {/* Unified Toolbar for selected conversation */}
                  {isSelected && (
                    <div className="unified-toolbar" data-testid="unified-toolbar">
                      <span className="unified-toolbar-btn selection-badge">📍 SELECTED</span>
                      <button 
                        className="unified-toolbar-btn center-in-graph-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentView('graph');
                        }}
                        title="Switch to graph view and center on this node"
                      >
                        🎯 Center in Graph
                      </button>
                      <button 
                        className="unified-toolbar-btn nav-btn-style"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTokenizer(conversation.prompt, conversation.id);
                        }}
                        title="Inspect Tokens - Analyze tokenization breakdown"
                      >
                        🔍 Inspect Tokens
                      </button>
                      {conversation.prompt && conversation.prompt.split('\n').length > 3 && (
                        <button 
                          className="unified-toolbar-btn collapse-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Toggle collapse state for this conversation
                            const toggleEvent = new CustomEvent('toggleConversationCollapse', {
                              detail: { conversationId: conversation.id }
                            });
                            window.dispatchEvent(toggleEvent);
                          }}
                          title="Expand/Collapse conversation content"
                        >
                          📖 Expand
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Quick select button for non-selected cards */}
                  {!isSelected && selectedNodeId && (
                    <button 
                      className="quick-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('📜 Linear view: selecting conversation:', conversation.id);
                        setCurrentConversationId(conversation.id);
                      }}
                      title="Select this conversation"
                    >
                      Select
                    </button>
                  )}
                  
                  {conversation.response && (
                    <>
                      <DaggerOutput
                        response={{
                          content: conversation.response,
                          totalTokens: conversation.tokenCount,
                          timestamp: new Date(conversation.timestamp),
                          processingTimeMs: conversation.processingTime,
                          model: conversation.model
                        }}
                        displayNumber={conversation.displayNumber}
                        isLoading={conversation.status === 'processing'}
                        conversationId={conversation.id}
                        onBranch={handleBranchConversation}
                        onContinue={handleConversationSelect}
                      />
                      {conversation.usage && (
                        <TokenUsageDisplay 
                          usage={conversation.usage}
                          model={conversation.model}
                          variant="detailed"
                        />
                      )}
                    </>
                  )}
                  
                </div>
                );
              })}

              {isProcessing && (
                <DaggerOutput
                  response={null}
                  displayNumber={getNextDisplayNumber()}
                  isLoading={true}
                  loadingStatus={currentStatus}
                />
              )}
            </div>

            {/* Session Token Summary */}
            {getDisplayConversations().length > 0 && (
              <SessionTokenSummary conversations={getDisplayConversations()} />
            )}

            <div className="input-section">
              <DaggerInput
                onSubmit={handleNewConversation}
                displayNumber={getNextDisplayNumber()}
                placeholder="Ask anything, explore ideas, branch into new territories..."
              />
            </div>

            {/* Horizontal separator line */}
            <hr className="footer-separator" />

            <footer className="app-footer">
              <div className="stats">
                <span>{getDisplayConversations().length} conversations {currentBranchContext ? `(branch ${currentBranchContext})` : '(main thread)'}</span>
                <span>{apiKey ? '🟢 Connected' : '🔴 Disconnected'}</span>
              </div>
              
              {/* Thread token gauge */}
              <TokenGauge 
                conversations={getDisplayConversations()}
                branchId={currentBranchContext}
                className="thread-gauge"
              />
              
              <div className="footer-line-1">
                Hot 🔥 MVP ⚡ from the 🗡️ Lab{' '}
                <a 
                  href="http://cotoaga.net" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="cotoaga-link"
                >
                  Cotoaga.Net
                </a>
              </div>
              
              <div className="footer-copyright">
                2025 – Ideas want to be free! Content under CC BY-SA 4.0 | Use it, improve it, share it. Created with AI support, compliant with the EU AI Act. Learn in our workshops how to use AI responsibly and effectively.
              </div>
              
              <div className="footer-line-2">
                Ceterum censeo, SBaaS™ – Scaling Business as a Service is the way forward to Accelerate Growth!
              </div>
            </footer>
          </>
        )}

        {currentView === 'graph' && (
            <GraphView 
              conversations={conversations}
              currentConversationId={currentConversationId}
              onConversationSelect={handleConversationSelect}
              onMergeNodes={handleMergeNodes}
              graphModel={graphModel}
              theme="dark"
              onViewChange={handleViewChange}
              currentView={currentView}
              promptsModel={promptsModel}
            />
        )}

        {currentView === 'prompts' && (
          <PromptsTab 
            onUsePrompt={(prompt) => {
              // Switch to linear view and start a new conversation with the selected prompt
              setCurrentView('linear');
              // Handle using a prompt to start a new conversation
              handleNewConversation({ content: prompt.content });
            }}
          />
        )}
      </main>

      {showBranchMenu && (
        <BranchMenu
          sourceConversationId={branchSourceId}
          onCreateBranch={handleCreateBranch}
          onClose={() => {
            setShowBranchMenu(false);
            setBranchSourceId(null);
          }}
          conversations={conversations}
        />
      )}

      {/* Enhanced Thread Debugging Panel (development only) */}
      {import.meta.env.DEV && (
        <ActiveThreads 
          graphModel={graphModel}
          onSwitchThread={(threadId) => {
            console.log('🔄 Switching to thread:', threadId);
            // Thread switching logic could be implemented here
          }}
        />
      )}

      {/* Global Tokenizer Popup */}
      <TokenizerPopup
        isOpen={tokenizerState.isOpen}
        onClose={handleCloseTokenizer}
        content={tokenizerState.content}
        model={selectedModel}
      />
        </>
      )}
    </div>
  )
}

export default App