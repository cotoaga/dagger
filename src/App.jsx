import { useState, useEffect, useCallback } from 'react'
import { DaggerInput } from './components/DaggerInput.jsx'
import { DaggerOutput } from './components/DaggerOutput.jsx'
import { DaggerInputDisplay } from './components/DaggerInputDisplay.jsx'
import { GraphView } from './components/GraphView.jsx'
import { ViewToggle } from './components/ViewToggle.jsx'
import { ForkMenu } from './components/ForkMenu.jsx'
import { graphModel } from './models/GraphModel.js'
import { ClaudeAPI } from './services/ClaudeAPI.js'
import './App.css'

function App() {
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [claudeAPI, setClaudeAPI] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    // Default to dark mode, or load from localStorage
    const saved = localStorage.getItem('dagger-dark-mode')
    return saved ? JSON.parse(saved) : true
  })
  const [apiTestStatus, setApiTestStatus] = useState('')
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('dagger-model') || 'claude-3-5-sonnet-20241022'
  })
  const [currentView, setCurrentView] = useState('linear') // 'linear' | 'graph'
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [showForkMenu, setShowForkMenu] = useState(false)
  const [forkSourceId, setForkSourceId] = useState(null)
  const [currentBranchContext, setCurrentBranchContext] = useState(null)

  // Load conversations on mount
  useEffect(() => {
    const loadedConversations = graphModel.getAllConversations();
    setConversations(loadedConversations);
    console.log('📊 Storage stats:', graphModel.getStorageStats());
    
    // Try to load API key from localStorage
    const savedApiKey = localStorage.getItem('claude-api-key')
    if (savedApiKey && ClaudeAPI.validateApiKey(savedApiKey)) {
      setApiKey(savedApiKey)
      setClaudeAPI(new ClaudeAPI(savedApiKey))
    }
  }, [])


  const handleApiKeySubmit = useCallback(async (key) => {
    if (!ClaudeAPI.validateApiKey(key)) {
      setApiTestStatus('❌ Invalid API key format')
      return
    }

    setApiTestStatus('🧪 Testing API key...')
    const testAPI = new ClaudeAPI(key, selectedModel)
    
    try {
      const result = await testAPI.testApiKey()
      if (result.success) {
        setApiKey(key)
        setClaudeAPI(testAPI)
        localStorage.setItem('claude-api-key', key)
        setApiTestStatus('✅ API key working!')
      } else {
        setApiTestStatus(`❌ ${result.message}`)
      }
    } catch (error) {
      setApiTestStatus(`❌ Test failed: ${error.message}`)
    }
  }, [])

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

  const handleModelChange = useCallback((model) => {
    setSelectedModel(model)
    localStorage.setItem('dagger-model', model)
    
    // Update existing API instance if connected
    if (claudeAPI) {
      claudeAPI.setModel(model)
    }
  }, [claudeAPI])

  const handleViewChange = useCallback((view) => {
    setCurrentView(view)
    localStorage.setItem('dagger-view', view)
  }, [])

  const handleNodeSelect = useCallback((nodeId, nodeData) => {
    setSelectedNodeId(nodeId)
    
    // If switching to linear view from graph, scroll to the selected conversation
    if (currentView === 'graph') {
      setCurrentView('linear')
      localStorage.setItem('dagger-view', 'linear')
      
      // Find the conversation in the DOM and scroll to it
      setTimeout(() => {
        const element = document.querySelector(`[data-node-id="${nodeId}"]`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [currentView])

  // CLEAN conversation handler
  const handleNewConversation = useCallback(async (inputData) => {
    const prompt = inputData.content;
    if (!prompt.trim() || isProcessing || !claudeAPI) {
      if (!claudeAPI) alert('Please enter your Claude API key first.');
      return;
    }
    
    setIsProcessing(true);
    
    let newConversation;
    
    if (currentBranchContext) {
      // Add to current branch
      newConversation = graphModel.addConversationToBranch(
        currentConversationId, 
        prompt, 
        '', 
        { status: 'processing' }
      );
    } else {
      // Add to main thread
      newConversation = graphModel.addConversation(prompt, '', {
        status: 'processing'
      });
    }
    
    // Update UI immediately
    setConversations(currentBranchContext ? graphModel.getAllConversationsWithBranches() : graphModel.getAllConversations());
    setCurrentConversationId(newConversation.id);
    
    try {
      // Call Claude API
      const startTime = Date.now();
      const response = await claudeAPI.sendMessage(prompt);
      const processingTime = Date.now() - startTime;
      
      // Update with response
      graphModel.updateConversation(newConversation.id, {
        response: response.content,
        processingTime: processingTime,
        tokenCount: response.totalTokens,
        model: claudeAPI.model,
        status: 'complete'
      });
      
      // Refresh UI
      setConversations(graphModel.getAllConversations());
      
    } catch (error) {
      console.error('❌ API Error:', error);
      
      graphModel.updateConversation(newConversation.id, {
        response: `Error: ${error.message}`,
        status: 'error'
      });
      
      setConversations(graphModel.getAllConversations());
    } finally {
      setIsProcessing(false);
    }
  }, [claudeAPI, isProcessing, currentBranchContext, currentConversationId])

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

  // TEST: Add reset button for development
  const handleReset = useCallback(() => {
    graphModel.clearAll();
    setConversations([]);
    setCurrentConversationId(null);
    console.log('🔥 All conversations cleared');
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
  const handleForkConversation = useCallback((conversationId) => {
    const conversation = graphModel.getConversation(conversationId);
    console.log(`🍴 Fork conversation ${conversation.displayNumber}: ${conversation.prompt}`);
    
    setForkSourceId(conversationId);
    setShowForkMenu(true);
  }, [])

  // Add fork creation handler (real implementation)
  const handleCreateFork = useCallback(async (sourceId, branchType) => {
    try {
      console.log(`🍴 Creating ${branchType} branch from conversation ${sourceId}`);
      
      // Create actual branch in GraphModel
      const newBranch = graphModel.createBranch(sourceId, branchType);
      
      // Update both conversation lists
      setConversations(graphModel.getAllConversations()); // For linear view
      
      // If in graph view, we need to include branches
      if (currentView === 'graph') {
        setConversations(graphModel.getAllConversationsWithBranches());
      }
      
      console.log(`✅ Created branch ${newBranch.displayNumber} (${branchType})`);
      
      // Close modal
      setShowForkMenu(false);
      setForkSourceId(null);
      
      // Optional: Switch to graph view to see the branch
      // setCurrentView('graph');
      
    } catch (error) {
      console.error('❌ Fork creation failed:', error);
      alert(`Failed to create fork: ${error.message}`);
    }
  }, [currentView])

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

  if (!apiKey) {
    return (
      <div className={`app ${darkMode ? 'dark' : 'light'}`}>
        <header className="app-header">
          <div>
            <h1>🗡️ DAGGER</h1>
            <p>Knowledge Cartography Tool</p>
          </div>
          <button onClick={toggleDarkMode} className="theme-toggle">
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </header>
        
        <div className="api-key-setup">
          <h2>Setup Required</h2>
          <p>Enter your Anthropic Claude API key to get started:</p>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Select Model:
            </label>
            <select 
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: darkMode ? '#374151' : '#ffffff',
                color: darkMode ? '#e5e7eb' : '#374151'
              }}
            >
              {Object.entries(ClaudeAPI.MODELS).map(([modelId, modelInfo]) => (
                <option key={modelId} value={modelId}>
                  {modelInfo.name} - {modelInfo.description}
                </option>
              ))}
            </select>
          </div>
          
          <input
            type="password"
            placeholder="sk-ant-..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleApiKeySubmit(e.target.value)
              }
            }}
            style={{
              width: '300px',
              padding: '8px 12px',
              marginTop: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
          />
          <button 
            onClick={(e) => {
              const input = e.target.previousElementSibling
              handleApiKeySubmit(input.value)
            }}
            style={{
              marginLeft: '8px',
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Connect
          </button>
          
          {apiTestStatus && (
            <div style={{ 
              marginTop: '16px', 
              padding: '8px 12px', 
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: apiTestStatus.includes('✅') ? '#dcfce7' : '#fef2f2',
              color: apiTestStatus.includes('✅') ? '#166534' : '#991b1b'
            }}>
              {apiTestStatus}
            </div>
          )}
          
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            <p>Get your API key from: <a href="https://console.anthropic.com/">https://console.anthropic.com/</a></p>
            <p>Your key is stored locally and never sent anywhere except Anthropic's servers.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <header className="app-header">
        <div>
          <h1>🗡️ DAGGER</h1>
          <p>Knowledge Cartography Tool</p>
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
              setApiKey('')
              setClaudeAPI(null)
              setApiTestStatus('')
            }}
            className="disconnect-button"
          >
            Disconnect API
          </button>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'linear' ? (
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
              {getDisplayConversations().map((conversation) => (
                <div 
                  key={conversation.id}
                  data-node-id={conversation.id}
                  className={selectedNodeId === conversation.id ? 'selected-conversation' : ''}
                >
                  <DaggerInputDisplay 
                    interaction={{
                      id: conversation.id,
                      content: conversation.prompt,
                      timestamp: new Date(conversation.timestamp),
                      displayNumber: conversation.displayNumber
                    }}
                    onCopy={() => copyConversation(conversation)}
                    onFork={handleForkConversation}
                    showActions={conversation.response && conversation.status === 'complete'}
                  />
                  
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
                    />
                  )}
                  
                </div>
              ))}

              {isProcessing && (
                <DaggerOutput
                  response={null}
                  displayNumber={getNextDisplayNumber()}
                  isLoading={true}
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

            <div className="app-footer">
              <div className="stats">
                <span>{getDisplayConversations().length} conversations {currentBranchContext ? `(branch ${currentBranchContext})` : '(main thread)'}</span>
                <span>{claudeAPI ? '🟢 Connected' : '🔴 Disconnected'}</span>
              </div>
              <p className="meta-note">
                <strong>Meta:</strong> This conversation demonstrates the exact problem DAGGER solves. 
                Use branching to explore tangents without losing your main thread.
              </p>
            </div>
          </>
        ) : (
          <GraphView 
            conversations={graphModel.getAllConversationsWithBranches()}
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            theme="dark"
          />
        )}
      </main>

      {showForkMenu && (
        <ForkMenu
          sourceConversationId={forkSourceId}
          onCreateFork={handleCreateFork}
          onClose={() => {
            setShowForkMenu(false);
            setForkSourceId(null);
          }}
        />
      )}
    </div>
  )
}

export default App