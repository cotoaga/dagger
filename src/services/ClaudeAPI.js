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

  getApiKey() {
    return this.apiKey || localStorage.getItem('claude-api-key');
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
   * Generate response with full conversation context
   */
  async generateResponse(prompt, options = {}) {
    console.log('\n🔍 === CLIENT-SIDE DEBUG ===');
    console.log('📝 Input prompt:', prompt);
    console.log('⚙️ Options:', options);
    
    const threadId = options.threadId || 'main';
    const model = options.model || this.model;
    const temperature = options.temperature !== undefined ? options.temperature : 0.7;
    const startTime = Date.now();
    
    console.log('🧵 Thread ID:', threadId);
    console.log('🤖 Model:', model);
    console.log('🌡️ Temperature:', temperature);
    
    // Get or create conversation thread
    let messageHistory = this.conversationThreads.get(threadId) || [];
    console.log('📚 Existing message history length:', messageHistory.length);
    console.log('📚 Existing messages:', JSON.stringify(messageHistory, null, 2));
    
    // Add current user message
    messageHistory.push({
      role: "user",
      content: prompt
    });
    
    console.log('📚 Updated message history length:', messageHistory.length);
    
    const requestBody = {
      model: model,
      max_tokens: options.max_tokens || 4000,
      temperature: temperature,
      messages: messageHistory // FULL conversation context!
    };
    
    console.log('📦 Final request payload:', JSON.stringify(requestBody, null, 2));
    
    // Build headers with extended thinking support
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };

    // Add extended thinking header for Sonnet 4/Opus 4
    if (this.extendedThinking && ClaudeAPIClass.MODELS[model]?.supportsExtendedThinking) {
      headers['interleaved-thinking-2025-05-14'] = 'true';
      console.log('🧠 Extended thinking mode enabled for this request');
    }
    
    console.log(`🧠 API call with ${messageHistory.length} messages in thread: ${threadId}`);
    console.log('📡 Making request to:', this.baseURL);
    console.log('📋 Request headers:', JSON.stringify(headers, null, 2));
    
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.text();
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
      console.log('✅ Parsed response data:', JSON.stringify(data, null, 2));
      
      const assistantMessage = data.content[0].text;
      console.log('💬 Assistant message extracted:', assistantMessage.substring(0, 100) + '...');
      
      // Add assistant response to thread history
      messageHistory.push({
        role: "assistant", 
        content: assistantMessage
      });
      
      // Update thread storage
      this.conversationThreads.set(threadId, messageHistory);
      
      console.log(`✅ Response generated, thread now has ${messageHistory.length} messages`);
      
      return {
        content: assistantMessage,
        processingTime: Date.now() - startTime,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens: data.usage?.input_tokens + data.usage?.output_tokens || 0,
        model: data.model || model,
        threadId: threadId
      };
      
    } catch (error) {
      console.error('❌ API Error:', error);
      
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

  // Legacy compatibility method
  async sendMessage(content, options = {}) {
    return this.generateResponse(content, options);
  }

  // Multi-turn conversation support
  async sendConversation(messages, options = {}) {
    const model = options.model || this.model;
    const temperature = options.temperature !== undefined ? options.temperature : 0.7;
    const startTime = Date.now();
    
    const requestBody = {
      model: model,
      max_tokens: options.max_tokens || 4000,
      temperature: temperature,
      messages: messages
    };
    
    // Build headers with extended thinking support
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };

    // Add extended thinking header for Sonnet 4/Opus 4
    if (this.extendedThinking && ClaudeAPIClass.MODELS[model]?.supportsExtendedThinking) {
      headers['interleaved-thinking-2025-05-14'] = 'true';
      console.log('🧠 Extended thinking mode enabled for this request');
    }
    
    console.log(`🤖 Multi-turn conversation with ${messages.length} messages`);
    
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        
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
      
      return {
        content: assistantMessage,
        processingTime: Date.now() - startTime,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens: data.usage?.input_tokens + data.usage?.output_tokens || 0,
        model: data.model || model
      };
      
    } catch (error) {
      console.error('❌ API Error:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Claude API. Please check your internet connection.');
      }
      
      // Re-throw API errors with better context
      throw error;
    }
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

// Export singleton and class for compatibility
export const ClaudeAPI = new ClaudeAPIClass();
ClaudeAPI.MODELS = ClaudeAPIClass.MODELS;
ClaudeAPI.validateApiKey = ClaudeAPIClass.validateApiKey;