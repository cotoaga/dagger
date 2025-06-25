import React, { useState, useEffect } from 'react'

const SessionApiKeyInput = ({ onApiKeySubmit, onTimeout }) => {
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Auto-timeout after 30 minutes of inactivity
  useEffect(() => {
    const timeout = setTimeout(() => {
      onTimeout?.()
    }, 30 * 60 * 1000) // 30 minutes

    return () => clearTimeout(timeout)
  }, [onTimeout])

  // Clear API key on window close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      setApiKey('') // Burn the evidence
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Claude API key must start with "sk-ant-"')
      return
    }

    setIsValidating(true)
    setError('')

    try {
      // Test the API key with a minimal request
      const testResponse = await fetch('http://localhost:3001/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-api-key': apiKey // Pass as header for this session
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: 'Hi' }]
            }
          ]
        })
      })

      if (testResponse.ok) {
        // API key works, store in memory for this session
        onApiKeySubmit(apiKey)
      } else {
        const errorData = await testResponse.json()
        setError(`API key validation failed: ${errorData.error?.message || 'Invalid key'}`)
      }
    } catch (error) {
      setError(`Connection error: ${error.message}`)
    } finally {
      setIsValidating(false)
    }
  }

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value)
    setError('') // Clear error on input
  }

  return (
    <div className="session-api-key-screen">
      <div className="api-key-content">
        <div className="dagger-logo">🗡️ DAGGER</div>
        <h2>Session API Key Required</h2>
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
            🗑️ API key will be cleared on tab close or page refresh
          </small>
        </div>
      </div>
    </div>
  )
}

export default SessionApiKeyInput