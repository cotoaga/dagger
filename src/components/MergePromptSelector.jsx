import { useState, useEffect } from 'react'

export function MergePromptSelector({ 
  sourceNode, 
  targetNode, 
  onSelect, 
  onCancel, 
  isVisible, 
  promptsModel 
}) {
  const [mergePrompts, setMergePrompts] = useState([])
  const [selectedPrompt, setSelectedPrompt] = useState(null)

  useEffect(() => {
    if (isVisible && promptsModel) {
      const prompts = promptsModel.getPromptsByCategory('merge')
      setMergePrompts(prompts)
    }
  }, [isVisible, promptsModel])

  const handlePromptSelect = (prompt) => {
    setSelectedPrompt(prompt)
  }

  const handleConfirm = () => {
    if (selectedPrompt && onSelect) {
      onSelect(selectedPrompt, sourceNode, targetNode)
    }
  }

  if (!isVisible) return null

  return (
    <div className="merge-prompt-overlay">
      <div className="merge-prompt-popup">
        <div className="merge-prompt-header">
          <h3>🔗 Branch Merge Intelligence</h3>
          <p>How should insights from <strong>Branch {sourceNode?.displayNumber}</strong> be integrated into the main thread?</p>
        </div>

        <div className="merge-prompt-options">
          {mergePrompts.map(prompt => (
            <div 
              key={prompt.id}
              className={`merge-prompt-option ${selectedPrompt?.id === prompt.id ? 'selected' : ''}`}
              onClick={() => handlePromptSelect(prompt)}
            >
              <div className="prompt-icon">🔗</div>
              <div className="prompt-details">
                <div className="prompt-name">{prompt.name}</div>
                <div className="prompt-description">
                  {prompt.id === 'khaos-squeezer' 
                    ? 'Extract weighted insights and key discoveries for seamless integration'
                    : 'Deep analysis of specialized exploration with strategic recommendations'
                  }
                </div>
              </div>
              <div className="prompt-selector">
                {selectedPrompt?.id === prompt.id && <span className="checkmark">✓</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="merge-prompt-preview">
          {selectedPrompt && (
            <div className="selected-prompt-preview">
              <h4>Integration Strategy:</h4>
              <p>{selectedPrompt.name} will process the branch conversation and create an intelligent summary optimized for main thread continuation.</p>
            </div>
          )}
        </div>

        <div className="merge-prompt-actions">
          <button 
            className="merge-cancel-btn"
            onClick={onCancel}
          >
            Cancel Merge
          </button>
          <button 
            className="merge-confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedPrompt}
          >
            🔗 Merge with {selectedPrompt?.name?.split(' ')[1] || 'Intelligence'}
          </button>
        </div>
      </div>
    </div>
  )
}

// CSS Styles
const styles = `
.merge-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.merge-prompt-popup {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.merge-prompt-header {
  text-align: center;
  margin-bottom: 24px;
}

.merge-prompt-header h3 {
  color: var(--text-primary);
  margin: 0 0 8px 0;
  font-size: 1.4em;
  font-weight: 600;
}

.merge-prompt-header p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.95em;
}

.merge-prompt-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.merge-prompt-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-secondary);
}

.merge-prompt-option:hover {
  border-color: var(--accent-color);
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.merge-prompt-option.selected {
  border-color: var(--accent-color);
  background: rgba(88, 166, 255, 0.1);
  box-shadow: 0 2px 8px rgba(88, 166, 255, 0.2);
}

.prompt-icon {
  font-size: 1.5em;
  margin-right: 12px;
  color: var(--accent-color);
}

.prompt-details {
  flex: 1;
}

.prompt-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 1.05em;
}

.prompt-description {
  color: var(--text-secondary);
  font-size: 0.9em;
  line-height: 1.4;
}

.prompt-selector {
  margin-left: 12px;
}

.checkmark {
  color: var(--accent-color);
  font-weight: bold;
  font-size: 1.2em;
}

.merge-prompt-preview {
  min-height: 60px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--accent-color);
}

.selected-prompt-preview h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 1em;
}

.selected-prompt-preview p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9em;
  line-height: 1.4;
}

.merge-prompt-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.merge-cancel-btn,
.merge-confirm-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}

.merge-cancel-btn {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.merge-cancel-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.merge-confirm-btn {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.merge-confirm-btn:hover:not(:disabled) {
  background: #4fa3ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(88, 166, 255, 0.3);
}

.merge-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .merge-prompt-popup {
    width: 95%;
    padding: 16px;
    margin: 20px;
  }
  
  .merge-prompt-option {
    padding: 12px;
  }
  
  .merge-prompt-actions {
    flex-direction: column;
  }
  
  .merge-cancel-btn,
  .merge-confirm-btn {
    width: 100%;
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}