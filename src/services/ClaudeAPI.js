import ConfigService from './ConfigService.js';
import { MessageFormatter } from './MessageFormatter.js';

class ClaudeAPIClass {
  constructor() {
    this.apiKey = localStorage.getItem('claude-api-key');
    this.baseURL = import.meta.env.DEV 
      ? 'http://localhost:3001/api/claude'
      : 'https://api.anthropic.com/v1/messages';
    this.conversationThreads = new Map(); // Thread ID -> message history
    this.model = 'claude-sonnet-4-20250514';
    this.extendedThinking = false;
  }

  // DEPRECATED: Old helper methods replaced by MessageFormatter
  // All message formatting now uses MessageFormatter.js as single source of truth

  // Available Claude models - Updated with Sonnet 4
  static MODELS = {
    'claude-sonnet-4-20250514': {
      name: 'Claude Sonnet 4',
      description: 'Latest and most capable model',
      supportsExtendedThinking: true
    },
    'claude-opus-4-20250514': {
      name: 'Claude Opus 4',
      description: 'Maximum capability for complex tasks',
      supportsExtendedThinking: true
    },
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      description: 'Balanced performance (Legacy)',
      supportsExtendedThinking: false
    },
    'claude-3-5-haiku-20241022': {
      name: 'Claude 3.5 Haiku', 
      description: 'Fast and efficient (Legacy)',
      supportsExtendedThinking: false
    },
    'claude-3-opus-20240229': {
      name: 'Claude 3 Opus',
      description: 'Most capable v3 (Legacy)',
      supportsExtendedThinking: false
    }
  }

  setModel(model) {
    this.model = model;
    console.log(`🔄 Switched to ${ClaudeAPIClass.MODELS[model]?.name || model}`);
  }

  setExtendedThinking(enabled) {
    this.extendedThinking = enabled;
    if (enabled && ClaudeAPIClass.MODELS[this.model]?.supportsExtendedThinking) {
      console.log('🧠 Extended thinking mode enabled');
    }
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    localStorage.setItem('claude-api-key', apiKey);
  }

  // New method to get API key from multiple sources
  async getApiKey() {
    try {
      // First check if we have auto-detected API key from backend
      const config = await ConfigService.checkBackendConfig();
      
      if (config.success && config.hasApiKey) {
        console.log('🔑 Using auto-detected API key from backend');
        // Return a special marker indicating backend has the key
        return 'BACKEND_CONFIGURED';
      }
      
      // Fallback to manual API key if auto-detection failed
      const manualKey = localStorage.getItem('claude-api-key') || this.apiKey;
      
      if (!manualKey || manualKey.trim() === '') {
        throw new Error('No API key available - neither auto-detected nor manually configured');
      }
      
      console.log('🔑 Using manually configured API key');
      return manualKey;
    } catch (error) {
      console.error('❌ API key retrieval failed:', error);
      throw new Error('API key configuration error: ' + error.message);
    }
  }


  // Check proxy server health
  async checkProxyHealth() {
    try {
      const response = await fetch('http://localhost:3001/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send message to Claude API - SINGLE METHOD FOR ALL CONVERSATION TYPES
   * 
   * @param {Array} conversationHistory - Previous conversation messages
   * @param {string} userInput - New user input
   * @param {Object} options - API options (temperature, model, systemPrompt, etc.)
   * @returns {Object} API response with content and usage data
   */
  async sendMessage(conversationHistory = [], userInput, options = {}) {
    try {
      console.log('\n🔍 === UNIFIED MESSAGE SYSTEM ===');
      console.log('📝 User input:', userInput);
      console.log('⚙️ Options:', options);
      
      const model = options.model || this.model;
      const temperature = options.temperature !== undefined ? options.temperature : 0.7;
      const startTime = Date.now();
      
      // Get API key using integrated method
      const apiKey = await this.getApiKey();
      
      // Build messages using SINGLE formatter
      const messages = MessageFormatter.buildConversationMessages(
        conversationHistory,
        userInput,
        options.systemPrompt || null
      );
      
      // Validate messages before sending
      const validation = MessageFormatter.validateMessages(messages);
      if (!validation.valid) {
        console.error('❌ Message validation failed:', validation.errors);
        MessageFormatter.debugMessages(messages, options.context || 'API call');
        throw new Error(`Invalid message format: ${validation.errors.join(', ')}`);
      }
      
      // Debug logging
      console.log(`🧠 API call with ${messages.length} messages in context: ${options.context || 'unknown'}`);
      if (options.debug) {
        MessageFormatter.debugMessages(messages, options.context);
      }
      
      // Make API request
      const requestBody = {
        model: model,
        max_tokens: options.maxTokens || options.max_tokens || 4000,
        temperature: temperature,
        messages: messages, // ✅ Properly formatted by single formatter
        stream: false
      };
      
      // Build headers with extended thinking support
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      };
      
      // Only add x-api-key header if we have a manual key
      // Backend-configured keys are handled by the proxy
      if (apiKey !== 'BACKEND_CONFIGURED') {
        headers['x-api-key'] = apiKey;
      }

      // Add extended thinking header for Sonnet 4/Opus 4
      if ((this.extendedThinking || options.extendedThinking) && ClaudeAPIClass.MODELS[model]?.supportsExtendedThinking) {
        headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
        console.log('🧠 Extended thinking mode enabled for this request');
      }
      
      console.log('🔑 Using API key type:', apiKey === 'BACKEND_CONFIGURED' ? 'Backend Auto-Detected' : 'Manual');
      
      // Determine endpoint based on key type
      const endpoint = apiKey === 'BACKEND_CONFIGURED' 
        ? 'http://localhost:3001/api/chat'  // Use proxy for backend keys
        : this.baseURL;  // Use default endpoint for manual keys
        
      console.log('📡 Making request to:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        
        // Handle specific error types
        switch (response.status) {
          case 401:
            throw new Error('Invalid API key. Please check your Claude API key.');
          case 429:
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          case 400:
            throw new Error('Invalid request. Please check your message format.');
          case 500:
            throw new Error('Claude API server error. Please try again later.');
          default:
            throw new Error(`API Error ${response.status}: ${errorData}`);
        }
      }
      
      const data = await response.json();
      const assistantMessage = data.content[0].text;
      
      console.log('✅ Response received:', assistantMessage.substring(0, 100) + '...');
      
      // Return standardized response
      return {
        content: assistantMessage,
        processingTime: Date.now() - startTime,
        usage: {
          input_tokens: data.usage?.input_tokens || 0,
          output_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        model: data.model || model,
        id: data.id,
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
        metadata: {
          temperature: temperature,
          messageCount: messages.length,
          timestamp: new Date().toISOString(),
          model: data.model || model,
          extendedThinking: (this.extendedThinking || options.extendedThinking) && ClaudeAPIClass.MODELS[model]?.supportsExtendedThinking
        }
      };
      
    } catch (error) {
      console.error('❌ Claude API Error:', error);
      
      // Handle network errors with proxy-specific messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (import.meta.env.DEV) {
          throw new Error('❌ Proxy server not running - start with \'npm run dev:proxy\'');
        } else {
          throw new Error('Network error: Unable to connect to Claude API. Please check your internet connection.');
        }
      }
      
      // Handle connection refused (proxy server down)
      if (error.code === 'ECONNREFUSED') {
        throw new Error('❌ Proxy server not running - start with \'npm run dev:proxy\'');
      }
      
      // Re-throw API errors with better context
      throw error;
    }
  }

  /**
   * Legacy compatibility method - redirects to unified sendMessage
   * @deprecated Use sendMessage() directly for new code
   */
  async generateResponse(prompt, options = {}) {
    console.log('⚠️ generateResponse() is deprecated. Use sendMessage() for unified message handling.');
    
    // Convert old thread-based format to new conversation history format
    const threadId = options.threadId || 'main';
    const messageHistory = this.conversationThreads.get(threadId) || [];
    
    // Convert thread messages to conversation format
    const conversationHistory = [];
    for (let i = 0; i < messageHistory.length; i += 2) {
      const userMsg = messageHistory[i];
      const assistantMsg = messageHistory[i + 1];
      
      if (userMsg && userMsg.role === 'user') {
        const conv = { input: userMsg.content[0]?.text || userMsg.content };
        if (assistantMsg && assistantMsg.role === 'assistant') {
          conv.response = assistantMsg.content[0]?.text || assistantMsg.content;
        }
        conversationHistory.push(conv);
      }
    }
    
    // Call unified sendMessage
    const response = await this.sendMessage(conversationHistory, prompt, {
      ...options,
      context: `legacy-thread-${threadId}`
    });
    
    // Update thread storage for backwards compatibility
    const newMessageHistory = [...messageHistory];
    newMessageHistory.push(MessageFormatter.createMessage('user', prompt));
    newMessageHistory.push(MessageFormatter.createMessage('assistant', response.content));
    this.conversationThreads.set(threadId, newMessageHistory);
    
    return {
      ...response,
      threadId: threadId
    };
  }

  // DEPRECATED: Multi-turn conversation support - use sendMessage() instead
  async sendConversation(messages, options = {}) {
    console.log('⚠️ sendConversation() is deprecated. Use sendMessage() for unified message handling.');
    
    // Convert legacy message format and call unified sendMessage
    const legacyMessages = MessageFormatter.convertLegacyMessages(messages);
    
    // Extract conversation history from legacy format
    const conversationHistory = [];
    for (let i = 0; i < legacyMessages.length; i += 2) {
      const userMsg = legacyMessages[i];
      const assistantMsg = legacyMessages[i + 1];
      
      if (userMsg && userMsg.role === 'user') {
        const conv = { input: userMsg.content[0]?.text };
        if (assistantMsg && assistantMsg.role === 'assistant') {
          conv.response = assistantMsg.content[0]?.text;
        }
        conversationHistory.push(conv);
      }
    }
    
    // Get last user message as new input
    const lastUserMessage = legacyMessages.filter(msg => msg.role === 'user').pop();
    const userInput = lastUserMessage?.content[0]?.text || '';
    
    // Remove last user message from history
    const historyWithoutLast = conversationHistory.slice(0, -1);
    
    return this.sendMessage(historyWithoutLast, userInput, {
      ...options,
      context: 'legacy-conversation'
    });
  }
  
  /**
   * Create new conversation thread for branches
   */
  createBranchThread(branchId) {
    const newThreadId = `branch-${branchId}`;
    
    // Initialize empty thread (no system prompts)
    this.conversationThreads.set(newThreadId, []);
    
    console.log(`🍴 Created branch thread: ${newThreadId}`);
    
    return newThreadId;
  }
  
  /**
   * Get conversation thread info for debugging
   */
  getThreadInfo(threadId) {
    const messages = this.conversationThreads.get(threadId) || [];
    return {
      threadId,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || 'Empty'
    };
  }
  
  /**
   * Clear thread (for testing)
   */
  clearThread(threadId) {
    this.conversationThreads.delete(threadId);
    console.log(`🗑️ Cleared thread: ${threadId}`);
  }
  
  /**
   * Get all active threads (for debugging)
   */
  getAllThreads() {
    return Array.from(this.conversationThreads.keys()).map(threadId => 
      this.getThreadInfo(threadId)
    );
  }

  // Rough token estimation for planning purposes
  estimateTokens(text) {
    // Very rough approximation: ~0.75 tokens per word
    // This is just for UI display, not billing
    const words = text.trim().split(/\s+/).length
    return Math.ceil(words * 0.75)
  }

  // Test API key with a minimal request
  async testApiKey() {
    try {
      await this.generateResponse('Hi', { maxTokens: 10 })
      return { success: true, message: 'API key working!' }
    } catch (error) {
      console.error('API test error:', error)
      return { success: false, message: `Error: ${error.message}` }
    }
  }

  // Validate API key format
  static validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false
    }
    // Anthropic API keys start with 'sk-ant-'
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20
  }
}

// Export both class and singleton for compatibility
export { ClaudeAPIClass as ClaudeAPI }; // For tests that need new ClaudeAPI()
export const claudeAPI = new ClaudeAPIClass(); // For app that needs singleton

// Attach static methods to singleton for backwards compatibility
claudeAPI.MODELS = ClaudeAPIClass.MODELS;
claudeAPI.validateApiKey = ClaudeAPIClass.validateApiKey;