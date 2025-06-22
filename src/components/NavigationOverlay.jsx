import React from 'react';
import BreadcrumbNav from './BreadcrumbNav';
import ContextPanel from './ContextPanel';
import NavigationControls from './NavigationControls';

/**
 * NavigationOverlay - Complete navigation interface for graph view
 * Combines breadcrumb, context panel, and navigation controls
 */
const NavigationOverlay = ({ 
  selectedNodeId,
  pathToRoot,
  totalNodes,
  currentView,
  graphModel,
  onNavigate,
  onCenterView,
  onViewChange
}) => {
  return (
    <div className="navigation-overlay">
      <div className="nav-left">
        <BreadcrumbNav
          currentNodeId={selectedNodeId}
          pathToRoot={pathToRoot}
          onNavigate={onNavigate}
          graphModel={graphModel}
        />
      </div>
      
      <div className="nav-center">
        <ContextPanel
          selectedNode={selectedNodeId}
          totalNodes={totalNodes}
          graphModel={graphModel}
        />
      </div>
      
      <div className="nav-right">
        <NavigationControls
          currentNode={selectedNodeId}
          onNavigate={onNavigate}
          onCenterView={onCenterView}
          onViewChange={onViewChange}
          currentView={currentView}
          graphModel={graphModel}
        />
      </div>
    </div>
  );
};

export default NavigationOverlay;