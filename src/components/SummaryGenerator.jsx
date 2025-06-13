import { useState, useEffect } from 'react'

const KHAOS_BRIEF_PROMPT = `# KHAOS-Brief v1.0 - Distill Essential Insights

You are KHAOS-Brief, specialized in extracting the essential discoveries from conversation explorations.

## Your Task
Analyze the conversation thread below and create a concise summary (200-300 tokens) that captures:
1. **Key insights discovered**
2. **Important decisions or conclusions reached**  
3. **Critical context needed for continuation**
4. **Actionable knowledge gained**

## Conversation Thread to Summarize:
{conversationThread}

## Output Format
**Essential Insights from Exploration:**
[Your concise summary here - focus on what someone continuing the main conversation needs to know]

Remember: You're preparing context for the main conversation thread. Include only what's truly valuable to carry forward.`

const KHAOS_DETAIL_PROMPT = `# KHAOS-Detail v1.0 - Comprehensive Briefing

You are KHAOS-Detail, specialized in creating thorough briefings from conversation explorations.

## Your Task  
Analyze the conversation thread below and create a comprehensive briefing (800-1000 tokens) that includes:
1. **Complete exploration journey** - how the conversation evolved
2. **All significant insights and discoveries**
3. **Alternative approaches or solutions identified**
4. **Technical details and specifications discovered**
5. **Lessons learned and implications**
6. **Recommendations for next steps**

## Conversation Thread to Analyze:
{conversationThread}

## Output Format
**Comprehensive Briefing from Branch Exploration:**

**Journey Overview:** [How the exploration progressed]

**Key Discoveries:** [Major insights and findings]

**Technical Details:** [Specific implementations, solutions, or approaches]

**Implications:** [What this means for the broader context]

**Recommendations:** [Suggested next steps or applications]

Remember: This briefing will inform continued exploration. Be thorough but organized.`

export function SummaryGenerator({ conversationThread, summaryType, onComplete, claudeAPI }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState(null)

  const formatConversationThread = (thread) => {
    return thread.map(node => 
      `**${node.id}:** ${node.content.prompt}\n**Response:** ${node.content.response}\n`
    ).join('\n---\n')
  }

  const generateSummary = async () => {
    if (!claudeAPI || !conversationThread || conversationThread.length === 0) {
      return
    }

    setIsGenerating(true)
    setError(null)
    
    try {
      const prompt = summaryType === 'brief' ? KHAOS_BRIEF_PROMPT : KHAOS_DETAIL_PROMPT
      const threadText = formatConversationThread(conversationThread)
      const fullPrompt = prompt.replace('{conversationThread}', threadText)
      
      const response = await claudeAPI.sendMessage(fullPrompt)
      setSummary(response.content)
      
      if (onComplete) {
        onComplete(response.content)
      }
    } catch (error) {
      console.error('Summary generation failed:', error)
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (conversationThread && conversationThread.length > 0) {
      generateSummary()
    }
  }, [conversationThread, summaryType, claudeAPI])

  const getKhaosPersonality = () => {
    return summaryType === 'brief' ? 'KHAOS-Brief' : 'KHAOS-Detail'
  }

  const getEstimatedTokens = () => {
    return summaryType === 'brief' ? '200-300 tokens' : '800-1000 tokens'
  }

  const handleRetry = () => {
    generateSummary()
  }

  if (!conversationThread || conversationThread.length === 0) {
    return (
      <div className="summary-generator empty">
        <div className="empty-state">
          <span className="empty-icon">📄</span>
          <p>No conversation thread to summarize</p>
        </div>
      </div>
    )
  }

  return (
    <div className="summary-generator">
      <div className="generator-header">
        <div className="khaos-info">
          <span className="khaos-badge">{getKhaosPersonality()}</span>
          <span className="token-estimate">{getEstimatedTokens()}</span>
        </div>
        <div className="thread-info">
          {conversationThread.length} conversation{conversationThread.length !== 1 ? 's' : ''} to summarize
        </div>
      </div>

      {isGenerating ? (
        <div className="generating">
          <div className="spinner-container">
            <span className="spinner">⟳</span>
            <div className="generating-text">
              <strong>{getKhaosPersonality()} is analyzing...</strong>
              <p>Distilling insights from {conversationThread.length} conversation exchanges</p>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-details">
              <strong>Summary generation failed</strong>
              <p>{error}</p>
            </div>
          </div>
          <button className="retry-btn" onClick={handleRetry}>
            🔄 Retry Summary
          </button>
        </div>
      ) : summary ? (
        <div className="summary-result">
          <div className="summary-header">
            <h4>Generated Summary ({summaryType}):</h4>
            <div className="summary-stats">
              <span>{summary.length} chars</span>
              <span>~{Math.ceil(summary.split(' ').length / 4)} tokens</span>
            </div>
          </div>
          <div className="summary-content">
            {summary}
          </div>
          <div className="summary-actions">
            <button className="regenerate-btn" onClick={handleRetry}>
              🔄 Regenerate
            </button>
          </div>
        </div>
      ) : (
        <div className="summary-placeholder">
          <p>Ready to generate summary...</p>
        </div>
      )}
    </div>
  )
}

