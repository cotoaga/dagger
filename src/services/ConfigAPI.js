class ConfigAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.configCache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  async checkConfiguration() {
    try {
      // Return cached result if still valid
      if (this.configCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        console.log('📋 Using cached config:', this.configCache);
        return this.configCache;
      }

      console.log('🔍 Checking backend configuration...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.baseURL}/api/config`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Config check failed: ${response.status}`);
      }

      const config = await response.json();
      
      // Cache the result
      this.configCache = config;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      console.log('✅ Backend configuration:', {
        hasApiKey: config.hasApiKey,
        apiKeyLength: config.apiKeyLength,
        prefix: config.apiKeyPrefix
      });

      return config;
    } catch (error) {
      console.warn('⚠️ Config check failed:', error.message);
      
      // Return safe defaults on failure
      return {
        hasApiKey: false,
        apiKeyConfigured: false,
        error: error.message,
        fallback: true
      };
    }
  }

  async testConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${this.baseURL}/api/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const health = await response.json();
      
      console.log('🏥 Backend health:', health);
      return health.status === 'healthy';
    } catch (error) {
      console.warn('⚠️ Backend connection test failed:', error);
      return false;
    }
  }

  // Clear cache to force fresh check
  clearCache() {
    this.configCache = null;
    this.cacheExpiry = null;
  }
}

export default new ConfigAPI();