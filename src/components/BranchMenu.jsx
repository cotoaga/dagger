import { useState } from 'react'

export function BranchMenu({ sourceNodeId, onBranchCreate, onClose }) {
  const [branchType, setBranchType] = useState('knowledge')
  const [summaryType, setSummaryType] = useState('brief')

  const calculateNewNodeId = (parentId) => {
    // This will be calculated by the GraphModel, but show preview
    const baseNumber = parentId.replace('>', '')
    return `${baseNumber}.1>`
  }

  const getBranchDescription = (branchType, summaryType) => {
    switch (branchType) {
      case 'virgin':
        return 'Fresh conversation with no inherited context. AI starts with clean slate.'
      case 'personality':
        return 'AI personality loaded (KHAOS-Coder) but no conversation history inherited.'
      case 'knowledge':
        return `Full context inheritance with ${summaryType} summary of conversation history.`
      default:
        return ''
    }
  }

  const handleCreate = () => {
    onBranchCreate(branchType, summaryType)
    onClose()
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />
      
      {/* Branch Menu Modal */}
      <div className="branch-modal">
        <div className="modal-header">
          <h3>🌿 Create Branch from Node {sourceNodeId}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {/* Branch Type Selection */}
        <div className="branch-type-selector">
          <h4>Select Branch Type:</h4>
          
          <label className={branchType === 'virgin' ? 'selected' : ''}>
            <input 
              type="radio" 
              value="virgin" 
              checked={branchType === 'virgin'}
              onChange={e => setBranchType(e.target.value)} 
            />
            <div className="option-card virgin">
              <div className="option-icon">🌱</div>
              <div className="option-content">
                <strong>Virgin Chat</strong>
                <p>Fresh start, no context inheritance</p>
              </div>
            </div>
          </label>
          
          <label className={branchType === 'personality' ? 'selected' : ''}>
            <input 
              type="radio" 
              value="personality" 
              checked={branchType === 'personality'}
              onChange={e => setBranchType(e.target.value)} 
            />
            <div className="option-card personality">
              <div className="option-icon">🎭</div>
              <div className="option-content">
                <strong>Personality Only</strong>
                <p>KHAOS-Coder loaded, no conversation history</p>
              </div>
            </div>
          </label>
          
          <label className={branchType === 'knowledge' ? 'selected' : ''}>
            <input 
              type="radio" 
              value="knowledge" 
              checked={branchType === 'knowledge'}
              onChange={e => setBranchType(e.target.value)} 
            />
            <div className="option-card knowledge">
              <div className="option-icon">🧠</div>
              <div className="option-content">
                <strong>Knowledge Inherited</strong>
                <p>Full context with summarized exploration history</p>
              </div>
            </div>
          </label>
        </div>
        
        {/* Summary Type (only for knowledge branches) */}
        {branchType === 'knowledge' && (
          <div className="summary-type-selector">
            <h4>Summary Detail Level:</h4>
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
                  <span>Brief Summary (KHAOS-Brief)</span>
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
                  <span>Detailed Briefing (KHAOS-Detail)</span>
                </span>
              </label>
            </div>
          </div>
        )}
        
        {/* Preview */}
        <div className="branch-preview">
          <h4>Preview:</h4>
          <div className="preview-content">
            <div className="preview-id">
              <strong>New node ID:</strong> {calculateNewNodeId(sourceNodeId)}
            </div>
            <div className="preview-description">
              {getBranchDescription(branchType, summaryType)}
            </div>
          </div>
        </div>
        
        {/* Modal Actions */}
        <div className="modal-actions">
          <button className="create-btn" onClick={handleCreate}>
            🌿 Create Branch
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
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.branch-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--modal-bg, #2d3748);
  border: 2px solid var(--border-color, #4a5568);
  border-radius: 12px;
  padding: 24px;
  min-width: 500px;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1001;
  color: var(--text-primary, #e2e8f0);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #4a5568);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #a0aec0);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--hover-bg, #374151);
  color: var(--text-primary, #e2e8f0);
}

.branch-type-selector h4,
.summary-type-selector h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary, #e2e8f0);
}

.branch-type-selector label,
.summary-type-selector label {
  display: block;
  cursor: pointer;
  margin-bottom: 12px;
}

.branch-type-selector input,
.summary-type-selector input {
  display: none;
}

.option-card {
  display: flex;
  align-items: center;
  border: 2px solid var(--border-color, #4a5568);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  background: var(--card-bg, #1a202c);
}

.option-card:hover {
  border-color: var(--accent-color, #63b3ed);
  background: var(--card-hover-bg, #2a3441);
}

.option-card.virgin {
  border-left: 4px solid #9f7aea;
}

.option-card.personality {
  border-left: 4px solid #4299e1;
}

.option-card.knowledge {
  border-left: 4px solid #48bb78;
}

label.selected .option-card {
  border-color: var(--accent-color, #63b3ed);
  background: var(--card-selected-bg, #2b6cb0);
  transform: scale(1.02);
}

.option-icon {
  font-size: 24px;
  margin-right: 16px;
  min-width: 40px;
  text-align: center;
}

.option-content {
  flex: 1;
}

.option-content strong {
  display: block;
  margin-bottom: 4px;
  font-size: 16px;
}

.option-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #a0aec0);
  line-height: 1.4;
}

.summary-options {
  display: flex;
  gap: 16px;
}

.summary-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid var(--border-color, #4a5568);
  border-radius: 6px;
  background: var(--card-bg, #1a202c);
  transition: all 0.2s;
  min-width: 200px;
}

.summary-option:hover {
  border-color: var(--accent-color, #63b3ed);
}

label.selected .summary-option {
  border-color: var(--accent-color, #63b3ed);
  background: var(--card-selected-bg, #2b6cb0);
}

.summary-icon {
  font-size: 18px;
}

.branch-preview {
  margin: 20px 0;
  padding: 16px;
  background: var(--preview-bg, #1a202c);
  border: 1px solid var(--border-color, #4a5568);
  border-radius: 6px;
}

.branch-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.preview-content {
  font-size: 14px;
  line-height: 1.5;
}

.preview-id {
  margin-bottom: 8px;
  font-family: Monaco, Menlo, Consolas, "Courier New", monospace;
}

.preview-description {
  color: var(--text-secondary, #a0aec0);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #4a5568);
}

.create-btn {
  background: var(--primary-color, #4299e1);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: var(--primary-hover, #3182ce);
  transform: translateY(-1px);
}

.cancel-btn {
  background: transparent;
  color: var(--text-secondary, #a0aec0);
  border: 1px solid var(--border-color, #4a5568);
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: var(--hover-bg, #374151);
  color: var(--text-primary, #e2e8f0);
}

/* Dark mode variables */
.app.dark {
  --modal-bg: #2d3748;
  --card-bg: #1a202c;
  --card-hover-bg: #2a3441;
  --card-selected-bg: #2b6cb0;
  --preview-bg: #1a202c;
  --hover-bg: #374151;
  --primary-color: #4299e1;
  --primary-hover: #3182ce;
  --accent-color: #63b3ed;
}

/* Light mode variables */
.app.light {
  --modal-bg: #ffffff;
  --card-bg: #f7fafc;
  --card-hover-bg: #edf2f7;
  --card-selected-bg: #bee3f8;
  --preview-bg: #f7fafc;
  --hover-bg: #e2e8f0;
  --primary-color: #3182ce;
  --primary-hover: #2c5aa0;
  --accent-color: #3182ce;
}

/* Responsive design */
@media (max-width: 640px) {
  .branch-modal {
    min-width: 90vw;
    max-width: 90vw;
    padding: 16px;
  }
  
  .summary-options {
    flex-direction: column;
    gap: 8px;
  }
  
  .summary-option {
    min-width: auto;
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}