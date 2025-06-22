import React from 'react';

/**
 * ContextPanel - Shows current node context and statistics
 * Provides clear "you are here" indication with metadata
 */
const ContextPanel = ({ selectedNode, totalNodes, graphModel }) => {
  if (!selectedNode) {
    return (
      <div className="context-panel">
        <div className="context-main">
          <span className="node-indicator">📍 No node selected</span>
          <span className="branch-type">Click a node to focus</span>
        </div>
        <div className="context-meta">
          <span>{totalNodes} total conversations</span>
        </div>
      </div>
    );
  }

  const conversation = graphModel?.getConversation(selectedNode);
  if (!conversation) {
    return null;
  }

  const isMainBranch = !String(conversation.displayNumber).includes('.');
  const branchType = isMainBranch ? 'Main Branch' : 'Side Branch';
  
  // Get branch-specific info
  let branchDetail = '';
  if (conversation.branchType) {
    const branchTypes = {
      virgin: '🌱 Virgin',
      personality: '🎭 Personality', 
      knowledge: '🧠 Knowledge'
    };
    branchDetail = branchTypes[conversation.branchType] || conversation.branchType;
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getStatusEmoji = (status) => {
    const statusEmojis = {
      complete: '✅',
      processing: '⏳',
      error: '❌',
      ready: '⚡'
    };
    return statusEmojis[status] || '📝';
  };

  return (
    <div className="context-panel">
      <div className="context-main">
        <span className="node-indicator">
          {getStatusEmoji(conversation.status)} Node {conversation.displayNumber}
        </span>
        <div className="branch-info">
          <span className="branch-type">{branchType}</span>
          {branchDetail && <span className="branch-detail">{branchDetail}</span>}
        </div>
      </div>
      
      <div className="context-meta">
        <div className="meta-row">
          {conversation.timestamp && (
            <span className="meta-item">🕒 {formatTimestamp(conversation.timestamp)}</span>
          )}
          <span className="meta-item">📊 {totalNodes} total nodes</span>
        </div>
        
        <div className="meta-row">
          {conversation.tokenCount && (
            <span className="meta-item">🔢 {conversation.tokenCount} tokens</span>
          )}
          {conversation.processingTime && (
            <span className="meta-item">⚡ {conversation.processingTime}ms</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextPanel;