import ConfigService from './ConfigService.js';
import { MessageFormatter } from './MessageFormatter.js';
import Logger from '../utils/logger.js';

class ClaudeAPIClass {
  constructor() {
    this.apiKey = null;  // Now fetched from Supabase
    this.cachedApiKey = null;  // Cache for session
    this.baseURL = '/api/chat';
    this.conversationThreads = new Map(); // Thread ID -> message history
    this.model = 'claude-sonnet-4-6';
    this.extendedThinking = false;
  }

  /**
   * Fetch API key from Supabase (cached for session)
   */
  async fetchApiKeyFromSupabase() {
    // Return cached key if available
    if (this.cachedApiKey) {
      return this.cachedApiKey;
    }

    try {
      const response = await fetch('/api/decrypt-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API key from database');
      }

      const { apiKey } = await response.json();

      // Cache for this session
      this.cachedApiKey = apiKey;
      console.log('🔑 API key fetched from Supabase');

      return apiKey;
    } catch (error) {
      console.error('❌ Failed to fetch API key:', error);
      throw new Error('No API key configured. Please configure in Settings.');
    }
  }

  /**
   * Get API key (async - fetches from Supabase if needed)
   */
  async getApiKey() {
    return await this.fetchApiKeyFromSupabase();
  }

  /**
   * Clear cached API key (call on sign out)
   */
  clearApiKeyCache() {
    this.cachedApiKey = null;
    console.log('🗑️ API key cache cleared');
  }

  // DEPRECATED: Old helper methods replaced by MessageFormatter
  // All message formatting now uses MessageFormatter.js as single source of truth

  // Available Claude models
  static MODELS = {
    'claude-sonnet-4-6': {
      name: '🧠 Claude Sonnet 4.6',
      description: 'Smart model for complex agents and coding',
      supportsExtendedThinking: true
    },
    'claude-haiku-4-5': {
      name: '⚡ Claude Haiku 4.5',
      description: 'Fastest model with near-frontier intelligence',
      supportsExtendedThinking: false
    },
    'claude-opus-4-8': {
      name: '🚀 Claude Opus 4.8',
      description: 'Most capable model for demanding reasoning and agentic work',
      supportsExtendedThinking: true
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

  // DEPRECATED: API keys now managed through Supabase
  // Use Settings screen to configure API key


  // Check proxy server health
  async checkProxyHealth() {
    try {
      // Health check removed - edge function doesn't need health endpoint
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
      Logger.debug('UNIFIED MESSAGE SYSTEM', {
        userInput: userInput?.substring(0, 100) + '...',
        options: Object.keys(options)
      });
      
      // Support conversationHistory in options for different calling patterns
      const workingHistory = options.conversationHistory || conversationHistory;
      
      Logger.debug('Conversation history source', {
        fromParameter: conversationHistory?.length || 0,
        fromOptions: options.conversationHistory?.length || 0,
        usingHistory: workingHistory?.length || 0
      });
      
      const model = options.model || this.model;
      const temperature = options.temperature !== undefined ? options.temperature : 0.7;
      const startTime = Date.now();

      // Get API key from Supabase (async)
      const apiKey = await this.getApiKey();
      
      // Build messages using SINGLE formatter
      let messages;
      try {
        messages = MessageFormatter.buildConversationMessages(
          workingHistory,
          userInput,
          options.systemPrompt || null
        );
        Logger.debug('MessageFormatter succeeded');
      } catch (error) {
        Logger.error('MessageFormatter failed:', error);
        throw error;
      }
      
      // Validate messages before sending
      const validation = MessageFormatter.validateMessages(messages);
      if (!validation.valid) {
        Logger.error('Message validation failed:', validation.errors);
        MessageFormatter.debugMessages(messages, options.context || 'API call');
        throw new Error(`Invalid message format: ${validation.errors.join(', ')}`);
      }
      
      // Debug logging
      Logger.debug(`API call with ${messages.length} messages`, {
        context: options.context || 'unknown'
      });
      if (options.debug) {
        MessageFormatter.debugMessages(messages, options.context);
      }
      
      // CRITICAL DEBUG: Log the exact API payload
      const requestBody = {
        model: model,
        max_tokens: options.maxTokens || options.max_tokens || 4000,
        temperature: temperature,
        messages: messages, // ✅ Properly formatted by single formatter
        stream: false
      };
      
      console.log('🚨 EXACT API PAYLOAD BEING SENT:');
      console.log('🚨 Request URL:', import.meta.env.DEV ? this.baseURL : 'production URL');
      console.log('🚨 Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('🚨 Message count:', messages.length);
      console.log('🚨 First message role:', messages[0]?.role);
      console.log('🚨 System message present:', messages.some(m => m.role === 'system'));
      
      // Build headers with extended thinking support
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      };
      
      // Always use session header format for API key
      headers['x-session-api-key'] = apiKey;
      console.log('🔑 Using API key:', this.sessionApiKey ? 'Session (volatile)' : 'Backend/Manual');

      // Add extended thinking header for Sonnet 4/Opus 4
      if ((this.extendedThinking || options.extendedThinking) && ClaudeAPIClass.MODELS[model]?.supportsExtendedThinking) {
        headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
        console.log('🧠 Extended thinking mode enabled for this request');
      }
      
      console.log('🔑 Using API key type:', apiKey === 'BACKEND_CONFIGURED' ? 'Backend Auto-Detected' : 'Manual');
      
      // Determine endpoint based on key type
      const endpoint = apiKey === 'BACKEND_CONFIGURED' 
        ? '/api/chat'  // Use Vercel edge function
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
          cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0,
          cache_write_input_tokens: data.usage?.cache_write_input_tokens || 0,
          cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
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