import React, { useState, useEffect } from 'react';

const PromptEditor = ({ prompt, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('custom');

  useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setContent(prompt.content);
      setCategory(prompt.category || 'custom');
    } else {
      setName('');
      setContent('');
      setCategory('custom');
    }
  }, [prompt]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Prompt name is required');
      return;
    }
    
    if (!content.trim()) {
      alert('Prompt content is required');
      return;
    }

    onSave({
      name: name.trim(),
      content: content.trim(),
      category
    });
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    
    // Escape to cancel
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const getCharCount = () => content.length;
  const getLineCount = () => content.split('\n').length;
  const getWordCount = () => content.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="prompt-editor" onKeyDown={handleKeyDown}>
      <div className="editor-header">
        <h3>
          {prompt ? '✏️ Edit Prompt' : '✨ Create New Prompt'}
        </h3>
        <div className="editor-shortcuts">
          <span>💡 Tip: Ctrl+S to save, Esc to cancel</span>
        </div>
      </div>

      <div className="editor-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prompt-name">Prompt Name *</label>
            <input
              id="prompt-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., KHAOS Strategic Analyst"
              maxLength={100}
              autoFocus
            />
            <div className="field-hint">
              A descriptive name for your prompt template
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prompt-category">Category</label>
            <select
              id="prompt-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="personality">🎭 Personality - AI personas and character templates</option>
              <option value="specialist">🔬 Specialist - Domain-specific expert templates</option>
              <option value="system">⚙️ System - Technical and operational prompts</option>
              <option value="custom">✨ Custom - Personal and miscellaneous templates</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="prompt-content">Prompt Content *</label>
          <textarea
            id="prompt-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter the complete prompt text here...

Example for a personality prompt:
You are [NAME] - a [DESCRIPTION]. You possess [CAPABILITIES].

CORE PRINCIPLES:
- [Principle 1]
- [Principle 2]

OPERATIONAL MODES:
1. [Mode 1]: [Description]
2. [Mode 2]: [Description]

[Additional instructions...]`}
            rows={20}
            spellCheck={false}
          />
          <div className="content-meta">
            <div className="meta-stats">
              <span className="stat-item">📝 {getCharCount()} characters</span>
              <span className="stat-item">📄 {getLineCount()} lines</span>
              <span className="stat-item">💬 {getWordCount()} words</span>
            </div>
            <div className="meta-hints">
              <span className="hint">💡 Use clear, specific instructions for best results</span>
            </div>
          </div>
        </div>

        <div className="editor-actions">
          <button onClick={handleSave} className="btn-primary">
            {prompt ? '💾 Update Prompt' : '✨ Create Prompt'}
          </button>
          <button onClick={onCancel} className="btn-secondary">
            ❌ Cancel
          </button>
        </div>
      </div>

      {/* Preview section */}
      {content.trim() && (
        <div className="prompt-preview-section">
          <h4>📋 Preview</h4>
          <div className="prompt-preview-content">
            {content.slice(0, 300)}
            {content.length > 300 && '...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEditor;