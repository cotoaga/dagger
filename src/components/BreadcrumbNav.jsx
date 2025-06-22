import React from 'react';

/**
 * BreadcrumbNav - Shows navigation path from root to current node
 * Helps users understand where they are in the conversation topology
 */
const BreadcrumbNav = ({ currentNodeId, pathToRoot, onNavigate, graphModel }) => {
  if (!currentNodeId || !pathToRoot || pathToRoot.length === 0) {
    return null;
  }

  const buildBreadcrumbItems = () => {
    return pathToRoot.map((nodeId, index) => {
      const conversation = graphModel?.getConversation(nodeId);
      if (!conversation) return null;

      const isLast = index === pathToRoot.length - 1;
      const isMainBranch = !String(conversation.displayNumber).includes('.');
      
      return {
        id: nodeId,
        displayNumber: conversation.displayNumber,
        name: `${conversation.displayNumber}`,
        isMainBranch,
        isLast,
        isCurrent: nodeId === currentNodeId
      };
    }).filter(Boolean);
  };

  const breadcrumbItems = buildBreadcrumbItems();

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <div className="breadcrumb-nav">
      <span className="breadcrumb-label">📍 You are here:</span>
      <div className="breadcrumb-items">
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <button
              onClick={() => onNavigate(item.id)}
              className={`breadcrumb-item ${item.isCurrent ? 'current' : ''} ${
                item.isMainBranch ? 'main-branch' : 'side-branch'
              }`}
              title={`Navigate to conversation ${item.displayNumber}`}
            >
              <span className="item-number">{item.displayNumber}</span>
              {item.isMainBranch && <span className="main-indicator">🏠</span>}
              {!item.isMainBranch && <span className="branch-indicator">🌿</span>}
            </button>
            
            {!item.isLast && (
              <span className="breadcrumb-separator">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default BreadcrumbNav;