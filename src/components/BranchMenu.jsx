import { useState, useEffect } from 'react';
import PromptsModel from '../models/PromptsModel';

/**
 * BranchMenu - Enhanced branch type selector with prompt integration
 * Shows when user clicks Branch button in Linear mode
 */
export function BranchMenu({ sourceConversationId, onCreateBranch, onClose, conversations }) {
  const [selectedType, setSelectedType] = useState('virgin');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [promptsModel] = useState(() => new PromptsModel());


  useEffect(() => {
    // Load available prompts
    const allPrompts = promptsModel.getAllPrompts();
    setPrompts(allPrompts);
    
    // Auto-select KHAOS Navigator 6.0 as default personality
    const khaosNavigator = allPrompts.find(p => p.id === 'khaos-navigator-6');
    if (khaosNavigator && selectedType === 'personality') {
      setSelectedPrompt(khaosNavigator.id);
    }
  }, [selectedType]);

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
    console.log('🌿 BranchMenu.handleCreate called with:', {
      selectedType,
      selectedPrompt,
      sourceConversationId
    });
    
    if (selectedType === 'personality' && selectedPrompt) {
      const prompt = prompts.find(p => p.id === selectedPrompt);
      console.log('🎭 Creating personality branch with prompt:', prompt);
      onCreateBranch(sourceConversationId, selectedType, prompt);
    } else {
      console.log(`🌿 Creating ${selectedType} branch`);
      onCreateBranch(sourceConversationId, selectedType);
    }
  };

  const personalityPrompts = prompts.filter(p => p.category === 'personality');
  const starredPrompts = prompts.filter(p => p.starred);
  const isPersonalitySelected = selectedType === 'personality';

  // Find the source conversation to show display number
  const sourceConversation = conversations?.find(c => c.id === sourceConversationId);
  const displayTitle = sourceConversation ? sourceConversation.displayNumber : sourceConversationId;

  return (
    <div className="branch-menu-overlay" onClick={onClose}>
      <div className="branch-menu" onClick={e => e.stopPropagation()}>
        <h3>🌿 Create Branch from Conversation {displayTitle}</h3>
        
        <div className="branch-types">
          {branchTypes.map(branch => (
            <div 
              key={branch.type} 
              className={`branch-option ${selectedType === branch.type ? 'selected' : ''}`}
              onClick={() => {
                console.log('🔘 Direct click handler:', branch.type);
                setSelectedType(branch.type);
                console.log('🔘 Should update to:', branch.type);
              }}
              style={{
                border: selectedType === branch.type ? '3px solid #f59e0b' : '2px solid #4b5563',
                borderRadius: '8px',
                padding: '12px',
                margin: '8px 0',
                cursor: 'pointer',
                backgroundColor: selectedType === branch.type ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
              }}
            >
              <div className="branch-header">
                <strong>{branch.emoji} {branch.title}</strong>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#9ca3af' }}>
                {branch.description}
              </p>
            </div>
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
                    <div 
                      key={prompt.id} 
                      className={`prompt-option ${selectedPrompt === prompt.id ? 'selected' : ''}`}
                      onClick={() => {
                        console.log('📝 Starred template selected:', prompt.id, prompt.name);
                        setSelectedPrompt(prompt.id);
                      }}
                      style={{
                        border: selectedPrompt === prompt.id ? '3px solid #3b82f6' : '2px solid #4b5563',
                        borderRadius: '8px',
                        padding: '12px',
                        margin: '8px 0',
                        cursor: 'pointer',
                        backgroundColor: selectedPrompt === prompt.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                      }}
                    >
                      <div className="prompt-header">
                        <strong>{prompt.name}</strong>
                        <span className="prompt-category">{prompt.category}</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', color: '#9ca3af' }}>
                        {prompt.content.slice(0, 100)}
                        {prompt.content.length > 100 && '...'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {personalityPrompts.length > 0 && (
              <div className="prompt-group">
                <h5>🎭 All Personality Templates</h5>
                <div className="prompt-options">
                  {personalityPrompts.map(prompt => (
                    <div 
                      key={prompt.id} 
                      className={`prompt-option ${selectedPrompt === prompt.id ? 'selected' : ''}`}
                      onClick={() => {
                        console.log('📝 Template selected:', prompt.id, prompt.name);
                        setSelectedPrompt(prompt.id);
                      }}
                      style={{
                        border: selectedPrompt === prompt.id ? '3px solid #3b82f6' : '2px solid #4b5563',
                        borderRadius: '8px',
                        padding: '12px',
                        margin: '8px 0',
                        cursor: 'pointer',
                        backgroundColor: selectedPrompt === prompt.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                      }}
                    >
                      <div className="prompt-header">
                        <strong>{prompt.name}</strong>
                        {prompt.starred && <span className="star-indicator">⭐</span>}
                      </div>
                      <p style={{ margin: '4px 0 0 0', color: '#9ca3af' }}>
                        {prompt.content.slice(0, 100)}
                        {prompt.content.length > 100 && '...'}
                      </p>
                    </div>
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

        <div className="branch-actions">
          <button 
            onClick={handleCreate} 
            className="create-branch-btn"
            disabled={selectedType === 'personality' && !selectedPrompt}
            style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
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