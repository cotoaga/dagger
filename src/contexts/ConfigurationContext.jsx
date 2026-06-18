import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { claudeAPI as ClaudeAPI } from '../services/ClaudeAPI.js';

const ConfigurationContext = createContext(null);

/**
 * ConfigurationContext manages AI configuration:
 * - Model selection (Claude variants)
 * - Temperature control (creativity)
 * - Extended thinking mode
 * - Persists to localStorage
 */
export function ConfigurationProvider({ children }) {
  // Model selection state
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('dagger-model') || 'claude-sonnet-4-5-20250929';
  });

  // Temperature state
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('dagger-temperature');
    return saved ? parseFloat(saved) : 0.7; // Default Claude temperature
  });

  // Extended thinking state
  const [extendedThinking, setExtendedThinking] = useState(false);

  // Root prompt state (for debug/testing)
  const [useRootPrompt, setUseRootPrompt] = useState(() => {
    const saved = localStorage.getItem('dagger-use-root-prompt');
    return saved !== null ? saved === 'true' : true; // Default true
  });

  // Model change handler
  const handleModelChange = useCallback((model) => {
    console.log('🤖 Model change:', selectedModel, '→', model);
    setSelectedModel(model);
    localStorage.setItem('dagger-model', model);

    // Update Claude API
    ClaudeAPI.setModel(model);

    // Disable extended thinking if new model doesn't support it
    const modelInfo = ClaudeAPI.MODELS[model];
    if (!modelInfo?.supportsExtendedThinking && extendedThinking) {
      console.log('⚠️ Extended thinking disabled: model does not support it');
      setExtendedThinking(false);
    }
  }, [selectedModel, extendedThinking]);

  // Temperature change handler
  const handleTemperatureChange = useCallback((temp) => {
    const newTemp = parseFloat(temp);
    console.log('🌡️ Temperature change:', temperature, '→', newTemp);
    setTemperature(newTemp);
    localStorage.setItem('dagger-temperature', newTemp.toString());
  }, [temperature]);

  // Extended thinking change handler
  const handleExtendedThinkingChange = useCallback((enabled) => {
    console.log('🧠 Extended thinking:', extendedThinking, '→', enabled);
    setExtendedThinking(enabled);

    // Update Claude API if configured
    ClaudeAPI.setExtendedThinking(enabled);
  }, [extendedThinking]);

  // Root prompt change handler
  const handleUseRootPromptChange = useCallback((enabled) => {
    console.log('🗡️ Root prompt:', useRootPrompt, '→', enabled);
    setUseRootPrompt(enabled);
    localStorage.setItem('dagger-use-root-prompt', enabled.toString());
  }, [useRootPrompt]);

  // Sync Claude API configuration when model changes
  useEffect(() => {
    console.log('🔄 ConfigurationContext: Syncing Claude API with model:', selectedModel);
    ClaudeAPI.setModel(selectedModel);
  }, [selectedModel]);

  // Sync extended thinking state with Claude API
  useEffect(() => {
    console.log('🔄 ConfigurationContext: Syncing extended thinking:', extendedThinking);
    ClaudeAPI.setExtendedThinking(extendedThinking);
  }, [extendedThinking]);

  // Debug logging
  useEffect(() => {
    console.log('⚙️ ConfigurationContext state:', {
      selectedModel,
      temperature,
      extendedThinking,
      modelSupportsExtendedThinking: ClaudeAPI.MODELS[selectedModel]?.supportsExtendedThinking
    });
  }, [selectedModel, temperature, extendedThinking]);

  const value = {
    // Model state
    selectedModel,
    setSelectedModel,
    handleModelChange,

    // Temperature state
    temperature,
    setTemperature,
    handleTemperatureChange,

    // Extended thinking state
    extendedThinking,
    setExtendedThinking,
    handleExtendedThinkingChange,

    // Root prompt state
    useRootPrompt,
    setUseRootPrompt,
    handleUseRootPromptChange,

    // Computed properties
    modelSupportsExtendedThinking: ClaudeAPI.MODELS[selectedModel]?.supportsExtendedThinking || false
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
}

/**
 * Hook to access configuration context
 * @returns {Object} Configuration context with state and handlers
 * @throws {Error} If used outside ConfigurationProvider
 */
export function useConfiguration() {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
}

export default ConfigurationContext;
