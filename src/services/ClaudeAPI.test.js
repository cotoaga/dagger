import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ClaudeAPI } from './ClaudeAPI.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('ClaudeAPI', () => {
  let api

  beforeEach(() => {
    api = new ClaudeAPI('test-api-key')
    vi.clearAllMocks()
  })

  test('should initialize with API key', () => {
    expect(api.apiKey).toBe('test-api-key')
  })

  test('should send message and return response', async () => {
    const mockResponse = {
      content: [{ text: 'Test response from Claude' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const result = await api.sendMessage('Test prompt')

    expect(fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: 'Test prompt' }]
      })
    })

    expect(result).toEqual({
      content: 'Test response from Claude',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15
    })
  })

  test('should handle API errors gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Rate Limited'
    })

    await expect(api.sendMessage('Test')).rejects.toThrow('API Error: 429 Rate Limited')
  })

  test('should count tokens approximately', () => {
    const text = 'This is a test message with several words'
    const tokenCount = api.estimateTokens(text)
    
    // Rough approximation: ~0.75 tokens per word
    expect(tokenCount).toBeGreaterThan(5)
    expect(tokenCount).toBeLessThan(15)
  })
})