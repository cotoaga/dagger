import React, { useMemo } from 'react'

/**
 * TokenGauge - Display token consumption for conversation branches
 * Shows: Character count, word count, estimated tokens, cost estimation
 */
export function TokenGauge({ conversations, branchId, className = '' }) {
  const metrics = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return { chars: 0, words: 0, tokens: 0, cost: 0 }
    }

    const branchConversations = branchId 
      ? conversations.filter(conv => conv.branchId === branchId)
      : conversations

    let totalChars = 0
    let totalWords = 0
    let totalTokens = 0

    branchConversations.forEach(conv => {
      // Count input
      if (conv.input) {
        totalChars += conv.input.length
        totalWords += conv.input.split(/\s+/).filter(word => word.length > 0).length
      }
      
      // Count response
      if (conv.response) {
        totalChars += conv.response.length
        totalWords += conv.response.split(/\s+/).filter(word => word.length > 0).length
      }
      
      // Use actual token count if available from API response
      if (conv.usage && conv.usage.input_tokens) {
        totalTokens += conv.usage.input_tokens
      }
      if (conv.usage && conv.usage.output_tokens) {
        totalTokens += conv.usage.output_tokens
      }
    })

    // REALISTIC token estimation if no actual count available
    // Claude typically: 1 token ≈ 3.5-4 characters for English text
    const estimatedTokens = totalTokens > 0 ? totalTokens : Math.ceil(totalChars / 3.7)
    
    // REALISTIC cost calculation for Claude Sonnet 4
    // Input: $3 per 1M tokens, Output: $15 per 1M tokens
    // Assume roughly 40% input, 60% output for conversation
    const inputTokens = Math.floor(estimatedTokens * 0.4)
    const outputTokens = Math.floor(estimatedTokens * 0.6)
    const estimatedCost = (inputTokens / 1000000 * 3) + (outputTokens / 1000000 * 15)

    return {
      chars: totalChars,
      words: totalWords,
      tokens: estimatedTokens,
      cost: estimatedCost,
      conversations: branchConversations.length
    }
  }, [conversations, branchId])

  const getTokenColor = (tokenCount) => {
    if (tokenCount < 2000) return '#10b981'   // Green - low usage
    if (tokenCount < 8000) return '#f59e0b'   // Yellow - moderate usage
    if (tokenCount < 15000) return '#ef4444'  // Orange - high usage
    return '#dc2626' // Red - very high usage
  }

  const formatCost = (cost) => {
    if (cost < 0.001) return '<$0.001'
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(3)}`
  }

  return (
    <div className={`token-gauge ${className}`}>
      <div className="gauge-metrics">
        <div className="metric">
          <span className="metric-value">{metrics.conversations}</span>
          <span className="metric-label">msgs</span>
        </div>
        
        <div className="metric">
          <span className="metric-value">{metrics.words.toLocaleString()}</span>
          <span className="metric-label">words</span>
        </div>
        
        <div className="metric">
          <span 
            className="metric-value" 
            style={{ color: getTokenColor(metrics.tokens) }}
          >
            {metrics.tokens.toLocaleString()}
          </span>
          <span className="metric-label">tokens</span>
        </div>
        
        <div className="metric">
          <span className="metric-value cost">{formatCost(metrics.cost)}</span>
          <span className="metric-label">est cost</span>
        </div>
      </div>
      
      <div className="gauge-bar">
        <div 
          className="gauge-fill"
          style={{ 
            width: `${Math.min((metrics.tokens / 20000) * 100, 100)}%`, // Scale to 20K tokens max
            backgroundColor: getTokenColor(metrics.tokens)
          }}
        />
      </div>
    </div>
  )
}