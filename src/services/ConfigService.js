class ConfigService {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  async checkBackendConfig() {
    try {
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

      if (!response.ok) {
        throw new Error(`Backend config check failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache the result
      this.cache = result;
      this.cacheTime = Date.now();
      
      console.log('✅ Backend config result:', { 
        hasApiKey: result.hasApiKey,
        success: result.success 
      });

      return result;
    } catch (error) {
      console.warn('⚠️ Backend config check failed:', error.message);
      
      // Return safe defaults
      return {
        success: false,
        hasApiKey: false,
        error: error.message,
        fallbackMode: true
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

  clearCache() {
    this.cache = null;
    this.cacheTime = null;
  }
}

export default new ConfigService();