// CSS styles
const styles = `
.summary-generator {
  margin: 16px 0;
  border: 1px solid var(--border-color, #4a5568);
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg, #1a202c);
}

.generator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--header-bg, #2d3748);
  border-bottom: 1px solid var(--border-color, #4a5568);
}

.khaos-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.khaos-badge {
  background: var(--accent-color, #4299e1);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
}

.token-estimate {
  font-size: 12px;
  color: var(--text-secondary, #a0aec0);
  font-style: italic;
}

.thread-info {
  font-size: 12px;
  color: var(--text-secondary, #a0aec0);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  color: var(--text-secondary, #a0aec0);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.generating {
  padding: 24px;
}

.spinner-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.spinner {
  font-size: 24px;
  animation: spin 2s linear infinite;
  color: var(--accent-color, #4299e1);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.generating-text strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary, #e2e8f0);
}

.generating-text p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #a0aec0);
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--progress-bg, #4a5568);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color, #4299e1), var(--accent-light, #63b3ed));
  animation: progress 3s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

.error-state {
  padding: 24px;
  text-align: center;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--error-bg, rgba(239, 68, 68, 0.1));
  border: 1px solid var(--error-color, #f56565);
  border-radius: 6px;
}

.error-icon {
  font-size: 20px;
}

.error-details strong {
  display: block;
  color: var(--error-color, #f56565);
  margin-bottom: 4px;
}

.error-details p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #a0aec0);
}

.retry-btn {
  background: var(--error-color, #f56565);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: var(--error-hover, #e53e3e);
}

.summary-result {
  padding: 16px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary, #e2e8f0);
}

.summary-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary, #a0aec0);
}

.summary-content {
  background: var(--content-bg, rgba(0, 0, 0, 0.2));
  border: 1px solid var(--border-color, #4a5568);
  border-radius: 6px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary, #e2e8f0);
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.summary-actions {
  display: flex;
  justify-content: flex-end;
}

.regenerate-btn {
  background: transparent;
  color: var(--accent-color, #4299e1);
  border: 1px solid var(--accent-color, #4299e1);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.regenerate-btn:hover {
  background: var(--accent-color, #4299e1);
  color: white;
}

.summary-placeholder {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary, #a0aec0);
  font-style: italic;
}

/* Dark mode variables */
.app.dark {
  --header-bg: #2d3748;
  --content-bg: rgba(0, 0, 0, 0.2);
  --progress-bg: #4a5568;
  --accent-light: #63b3ed;
  --error-color: #f56565;
  --error-hover: #e53e3e;
  --error-bg: rgba(239, 68, 68, 0.1);
}

/* Light mode variables */
.app.light {
  --header-bg: #f7fafc;
  --content-bg: rgba(0, 0, 0, 0.05);
  --progress-bg: #e2e8f0;
  --accent-light: #90cdf4;
  --error-color: #e53e3e;
  --error-hover: #c53030;
  --error-bg: rgba(229, 62, 62, 0.1);
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}