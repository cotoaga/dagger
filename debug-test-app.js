// Emergency debug version of App.jsx
// Replace your current App.jsx with this temporarily to isolate issues

import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('DAGGER Debug Mode Active')
  const [error, setError] = useState(null)

  const testBasics = () => {
    try {
      // Test 1: LocalStorage
      localStorage.setItem('test', 'works')
      const testVal = localStorage.getItem('test')
      console.log('✅ localStorage working:', testVal)
      
      // Test 2: UUID
      import('uuid').then(({ v4: uuidv4 }) => {
        const testId = uuidv4()
        console.log('✅ UUID working:', testId)
        setMessage('Basic functionality working!')
      }).catch(err => {
        console.error('❌ UUID import failed:', err)
        setError('UUID import failed: ' + err.message)
      })
      
    } catch (err) {
      console.error('❌ Basic test failed:', err)
      setError('Basic test failed: ' + err.message)
    }
  }

  const testClaudeAPI = () => {
    const testKey = prompt('Enter Claude API key for test:')
    if (!testKey || !testKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Should start with sk-ant-')
      return
    }
    
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': testKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello! Just testing the API connection.' }]
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      return response.json()
    })
    .then(data => {
      console.log('✅ Claude API working:', data)
      setMessage('Claude API connection successful!')
    })
    .catch(err => {
      console.error('❌ Claude API failed:', err)
      setError('Claude API failed: ' + err.message)
    })
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🗡️ DAGGER Debug Mode</h1>
      <p><strong>Status:</strong> {message}</p>
      
      {error && (
        <div style={{ background: '#ffe6e6', padding: '10px', border: '1px solid #ff0000', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={testBasics} style={{ marginRight: '10px', padding: '10px' }}>
          Test Basic Functions
        </button>
        <button onClick={testClaudeAPI} style={{ padding: '10px' }}>
          Test Claude API
        </button>
      </div>
      
      <div style={{ marginTop: '20px', background: '#f0f0f0', padding: '10px' }}>
        <h3>Debug Info:</h3>
        <p>Node.js version: Check terminal with `node --version`</p>
        <p>Browser: {navigator.userAgent}</p>
        <p>Current URL: {window.location.href}</p>
        <p>LocalStorage available: {typeof localStorage !== 'undefined' ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}

export default App