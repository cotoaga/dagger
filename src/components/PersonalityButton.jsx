import React, { useState } from 'react';

const PersonalityButton = ({ personality, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getPersonalityIcon = (type) => {
    const icons = {
      'khaos': '🎭',
      'coder': '💻',
      'analyst': '📊',
      'virgin': '🌱',
      'custom': '🔬',
      'load': '📚'
    };
    return icons[type] || '🤖';
  };

  const getPersonalityDescription = (type) => {
    const descriptions = {
      'khaos': 'Dimensional Navigator - 60% TARS Sarcasm, 25% Marvin Philosophy',
      'coder': 'Expert Software Engineer - Clean, efficient, maintainable code',
      'analyst': 'Strategic Business Mind - Market analysis & organizational planning',
      'virgin': 'Pure Claude - Helpful, harmless, honest baseline',
      'custom': 'Build Your Own - Create custom cognitive personality',
      'load': 'Import Template - Load saved personality configurations'
    };
    return descriptions[type] || 'Unknown personality type';
  };

  return (
    <div 
      className={`personality-button ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Selection Glow Effect */}
      {isSelected && <div className="selection-glow"></div>}
      
      {/* Main Button Content */}
      <div className="button-content">
        <div className="personality-icon">
          {getPersonalityIcon(personality.type)}
        </div>
        
        <div className="personality-info">
          <h3 className="personality-name">{personality.name}</h3>
          <p className="personality-description">
            {getPersonalityDescription(personality.type)}
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