import { useState } from 'react';

/**
 * ForkMenu - Simple branch type selector
 * Shows when user clicks Fork button in Linear mode
 */
export function ForkMenu({ sourceConversationId, onCreateFork, onClose }) {
  const [selectedType, setSelectedType] = useState('knowledge');

  const branchTypes = [
    {
      type: 'virgin',
      emoji: '🌱',
      title: 'Virgin Branch',
      description: 'Fresh start, no context inheritance'
    },
    {
      type: 'personality', 
      emoji: '🎭',
      title: 'Personality Branch',
      description: 'KHAOS-Coder loaded, no conversation history'
    },
    {
      type: 'knowledge',
      emoji: '🧠', 
      title: 'Knowledge Branch',
      description: 'Full context with conversation history'
    }
  ];

  const handleCreate = () => {
    onCreateFork(sourceConversationId, selectedType);
  };

  return (
    <div className="fork-menu-overlay" onClick={onClose}>
      <div className="fork-menu" onClick={e => e.stopPropagation()}>
        <h3>🍴 Create Branch from Conversation {sourceConversationId}</h3>
        
        <div className="branch-types">
          {branchTypes.map(branch => (
            <label key={branch.type} className={selectedType === branch.type ? 'selected' : ''}>
              <input 
                type="radio" 
                value={branch.type}
                checked={selectedType === branch.type}
                onChange={e => setSelectedType(e.target.value)}
              />
              <div className="branch-option">
                <div className="branch-header">
                  <span className="branch-emoji">{branch.emoji}</span>
                  <strong>{branch.title}</strong>
                </div>
                <p>{branch.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="fork-actions">
          <button onClick={handleCreate} className="create-fork-btn">
            Create {selectedType} Branch
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}