import { useState, useEffect } from 'react';
import { useDebug } from '../contexts/DebugContext.jsx';
import { graphModel } from '../models/GraphModel.js';
import './DebugPanel.css';

/**
 * DebugPanel - Real-time conversation state inspector (DEV mode only)
 *
 * Features:
 * - Display conversation metadata (ID, displayNumber, branchType, depth, status)
 * - Show conversation chain from root to current
 * - Context information (model, temperature, token count, context size)
 * - Parent/merge information
 * - Copy-to-clipboard debug info
 * - Collapsible sections
 */
export function DebugPanel() {
  const { debugPanelVisible, selectedConversationId, toggleDebugPanel } = useDebug();
  const [debugInfo, setDebugInfo] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  // Update debug info when selected conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      const info = graphModel.getDebugInfo(selectedConversationId);
      setDebugInfo(info);
    } else {
      setDebugInfo(null);
    }
  }, [selectedConversationId]);

  // Auto-refresh debug info every 2 seconds (to catch status updates)
  useEffect(() => {
    if (!selectedConversationId) return;

    const interval = setInterval(() => {
      const info = graphModel.getDebugInfo(selectedConversationId);
      setDebugInfo(info);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedConversationId]);

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const copyFullDebugInfo = () => {
    if (!debugInfo) return;
    const text = JSON.stringify(debugInfo, null, 2);
    copyToClipboard(text, 'full');
  };

  const formatChain = (chain) => {
    if (!chain || chain.length === 0) return 'Root';

    return chain.map((node, idx) => {
      const isLast = idx === chain.length - 1;
      const prefix = node.isCurrent ? '[' : '';
      const suffix = node.isCurrent ? ']' : '';
      const arrow = isLast ? '' : ' → ';

      return `${prefix}${node.displayNumber}${suffix}${arrow}`;
    }).join('');
  };

  if (!debugPanelVisible) {
    return null;
  }

  return (
    <div className={`debug-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="debug-panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>🐛 Debug Inspector</h3>
        <div className="debug-panel-controls">
          {!collapsed && debugInfo && (
            <button
              className="copy-button"
              onClick={(e) => {
                e.stopPropagation();
                copyFullDebugInfo();
              }}
              title="Copy full debug info"
            >
              {copiedSection === 'full' ? '✓' : '📋'}
            </button>
          )}
          <button
            className="close-button"
            onClick={(e) => {
              e.stopPropagation();
              toggleDebugPanel();
            }}
          >
            ×
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="debug-panel-content">
          {!debugInfo ? (
            <div className="debug-empty">
              <p>No conversation selected</p>
              <p className="debug-hint">Click on a conversation node in the graph to inspect it</p>
            </div>
          ) : (
            <>
              {/* Basic Information */}
              <section className="debug-section">
                <h4>Basic Information</h4>
                <div className="debug-field">
                  <span className="debug-label">Display Number:</span>
                  <span className="debug-value">{debugInfo.displayNumber}</span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">ID:</span>
                  <span className="debug-value debug-id" title={debugInfo.id}>
                    {debugInfo.id.substring(0, 8)}...
                    <button
                      className="copy-icon"
                      onClick={() => copyToClipboard(debugInfo.id, 'id')}
                    >
                      {copiedSection === 'id' ? '✓' : '📋'}
                    </button>
                  </span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">Status:</span>
                  <span className={`debug-value status-${debugInfo.status}`}>
                    {debugInfo.status}
                  </span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">Timestamp:</span>
                  <span className="debug-value">{debugInfo.formattedTimestamp}</span>
                </div>
              </section>

              {/* Branch Information */}
              <section className="debug-section">
                <h4>Branch Information</h4>
                <div className="debug-field">
                  <span className="debug-label">Branch Type:</span>
                  <span className={`debug-value branch-type-${debugInfo.branchType}`}>
                    {debugInfo.branchType}
                  </span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">Depth:</span>
                  <span className="debug-value">{debugInfo.depth}</span>
                </div>
                {debugInfo.parentDisplayNumber && (
                  <>
                    <div className="debug-field">
                      <span className="debug-label">Parent Node:</span>
                      <span className="debug-value">{debugInfo.parentDisplayNumber}</span>
                    </div>
                    <div className="debug-field">
                      <span className="debug-label">Parent ID:</span>
                      <span className="debug-value debug-id" title={debugInfo.parentId}>
                        {debugInfo.parentId?.substring(0, 8)}...
                      </span>
                    </div>
                  </>
                )}
                {debugInfo.isMerged && (
                  <div className="debug-field">
                    <span className="debug-label">Merged:</span>
                    <span className="debug-value merged">Yes</span>
                  </div>
                )}
              </section>

              {/* Conversation Chain */}
              <section className="debug-section">
                <h4>Conversation Chain</h4>
                <div className="debug-chain">
                  <code>{formatChain(debugInfo.chain)}</code>
                  <button
                    className="copy-icon"
                    onClick={() => copyToClipboard(formatChain(debugInfo.chain), 'chain')}
                  >
                    {copiedSection === 'chain' ? '✓' : '📋'}
                  </button>
                </div>
              </section>

              {/* Context Information */}
              <section className="debug-section">
                <h4>Context Information</h4>
                <div className="debug-field">
                  <span className="debug-label">Model:</span>
                  <span className="debug-value">{debugInfo.modelDisplay}</span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">Temperature:</span>
                  <span className="debug-value">{debugInfo.temperature}</span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">Token Count:</span>
                  <span className="debug-value">{debugInfo.tokenCount.toLocaleString()}</span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">Context Size:</span>
                  <span className="debug-value">
                    {(debugInfo.contextSize / 1000).toFixed(1)}k chars
                  </span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">Processing Time:</span>
                  <span className="debug-value">{debugInfo.processingTime}ms</span>
                </div>
                <div className="debug-field">
                  <span className="debug-label">System Prompt:</span>
                  <span className="debug-value">{debugInfo.systemPrompt}</span>
                </div>
                {debugInfo.promptTemplate && (
                  <div className="debug-field">
                    <span className="debug-label">Prompt Template:</span>
                    <span className="debug-value">{debugInfo.promptTemplate}</span>
                  </div>
                )}
              </section>

              {/* Merge Information */}
              {debugInfo.mergeInfo && (
                <section className="debug-section">
                  <h4>Merge Information</h4>
                  <div className="debug-field">
                    <span className="debug-label">Source:</span>
                    <span className="debug-value">{debugInfo.mergeInfo.sourceDisplayNumber}</span>
                  </div>
                  <div className="debug-field">
                    <span className="debug-label">Target:</span>
                    <span className="debug-value">{debugInfo.mergeInfo.targetDisplayNumber}</span>
                  </div>
                  <div className="debug-field">
                    <span className="debug-label">Merged At:</span>
                    <span className="debug-value">
                      {new Date(debugInfo.mergeInfo.timestamp).toLocaleString()}
                    </span>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DebugPanel;
