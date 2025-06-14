import { useState, useCallback } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

export function DaggerInput({ onSubmit, displayNumber, placeholder = "Ask anything, explore ideas, branch into new territories..." }) {
  const [content, setContent] = useState('')
  const [temperature, setTemperature] = useState(0.7)

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
      temperature: temperature,
      timestamp: new Date(),
      displayNumber,
      charCount: getCharCount(),
      wordCount: getWordCount()
    }

    onSubmit(submission)
    setContent('')
  }, [content, temperature, displayNumber, onSubmit, getCharCount, getWordCount])

  return (
    <div className="dagger-input">
      <div className="input-header">
        <span className="interaction-number">{displayNumber}&gt;</span>
        <div className="stats">
          <span className="char-count">{getCharCount()} chars</span>
          <span className="word-count">{getWordCount()} words</span>
        </div>
      </div>
      
      <div className="dagger-input-controls">
        <div className="control-group">
          <label htmlFor="temperature-slider">
            Temperature: <span className="temperature-value">{temperature}</span>
          </label>
          <input
            type="range"
            id="temperature-slider"
            min="0.1"
            max="1.0"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="temperature-slider"
          />
          <div className="temperature-labels">
            <span>Focused</span>
            <span>Creative</span>
          </div>
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

.dagger-input-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-group label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.temperature-slider {
  width: 120px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.temperature-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.temperature-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.temperature-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
}

.temperature-value {
  color: #3b82f6;
  font-weight: 600;
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

/* Dark mode support for DaggerInput */
.app.dark .dagger-textarea {
  background-color: #374151 !important;
  border-color: #4b5563 !important;
  color: #e5e7eb !important;
}

.app.dark .dagger-textarea::placeholder {
  color: #9ca3af !important;
}

.app.dark .dagger-textarea:focus {
  border-color: #3b82f6 !important;
  background-color: #374151 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

.app.dark .input-header {
  color: #9ca3af;
}

.app.dark .interaction-number {
  background: #4b5563;
  color: #e5e7eb;
}

.app.dark .shortcut-hint {
  color: #6b7280;
}

/* Dark mode support for temperature controls */
.app.dark .control-group label {
  color: #9ca3af;
}

.app.dark .temperature-slider {
  background: #4b5563;
}

.app.dark .temperature-slider::-webkit-slider-thumb {
  background: #3b82f6;
}

.app.dark .temperature-slider::-moz-range-thumb {
  background: #3b82f6;
}

.app.dark .temperature-labels {
  color: #6b7280;
}

.app.dark .temperature-value {
  color: #3b82f6;
}
`

// Inject styles into head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}