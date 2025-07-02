/**
 * DAGGER Logger Utility - Environment-Aware Logging
 * Provides clean production console while preserving development debugging
 */
class Logger {
  static isDev = import.meta.env.DEV;
  
  /**
   * Debug logging - only shown in development mode
   */
  static debug(message, data) {
    if (this.isDev) {
      console.log(`🔍 ${message}`, data);
    }
  }
  
  /**
   * Info logging - always shown
   */
  static info(message, data) {
    console.log(`ℹ️ ${message}`, data);
  }
  
  /**
   * Error logging - always shown
   */
  static error(message, error) {
    console.error(`❌ ${message}`, error);
  }
  
  /**
   * Success logging - always shown
   */
  static success(message, data) {
    console.log(`✅ ${message}`, data);
  }
  
  /**
   * Warning logging - always shown
   */
  static warn(message, data) {
    console.warn(`⚠️ ${message}`, data);
  }
  
  /**
   * Group logging - only in development mode
   */
  static group(title, callback) {
    if (this.isDev && callback) {
      console.group(title);
      callback();
      console.groupEnd();
    } else if (callback) {
      callback();
    }
  }
  
  /**
   * Conditional logging based on condition
   */
  static conditional(condition, level, message, data) {
    if (condition) {
      this[level](message, data);
    }
  }
}

export default Logger;