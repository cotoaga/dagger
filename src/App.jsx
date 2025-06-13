import { useState, useEffect, useCallback } from 'react'
import { DaggerInput } from './components/DaggerInput.jsx'
import { DaggerOutput } from './components/DaggerOutput.jsx'
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

  const handleApiKeySubmit = useCallback((key) => {
    if (ClaudeAPI.validateApiKey(key)) {
      setApiKey(key)
      setClaudeAPI(new ClaudeAPI(key))
      localStorage.setItem('claude-api-key', key)
    } else {
      alert('Invalid API key format. Please enter a valid Anthropic API key.')
    }
  }, [])

  const handleInputSubmit = useCallback(async (inputData) => {
    if (!claudeAPI) {
      alert('Please enter your Claude API key first.')
      return
    }

    try {
      // Create input node
      const inputNode = graph.createNode(`**User:** ${inputData.content}`, 'input')
      const updatedInteractions = graph.getAllNodes()
      setInteractions([...updatedInteractions])
      setCurrentNode(inputNode)

      // Show loading state
      setIsLoading(true)

      // Call Claude API
      const startTime = Date.now()
      const response = await claudeAPI.sendMessage(inputData.content)
      const processingTime = Date.now() - startTime

      // Create output node
      const outputNode = graph.createNode(response.content, 'output')
      outputNode.inputTokens = response.inputTokens
      outputNode.outputTokens = response.outputTokens
      outputNode.totalTokens = response.totalTokens
      outputNode.processingTimeMs = processingTime

      // Add edge from input to output
      graph.addEdge(inputNode.id, outputNode.id)

      // Update state
      const finalInteractions = graph.getAllNodes()
      setInteractions([...finalInteractions])
      setCurrentNode(outputNode)
      setIsLoading(false)

      // Auto-save after interaction
      graph.save()

    } catch (error) {
      setIsLoading(false)
      console.error('Error calling Claude API:', error)
      alert(`Error: ${error.message}`)
    }
  }, [claudeAPI, graph])

  const getNextDisplayNumber = useCallback(() => {
    if (!currentNode) return '1'
    
    // If current node is an output, next input gets incremented number
    if (currentNode.type === 'output') {
      return (parseInt(currentNode.displayNumber) + 1).toString()
    }
    
    // If current node is an input, we're waiting for its output
    return currentNode.displayNumber + '.response'
  }, [currentNode])

  if (!apiKey) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🗡️ DAGGER</h1>
          <p>Knowledge Cartography Tool</p>
        </header>
        
        <div className="api-key-setup">
          <h2>Setup Required</h2>
          <p>Enter your Anthropic Claude API key to get started:</p>
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
          
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            <p>Get your API key from: <a href="https://console.anthropic.com/">https://console.anthropic.com/</a></p>
            <p>Your key is stored locally and never sent anywhere except Anthropic's servers.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🗡️ DAGGER</h1>
        <p>Knowledge Cartography Tool</p>
        <button 
          onClick={() => {
            localStorage.removeItem('claude-api-key')
            setApiKey('')
            setClaudeAPI(null)
          }}
          className="disconnect-button"
        >
          Disconnect API
        </button>
      </header>

      <main className="app-main">
        <div className="conversation">
          {interactions.map((interaction) => {
            if (interaction.type === 'input') {
              return (
                <div key={interaction.id} className="input-interaction">
                  <div className="interaction-header">
                    <span className="interaction-number">{interaction.displayNumber}</span>
                    <span className="timestamp">{interaction.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <div className="interaction-content" dangerouslySetInnerHTML={{ 
                    __html: interaction.content.replace(/\*\*User:\*\* /, '') 
                  }} />
                </div>
              )
            } else if (interaction.type === 'output') {
              return (
                <DaggerOutput
                  key={interaction.id}
                  response={{
                    content: interaction.content,
                    inputTokens: interaction.inputTokens,
                    outputTokens: interaction.outputTokens,
                    totalTokens: interaction.totalTokens,
                    timestamp: interaction.timestamp,
                    processingTimeMs: interaction.processingTimeMs
                  }}
                  displayNumber={interaction.displayNumber}
                />
              )
            }
            return null
          })}

          {isLoading && (
            <DaggerOutput
              response={null}
              displayNumber={getNextDisplayNumber()}
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