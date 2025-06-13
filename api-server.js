// Simple API proxy server to handle CORS issues
import express from 'express'
import cors from 'cors'
const app = express()

app.use(cors())
app.use(express.json())

// Proxy route for Claude API
app.post('/api/claude', async (req, res) => {
  try {
    console.log('🔄 Proxying Claude API request...')
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.headers['x-api-key'],
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01'
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.json()
    
    console.log('✅ Claude API response:', response.status)
    
    if (!response.ok) {
      return res.status(response.status).json(data)
    }
    
    res.json(data)
  } catch (error) {
    console.error('❌ Proxy error:', error)
    res.status(500).json({ error: 'Proxy server error' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`🚀 API proxy server running on http://localhost:${PORT}`)
  console.log('📡 Proxying Claude API calls to avoid CORS issues')
})