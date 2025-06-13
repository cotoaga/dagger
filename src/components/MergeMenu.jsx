import { useState, useEffect } from 'react'

export function MergeMenu({ branchNodeId, availableTargets, onMergeBack, onClose, graph }) {
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [summaryType, setSummaryType] = useState('brief')
  const [previewSummary, setPreviewSummary] = useState('')

  const generateMergePreview = (branchNodeId, summaryType) => {
    if (!graph) return 'Preview will be generated...'
    
    const thread = graph.getConversationThread(branchNodeId)
    const branchExplorations = thread.filter(node => node.id.includes('.'))
    
    if (branchExplorations.length === 0) {
      return 'No branch-specific content to summarize.'
    }

    const keyTopics = branchExplorations.map(node => {
      const firstSentence = node.content.prompt.split('.')[0]
      return firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence
    }).slice(0, 3)

    if (summaryType === 'brief') {
      return `Brief integration: Explored ${keyTopics.length} topics including "${keyTopics[0]}" with ${branchExplorations.length} total exchanges.`
    } else {
      return `Detailed integration: Comprehensive exploration of ${keyTopics.join(', ')}, covering ${branchExplorations.length} conversation exchanges with deep analysis and insights.`
    }
  }

  useEffect(() => {
    setPreviewSummary(generateMergePreview(branchNodeId, summaryType))
  }, [branchNodeId, summaryType, graph])

  const handleMerge = () => {
    if (!selectedTarget) return
    onMergeBack(selectedTarget, summaryType)
    onClose()
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />
      
      {/* Merge Menu Modal */}
      <div className="merge-modal">
        <div className="modal-header">
          <h3>⤴ Merge Branch {branchNodeId} Back to Main Thread</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {/* Valid Merge Targets */}
        <div className="merge-targets">
          <h4>Select Merge Destination:</h4>
          {availableTargets.length === 0 ? (
            <div className="no-targets">
              <p>No valid merge targets available. Create more conversation nodes or branches to enable merging.</p>
            </div>
          ) : (
            availableTargets.map(target => (
              <label 
                key={target.id} 
                className={selectedTarget === target.id ? 'selected' : ''}
              >
                <input 
                  type="radio" 
                  value={target.id} 
                  checked={selectedTarget === target.id}
                  onChange={e => setSelectedTarget(e.target.value)} 
                />
                <div className="target-option">
                  <div className="target-header">
                    <strong>Node {target.id}</strong>
                    <span className="merge-reason">{target.mergeReason}</span>
                  </div>
                  <div className="target-preview">
                    {target.preview}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
        
        {/* Summary Type Selection */}
        {availableTargets.length > 0 && (
          <div className="summary-type-selector">
            <h4>Integration Summary:</h4>
            <div className="summary-options">
              <label className={summaryType === 'brief' ? 'selected' : ''}>
                <input 
                  type="radio" 
                  value="brief" 
                  checked={summaryType === 'brief'}
                  onChange={e => setSummaryType(e.target.value)} 
                />
                <span className="summary-option">
                  <span className="summary-icon">📝</span>
                  <span>Brief Integration (Key insights only)</span>
                </span>
              </label>
              <label className={summaryType === 'detailed' ? 'selected' : ''}>
                <input 
                  type="radio" 
                  value="detailed" 
                  checked={summaryType === 'detailed'}
                  onChange={e => setSummaryType(e.target.value)} 
                />
                <span className="summary-option">
                  <span className="summary-icon">📖</span>
                  <span>Detailed Integration (Comprehensive findings)</span>
                </span>
              </label>
            </div>
          </div>
        )}
        
        {/* Merge Preview */}
        {availableTargets.length > 0 && (
          <div className="merge-preview">
            <h4>Branch Summary Preview:</h4>
            <div className="summary-preview">
              {previewSummary}
            </div>
            <div className="integration-note">
              <small>This summary will be integrated into the target conversation thread.</small>
            </div>
          </div>
        )}
        
        {/* Modal Actions */}
        <div className="modal-actions">
          <button 
            className="merge-btn"
            onClick={handleMerge}
            disabled={!selectedTarget}
          >
            ⤴ Merge Branch
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// CSS styles
const styles = `
.merge-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--modal-bg, #2d3748);
  border: 2px solid var(--border-color, #4a5568);
  border-radius: 12px;
  padding: 24px;
  min-width: 600px;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1001;
  color: var(--text-primary, #e2e8f0);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

.merge-targets h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-primary, #e2e8f0);
}

.merge-targets label {
  display: block;
  cursor: pointer;
  margin-bottom: 12px;
}

.merge-targets input {
  display: none;
}

.target-option {
  border: 2px solid var(--border-color, #4a5568);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  background: var(--card-bg, #1a202c);
}

.target-option:hover {
  border-color: var(--accent-color, #63b3ed);
  background: var(--card-hover-bg, #2a3441);
}

label.selected .target-option {
  border-color: var(--accent-color, #63b3ed);
  background: var(--card-selected-bg, #2b6cb0);
  transform: scale(1.01);
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.target-header strong {
  font-size: 16px;
  color: var(--text-primary, #e2e8f0);
}

.merge-reason {
  font-size: 12px;
  color: var(--accent-color, #63b3ed);
  font-style: italic;
  padding: 2px 6px;
  background: var(--accent-bg, rgba(99, 179, 237, 0.1));
  border-radius: 4px;
}

.target-preview {
  font-size: 14px;
  color: var(--text-secondary, #a0aec0);
  line-height: 1.4;
  margin-top: 8px;
  padding: 8px;
  background: var(--preview-bg, rgba(0, 0, 0, 0.2));
  border-radius: 4px;
  border-left: 3px solid var(--accent-color, #63b3ed);
}

.no-targets {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary, #a0aec0);
  font-style: italic;
}

.merge-preview {
  margin: 24px 0;
  padding: 16px;
  background: var(--preview-bg, #1a202c);
  border: 1px solid var(--border-color, #4a5568);
  border-radius: 8px;
  border-left: 4px solid var(--warning-color, #f6ad55);
}

.merge-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary, #e2e8f0);
}

.summary-preview {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary, #e2e8f0);
  padding: 12px;
  background: var(--code-bg, rgba(0, 0, 0, 0.3));
  border-radius: 6px;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
  margin-bottom: 12px;
}

.integration-note {
  color: var(--text-secondary, #a0aec0);
  font-style: italic;
}

.merge-btn {
  background: var(--warning-color, #f6ad55);
  color: var(--text-dark, #1a202c);
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.merge-btn:hover:not(:disabled) {
  background: var(--warning-hover, #ed8936);
  transform: translateY(-1px);
}

.merge-btn:disabled {
  background: var(--disabled-bg, #4a5568);
  color: var(--text-disabled, #718096);
  cursor: not-allowed;
  transform: none;
}

/* Additional dark mode variables */
.app.dark {
  --warning-color: #f6ad55;
  --warning-hover: #ed8936;
  --accent-bg: rgba(99, 179, 237, 0.1);
  --code-bg: rgba(0, 0, 0, 0.3);
  --text-dark: #1a202c;
  --text-disabled: #718096;
  --disabled-bg: #4a5568;
}

/* Light mode variables */
.app.light {
  --warning-color: #ed8936;
  --warning-hover: #dd6b20;
  --accent-bg: rgba(49, 130, 206, 0.1);
  --code-bg: rgba(0, 0, 0, 0.1);
  --text-dark: #ffffff;
  --text-disabled: #a0aec0;
  --disabled-bg: #e2e8f0;
}

/* Responsive design */
@media (max-width: 640px) {
  .merge-modal {
    min-width: 90vw;
    max-width: 90vw;
    padding: 16px;
  }
  
  .target-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .merge-reason {
    font-size: 11px;
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}