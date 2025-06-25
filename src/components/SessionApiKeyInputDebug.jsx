import React, { useState, useEffect } from 'react'

const SessionApiKeyInputDebug = ({ onApiKeySubmit, onTimeout }) => {
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [debugLog, setDebugLog] = useState([])

  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => [...prev, { timestamp, message, type }])
    console.log(`[${timestamp}] ${message}`)
  }

  // Auto-timeout after 30 minutes of inactivity
  useEffect(() => {
    addDebugLog('Setting up 30-minute auto-timeout', 'info')
    const timeout = setTimeout(() => {
      addDebugLog('30-minute timeout reached, calling onTimeout', 'warning')
      onTimeout?.()
    }, 30 * 60 * 1000) // 30 minutes

    return () => {
      clearTimeout(timeout)
      addDebugLog('Cleanup: Cleared 30-minute timeout', 'info')
    }
  }, [onTimeout])

  // Clear API key on window close/refresh
  useEffect(() => {
    addDebugLog('Setting up beforeunload event listener', 'info')
    const handleBeforeUnload = () => {
      addDebugLog('Window closing/refreshing - burning API key evidence', 'warning')
      setApiKey('') // Burn the evidence
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      addDebugLog('Cleanup: Removed beforeunload listener', 'info')
    }
  }, [])

  const testProxyHealth = async () => {
    addDebugLog('Testing proxy health...', 'info')
    try {
      const response = await fetch('http://localhost:3001/health')
      const data = await response.json()
      addDebugLog(`Proxy health check: ${response.status} - ${JSON.stringify(data)}`, 'success')
    } catch (error) {
      addDebugLog(`Proxy health check failed: ${error.message}`, 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    addDebugLog('=== API KEY VALIDATION STARTED ===', 'info')
    
    if (!apiKey.trim()) {
      setError('API key is required')
      addDebugLog('Validation failed: API key is empty', 'error')
      return
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Claude API key must start with "sk-ant-"')
      addDebugLog(`Validation failed: API key format invalid (starts with: ${apiKey.substring(0, 7)}...)`, 'error')
      return
    }

    addDebugLog(`API key format valid (starts with: ${apiKey.substring(0, 7)}...)`, 'success')
    setIsValidating(true)
    setError('')

    try {
      // Step 1: Test proxy connectivity
      addDebugLog('Step 1: Testing proxy connectivity...', 'info')
      
      const testPayload = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Hi' }]
          }
        ]
      }
      
      addDebugLog(`Request payload: ${JSON.stringify(testPayload, null, 2)}`, 'info')
      
      const headers = {
        'Content-Type': 'application/json',
        'x-session-api-key': apiKey
      }
      
      addDebugLog(`Request headers: ${JSON.stringify(headers, null, 2)}`, 'info')
      addDebugLog('Making request to http://localhost:3001/api/claude...', 'info')

      // Test the API key with a minimal request
      const testResponse = await fetch('http://localhost:3001/api/claude', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testPayload)
      })

      addDebugLog(`Response status: ${testResponse.status} ${testResponse.statusText}`, 'info')
      addDebugLog(`Response headers: ${JSON.stringify(Object.fromEntries(testResponse.headers), null, 2)}`, 'info')

      const responseText = await testResponse.text()
      addDebugLog(`Raw response text: ${responseText}`, 'info')

      let responseData
      try {
        responseData = JSON.parse(responseText)
        addDebugLog(`Parsed response data: ${JSON.stringify(responseData, null, 2)}`, 'info')
      } catch (parseError) {
        addDebugLog(`Failed to parse response as JSON: ${parseError.message}`, 'error')
        responseData = { error: { message: 'Invalid JSON response' } }
      }

      if (testResponse.ok) {
        addDebugLog('✅ API key validation successful!', 'success')
        addDebugLog('Calling onApiKeySubmit callback...', 'info')
        onApiKeySubmit(apiKey)
        addDebugLog('onApiKeySubmit callback completed', 'success')
      } else {
        const errorMsg = `API key validation failed: ${responseData.error?.message || responseData.message || 'Unknown error'}`
        addDebugLog(errorMsg, 'error')
        setError(errorMsg)
      }
    } catch (error) {
      const errorMsg = `Connection error: ${error.message}`
      addDebugLog(errorMsg, 'error')
      setError(errorMsg)
    } finally {
      setIsValidating(false)
      addDebugLog('=== API KEY VALIDATION COMPLETED ===', 'info')
    }
  }

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value)
    setError('') // Clear error on input
    addDebugLog(`API key input changed (length: ${e.target.value.length})`, 'info')
  }

  const clearDebugLog = () => {
    setDebugLog([])
    addDebugLog('Debug log cleared', 'info')
  }

  const getLogStyle = (type) => {
    switch (type) {
      case 'error': return { color: '#ff4444', fontWeight: 'bold' }
      case 'warning': return { color: '#ffaa00', fontWeight: 'bold' }
      case 'success': return { color: '#00ff44', fontWeight: 'bold' }
      default: return { color: '#ffffff' }
    }
  }

  return (
    <div className="session-api-key-screen">
      <div className="api-key-content" style={{ maxWidth: '800px' }}>
        <div className="dagger-logo">🗡️ DAGGER DEBUG</div>
        <h2>Session API Key Required (Debug Mode)</h2>
        <p className="security-notice">
          🔍 <strong>Debug Mode:</strong> This version shows detailed logging of the API key validation process.
          All network requests, responses, and callbacks are logged below.
        </p>

        {/* Debug Controls */}
        <div style={{ marginBottom: '20px', padding: '10px', background: '#333', borderRadius: '8px' }}>
          <button 
            onClick={testProxyHealth}
            style={{ 
              marginRight: '10px', 
              padding: '8px 16px', 
              background: '#0066cc', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🏥 Test Proxy Health
          </button>
          <button 
            onClick={clearDebugLog}
            style={{ 
              padding: '8px 16px', 
              background: '#666', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Log
          </button>
        </div>

        <form onSubmit={handleSubmit} className="api-key-form">
          <div className="input-group">
            <label htmlFor="session-api-key">Claude API Key:</label>
            <input
              id="session-api-key"
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-ant-your-api-key-here"
              className={`api-key-input ${error ? 'error' : ''}`}
              disabled={isValidating}
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={isValidating || !apiKey.trim()}
          >
            {isValidating ? '🔄 Validating...' : '🚀 Start Session'}
          </button>
        </form>

        {/* Debug Log */}
        <div style={{ marginTop: '30px' }}>
          <h3>🔍 Debug Log ({debugLog.length} entries)</h3>
          <div style={{ 
            background: '#000', 
            color: '#00ff00', 
            padding: '15px', 
            borderRadius: '8px', 
            maxHeight: '400px', 
            overflowY: 'auto',
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: '12px',
            lineHeight: '1.4'
          }}>
            {debugLog.length === 0 ? (
              <div style={{ color: '#666' }}>No debug entries yet...</div>
            ) : (
              debugLog.map((entry, index) => (
                <div key={index} style={getLogStyle(entry.type)}>
                  [{entry.timestamp}] {entry.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="help-section">
          <button 
            type="button"
            className="help-toggle"
            onClick={() => setShowHelp(!showHelp)}
          >
            {showHelp ? '▼' : '▶'} Where to get a Claude API key?
          </button>
          
          {showHelp && (
            <div className="help-content">
              <ol>
                <li>Visit <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
                <li>Sign in or create an account</li>
                <li>Go to <strong>API Keys</strong> section</li>
                <li>Click <strong>Create Key</strong></li>
                <li>Copy the key (starts with "sk-ant-")</li>
                <li>Paste it above</li>
              </ol>
              <p className="security-reminder">
                🔐 <strong>Security:</strong> DAGGER never saves your API key to disk. 
                It only exists in memory during your session.
              </p>
            </div>
          )}
        </div>

        <div className="session-info">
          <small>
            🕒 Session will auto-expire after 30 minutes of inactivity<br/>
            🗑️ API key will be cleared on tab close or page refresh<br/>
            🔍 <strong>Debug mode</strong> - All validation steps are logged above
          </small>
        </div>
      </div>
    </div>
  )
}

export default SessionApiKeyInputDebug