import React, { useState } from 'react';

const PersonalityButton = ({ personality, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getPersonalityIcon = (category) => {
    const icons = {
      'personality': '🎭',
      'system': '🌱',
      'merge': '🔗',
      'analysis': '🔬',
      'strategy': '🚀',
      'legacy': '📚',
      'custom': '🛠️'
    };
    return icons[category] || '🤖';
  };

  const getPersonalityDescription = (category, name) => {
    const descriptions = {
      'personality': 'Core conversational AI with DAGGER topology awareness',
      'system': 'Pure Claude - Helpful, harmless, honest baseline',
      'merge': 'Specialized in synthesizing branch conversations intelligently',
      'analysis': 'Domain deep-dive specialist for focused explorations',
      'strategy': 'High-level conversation architect for maximum cognitive ROI',
      'legacy': 'Previous generation prompts for compatibility',
      'custom': 'User-created custom personality configurations'
    };
    
    // Override with specific descriptions for known prompts
    if (name?.includes('Navigator 6.0')) return 'XML-structured DAGGER guide with tactical precision';
    if (name?.includes('Synthesizer 6.0')) return 'Branch merge specialist with 10:1 compression protocol';
    if (name?.includes('Analyst 6.0')) return '4-layer analysis framework for deep domain exploration';
    if (name?.includes('Director 6.0')) return 'Strategic conversation orchestrator with scout/build/pivot modes';
    
    return descriptions[category] || 'Advanced AI personality configuration';
  };

  return (
    <div 
      className={`personality-button ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(event) => onSelect(event)}
    >
      {/* Selection Glow Effect */}
      {isSelected && <div className="selection-glow"></div>}
      
      {/* Main Button Content */}
      <div className="button-content">
        <div className="personality-icon">
          {personality.emoji || getPersonalityIcon(personality.category)}
        </div>
        
        <div className="personality-info">
          <h3 className="personality-name">{personality.name}</h3>
          <p className="personality-description">
            {personality.description || getPersonalityDescription(personality.category, personality.name)}
          </p>
          
          <div className="personality-stats">
            <span className="stat-item">
              {personality.chars} chars
            </span>
            <span className="stat-item">
              {personality.lines} lines
            </span>
            {personality.starred && (
              <span className="starred">⭐</span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Effects */}
      <div className="hover-overlay"></div>
      
      {/* Selection Animation */}
      {isSelected && (
        <div className="selection-animation">
          <div className="pulse-ring"></div>
          <div className="loading-text">Initializing Cognitive Enhancement...</div>
        </div>
      )}
    </div>
  );
};

export default PersonalityButton;