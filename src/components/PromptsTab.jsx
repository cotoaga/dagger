import React, { useState, useEffect } from 'react';
import PromptsModel from '../models/PromptsModel';
import PromptList from './PromptList';
import PromptEditor from './PromptEditor';

const PromptsTab = ({ onUsePrompt }) => {
  const [promptsModel] = useState(() => new PromptsModel());
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    refreshPrompts();
  }, []);

  const refreshPrompts = () => {
    setPrompts([...promptsModel.prompts]);
  };

  const handleCreateNew = () => {
    setSelectedPrompt(null);
    setIsEditing(true);
  };

  const handleEdit = (prompt) => {
    setSelectedPrompt(prompt);
    setIsEditing(true);
  };

  const handleSave = (promptData) => {
    try {
      if (selectedPrompt) {
        promptsModel.updatePrompt(selectedPrompt.id, promptData);
        console.log(`✅ Updated prompt: ${promptData.name}`);
      } else {
        const newPrompt = promptsModel.createPrompt(promptData.name, promptData.content, promptData.category);
        console.log(`✨ Created new prompt: ${newPrompt.name}`);
      }
      refreshPrompts();
      setIsEditing(false);
      setSelectedPrompt(null);
    } catch (error) {
      console.error('❌ Failed to save prompt:', error);
      alert('Failed to save prompt. Please try again.');
    }
  };

  const handleDelete = (id) => {
    const prompt = promptsModel.getPrompt(id);
    if (!prompt) return;
    
    const confirmMessage = `Are you sure you want to delete "${prompt.name}"?\n\nThis action cannot be undone.`;
    if (confirm(confirmMessage)) {
      try {
        promptsModel.deletePrompt(id);
        refreshPrompts();
        console.log(`🗑️ Deleted prompt: ${prompt.name}`);
      } catch (error) {
        console.error('❌ Failed to delete prompt:', error);
        alert('Failed to delete prompt. Please try again.');
      }
    }
  };

  const handleToggleStar = (id) => {
    const prompt = promptsModel.getPrompt(id);
    if (!prompt) return;
    
    try {
      promptsModel.updatePrompt(id, { starred: !prompt.starred });
      refreshPrompts();
      console.log(`${prompt.starred ? '☆' : '⭐'} ${prompt.starred ? 'Unstarred' : 'Starred'}: ${prompt.name}`);
    } catch (error) {
      console.error('❌ Failed to toggle star:', error);
    }
  };

  const handleUsePrompt = (prompt) => {
    if (onUsePrompt) {
      onUsePrompt(prompt);
      console.log(`🚀 Using prompt for new conversation: ${prompt.name}`);
    }
  };

  const handleExportPrompts = () => {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        prompts: prompts
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dagger-prompts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('📤 Prompts exported successfully');
    } catch (error) {
      console.error('❌ Failed to export prompts:', error);
      alert('Failed to export prompts. Please try again.');
    }
  };

  const handleImportPrompts = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        if (!importData.prompts || !Array.isArray(importData.prompts)) {
          throw new Error('Invalid file format');
        }
        
        let importedCount = 0;
        importData.prompts.forEach(prompt => {
          if (prompt.name && prompt.content) {
            promptsModel.createPrompt(
              prompt.name,
              prompt.content,
              prompt.category || 'custom'
            );
            importedCount++;
          }
        });
        
        refreshPrompts();
        alert(`Successfully imported ${importedCount} prompts!`);
        console.log(`📥 Imported ${importedCount} prompts`);
        
      } catch (error) {
        console.error('❌ Failed to import prompts:', error);
        alert('Failed to import prompts. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  // Filter prompts based on search and category
  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = searchTerm === '' || 
      prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || prompt.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const stats = promptsModel.getStorageStats();

  if (isEditing) {
    return (
      <PromptEditor
        prompt={selectedPrompt}
        onSave={handleSave}
        onCancel={() => {
          setIsEditing(false);
          setSelectedPrompt(null);
        }}
      />
    );
  }

  return (
    <div className="prompts-tab">
      <div className="prompts-header">
        <div className="header-title">
          <h2>🎭 Prompt Templates</h2>
          <div className="stats-summary">
            {stats.totalPrompts} prompts • {stats.starredPrompts} starred • {stats.categories.length} categories
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={handleCreateNew}
            title="Create a new prompt template"
          >
            ✨ New Prompt
          </button>
          
          <button 
            className="btn-secondary"
            onClick={handleExportPrompts}
            title="Export all prompts to JSON file"
          >
            📤 Export
          </button>
          
          <label className="btn-secondary import-btn" title="Import prompts from JSON file">
            📥 Import
            <input 
              type="file" 
              accept=".json"
              onChange={handleImportPrompts}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="prompts-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search prompts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="category-filter">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="category-select"
          >
            <option value="all">All Categories</option>
            <option value="personality">🎭 Personality</option>
            <option value="specialist">🔬 Specialist</option>
            <option value="system">⚙️ System</option>
            <option value="custom">✨ Custom</option>
          </select>
        </div>
      </div>

      <PromptList
        prompts={filteredPrompts}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStar={handleToggleStar}
        onUsePrompt={handleUsePrompt}
      />

      {filteredPrompts.length === 0 && prompts.length > 0 && (
        <div className="no-results">
          <h3>🔍 No Results Found</h3>
          <p>No prompts match your current search or filter criteria.</p>
          <button onClick={() => { setSearchTerm(''); setFilterCategory('all'); }}>
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default PromptsTab;