import React from 'react';

/**
 * NavigationControls - Provides quick navigation options
 * Parent, Main Branch, Center View, and other navigation shortcuts
 */
const NavigationControls = ({ 
  currentNode, 
  onNavigate, 
  onCenterView, 
  onViewChange,
  currentView,
  graphModel 
}) => {
  if (!currentNode) {
    return (
      <div className="nav-controls">
        <button className="nav-btn nav-disabled" disabled>
          🏠 Main Branch
        </button>
        <button 
          onClick={onCenterView}
          className="nav-btn"
          title="Center the graph view"
        >
          🎯 Center View
        </button>
        <button 
          onClick={() => onViewChange('linear')}
          className={`nav-btn ${currentView === 'linear' ? 'nav-active' : ''}`}
          title="Switch to linear view"
        >
          📝 Linear
        </button>
      </div>
    );
  }

  const conversation = graphModel?.getConversation(currentNode);
  if (!conversation) return null;

  const displayNum = String(conversation.displayNumber);
  const isMainBranch = !displayNum.includes('.');
  
  // Find parent node
  let parentNodeId = null;
  if (!isMainBranch) {
    const parts = displayNum.split('.');
    if (parts.length > 1) {
      // For branches like "1.1.2", parent could be "1.1.1" or "1"
      const lastNum = parseInt(parts[parts.length - 1]);
      if (lastNum > 0) {
        // Parent is previous in branch
        const parentDisplayNum = [...parts.slice(0, -1), String(lastNum - 1)].join('.');
        const parentConv = graphModel?.getAllConversations()?.find(
          c => String(c.displayNumber) === parentDisplayNum
        );
        parentNodeId = parentConv?.id;
      } else {
        // Branch start, parent is the main thread node it branched from
        const mainDisplayNum = parts[0];
        const parentConv = graphModel?.getAllConversations()?.find(
          c => String(c.displayNumber) === mainDisplayNum
        );
        parentNodeId = parentConv?.id;
      }
    }
  } else {
    // Main branch - parent is previous main node
    const currentNum = parseInt(displayNum);
    if (currentNum > 0) {
      const parentDisplayNum = String(currentNum - 1);
      const parentConv = graphModel?.getAllConversations()?.find(
        c => String(c.displayNumber) === parentDisplayNum
      );
      parentNodeId = parentConv?.id;
    }
  }

  // Find main branch root
  const findMainBranchRoot = () => {
    const allConversations = graphModel?.getAllConversations() || [];
    const mainNodes = allConversations.filter(c => !String(c.displayNumber).includes('.'));
    return mainNodes.length > 0 ? mainNodes[0].id : null;
  };

  const mainBranchRootId = findMainBranchRoot();

  return (
    <div className="nav-controls">
      <button 
        onClick={() => parentNodeId && onNavigate(parentNodeId)}
        disabled={!parentNodeId}
        className="nav-btn"
        title={parentNodeId ? "Navigate to parent node" : "No parent available"}
      >
        ⬆️ Parent
      </button>
      
      <button 
        onClick={() => mainBranchRootId && onNavigate(mainBranchRootId)}
        disabled={!mainBranchRootId || currentNode === mainBranchRootId}
        className={`nav-btn nav-main ${currentNode === mainBranchRootId ? 'nav-active' : ''}`}
        title="Navigate to main branch start"
      >
        🏠 Main Branch
      </button>
      
      <button 
        onClick={onCenterView}
        className="nav-btn"
        title="Center the graph view on current selection"
      >
        🎯 Center View
      </button>

      <div className="nav-divider"></div>
      
      <button 
        onClick={() => onViewChange('linear')}
        className={`nav-btn ${currentView === 'linear' ? 'nav-active' : ''}`}
        title="Switch to linear conversation view"
      >
        📝 Linear
      </button>
      
      <button 
        onClick={() => onViewChange('graph')}
        className={`nav-btn ${currentView === 'graph' ? 'nav-active' : ''}`}
        title="Switch to graph topology view"
      >
        🗺️ Graph
      </button>
    </div>
  );
};

export default NavigationControls;