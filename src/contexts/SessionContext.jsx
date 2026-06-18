import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { claudeAPI as ClaudeAPI } from '../services/ClaudeAPI.js';
import ConfigService from '../services/ConfigService.js';
import { graphModel } from '../models/GraphModel.js';

const SessionContext = createContext(null);

/**
 * SessionContext manages session and authentication state:
 * - Volatile session API keys
 * - API key configuration checking
 * - Session timeout tracking
 * - Activity monitoring
 * - Backend error handling
 */
export function SessionProvider({ children }) {
  // API key state
  const [apiKey, setApiKey] = useState('');
  const [sessionApiKey, setSessionApiKey] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [configurationLoading, setConfigurationLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);
  const [apiTestStatus, setApiTestStatus] = useState('');

  // Activity tracking
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check API key configuration
  const checkApiKeyConfiguration = useCallback(async () => {
    console.log('🔑 SessionContext: Checking API key configuration');
    setConfigurationLoading(true);
    setBackendError(null);

    try {
      // Check backend config with current session key context
      const config = await ConfigService.checkBackendConfig(sessionApiKey);

      setBackendError('');

      // If we have a session key, we're configured regardless of backend
      if (sessionApiKey && sessionApiKey.trim()) {
        console.log('✅ SessionContext: Session API key configured');
        setApiKeyConfigured(true);
        return;
      }

      // Otherwise use backend config result
      setApiKeyConfigured(config.apiKeyConfigured);

      if (config.apiKeyConfigured) {
        console.log('✅ SessionContext: API key configured via:', config.configSource);
      }
    } catch (error) {
      console.error('❌ SessionContext: Backend configuration check failed:', error);
      setBackendError(error.message);

      // If we have session key, still allow operation
      if (sessionApiKey && sessionApiKey.trim()) {
        setApiKeyConfigured(true);
        setBackendError('');
      } else {
        setApiKeyConfigured(false);
      }
    } finally {
      setConfigurationLoading(false);
    }
  }, [sessionApiKey]);

  // Handle API key submission
  const handleApiKeySubmit = useCallback(async (key) => {
    console.log('🔑 SessionContext: Submitting API key');

    if (!ClaudeAPI.validateApiKey(key)) {
      setApiTestStatus('❌ Invalid API key format');
      return;
    }

    setApiTestStatus('🧪 Testing API key...');
    ClaudeAPI.setApiKey(key);

    try {
      const result = await ClaudeAPI.testApiKey();
      if (result.success) {
        console.log('✅ SessionContext: API key validated successfully');
        setApiKey(key);
        setSessionApiKey(key);
        setApiKeyConfigured(true);
        setApiTestStatus('✅ API key validated');
        setLastActivity(Date.now()); // Reset activity timer on key submission
      } else {
        console.error('❌ SessionContext: API key validation failed');
        setApiTestStatus('❌ ' + result.error);
      }
    } catch (error) {
      console.error('❌ SessionContext: API key test error:', error);
      setApiTestStatus('❌ Test failed: ' + error.message);
    }
  }, []);

  // Handle session timeout
  const handleSessionTimeout = useCallback(() => {
    console.log('⏰ SessionContext: Session timeout detected, preserving state...');

    // Force save current state
    graphModel.saveToStorage();

    // Clear volatile keys
    setSessionApiKey('');
    setApiKeyConfigured(false);
    setApiTestStatus('⏰ Session expired. Please re-enter your API key.');

    console.log('💾 SessionContext: State saved, session cleared');
  }, []);

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Auto-check API key configuration on mount and when sessionApiKey changes
  useEffect(() => {
    console.log('🔄 SessionContext: useEffect [checkApiKeyConfiguration] triggered');
    checkApiKeyConfiguration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionApiKey]); // Only run when sessionApiKey changes, not when callback changes

  // Sync session API key with Claude API
  useEffect(() => {
    if (apiKeyConfigured && sessionApiKey) {
      console.log('🔄 SessionContext: Syncing session API key with Claude API');
      ClaudeAPI.setSessionApiKey(sessionApiKey);
    }
  }, [apiKeyConfigured, sessionApiKey]);

  // Session timeout monitoring (30 minutes)
  useEffect(() => {
    if (!sessionApiKey) {
      // Skip logging when no session key to avoid console spam
      return;
    }

    console.log('🔄 SessionContext: Starting session timeout monitoring');

    // Check timeout periodically
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

      if (timeSinceActivity >= SESSION_TIMEOUT) {
        console.log('⏰ SessionContext: Session timeout reached');
        handleSessionTimeout();
        clearInterval(intervalId);
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [sessionApiKey, lastActivity, handleSessionTimeout]);

  // Debug logging (only on important state changes, not lastActivity)
  useEffect(() => {
    console.log('🔑 SessionContext state:', {
      hasApiKey: !!apiKey,
      hasSessionApiKey: !!sessionApiKey,
      apiKeyConfigured,
      configurationLoading,
      hasBackendError: !!backendError
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, sessionApiKey, apiKeyConfigured, configurationLoading, backendError]); // Removed lastActivity to avoid spam

  const value = {
    // API key state
    apiKey,
    setApiKey,
    sessionApiKey,
    setSessionApiKey,
    apiKeyConfigured,
    setApiKeyConfigured,

    // Configuration state
    configurationLoading,
    setConfigurationLoading,
    backendError,
    setBackendError,
    apiTestStatus,
    setApiTestStatus,

    // Activity tracking
    lastActivity,
    setLastActivity,
    updateActivity,

    // Methods
    handleApiKeySubmit,
    checkApiKeyConfiguration,
    handleSessionTimeout
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session context
 * @returns {Object} Session context with state and handlers
 * @throws {Error} If used outside SessionProvider
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;
