import { useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

export function DaggerOutput({ response, displayNumber, isLoading = false }) {
  const [copyStatus, setCopyStatus] = useState('copy')

  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return ''
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp))
  }, [])

  const formatProcessingTime = useCallback((ms) => {
    if (!ms) return ''
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }, [])

  const getWordCount = useCallback((text) => {
    if (!text?.trim()) return 0
    return text.trim().split(/\s+/).length
  }, [])

  const handleCopyToClipboard = useCallback(async () => {
    if (!response?.content) return

    try {
      await navigator.clipboard.writeText(response.content)
      setCopyStatus('copied!')
      setTimeout(() => setCopyStatus('copy'), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [response?.content])

  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneLight}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
  }), [])

  if (isLoading) {
    return (
      <div className="dagger-output loading">
        <div className="output-header">
          <span className="interaction-number">{displayNumber}</span>
          <div className="loading-indicator">
            <span className="loading-text">Thinking...</span>
            <div className="loading-dots">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="dagger-output empty">
        <div className="output-header">
          <span className="interaction-number">{displayNumber}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="dagger-output">
      <div className="output-header">
        <span className="interaction-number">{displayNumber}</span>
        <div className="output-actions">
          <button 
            onClick={handleCopyToClipboard}
            className="copy-button"
            title="Copy response to clipboard"
          >
            {copyStatus}
          </button>
        </div>
      </div>

      <div className="output-content">
        <div className="markdown-content">
          <ReactMarkdown 
            components={markdownComponents}
          >
            {response.content}
          </ReactMarkdown>
        </div>
      </div>

      <div className="output-footer">
        <div className="metadata">
          <span className="timestamp">{formatTimestamp(response.timestamp)}</span>
          <span className="processing-time">{formatProcessingTime(response.processingTimeMs)}</span>
        </div>
        <div className="stats">
          <span className="char-count">{response.content.length} chars</span>
          <span className="word-count">{getWordCount(response.content)} words</span>
          <span className="token-count">{response.totalTokens} tokens</span>
        </div>
      </div>
    </div>
  )
}

// CSS-in-JS styles
const styles = `
.dagger-output {
  margin-bottom: 30px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
}

.dagger-output.loading {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dagger-output.empty {
  display: none;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.interaction-number {
  font-weight: 600;
  color: #374151;
  background: #ffffff;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  border: 1px solid #d1d5db;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}

.loading-dots {
  display: flex;
  gap: 2px;
}

.loading-dots span {
  animation: loadingDot 1.4s infinite ease-in-out;
  font-size: 10px;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes loadingDot {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.copy-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-button:hover {
  background: #2563eb;
}

.output-content {
  padding: 20px;
}

.markdown-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #374151;
}

.markdown-content h1 {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #111827;
}

.markdown-content h2 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 20px 0 12px 0;
  color: #111827;
}

.markdown-content p {
  margin: 0 0 16px 0;
}

.markdown-content code {
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
}

.markdown-content strong {
  font-weight: 600;
  color: #111827;
}

.output-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  font-size: 11px;
  color: #6b7280;
}

.metadata {
  display: flex;
  gap: 16px;
}

.stats {
  display: flex;
  gap: 12px;
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}