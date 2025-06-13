export class ClaudeAPI {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseUrl = 'https://api.anthropic.com/v1/messages'
    this.model = 'claude-3-sonnet-20240229'
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

  // Validate API key format
  static validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false
    }
    // Anthropic API keys start with 'sk-ant-'
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20
  }
}