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

  const handleNavigateToPromptEditor = () => {
    // Navigate to prompt editor/creation interface
    console.log('🍹 Navigating to Pan-Galactic-Gargle-Blaster creator');
    
    // For now, we'll use hash navigation - this can be enhanced based on routing setup
    window.location.hash = '#prompts/editor';
    
    // Alternative: If the parent component has a way to switch views, call it
    // if (onNavigateToEditor) onNavigateToEditor();
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
            <div className="prompt-selection-header">
              <h2 className="selection-title">
                Choose your Poison 🧪 or create your own{' '}
                <button 
                  className="gargle-blaster-link"
                  onClick={handleNavigateToPromptEditor}
                  title="Create custom personality prompt"
                >
                  Pan-Galactic-Gargle-Blaster 🍹
                </button>
              </h2>
              <p className="selection-subtitle">
                Select a pre-configured AI personality or craft your own cognitive enhancement
              </p>
            </div>
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
          <div className="app-footer-branding">
            <div className="footer-main">
              Hot 🔥 MVP ⚡ from the 🗡️ Lab{' '}
              <a 
                href="http://cotoaga.net" 
                target="_blank" 
                rel="noopener noreferrer"
                className="cotoaga-link"
              >
                COTOAGA.NET
              </a>
            </div>
            <div className="footer-tagline">
              Ceterum censeo, SBaaS™ – Scaling Business as a Service is the way forward to Accelerate Growth!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;