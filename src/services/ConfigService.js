class ConfigService {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  async checkBackendConfig(sessionApiKey = null) {
    try {
      // If we have a session API key, we don't need backend config
      if (sessionApiKey && sessionApiKey.trim()) {
        console.log('✅ Using session API key - backend config not needed');
        return {
          apiKeyConfigured: true,  // Session key counts as configured
          backendAvailable: true,
          configSource: 'session',
          hasApiKey: true,
          success: true
        };
      }

      // Use cache if fresh
      if (this.cache && this.cacheTime && (Date.now() - this.cacheTime) < this.CACHE_DURATION) {
        console.log('📋 Using cached config');
        return this.cache;
      }

      console.log('🔍 Checking backend API key configuration...');
      
      const response = await fetch(`${this.baseURL}/api/config`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Cache the result
        this.cache = {
          apiKeyConfigured: result.hasApiKey || false,
          backendAvailable: true,
          configSource: 'backend',
          hasApiKey: result.hasApiKey || false,
          success: result.success || false
        };
        this.cacheTime = Date.now();
        
        console.log('✅ Backend config result:', this.cache);
        return this.cache;
      } else if (response.status === 404) {
        // 404 is expected when using session-only mode
        console.log('ℹ️ No backend config endpoint - using session-only mode');
        return {
          apiKeyConfigured: false,
          backendAvailable: true,
          configSource: 'none',
          hasApiKey: false,
          success: false
        };
      } else {
        throw new Error(`Backend config check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Backend config check failed:', error.message);
      return {
        apiKeyConfigured: sessionApiKey ? true : false,
        backendAvailable: false,
        configSource: sessionApiKey ? 'session' : 'none',
        hasApiKey: sessionApiKey ? true : false,
        success: sessionApiKey ? true : false,
        error: error.message
      };
    }
  }

  async testBackendConnection() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Backend connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Validate session API key format
   */
  static validateSessionApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, error: 'API key must be a non-empty string' };
    }
    
    if (!apiKey.startsWith('sk-ant-')) {
      return { valid: false, error: 'Claude API key must start with "sk-ant-"' };
    }
    
    if (apiKey.length < 40) {
      return { valid: false, error: 'API key appears too short' };
    }
    
    return { valid: true };
  }

  /**
   * Test session API key with Claude API
   */
  static async testSessionApiKey(apiKey) {
    try {
      const validation = this.validateSessionApiKey(apiKey);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const testResponse = await fetch('http://localhost:3001/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: 'Test' }]
            }
          ]
        })
      });

      if (testResponse.ok) {
        return { valid: true, tested: true };
      } else {
        const errorData = await testResponse.json();
        throw new Error(errorData.error?.message || `API test failed: ${testResponse.status}`);
      }
    } catch (error) {
      return { valid: false, tested: true, error: error.message };
    }
  }

  clearCache() {
    this.cache = null;
    this.cacheTime = null;
  }
}

const configService = new ConfigService();
export { ConfigService };
export default configService;