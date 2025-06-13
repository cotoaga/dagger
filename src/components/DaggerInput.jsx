import { useState, useCallback } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

export function DaggerInput({ onSubmit, displayNumber, placeholder = "Ask anything, explore ideas, branch into new territories..." }) {
  const [content, setContent] = useState('')

  const getCharCount = useCallback(() => content.length, [content])
  
  const getWordCount = useCallback(() => {
    if (!content.trim()) return 0
    return content.trim().split(/\s+/).length
  }, [content])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }, [content, displayNumber])

  const handleSubmit = useCallback(() => {
    if (!content.trim()) return

    const submission = {
      content: content.trim(),
      timestamp: new Date(),
      displayNumber,
      charCount: getCharCount(),
      wordCount: getWordCount()
    }

    onSubmit(submission)
    setContent('')
  }, [content, displayNumber, onSubmit, getCharCount, getWordCount])

  return (
    <div className="dagger-input">
      <div className="input-header">
        <span className="interaction-number">{displayNumber}</span>
        <div className="stats">
          <span className="char-count">{getCharCount()} chars</span>
          <span className="word-count">{getWordCount()} words</span>
        </div>
      </div>
      
      <TextareaAutosize
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        minRows={3}
        maxRows={20}
        className="dagger-textarea"
        style={{
          fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          width: '100%',
          padding: '12px',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          resize: 'none',
          outline: 'none',
          backgroundColor: '#fafbfc',
          transition: 'border-color 0.2s, background-color 0.2s'
        }}
      />
      
      <div className="input-footer">
        <span className="shortcut-hint">⌘+Enter or Ctrl+Enter to submit</span>
      </div>
    </div>
  )
}

// Add some basic CSS-in-JS styles
const styles = `
.dagger-input {
  margin-bottom: 20px;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.interaction-number {
  font-weight: 600;
  color: #374151;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
}

.stats {
  display: flex;
  gap: 16px;
}

.dagger-textarea:focus {
  border-color: #3b82f6 !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-footer {
  margin-top: 4px;
  text-align: right;
}

.shortcut-hint {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}
`

// Inject styles into head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}