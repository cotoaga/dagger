import { useState } from 'react';
import { useDebug } from '../contexts/DebugContext.jsx';
import { testTemplates, getAllTemplates } from '../data/testTemplates.js';
import './TestTemplatePanel.css';

/**
 * TestTemplatePanel - Quick-insert test messages (DEV mode only)
 *
 * Features:
 * - Pre-built templates with novel information for testing
 * - Click: Replace input
 * - Shift+Click: Append to input
 * - Ctrl+Click: Copy to clipboard
 * - Organized by category
 * - Collapsible sections
 */
export function TestTemplatePanel({ inputRef }) {
  const { templatePanelVisible, toggleTemplatePanel } = useDebug();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    knowledgeMarkers: true,
    recallTests: false,
    structuredData: false,
    mergeInstructions: false,
    complexityTests: false,
    virginBranchTests: false
  });
  const [copiedId, setCopiedId] = useState(null);

  const handleTemplateClick = (template, event) => {
    event.preventDefault();

    // Ctrl/Cmd + Click = Copy to clipboard
    if (event.ctrlKey || event.metaKey) {
      navigator.clipboard.writeText(template.content).then(() => {
        setCopiedId(template.id);
        setTimeout(() => setCopiedId(null), 2000);
      });
      return;
    }

    // Check if inputRef is available
    if (!inputRef?.current) {
      console.warn('Input ref not available');
      return;
    }

    // Shift + Click = Append to input
    if (event.shiftKey) {
      const currentValue = inputRef.current.getValue?.() || '';
      const newValue = currentValue
        ? `${currentValue}\n\n${template.content}`
        : template.content;
      inputRef.current.setValue?.(newValue);
    } else {
      // Regular click = Replace input
      inputRef.current.setValue?.(template.content);
    }

    // Focus the input
    inputRef.current.focus?.();
  };

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  if (!templatePanelVisible) {
    return null;
  }

  return (
    <div className={`test-template-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="template-panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>🧪 Test Templates</h3>
        <div className="template-panel-controls">
          <button
            className="close-button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTemplatePanel();
            }}
          >
            ×
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="template-panel-content">
          <div className="template-usage-hint">
            <p><strong>Click:</strong> Replace input</p>
            <p><strong>Shift+Click:</strong> Append to input</p>
            <p><strong>Ctrl+Click:</strong> Copy to clipboard</p>
          </div>

          {Object.entries(testTemplates).map(([categoryKey, categoryData]) => (
            <div key={categoryKey} className="template-category">
              <div
                className="template-category-header"
                onClick={() => toggleCategory(categoryKey)}
              >
                <span className="category-toggle">
                  {expandedCategories[categoryKey] ? '▼' : '▶'}
                </span>
                <span className="category-name">{categoryData.category}</span>
                <span className="category-count">
                  ({categoryData.templates.length})
                </span>
              </div>

              {expandedCategories[categoryKey] && (
                <div className="template-list">
                  <p className="category-description">{categoryData.description}</p>
                  {categoryData.templates.map(template => (
                    <div
                      key={template.id}
                      className={`template-item ${copiedId === template.id ? 'copied' : ''}`}
                      onClick={(e) => handleTemplateClick(template, e)}
                      title={template.description}
                    >
                      <div className="template-item-header">
                        <span className="template-name">{template.name}</span>
                        {copiedId === template.id && (
                          <span className="copied-indicator">✓ Copied</span>
                        )}
                      </div>
                      <div className="template-preview">
                        {template.content.length > 80
                          ? `${template.content.substring(0, 80)}...`
                          : template.content
                        }
                      </div>
                      <div className="template-description">
                        {template.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TestTemplatePanel;
