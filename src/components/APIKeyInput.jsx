import React, { useState } from 'react';

const APIKeyInput = ({ onApiKeySubmit, backendConfig }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSubmitting(true);
    
    try {
      // Validate API key format
      if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid API key format. Claude API keys start with "sk-ant-"');
      }

      await onApiKeySubmit(apiKey.trim());
    } catch (error) {
      alert(`API Key Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="api-key-input-screen">
      <div className="api-key-content">
        <div className="dagger-logo">
          🗡️ <span className="title">DAGGER</span>
        </div>
        
        <div className="config-info">
          <h2>API Key Configuration Required</h2>
          <p>DAGGER needs a Claude API key to enable cognitive enhancement.</p>
          
          {backendConfig?.error && (
            <div className="backend-status error">
              <span className="status-icon">⚠️</span>
              <span>Backend Error: {backendConfig.error}</span>
            </div>
          )}
          
          <div className="env-hint">
            <h3>💡 For automatic configuration:</h3>
            <p>Add your API key to <code>.env</code> file:</p>
            <pre><code>CLAUDE_API_KEY=sk-ant-your-key-here</code></pre>
            <p>Then restart the proxy server to skip this step.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="api-key-form">
          <div className="input-group">
            <label htmlFor="api-key">Claude API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="new-password"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!apiKey.trim() || isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Validating...' : '🚀 Initialize DAGGER'}
          </button>
        </form>

        <div className="api-key-help">
          <p>
            Get your API key from{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
              Anthropic Console
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default APIKeyInput;