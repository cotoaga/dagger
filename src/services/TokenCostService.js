/**
 * 💰 DAGGER Token Cost Service
 * 
 * Calculates API costs based on token usage for Claude models
 * Provides real-time cost tracking and session totals
 */

export class TokenCostService {
  // Claude API Pricing (per 1M tokens) as of 2024
  static PRICING = {
    // Claude 3.5 Sonnet
    'claude-3-5-sonnet-20241022': {
      input: 3.00,   // $3.00 per 1M input tokens
      output: 15.00, // $15.00 per 1M output tokens
      cached: 0.30,  // $0.30 per 1M cached tokens
      name: 'Claude 3.5 Sonnet'
    },
    // Claude 3.5 Haiku
    'claude-3-5-haiku-20241022': {
      input: 0.80,   // $0.80 per 1M input tokens
      output: 4.00,  // $4.00 per 1M output tokens
      cached: 0.08,  // $0.08 per 1M cached tokens
      name: 'Claude 3.5 Haiku'
    },
    // Claude 3 Opus
    'claude-3-opus-20240229': {
      input: 15.00,  // $15.00 per 1M input tokens
      output: 75.00, // $75.00 per 1M output tokens
      cached: 1.50,  // $1.50 per 1M cached tokens
      name: 'Claude 3 Opus'
    },
    // Claude 3 Sonnet
    'claude-3-sonnet-20240229': {
      input: 3.00,   // $3.00 per 1M input tokens
      output: 15.00, // $15.00 per 1M output tokens
      cached: 0.30,  // $0.30 per 1M cached tokens
      name: 'Claude 3 Sonnet'
    },
    // Claude 3 Haiku
    'claude-3-haiku-20240307': {
      input: 0.25,   // $0.25 per 1M input tokens
      output: 1.25,  // $1.25 per 1M output tokens
      cached: 0.03,  // $0.03 per 1M cached tokens
      name: 'Claude 3 Haiku'
    },
    // Claude Sonnet 4 (if available)
    'claude-sonnet-4-20250514': {
      input: 3.00,   // Estimated pricing
      output: 15.00, // Estimated pricing
      cached: 0.30,  // Estimated pricing
      name: 'Claude Sonnet 4'
    },
    // Claude Opus 4 (if available)
    'claude-opus-4-20250514': {
      input: 15.00,  // Estimated pricing
      output: 75.00, // Estimated pricing
      cached: 1.50,  // Estimated pricing
      name: 'Claude Opus 4'
    }
  };

  /**
   * Calculate cost for token usage
   * @param {string} model - Model identifier
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @param {number} cachedTokens - Number of cached tokens (optional)
   * @returns {Object} Cost breakdown
   */
  static calculateCost(model, inputTokens, outputTokens, cachedTokens = 0) {
    const pricing = this.PRICING[model] || this.PRICING['claude-3-5-sonnet-20241022'];
    
    // Calculate costs (price per 1M tokens, so divide by 1,000,000)
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    const cachedCost = (cachedTokens / 1000000) * pricing.cached;
    const totalCost = inputCost + outputCost + cachedCost;

    return {
      inputCost,
      outputCost,
      cachedCost,
      totalCost,
      breakdown: {
        input: { tokens: inputTokens, rate: pricing.input, cost: inputCost },
        output: { tokens: outputTokens, rate: pricing.output, cost: outputCost },
        cached: { tokens: cachedTokens, rate: pricing.cached, cost: cachedCost }
      },
      model: pricing.name,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format cost for display
   * @param {number} cost - Cost in dollars
   * @param {boolean} showSign - Whether to show $ sign
   * @returns {string} Formatted cost string
   */
  static formatCost(cost, showSign = true) {
    if (cost === 0) return showSign ? '$0.00' : '0.00';
    
    // For very small amounts, show more decimal places
    if (cost < 0.01) {
      return `${showSign ? '$' : ''}${cost.toFixed(6)}`;
    } else if (cost < 1) {
      return `${showSign ? '$' : ''}${cost.toFixed(4)}`;
    } else {
      return `${showSign ? '$' : ''}${cost.toFixed(2)}`;
    }
  }

  /**
   * Format token count for display
   * @param {number} tokens - Token count
   * @returns {string} Formatted token string
   */
  static formatTokens(tokens) {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    } else {
      return tokens.toString();
    }
  }

  /**
   * Get cost summary for a session
   * @param {Array} conversations - Array of conversations with token data
   * @returns {Object} Session cost summary
   */
  static getSessionSummary(conversations) {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCachedTokens = 0;
    let totalCost = 0;
    const costsByModel = {};

    conversations.forEach(conv => {
      if (conv.usage) {
        totalInputTokens += conv.usage.input_tokens || 0;
        totalOutputTokens += conv.usage.output_tokens || 0;
        totalCachedTokens += conv.usage.cache_read_input_tokens || 0;

        const cost = this.calculateCost(
          conv.model,
          conv.usage.input_tokens || 0,
          conv.usage.output_tokens || 0,
          conv.usage.cache_read_input_tokens || 0
        );

        totalCost += cost.totalCost;

        // Track costs by model
        const modelName = cost.model;
        if (!costsByModel[modelName]) {
          costsByModel[modelName] = {
            conversations: 0,
            inputTokens: 0,
            outputTokens: 0,
            cachedTokens: 0,
            cost: 0
          };
        }
        costsByModel[modelName].conversations++;
        costsByModel[modelName].inputTokens += conv.usage.input_tokens || 0;
        costsByModel[modelName].outputTokens += conv.usage.output_tokens || 0;
        costsByModel[modelName].cachedTokens += conv.usage.cache_read_input_tokens || 0;
        costsByModel[modelName].cost += cost.totalCost;
      }
    });

    return {
      totalConversations: conversations.length,
      totalInputTokens,
      totalOutputTokens,
      totalCachedTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      costsByModel,
      averageCostPerConversation: conversations.length > 0 ? totalCost / conversations.length : 0
    };
  }

  /**
   * Estimate cost for a prompt before sending
   * @param {string} prompt - The prompt text
   * @param {string} model - The model to use
   * @param {number} estimatedOutputTokens - Estimated output tokens (default: 500)
   * @returns {Object} Estimated cost
   */
  static estimateCost(prompt, model, estimatedOutputTokens = 500) {
    // Use TokenizerService to estimate input tokens
    // This is a simplified estimation - actual tokens may vary
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    
    return this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
  }

  /**
   * Get model pricing info
   * @param {string} model - Model identifier
   * @returns {Object} Model pricing details
   */
  static getModelPricing(model) {
    return this.PRICING[model] || this.PRICING['claude-3-5-sonnet-20241022'];
  }

  /**
   * Compare costs between models
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {Array} Sorted array of model costs
   */
  static compareModelCosts(inputTokens, outputTokens) {
    return Object.entries(this.PRICING)
      .map(([model, pricing]) => {
        const cost = this.calculateCost(model, inputTokens, outputTokens);
        return {
          model,
          name: pricing.name,
          cost: cost.totalCost,
          inputRate: pricing.input,
          outputRate: pricing.output
        };
      })
      .sort((a, b) => a.cost - b.cost);
  }

  /**
   * Get cost tier for a model (budget/standard/premium)
   * @param {string} model - Model identifier
   * @returns {string} Cost tier
   */
  static getModelTier(model) {
    const pricing = this.getModelPricing(model);
    const avgRate = (pricing.input + pricing.output) / 2;
    
    if (avgRate < 3) return 'budget';
    if (avgRate < 20) return 'standard';
    return 'premium';
  }
}

export default TokenCostService;