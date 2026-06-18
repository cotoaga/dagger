import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client.js';
import { ClaudeAPI } from '../../services/ClaudeAPI.js';
import './SettingsScreen.css';

/**
 * Settings Screen
 * Manage Claude API key and user preferences
 */
export function SettingsScreen({ onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-5-20250929');
  const [defaultTemperature, setDefaultTemperature] = useState(0.7);
  const [defaultPersonality, setDefaultPersonality] = useState('khaos_navigator_v7');
  const [useRootPrompt, setUseRootPrompt] = useState(true);
  const [useExtendedThinking, setUseExtendedThinking] = useState(true);

  const supabase = createClient();

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Load settings from database
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        // Settings exist - decrypt API key
        if (settings.encrypted_api_key) {
          const response = await fetch('/api/decrypt-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (response.ok) {
            const { apiKey: decryptedKey } = await response.json();
            setApiKey(decryptedKey);
          }
        }

        // Load other preferences
        setDefaultModel(settings.default_model || 'claude-sonnet-4-5-20250929');
        setDefaultTemperature(settings.default_temperature || 0.7);
        setDefaultPersonality(settings.default_personality || 'khaos_navigator_v7');
        setUseRootPrompt(settings.use_root_prompt ?? true);
        setUseExtendedThinking(settings.use_extended_thinking ?? true);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Validate API key format
      if (apiKey && !ClaudeAPI.validateApiKey(apiKey)) {
        setError('Invalid API key format (should start with sk-ant-)');
        return;
      }

      // Encrypt API key if provided
      let encryptedApiKey = null;
      if (apiKey) {
        const response = await fetch('/api/encrypt-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
          throw new Error('Failed to encrypt API key');
        }

        const { encryptedKey } = await response.json();
        encryptedApiKey = encryptedKey;
      }

      // Save settings to database
      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          encrypted_api_key: encryptedApiKey,
          default_model: defaultModel,
          default_temperature: defaultTemperature,
          default_personality: defaultPersonality,
          use_root_prompt: useRootPrompt,
          use_extended_thinking: useExtendedThinking,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      setSuccess('✅ Settings saved successfully!');

      // Auto-redirect after 1 second
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="settings-screen">
        <div className="settings-loading">
          <div className="spinner-large"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-screen">
      <div className="settings-container">
        {/* Header */}
        <div className="settings-header">
          <h1>⚙️ DAGGER Settings</h1>
          <button onClick={handleSignOut} className="signout-btn">
            Sign Out
          </button>
        </div>

        {/* Settings Form */}
        <div className="settings-card">
          <h2>Configuration</h2>

          {/* API Key */}
          <div className="setting-section">
            <h3>🔑 Claude API Key</h3>
            <p className="setting-description">
              Your API key is encrypted and stored securely. Required for using DAGGER.
            </p>
            <div className="form-group">
              <label htmlFor="apiKey">API Key</label>
              <div className="input-with-toggle">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="toggle-visibility-btn"
                >
                  {showApiKey ? '👁️' : '🔒'}
                </button>
              </div>
              <small className="form-hint">
                Get your API key from{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  console.anthropic.com
                </a>
              </small>
            </div>
          </div>

          {/* Model Selection */}
          <div className="setting-section">
            <h3>🧠 Default Model</h3>
            <div className="form-group">
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                disabled={saving}
              >
                <option value="claude-sonnet-4-5-20250929">
                  🧠 Claude Sonnet 4.5 (Recommended)
                </option>
                <option value="claude-haiku-4-5-20251001">
                  ⚡ Claude Haiku 4.5 (Fast & Affordable)
                </option>
                <option value="claude-opus-4-5-20251101">
                  🚀 Claude Opus 4.5 (Most Capable)
                </option>
              </select>
            </div>
          </div>

          {/* Temperature */}
          <div className="setting-section">
            <h3>🌡️ Creativity (Temperature)</h3>
            <div className="form-group">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={defaultTemperature}
                onChange={(e) => setDefaultTemperature(parseFloat(e.target.value))}
                disabled={saving}
              />
              <div className="range-value">{defaultTemperature}</div>
              <small className="form-hint">
                0.1 = Focused, 1.0 = Creative
              </small>
            </div>
          </div>

          {/* Personality */}
          <div className="setting-section">
            <h3>🎭 Default Personality</h3>
            <div className="form-group">
              <select
                value={defaultPersonality}
                onChange={(e) => setDefaultPersonality(e.target.value)}
                disabled={saving}
              >
                <option value="khaos_navigator_v7">
                  🧭 Navigator (Broad Exploration)
                </option>
                <option value="khaos_specialist_v7">
                  🔬 Specialist (Problem Solver)
                </option>
                <option value="vanilla_claude">
                  ⚡ Claude Classic (Pure Claude)
                </option>
              </select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="setting-section">
            <h3>🔧 Advanced</h3>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={useRootPrompt}
                  onChange={(e) => setUseRootPrompt(e.target.checked)}
                  disabled={saving}
                />
                <span>Enable Root System Prompt (branch awareness)</span>
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={useExtendedThinking}
                  onChange={(e) => setUseExtendedThinking(e.target.checked)}
                  disabled={saving}
                />
                <span>Enable Extended Thinking (Claude 4.5)</span>
              </label>
            </div>
          </div>

          {/* Messages */}
          {error && <div className="settings-error">❌ {error}</div>}
          {success && <div className="settings-success">{success}</div>}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="settings-save"
            disabled={saving || !apiKey}
          >
            {saving ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>

          {!apiKey && (
            <p className="settings-warning">
              ⚠️ API key required to use DAGGER
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
