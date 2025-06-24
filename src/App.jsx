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
import { graphModel } from './models/GraphModel.js'
import { claudeAPI as ClaudeAPI } from './services/ClaudeAPI.js'
import { useVisibleConversation } from './hooks/useVisibleConversation.js'
import PromptsModel from './models/PromptsModel.js'
import ConfigService from './services/ConfigService.js'
import { BranchContextManager } from './services/BranchContextManager.js'
import { ConversationChainBuilder } from './services/ConversationChainBuilder.js'
import { MessageFormatter } from './services/MessageFormatter.js'
import { TokenGauge } from './components/TokenGauge.jsx'
import './App.css'

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [apiKey, setApiKey] = useState('')
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
  const [currentView, setCurrentView] = useState('linear') // 'linear' | 'graph' | 'prompts'
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [showBranchMenu, setShowBranchMenu] = useState(false)
  const [branchSourceId, setBranchSourceId] = useState(null)
  const [currentBranchContext, setCurrentBranchContext] = useState(null)
  const conversationRefs = useRef({})
  
  // Add scroll source tracking to prevent infinite loops
  const [scrollSource, setScrollSource] = useState('user') // 'user' | 'programmatic'
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [loopDetection, setLoopDetection] = useState({
    lastSelections: [],
    loopCount: 0
  })
  
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

  // Auto-detect API key configuration on startup
  const checkApiKeyConfiguration = useCallback(async () => {
    setConfigurationLoading(true);
    setBackendError(null);
    
    try {
      const config = await ConfigService.checkBackendConfig();
      setApiKeyConfigured(config.hasApiKey);
      
      if (config.hasApiKey) {
        console.log('✅ API key auto-detected from backend');
      }
    } catch (error) {
      console.error('❌ Backend configuration check failed:', error);
      setBackendError(error.message);
      setApiKeyConfigured(false);
    } finally {
      setConfigurationLoading(false);
    }
  }, []);
  
  useEffect(() => {
    checkApiKeyConfiguration();
  }, [checkApiKeyConfiguration]);
  
  // Load conversations on mount (after API check)
  useEffect(() => {
    if (apiKeyConfigured) {
      const loadedConversations = graphModel.getAllConversations();
      setConversations(loadedConversations);
      console.log('📊 Storage stats:', graphModel.getStorageStats());
      
      // Clean up any ghost branches on startup
      graphModel.cleanupEmptyThreads();
      
      // Check if we should show welcome screen (Node 0 state)
      const isNodeZero = loadedConversations.length === 0;
      setShowWelcomeScreen(isNodeZero);
    }
  }, [apiKeyConfigured])


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
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Auto-scroll to selected conversation in linear view (only for programmatic selection)
  useEffect(() => {
    if (selectedNodeId && currentView === 'linear' && scrollSource === 'programmatic' && conversationRefs.current[selectedNodeId]) {
      console.log('📍 Auto-scrolling to conversation:', selectedNodeId);
      
      // Set auto-scrolling flag
      setIsAutoScrolling(true);
      
      // Add a small delay to ensure DOM is updated
      setTimeout(() => {
        const element = conversationRefs.current[selectedNodeId];
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          console.log(`📍 Auto-scrolled to conversation ${selectedNodeId}`);
        }
      }, 100);
      
      // Clear flags after scroll animation completes
      setTimeout(() => {
        setScrollSource('user');
        setIsAutoScrolling(false);
        console.log('✅ Auto-scroll completed, re-enabling user scroll detection');
      }, 1500);
    }
  }, [selectedNodeId, currentView, scrollSource]);

  // Handle scroll-based selection detection (Linear → Graph sync) with loop prevention
  const handleVisibleConversationChange = useCallback((conversationId) => {
    // Circuit breaker - detect rapid ping-ponging
    const newSelections = [...loopDetection.lastSelections, conversationId].slice(-10);
    const uniqueSelections = new Set(newSelections);
    
    // If we're rapidly switching between only 2 conversations, STOP
    if (newSelections.length >= 6 && uniqueSelections.size <= 2) {
      console.warn('🚨 LOOP DETECTED - Disabling auto-selection temporarily');
      setIsAutoScrolling(true); // Disable observer
      
      // Re-enable after cool-down period
      setTimeout(() => {
        setIsAutoScrolling(false);
        setLoopDetection({ lastSelections: [], loopCount: 0 });
        console.log('✅ Loop protection reset - Re-enabling scroll detection');
      }, 3000);
      
      return;
    }
    
    setLoopDetection({ lastSelections: newSelections, loopCount: 0 });
    
    // Only process if user is actually scrolling (not programmatic) and we're in linear view
    if (scrollSource === 'user' && !isAutoScrolling && conversationId !== selectedNodeId && currentView === 'linear') {
      console.log('🔄 Auto-selected conversation from scroll:', conversationId);
      setSelectedNodeId(conversationId);
    }
  }, [selectedNodeId, currentView, scrollSource, isAutoScrolling, loopDetection]);

  // Get conversations to display based on current context
  const getDisplayConversations = useCallback(() => {
    if (currentBranchContext) {
      // Show all conversations in this branch thread
      const branchThread = graphModel.getBranchThread(currentBranchContext + '.0');
      console.log(`📋 Displaying branch thread:`, branchThread.map(c => c.displayNumber));
      return branchThread;
    } else {
      // Show main thread only
      return graphModel.getAllConversations(); // Main thread conversations
    }
  }, [currentBranchContext])

  // Use intersection observer to detect visible conversations with auto-scroll awareness
  useVisibleConversation(
    getDisplayConversations(), 
    handleVisibleConversationChange, 
    currentView === 'linear' && !isAutoScrolling // Only enable in linear view when not auto-scrolling
  );

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
    
    // Set flags to prevent feedback loop
    setScrollSource('programmatic');
    setSelectedNodeId(nodeId);
    
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
    const prompt = inputData.content;
    if (!prompt.trim() || isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    setCurrentStatus(getRandomHonestStatus());
    
    try {
      // Create new conversation in GraphModel
      let newConversation;
      let threadId = 'main';
      let branchContext = null;
      
      if (currentBranchContext) {
        threadId = `branch-${currentBranchContext}`;
        branchContext = currentBranchContext;
        newConversation = graphModel.addConversationToBranch(
          currentConversationId, 
          prompt, 
          '', 
          { status: 'processing', threadId: threadId }
        );
      } else {
        newConversation = graphModel.addConversation(
          prompt, 
          '', 
          { status: 'processing', threadId: 'main' }
        );
      }
      
      setConversations(graphModel.getAllConversationsWithBranches());
      setCurrentConversationId(newConversation.id);
      
      // Get conversation history using MessageFormatter helper
      const allConversations = graphModel.getAllConversationsWithBranches();
      const conversationHistory = MessageFormatter.extractConversationHistory(
        allConversations, 
        threadId, 
        branchContext
      );
      
      // Get system prompt if we're in a branch with personality template
      let systemPrompt = null;
      if (currentBranchContext) {
        const currentBranch = graphModel.getConversation(currentConversationId);
        const promptTemplateId = currentBranch?.promptTemplate?.id || null;
        if (promptTemplateId) {
          const promptTemplate = promptsModel.getPrompt(promptTemplateId);
          systemPrompt = promptTemplate?.content || null;
        }
      }
      
      // Determine model to use
      let modelToUse = selectedModel;
      if (currentBranchContext) {
        const currentBranch = graphModel.getConversation(currentConversationId);
        if (currentBranch && currentBranch.preferredModel) {
          modelToUse = currentBranch.preferredModel;
        }
      }
      
      console.log(`🧠 UNIFIED: ${conversationHistory.length} messages, context: ${threadId}`);
      
      // Single API call for ALL conversation types using MessageFormatter
      const response = await ClaudeAPI.sendMessage(
        conversationHistory,
        prompt,
        {
          temperature: temperature,
          model: modelToUse,
          systemPrompt: systemPrompt,
          context: threadId,
          debug: process.env.NODE_ENV === 'development'
        }
      );
      
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
      console.error('❌ UNIFIED Conversation Error:', error);
      
      if (newConversation) {
        graphModel.updateConversation(newConversation.id, {
          response: `Error: ${error.message}`,
          status: 'error'
        });
        setConversations(graphModel.getAllConversationsWithBranches());
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
  }, [])

  // Add fork handler
  const handleBranchConversation = useCallback((conversationId) => {
    const conversation = graphModel.getConversation(conversationId);
    console.log(`🌿 Branch conversation ${conversation.displayNumber}: ${conversation.prompt}`);
    
    setBranchSourceId(conversationId);
    setShowBranchMenu(true);
  }, [])

  // Add branch creation handler (real implementation)
  const handleCreateBranch = useCallback(async (sourceId, branchType, promptTemplate) => {
    try {
      // Determine model based on branch type
      let branchModel;
      
      switch (branchType) {
        case 'virgin':
          branchModel = 'claude-sonnet-4-20250514'; // Fresh conversations
          break;
        case 'personality':
          branchModel = 'claude-sonnet-4-20250514'; // Personality + efficiency
          break;
        case 'knowledge':
          branchModel = 'claude-opus-4-20250514';   // Complex context processing
          break;
        default:
          branchModel = selectedModel;
      }
      
      console.log(`🌿 Creating ${branchType} branch from conversation ${sourceId} with ${ClaudeAPI.MODELS[branchModel]?.name || branchModel}`);
      
      if (promptTemplate) {
        console.log(`🎭 Using prompt template: ${promptTemplate.name}`);
      }
      
      // Create branch in data model
      const newBranch = graphModel.createBranch(sourceId, branchType);
      
      // Create dedicated thread for this branch
      const branchThreadId = ClaudeAPI.createBranchThread(newBranch.id);
      
      // Set branch-specific model preference and thread ID
      newBranch.preferredModel = branchModel;
      const updateData = { threadId: branchThreadId };
      
      // If we have a prompt template, store it with the branch
      if (promptTemplate) {
        updateData.promptTemplate = promptTemplate;
        // Pre-populate the prompt as the first message for personality branches
        if (branchType === 'personality') {
          newBranch.prompt = promptTemplate.content;
          updateData.prompt = promptTemplate.content;
        }
      }
      
      graphModel.updateConversation(newBranch.id, updateData);
      
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
  }, [currentView, selectedModel])

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

  // Handle merge nodes operation
  const handleMergeNodes = useCallback((sourceConversationId, targetConversationId) => {
    try {
      graphModel.mergeNodes(sourceConversationId, targetConversationId);
      console.log(`✅ Merged node ${sourceConversationId} into ${targetConversationId}`);
      
      // Update UI to reflect merge
      setConversations(graphModel.getAllConversationsWithBranches());
      
    } catch (error) {
      console.error('❌ Merge failed:', error.message);
      alert(`Merge failed: ${error.message}`);
    }
  }, [])
  
  // Personality selection helper functions
  const getUniversalInjector = () => {
    return `Hello Claude, I am initiating this conversation via API and I am fully aware, you are Claude from Anthropic.
You can assist and support me in my exploration of complex topics through the following "personality prompt" that helps you to better see, how I would like to think and what I expect from you.
Be my Knowledge-Helping Artificial Optimization Specialist or short form: KHAOS.
I am looking forward to our cooperation.
This personality framework helps you understand my thinking patterns and communication preferences for our technical collaboration.`;
  };
  
  const getPersonalityTemplate = (personalityId) => {
    const templates = {
      'khaos': promptsModel.getPrompt('khaos-core')?.content || '',
      'coder': promptsModel.getPrompt('code-specialist')?.content || '',
      'analyst': promptsModel.getPrompt('strategic-analyst')?.content || '',
      'virgin': promptsModel.getPrompt('virgin-claude')?.content || 'You are Claude, created by Anthropic. You are helpful, harmless, and honest.'
    };
    
    return templates[personalityId] || templates.virgin;
  };
  
  // Handle personality selection
  const handlePersonalitySelect = useCallback(async (personalityId) => {
    try {
      console.log('🎭 Personality selected:', personalityId);
      setSelectedPersonality(personalityId);
      
      // Get personality template
      const injector = getUniversalInjector();
      const template = getPersonalityTemplate(personalityId);
      const fullPrompt = `${injector}\n\n${template}`;
      
      console.log('🔄 Initializing personality with prompt length:', fullPrompt.length);
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
        }
      );
      
      console.log('✅ Got personality response:', response);
      
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
      
      setConversations(graphModel.getAllConversationsWithBranches());
      setCurrentConversationId(newConversation.id);
      
      console.log('✅ Personality initialized successfully');
      
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
  }, [selectedModel]);
  
  
  
  const handleRetryConnection = useCallback(() => {
    ConfigService.clearCache();
    checkApiKeyConfiguration();
  }, [checkApiKeyConfiguration]);
  
  const availablePersonalities = [
    {
      id: 'khaos',
      name: 'KHAOS CORE V3.0',
      type: 'khaos',
      chars: promptsModel.getPrompt('khaos-core')?.content.length || 899,
      lines: promptsModel.getPrompt('khaos-core')?.content.split('\n').length || 16,
      starred: true
    },
    {
      id: 'coder',
      name: 'CODE SPECIALIST',
      type: 'coder',
      chars: promptsModel.getPrompt('code-specialist')?.content.length || 407,
      lines: promptsModel.getPrompt('code-specialist')?.content.split('\n').length || 9,
      starred: true
    },
    {
      id: 'analyst',
      name: 'STRATEGIC ANALYST',
      type: 'analyst',
      chars: promptsModel.getPrompt('strategic-analyst')?.content.length || 542,
      lines: promptsModel.getPrompt('strategic-analyst')?.content.split('\n').length || 12,
      starred: false
    },
    {
      id: 'virgin',
      name: 'VIRGIN CLAUDE',
      type: 'virgin',
      chars: promptsModel.getPrompt('virgin-claude')?.content.length || 76,
      lines: promptsModel.getPrompt('virgin-claude')?.content.split('\n').length || 1,
      starred: false
    }
  ];
  
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

  // Show API key input if not configured in backend
  if (!apiKeyConfigured) {
    return (
      <div className="api-key-required-screen">
        <div className="api-key-content">
          <div className="dagger-logo">🗡️ DAGGER</div>
          <h2>API Key Required</h2>
          <p>No Claude API key found in backend configuration.</p>
          
          <div className="setup-instructions">
            <h3>Setup Instructions:</h3>
            <ol>
              <li>Add your API key to <code>.env</code> file:</li>
              <pre><code>CLAUDE_API_KEY=sk-ant-your-key-here</code></pre>
              <li>Restart the proxy server:</li>
              <pre><code>npm run dev:proxy</code></pre>
              <li>Refresh this page</li>
            </ol>
          </div>

          <button 
            onClick={handleRetryConnection}
            className="recheck-button"
          >
            🔄 Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      
      {/* Show welcome screen for Node 0 */}
      {isNodeZero && showWelcomeScreen && apiKeyConfigured && (
        <WelcomeScreen
          onPersonalitySelect={handlePersonalitySelect}
          availablePersonalities={availablePersonalities}
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
              🔑 API Key: {apiKeyConfigured ? '✅ Auto-Detected' : '❌ Missing'}
            </span>
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
            className="disconnect-button"
          >
            Disconnect API
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
                    onClick={() => setSelectedNodeId(conversation.id)}
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
                  />
                  
                  {/* Selection indicator for selected conversation */}
                  {isSelected && (
                    <div className="selection-indicator">
                      <span className="selection-badge">📍 SELECTED</span>
                      <button 
                        className="center-in-graph-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentView('graph');
                        }}
                        title="Switch to graph view and center on this node"
                      >
                        🎯 Center in Graph
                      </button>
                    </div>
                  )}
                  
                  {/* Quick select button for non-selected cards */}
                  {!isSelected && selectedNodeId && (
                    <button 
                      className="quick-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(conversation.id);
                      }}
                      title="Select this conversation"
                    >
                      Select
                    </button>
                  )}
                  
                  {conversation.response && (
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
              
              <div className="footer-line-2">
                Ceterum censeo, SBaaS™ – Scaling Business as a Service is the way forward to Accelerate Growth!
              </div>
            </footer>
          </>
        )}

        {currentView === 'graph' && (
          <GraphView 
            conversations={graphModel.getAllConversationsWithBranches()}
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            onMergeNodes={handleMergeNodes}
            graphModel={graphModel}
            theme="dark"
            onViewChange={handleViewChange}
            currentView={currentView}
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
        </>
      )}
    </div>
  )
}

export default App