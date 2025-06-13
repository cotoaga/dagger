export function ViewToggle({ currentView, onViewChange }) {
  return (
    <div className="view-toggle">
      <button 
        className={currentView === 'linear' ? 'active' : ''}
        onClick={() => onViewChange('linear')}
        title="Linear conversation view"
      >
        📝 Linear
      </button>
      <button 
        className={currentView === 'graph' ? 'active' : ''}
        onClick={() => onViewChange('graph')}
        title="Graph knowledge map view"
      >
        🗺️ Graph
      </button>
    </div>
  )
}

// CSS styles
const styles = `
.view-toggle {
  display: flex;
  background-color: var(--toggle-bg, #2d3748);
  border-radius: 6px;
  padding: 4px;
  border: 1px solid var(--border-color, #4a5568);
  margin-left: 12px;
}

.view-toggle button {
  padding: 6px 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary, #a0aec0);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.view-toggle button:hover {
  background-color: var(--hover-bg, #374151);
  color: var(--text-primary, #e2e8f0);
}

.view-toggle button.active {
  background-color: var(--active-bg, #4299e1);
  color: white;
  font-weight: 600;
}

.view-toggle button:focus {
  outline: 2px solid var(--focus-color, #63b3ed);
  outline-offset: 2px;
}

/* Dark mode variables */
.app.dark {
  --toggle-bg: #2d3748;
  --hover-bg: #374151;
  --active-bg: #4299e1;
  --focus-color: #63b3ed;
}

/* Light mode variables */
.app.light {
  --toggle-bg: #f7fafc;
  --hover-bg: #e2e8f0;
  --active-bg: #4299e1;
  --focus-color: #3182ce;
}

/* Responsive design */
@media (max-width: 640px) {
  .view-toggle {
    margin-left: 8px;
  }
  
  .view-toggle button {
    padding: 4px 8px;
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