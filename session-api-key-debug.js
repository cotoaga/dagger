import React, { useState, useEffect } from 'react'

const SessionApiKeyInputDebug = ({ onApiKeySubmit, onTimeout }) => {
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [debugLog, setDebugLog] = useState([])

  // Debug logging function
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }
    console.log(`🔍 [${timestamp}] ${message}`)
    setDebugLog(prev => [...prev, logEntry])
  }

  // Auto-timeout after 30 minutes of inactivity
  useEffect(() => {
    addDebugLog('Component mounted, setting up 30-minute timeout')
    const timeout = setTimeout(() => {
      addDebugLog('Session timeout reached (30 minutes)', 'warning')
      onTimeout?.()
    }, 30 * 60 * 1000) // 30 minutes

    return () => {
      addDebugLog('Component unmounting, clearing timeout')
      clearTimeout(timeout)
    }
  }, [onTimeout])

  // Clear API key on window close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      addDebugLog('Window closing/refreshing - burning API key evidence', 'security')
      setApiKey('') // Burn the evidence
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    addDebugLog('Set up beforeunload listener for security cleanup')
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      addDebugLog('Removed beforeunload listener')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    addDebugLog('Form submission started', 'action')
    
    // Validation checks with debug logging
    if (!apiKey.trim()) {
      const errorMsg = 'API key is required'
      addDebugLog(`Validation failed: ${errorMsg}`, 'error')
      setError(errorMsg)
      return
    }

    if (!apiKey.startsWith('sk-ant-')) {
      const errorMsg = 'Claude API key must start with "sk-ant-"'
      addDebugLog(`Validation failed: ${errorMsg}`, 'error')
      setError(errorMsg)
      return
    }

    addDebugLog(`API key validation passed (length: ${apiKey.length})`, 'success')
    setIsValidating(true)
    setError('')

    try {
      addDebugLog('Starting API key test request to proxy...', 'action')
      
      // Build test request
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

      addDebugLog(`Test payload prepared: ${JSON.stringify(testPayload, null, 2)}`)

      const headers = {
        'Content-Type': 'application/json',
        'x-session-api-key': apiKey
      }

      addDebugLog(`Request headers: ${JSON.stringify(headers, null, 2)}`)
      addDebugLog('Making fetch request to http://localhost:3001/api/claude')

      // Test the API key with a minimal request
      const testResponse = await fetch('http://localhost:3001/api/claude', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testPayload)
      })

      addDebugLog(`Response received - Status: ${testResponse.status} (${testResponse.statusText})`, 
                  testResponse.ok ? 'success' : 'error')

      if (testResponse.ok) {
        const responseData = await testResponse.json()
        addDebugLog(`Response data: ${JSON.stringify(responseData, null, 2)}`, 'success')
        addDebugLog('API key validation successful! Calling onApiKeySubmit...', 'success')
        
        // API key works, store in memory for this session
        onApiKeySubmit(apiKey)
        addDebugLog('onApiKeySubmit callback executed', 'success')
        
      } else {
        let errorData
        try {
          errorData = await testResponse.json()
          addDebugLog(`Error response data: ${JSON.stringify(errorData, null, 2)}`, 'error')
        } catch (parseError) {
          addDebugLog(`Failed to parse error response: ${parseError.message}`, 'error')
          errorData = { error: 'Unknown error - could not parse response' }
        }
        
        const errorMsg = `API key validation failed: ${errorData.error || 'Invalid key'}`
        addDebugLog(errorMsg, 'error')
        setError(errorMsg)
      }
    } catch (error) {
      const errorMsg = `Connection error: ${error.message}`
      addDebugLog(`Fetch failed: ${errorMsg}`, 'error')
      addDebugLog(`Error stack: ${error.stack}`, 'error')
      setError(errorMsg)
    } finally {
      addDebugLog('API validation process completed', 'info')
      setIsValidating(false)
    }
  }

  const handleApiKeyChange = (e) => {
    const newValue = e.target.value
    setApiKey(newValue)
    setError('') // Clear error on input
    addDebugLog(`API key input changed (length: ${newValue.length})`)
  }

  const clearDebugLog = () => {
    setDebugLog([])
    addDebugLog('Debug log cleared by user')
  }

  return (
    <div className="session-api-key-screen">
      <div className="api-key-content">
        <div className="dagger-logo">🗡️ DAGGER DEBUG</div>
        <h2>Session API Key Required (Debug Mode)</h2>
        <p className="security-notice">
          🔒 <strong>Maximum Security:</strong> Your API key will only be stored in memory for this session.
          It will be automatically cleared when you close the tab, refresh the page, or after 30 minutes of inactivity.
        </p>

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

        {/* DEBUG LOG SECTION */}
        <div className="debug-section" style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: '#1a1a1a', 
          border: '1px solid #333',
          borderRadius: '8px',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#ffd700' }}>🔍 Debug Log</h3>
            <button 
              type="button" 
              onClick={clearDebugLog}
              style={{ 
                background: '#666', 
                color: 'white', 
                border: 'none', 
                padding: '5px 10px', 
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Log
            </button>
          </div>
          
          <div className="debug-log" style={{ fontFamily: 'Monaco, monospace', fontSize: '12px' }}>
            {debugLog.length === 0 ? (
              <div style={{ color: '#888' }}>No debug events yet...</div>
            ) : (
              debugLog.map((entry, index) => (
                <div 
                  key={index} 
                  style={{ 
                    padding: '2px 0',
                    color: entry.type === 'error' ? '#ff6b6b' : 
                           entry.type === 'success' ? '#51cf66' :
                           entry.type === 'warning' ? '#ffd43b' :
                           entry.type === 'action' ? '#74c0fc' :
                           entry.type === 'security' ? '#ff8cc8' : '#fff'
                  }}
                >
                  <span style={{ color: '#888' }}>[{entry.timestamp}]</span> {entry.message}
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
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#74c0fc', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showHelp ? '▼' : '▶'} Where to get a Claude API key?
          </button>
          
          {showHelp && (
            <div className="help-content" style={{ 
              marginTop: '15px', 
              padding: '15px', 
              background: '#2a2a2a', 
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <ol>
                <li>Visit <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: '#74c0fc' }}>console.anthropic.com</a></li>
                <li>Sign in or create an account</li>
                <li>Go to <strong>API Keys</strong> section</li>
                <li>Click <strong>Create Key</strong></li>
                <li>Copy the key (starts with "sk-ant-")</li>
                <li>Paste it above</li>
              </ol>
              <p style={{ marginTop: '15px', fontStyle: 'italic', color: '#888' }}>
                🔐 <strong>Security:</strong> DAGGER never saves your API key to disk. 
                It only exists in memory during your session.
              </p>
            </div>
          )}
        </div>

        <div className="session-info" style={{ marginTop: '20px', color: '#888', fontSize: '12px', lineHeight: 1.4 }}>
          🕒 Session will auto-expire after 30 minutes of inactivity<br/>
          🗑️ API key will be cleared on tab close or page refresh<br/>
          🔍 Debug mode: All actions are logged above
        </div>

        {/* PROXY STATUS CHECK */}
        <div className="proxy-status" style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#2a2a2a', 
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ffd700' }}>🔧 Proxy Status</h4>
          <div>
            <button 
              type="button"
              onClick={async () => {
                addDebugLog('Testing proxy health endpoint...', 'action')
                try {
                  const healthResponse = await fetch('http://localhost:3001/health')
                  if (healthResponse.ok) {
                    const healthData = await healthResponse.json()
                    addDebugLog(`Proxy health check successful: ${JSON.stringify(healthData)}`, 'success')
                  } else {
                    addDebugLog(`Proxy health check failed: ${healthResponse.status}`, 'error')
                  }
                } catch (error) {
                  addDebugLog(`Proxy health check error: ${error.message}`, 'error')
                }
              }}
              style={{
                background: '#4a9eff',
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              🏥 Test Proxy Health
            </button>
            
            <span style={{ color: '#888' }}>
              Expected: Proxy running on localhost:3001
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionApiKeyInputDebug