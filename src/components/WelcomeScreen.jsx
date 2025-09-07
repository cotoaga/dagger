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

  const handlePersonalitySelect = async (personalityId, event) => {
    setSelectedPersonality(personalityId);
    
    // Add dramatic effect
    const card = event.currentTarget;
    card.classList.add('activating');
    
    // Sound effect (optional)
    // playSound('portal-open.mp3');
    
    // Wait for animation to peak
    setTimeout(() => {
      onPersonalitySelect(personalityId);
    }, 400);
    
    // Remove animation class after completion
    setTimeout(() => {
      card.classList.remove('activating');
    }, 800);
  };

  const openPromptMixer = () => {
    // Open the prompt editor in "create new" mode
    console.log('🍹 Opening Pan-Galactic-Gargle-Blaster prompt mixer');
    
    // For now, we'll use hash navigation - this can be enhanced based on routing setup
    window.location.hash = '#prompts/editor';
    
    // Optional: Add mixing animation
    document.body.classList.add('mixing-cocktail');
    setTimeout(() => {
      document.body.classList.remove('mixing-cocktail');
    }, 1000);
    
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
            <p className="subtitle">Enlightenment Repository – a KHAOS (Knowledge-Helping Artificial Optimization Specialist) Application</p>
          </div>
          
          <div className="mentat-section">
            <div className="header-section">
              <h1 className="title-row">
                <span className="title-text">Sapho's Juice for the Smart Mentat</span>
                <a 
                  href="https://cotoaga.ai/dagger" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="help-link"
                  title="Learn how to shoot yourself in the foot elegantly"
                >
                  <span className="help-icon">📖</span>
                  <span className="help-text">How to DAGGER</span>
                </a>
              </h1>
            </div>
            <div className="prompt-selection-header">
              {/* Main selection header */}
              <h2 className="selection-title">
                Choose your Poison 🗡️
              </h2>
              <p className="selection-subtitle">
                Select a pre-configured AI personality
              </p>
            </div>
          </div>
        </div>

        {/* 4 personality selection areas here */}
        <div className="personality-grid">
          {availablePersonalities.map(personality => (
            <PersonalityButton
              key={personality.id}
              personality={personality}
              isSelected={selectedPersonality === personality.id}
              onSelect={(event) => handlePersonalitySelect(personality.id, event)}
            />
          ))}
        </div>

        {/* Fifth area - Prompt Library Access */}
        <div className="prompt-library-section">
          <div className="personality-button prompt-library-button gargle-blaster-button" onClick={openPromptMixer}>
            <div className="button-content">
              <div className="personality-icon">🍹</div>
              <div className="personality-info">
                <div className="personality-name">Pan-Galactic-Gargle-Blaster</div>
                <div className="personality-description">Mix Your Own Prompt Cocktail</div>
                <div className="subtitle">Access Prompt Library & Create Custom AI Personalities</div>
              </div>
            </div>
          </div>
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
            
            <div className="footer-copyright">
              2025 – Ideas want to be free! Content under CC BY-SA 4.0 | Use it, improve it, share it. Created with AI support, compliant with the EU AI Act. Learn in our workshops how to use AI responsibly and effectively.
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