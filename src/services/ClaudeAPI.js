export class ClaudeAPI {
  constructor(apiKey, model = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey
    // Use local API proxy server to avoid CORS issues in development
    this.baseUrl = import.meta.env.DEV 
      ? 'http://localhost:3001/api/claude'
      : 'https://api.anthropic.com/v1/messages'
    this.model = model
  }

  // Available Claude models
  static MODELS = {
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      description: 'Balanced performance and capability'
    },
    'claude-3-5-haiku-20241022': {
      name: 'Claude 3.5 Haiku', 
      description: 'Fast and efficient'
    },
    'claude-3-opus-20240229': {
      name: 'Claude 3 Opus',
      description: 'Most capable, slower'
    }
  }

  setModel(model) {
    this.model = model
  }

  async sendMessage(content, options = {}) {
    const {
      model = this.model,
      maxTokens = 4000,
      temperature,
      systemPrompt = null
    } = options

    const messages = [{ role: 'user', content }]
    
    const requestBody = {
      model,
      max_tokens: maxTokens,
      messages,
      ...(temperature !== undefined && { temperature }),
      ...(systemPrompt && { system: systemPrompt })
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        content: data.content[0].text,
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Claude API')
      }
      throw error
    }
  }

  // Rough token estimation for planning purposes
  estimateTokens(text) {
    // Very rough approximation: ~0.75 tokens per word
    // This is just for UI display, not billing
    const words = text.trim().split(/\s+/).length
    return Math.ceil(words * 0.75)
  }

  // Test API key with a minimal request
  async testApiKey() {
    try {
      const response = await this.sendMessage('Hi', { maxTokens: 10 })
      return { success: true, message: 'API key working!' }
    } catch (error) {
      console.error('API test error:', error)
      return { success: false, message: `Error: ${error.message}` }
    }
  }

  // Validate API key format
  static validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false
    }
    // Anthropic API keys start with 'sk-ant-'
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20
  }
}