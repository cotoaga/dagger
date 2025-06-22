import React, { useState, useEffect } from 'react';
import PersonalityButton from './PersonalityButton';
import MatrixRain from './MatrixRain';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onPersonalitySelect, availablePersonalities }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState(null);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handlePersonalitySelect = (personalityId) => {
    setSelectedPersonality(personalityId);
    
    // Epic selection animation
    setTimeout(() => {
      onPersonalitySelect(personalityId);
    }, 1000);
  };

  return (
    <div className="welcome-screen">
      {/* Matrix Background */}
      <MatrixRain />
      
      {/* Main Content */}
      <div className={`welcome-content ${isVisible ? 'visible' : ''}`}>
        {/* Header Section */}
        <div className="welcome-header">
          <div className="dagger-logo">
            <div className="dagger-icon">🗡️</div>
            <h1 className="title">DAGGER</h1>
          </div>
          
          <div className="subtitle-section">
            <p className="subtitle">Directed Acyclic Graph Generated</p>
            <p className="subtitle">Enlightenment Repository</p>
          </div>
          
          <div className="mentat-section">
            <h2 className="mentat-title">
              Sapho's Juice for the Smart Mentat
            </h2>
            <p className="poison-text">Choose Your Poison! 🧠</p>
          </div>
        </div>

        {/* Personality Grid */}
        <div className="personality-grid">
          {availablePersonalities.map(personality => (
            <PersonalityButton
              key={personality.id}
              personality={personality}
              isSelected={selectedPersonality === personality.id}
              onSelect={() => handlePersonalitySelect(personality.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="welcome-footer">
          <div className="branding">
            <span className="hot-label">Hot 🔥 MVP</span>
            <span className="from-label">⚡ from the 🧪 Lab</span>
            <span className="cotoaga-brand">COTOAGA.NET</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;