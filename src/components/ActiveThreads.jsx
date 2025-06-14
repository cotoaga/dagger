import React from 'react';

const ActiveThreads = ({ graphModel, onSwitchThread }) => {
  if (!graphModel) return null;
  
  const threadSummary = graphModel.getThreadSummary();
  
  return (
    <div className="active-threads">
      <h3>🧵 Active Threads:</h3>
      {threadSummary.length === 0 ? (
        <div className="no-threads">No active threads</div>
      ) : (
        threadSummary.map(thread => (
          <div 
            key={thread.id}
            className={`thread-item ${thread.isActive ? 'active' : ''}`}
            onClick={() => onSwitchThread && onSwitchThread(thread.id)}
          >
            <div className="thread-name">
              {thread.id === 'main' ? 'Main Thread' : `Branch ${thread.id}`}
            </div>
            <div className="thread-stats">
              {thread.messageCount} conversations
            </div>
            {thread.messageCount === 0 && (
              <div className="thread-empty">Empty</div>
            )}
            {thread.lastMessage && (
              <div className="thread-preview">
                {thread.lastMessage.substring(0, 50)}...
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ActiveThreads;

// CSS styles for ActiveThreads component
const styles = `
.active-threads {
  position: fixed;
  top: 80px;
  right: 10px;
  background: #2d3748;
  padding: 12px;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 12px;
  max-width: 300px;
  border: 1px solid #4a5568;
  z-index: 1000;
}

.active-threads h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #e2e8f0;
}

.thread-item {
  padding: 8px;
  margin: 4px 0;
  background: #374151;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.thread-item:hover {
  background: #4a5568;
}

.thread-item.active {
  background: #1e40af;
  border: 1px solid #3b82f6;
}

.thread-name {
  font-weight: bold;
  margin-bottom: 2px;
}

.thread-stats {
  color: #9ca3af;
  font-size: 11px;
}

.thread-empty {
  color: #ef4444;
  font-style: italic;
  font-size: 10px;
}

.thread-preview {
  color: #d1d5db;
  font-size: 10px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-threads {
  color: #9ca3af;
  font-style: italic;
  padding: 8px;
}

/* Hide in production mode */
.app:not(.debug-mode) .active-threads {
  display: none;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}