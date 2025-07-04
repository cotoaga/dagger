import { useState, useCallback } from 'react'
import { formatISODateTime } from '../models/GraphModel.js'

export function DaggerInputDisplay({ interaction, onCopy, onFork, showActions = false, onOpenTokenizer }) {
  // Auto-collapse long inputs (more than 3 lines)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (!interaction?.content) return false
    const content = interaction.content.replace(/\*\*User:\*\* /, '')
    return content.split('\n').length > 3
  })

  // Note: Tokenizer popup state is now managed at App level

  const getPreviewContent = useCallback((content) => {
    if (!content || !isCollapsed) return content
    
    const cleanContent = content.replace(/\*\*User:\*\* /, '')
    const lines = cleanContent.split('\n')
    if (lines.length <= 3) return cleanContent
    
    const preview = lines.slice(0, 3).join('\n')
    return preview + '\n\n[Input collapsed - click to expand]'
  }, [isCollapsed])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed])

  const handleInspectTokens = useCallback(() => {
    if (onOpenTokenizer) {
      const cleanContent = interaction.content.replace(/\*\*User:\*\* /, '')
      onOpenTokenizer(cleanContent, interaction.id)
    }
  }, [onOpenTokenizer, interaction.content, interaction.id])

  const cleanContent = interaction.content.replace(/\*\*User:\*\* /, '')
  const isLongContent = cleanContent.split('\n').length > 3

  return (
    <div className="input-interaction">
      <div className="interaction-header">
        <div className="conversation-info">
          <span className="interaction-number">{interaction.displayNumber}&gt;</span>
          <span className="timestamp">{formatISODateTime(interaction.timestamp)}</span>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Buttons are now handled by unified toolbar when conversation is selected */}
          {!showActions && (
            <>
              <button 
                onClick={handleInspectTokens}
                className="action-btn nav-btn-style"
                title="Inspect Tokens - Analyze tokenization breakdown"
              >
                🔍 Inspect Tokens
              </button>
              {isLongContent && (
                <button 
                  onClick={toggleCollapse}
                  className="collapse-button input-collapse"
                  title={isCollapsed ? "Expand input" : "Collapse input"}
                >
                  {isCollapsed ? '📖 Expand' : '📋 Collapse'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div 
        className={`interaction-content ${isCollapsed ? 'collapsed' : ''}`}
        onClick={isCollapsed ? toggleCollapse : undefined}
        style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
      >
        {getPreviewContent(cleanContent)}
      </div>
    </div>
  )
}

// CSS styles for input collapse
const styles = `
.interaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex !important;
  align-items: center;
  gap: 8px;
  visibility: visible !important;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background: transparent;
  color: #6b7280;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.fork-btn:hover {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

.copy-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* Professional grey button styling matching nav-btn */
.nav-btn-style {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85em;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn-style:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.input-collapse {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.input-collapse:hover {
  background: #7c3aed;
}

.interaction-content.collapsed {
  position: relative;
  cursor: pointer;
}

.interaction-content.collapsed::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(transparent, rgba(248, 250, 252, 0.9));
  pointer-events: none;
}

/* Dark mode support */
.app.dark .input-collapse {
  background: #8b5cf6;
}

.app.dark .input-collapse:hover {
  background: #7c3aed;
}

.app.dark .action-btn {
  border-color: #4a5568;
  color: #a0aec0;
}

.app.dark .action-btn:hover {
  background: #4a5568;
  color: #e2e8f0;
}

/* Dark mode for nav-btn-style uses CSS variables automatically */
.app.dark .nav-btn-style {
  /* CSS variables automatically handle dark mode theming */
}

.app.dark .interaction-content.collapsed::after {
  background: linear-gradient(transparent, rgba(31, 41, 55, 0.9));
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}