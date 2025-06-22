import { useState, useEffect } from 'react';
import PromptsModel from '../models/PromptsModel';

/**
 * ForkMenu - Enhanced branch type selector with prompt integration
 * Shows when user clicks Fork button in Linear mode
 */
export function ForkMenu({ sourceConversationId, onCreateFork, onClose }) {
  const [selectedType, setSelectedType] = useState('knowledge');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [promptsModel] = useState(() => new PromptsModel());

  useEffect(() => {
    // Load available prompts
    setPrompts(promptsModel.getAllPrompts());
  }, []);

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
      description: 'Load custom AI personality from prompt templates'
    },
    {
      type: 'knowledge',
      emoji: '🧠', 
      title: 'Knowledge Branch',
      description: 'Full context with conversation history'
    }
  ];

  const handleCreate = () => {
    if (selectedType === 'personality' && selectedPrompt) {
      const prompt = prompts.find(p => p.id === selectedPrompt);
      onCreateFork(sourceConversationId, selectedType, prompt);
    } else {
      onCreateFork(sourceConversationId, selectedType);
    }
  };

  const personalityPrompts = prompts.filter(p => p.category === 'personality');
  const starredPrompts = prompts.filter(p => p.starred);
  const isPersonalitySelected = selectedType === 'personality';

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

        {/* Prompt Selection for Personality Branches */}
        {isPersonalitySelected && (
          <div className="prompt-selection">
            <h4>🎭 Select Personality Template</h4>
            
            {starredPrompts.length > 0 && (
              <div className="prompt-group">
                <h5>⭐ Starred Templates</h5>
                <div className="prompt-options">
                  {starredPrompts.map(prompt => (
                    <label key={prompt.id} className={selectedPrompt === prompt.id ? 'selected' : ''}>
                      <input 
                        type="radio" 
                        value={prompt.id}
                        checked={selectedPrompt === prompt.id}
                        onChange={e => setSelectedPrompt(e.target.value)}
                      />
                      <div className="prompt-option">
                        <div className="prompt-header">
                          <strong>{prompt.name}</strong>
                          <span className="prompt-category">{prompt.category}</span>
                        </div>
                        <p className="prompt-preview">
                          {prompt.content.slice(0, 100)}
                          {prompt.content.length > 100 && '...'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {personalityPrompts.length > 0 && (
              <div className="prompt-group">
                <h5>🎭 All Personality Templates</h5>
                <div className="prompt-options">
                  {personalityPrompts.map(prompt => (
                    <label key={prompt.id} className={selectedPrompt === prompt.id ? 'selected' : ''}>
                      <input 
                        type="radio" 
                        value={prompt.id}
                        checked={selectedPrompt === prompt.id}
                        onChange={e => setSelectedPrompt(e.target.value)}
                      />
                      <div className="prompt-option">
                        <div className="prompt-header">
                          <strong>{prompt.name}</strong>
                          {prompt.starred && <span className="star-indicator">⭐</span>}
                        </div>
                        <p className="prompt-preview">
                          {prompt.content.slice(0, 100)}
                          {prompt.content.length > 100 && '...'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {personalityPrompts.length === 0 && (
              <div className="no-prompts">
                <p>No personality templates available. <br/>
                   Create some in the 🎭 Prompts tab first!</p>
              </div>
            )}
          </div>
        )}

        <div className="fork-actions">
          <button 
            onClick={handleCreate} 
            className="create-fork-btn"
            disabled={isPersonalitySelected && !selectedPrompt}
            title={isPersonalitySelected && !selectedPrompt ? 'Please select a personality template' : ''}
          >
            {isPersonalitySelected && selectedPrompt ? 
              `Create ${prompts.find(p => p.id === selectedPrompt)?.name} Branch` :
              `Create ${selectedType} Branch`
            }
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}