import React from 'react';

const PromptList = ({ prompts, onEdit, onDelete, onToggleStar, onUsePrompt }) => {
  const groupedPrompts = prompts.reduce((groups, prompt) => {
    const category = prompt.category || 'custom';
    if (!groups[category]) groups[category] = [];
    groups[category].push(prompt);
    return groups;
  }, {});

  const categoryEmojis = {
    personality: '🎭',
    specialist: '🔬',
    system: '⚙️',
    custom: '✨'
  };

  const formatCategory = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
      console.log('✅ Prompt copied to clipboard');
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  return (
    <div className="prompt-list">
      {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
        <div key={category} className="prompt-category">
          <h3 className="category-title">
            {categoryEmojis[category] || '📝'} {formatCategory(category)} Templates
            <span className="category-count">({categoryPrompts.length})</span>
          </h3>
          
          {categoryPrompts.map(prompt => (
            <div key={prompt.id} className="prompt-item">
              <div className="prompt-header">
                <span 
                  className={`star ${prompt.starred ? 'starred' : ''}`}
                  onClick={() => onToggleStar(prompt.id)}
                  title={prompt.starred ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {prompt.starred ? '⭐' : '☆'}
                </span>
                <h4 className="prompt-name">{prompt.name}</h4>
                <div className="prompt-actions">
                  {onUsePrompt && (
                    <button 
                      onClick={() => onUsePrompt(prompt)}
                      className="btn-use"
                      title="Use this prompt to start a new conversation"
                    >
                      Use
                    </button>
                  )}
                  <button 
                    onClick={() => copyToClipboard(prompt.content)}
                    className="btn-copy"
                    title="Copy prompt to clipboard"
                  >
                    Copy
                  </button>
                  <button 
                    onClick={() => onEdit(prompt)}
                    className="btn-edit"
                    title="Edit this prompt"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => onDelete(prompt.id)}
                    className="btn-danger"
                    title="Delete this prompt"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="prompt-preview">
                {prompt.content.slice(0, 200)}
                {prompt.content.length > 200 && '...'}
              </div>
              
              <div className="prompt-meta">
                <span className="char-count">{prompt.content.length} chars</span>
                <span className="line-count">{prompt.content.split('\n').length} lines</span>
                {prompt.createdAt && (
                  <span className="created-date">
                    Created: {new Date(prompt.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {categoryPrompts.length === 0 && (
            <div className="no-prompts">
              No {category} prompts yet. Create your first one!
            </div>
          )}
        </div>
      ))}
      
      {Object.keys(groupedPrompts).length === 0 && (
        <div className="no-prompts-at-all">
          <h3>🎭 No Prompts Yet</h3>
          <p>Create your first prompt template to get started!</p>
        </div>
      )}
    </div>
  );
};

export default PromptList;