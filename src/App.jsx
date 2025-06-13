import { useState, useEffect, useCallback } from 'react'
import { DaggerInput } from './components/DaggerInput.jsx'
import { DaggerOutput } from './components/DaggerOutput.jsx'
import { DaggerInputDisplay } from './components/DaggerInputDisplay.jsx'
import { GraphModel } from './models/GraphModel.js'
import { ClaudeAPI } from './services/ClaudeAPI.js'
import './App.css'

function App() {
  const [graph] = useState(() => new GraphModel())
  const [interactions, setInteractions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [claudeAPI, setClaudeAPI] = useState(null)
  const [currentNode, setCurrentNode] = useState(null)
  const [currentInputNumber, setCurrentInputNumber] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    // Default to dark mode, or load from localStorage
    const saved = localStorage.getItem('dagger-dark-mode')
    return saved ? JSON.parse(saved) : true
  })
  const [apiTestStatus, setApiTestStatus] = useState('')
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('dagger-model') || 'claude-3-5-sonnet-20241022'
  })

  // Load graph from localStorage on mount
  useEffect(() => {
    graph.load()
    setInteractions(graph.getAllNodes())
    
    // Try to load API key from localStorage
    const savedApiKey = localStorage.getItem('claude-api-key')
    if (savedApiKey && ClaudeAPI.validateApiKey(savedApiKey)) {
      setApiKey(savedApiKey)
      setClaudeAPI(new ClaudeAPI(savedApiKey))
    }
  }, [graph])

  // Auto-save graph every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      graph.save()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [graph])

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

  const handleInputSubmit = useCallback(async (inputData) => {
    if (!claudeAPI) {
      alert('Please enter your Claude API key first.')
      return
    }

    try {
      // Create input node using conversational method
      const inputNode = graph.addNextPrompt(inputData.content)
      const updatedInteractions = graph.getAllNodes()
      setInteractions([...updatedInteractions])
      setCurrentNode(inputNode)
      setCurrentInputNumber(inputNode.id.replace('>', ''))

      // Show loading state
      setIsLoading(true)

      // Call Claude API
      const startTime = Date.now()
      const response = await claudeAPI.sendMessage(inputData.content)
      const processingTime = Date.now() - startTime

      // Create output node using conversational method
      const outputNode = graph.addResponseToPrompt(inputNode.id, response.content)
      outputNode.inputTokens = response.inputTokens
      outputNode.outputTokens = response.outputTokens
      outputNode.totalTokens = response.totalTokens
      outputNode.processingTimeMs = processingTime
      outputNode.model = claudeAPI.model

      // Update state
      const finalInteractions = graph.getAllNodes()
      setInteractions([...finalInteractions])
      setCurrentNode(outputNode)
      setCurrentInputNumber(null)
      setIsLoading(false)

      // Auto-save after interaction
      graph.save()

    } catch (error) {
      setCurrentInputNumber(null)
      setIsLoading(false)
      console.error('Error calling Claude API:', error)
      alert(`Error: ${error.message}`)
    }
  }, [claudeAPI, graph])

  const getNextDisplayNumber = useCallback(() => {
    // Return the next main sequence number that the graph would assign
    return graph.nextMainSequence.toString()
  }, [graph])

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
        <div className="conversation">
          {interactions.map((interaction) => {
            if (interaction.type === 'user_prompt') {
              return (
                <DaggerInputDisplay 
                  key={interaction.internalId}
                  interaction={{
                    ...interaction,
                    displayNumber: interaction.id.replace('>', '')
                  }}
                />
              )
            } else if (interaction.type === 'ai_response') {
              return (
                <DaggerOutput
                  key={interaction.internalId}
                  response={{
                    content: interaction.content,
                    inputTokens: interaction.inputTokens,
                    outputTokens: interaction.outputTokens,
                    totalTokens: interaction.totalTokens,
                    timestamp: interaction.timestamp,
                    processingTimeMs: interaction.processingTimeMs,
                    model: interaction.model
                  }}
                  displayNumber={interaction.id.replace('>', '')}
                />
              )
            }
            return null
          })}

          {isLoading && (
            <DaggerOutput
              response={null}
              displayNumber={currentInputNumber}
              isLoading={true}
            />
          )}
        </div>

        <div className="input-section">
          <DaggerInput
            onSubmit={handleInputSubmit}
            displayNumber={getNextDisplayNumber()}
            placeholder="Ask anything, explore ideas, branch into new territories..."
          />
        </div>

        <div className="app-footer">
          <div className="stats">
            <span>{interactions.length} interactions</span>
            <span>{claudeAPI ? '🟢 Connected' : '🔴 Disconnected'}</span>
          </div>
          <p className="meta-note">
            <strong>Meta:</strong> This conversation demonstrates the exact problem DAGGER solves. 
            Use branching to explore tangents without losing your main thread.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App