/**
 * 🔍 DAGGER Tokenizer Service
 * 
 * Provides client-side tokenization analysis for Claude API requests
 * Estimates token counts and classifies token types for debugging
 */

export class TokenizerService {
  /**
   * Tokenize text using approximation algorithms
   * @param {string} text - Text to tokenize
   * @returns {Array} Array of token objects with text, type, and metadata
   */
  static tokenizeText(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const tokens = [];
    let currentIndex = 0;
    
    // Enhanced tokenization patterns for Claude-style analysis
    const patterns = [
      // Code blocks and special formatting
      { regex: /```[\s\S]*?```/g, type: 'code_block' },
      { regex: /`[^`]+`/g, type: 'inline_code' },
      
      // URLs and emails
      { regex: /https?:\/\/[^\s]+/g, type: 'url' },
      { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'email' },
      
      // Numbers (including floats, negatives, scientific notation)
      { regex: /-?\d+\.?\d*(?:[eE][+-]?\d+)?/g, type: 'number' },
      
      // Punctuation clusters
      { regex: /[.!?]+/g, type: 'sentence_end' },
      { regex: /[,;:]/g, type: 'punctuation' },
      { regex: /[()[\]{}]/g, type: 'bracket' },
      { regex: /['"]/g, type: 'quote' },
      { regex: /[-–—]/g, type: 'dash' },
      
      // Special characters
      { regex: /[#@$%^&*+=<>~]/g, type: 'symbol' },
      
      // Whitespace
      { regex: /\s+/g, type: 'whitespace' },
      
      // Words (including contractions, hyphenated words)
      { regex: /\b\w+(?:'\w+)?(?:-\w+)*\b/g, type: 'word' },
      
      // Everything else as individual characters
      { regex: /./g, type: 'other' }
    ];

    const remaining = text.split('');
    let position = 0;

    while (position < text.length) {
      let matched = false;
      
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.regex.source, 'g');
        regex.lastIndex = position;
        const match = regex.exec(text);
        
        if (match && match.index === position) {
          const tokenText = match[0];
          const classification = this.classifyToken(tokenText, pattern.type);
          
          tokens.push({
            text: tokenText,
            type: classification.type,
            subtype: classification.subtype,
            start: position,
            end: position + tokenText.length,
            length: tokenText.length,
            estimatedTokens: this.estimateTokenCount(tokenText, classification.type)
          });
          
          position += tokenText.length;
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // Fallback for unmatched characters
        const char = text[position];
        tokens.push({
          text: char,
          type: 'unknown',
          subtype: 'character',
          start: position,
          end: position + 1,
          length: 1,
          estimatedTokens: 1
        });
        position++;
      }
    }

    return tokens;
  }

  /**
   * Classify token type and provide detailed analysis
   * @param {string} tokenText - The token text
   * @param {string} baseType - Base type from regex matching
   * @returns {Object} Classification with type, subtype, and metadata
   */
  static classifyToken(tokenText, baseType) {
    const classification = {
      type: baseType,
      subtype: null,
      metadata: {}
    };

    switch (baseType) {
      case 'word':
        // Classify word types
        if (/^[A-Z]+$/.test(tokenText)) {
          classification.subtype = 'acronym';
        } else if (/^[A-Z]/.test(tokenText)) {
          classification.subtype = 'proper_noun';
        } else if (tokenText.length <= 2) {
          classification.subtype = 'short_word';
        } else if (tokenText.length >= 10) {
          classification.subtype = 'long_word';
        } else {
          classification.subtype = 'common_word';
        }
        
        // Check for programming keywords
        const programmingKeywords = [
          'function', 'class', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
          'return', 'import', 'export', 'async', 'await', 'try', 'catch', 'throw'
        ];
        if (programmingKeywords.includes(tokenText.toLowerCase())) {
          classification.type = 'programming_keyword';
        }
        break;

      case 'number':
        if (tokenText.includes('.')) {
          classification.subtype = 'decimal';
        } else if (tokenText.includes('e') || tokenText.includes('E')) {
          classification.subtype = 'scientific';
        } else if (parseInt(tokenText) > 1000) {
          classification.subtype = 'large_number';
        } else {
          classification.subtype = 'integer';
        }
        classification.metadata.value = parseFloat(tokenText);
        break;

      case 'code_block':
        // Detect language
        const langMatch = tokenText.match(/```(\w+)/);
        if (langMatch) {
          classification.subtype = `${langMatch[1]}_code`;
          classification.metadata.language = langMatch[1];
        } else {
          classification.subtype = 'generic_code';
        }
        break;

      case 'whitespace':
        if (tokenText.includes('\n')) {
          classification.subtype = 'newline';
          classification.metadata.lineBreaks = (tokenText.match(/\n/g) || []).length;
        } else {
          classification.subtype = 'space';
        }
        break;

      default:
        classification.subtype = 'default';
    }

    return classification;
  }

  /**
   * Estimate token count for Claude API
   * @param {string} text - Text to estimate
   * @param {string} type - Token type for estimation adjustment
   * @returns {number} Estimated token count
   */
  static estimateTokenCount(text, type) {
    if (!text) return 0;

    // Base estimation: ~4 characters per token for English text
    let baseTokens = Math.ceil(text.length / 4);

    // Adjust based on token type
    switch (type) {
      case 'code_block':
      case 'inline_code':
        // Code tends to be more token-dense
        baseTokens = Math.ceil(text.length / 3);
        break;
      
      case 'url':
        // URLs are often single tokens despite length
        baseTokens = Math.max(1, Math.ceil(text.length / 8));
        break;
      
      case 'number':
        // Numbers are typically single tokens
        baseTokens = 1;
        break;
      
      case 'whitespace':
        // Whitespace usually doesn't count as tokens
        baseTokens = 0;
        break;
      
      case 'word':
        // Common words are often single tokens
        if (text.length <= 6) {
          baseTokens = 1;
        } else {
          baseTokens = Math.ceil(text.length / 4);
        }
        break;
      
      case 'punctuation':
      case 'sentence_end':
      case 'bracket':
      case 'quote':
        // Punctuation is typically single tokens
        baseTokens = 1;
        break;
    }

    return Math.max(1, baseTokens);
  }

  /**
   * Get total estimated token count for text
   * @param {string} text - Text to analyze
   * @returns {number} Total estimated tokens
   */
  static getTotalTokenCount(text) {
    const tokens = this.tokenizeText(text);
    return tokens.reduce((total, token) => total + token.estimatedTokens, 0);
  }

  /**
   * Get token statistics for analysis
   * @param {string} text - Text to analyze
   * @returns {Object} Detailed statistics
   */
  static getTokenStatistics(text) {
    const tokens = this.tokenizeText(text);
    
    const stats = {
      totalTokens: tokens.reduce((total, token) => total + token.estimatedTokens, 0),
      totalCharacters: text.length,
      tokenCount: tokens.length,
      averageTokenLength: tokens.length > 0 ? text.length / tokens.length : 0,
      types: {},
      longestToken: '',
      shortestToken: text.length > 0 ? tokens[0]?.text || '' : ''
    };

    // Analyze token types
    tokens.forEach(token => {
      const type = token.type;
      if (!stats.types[type]) {
        stats.types[type] = { count: 0, characters: 0, estimatedTokens: 0 };
      }
      stats.types[type].count++;
      stats.types[type].characters += token.length;
      stats.types[type].estimatedTokens += token.estimatedTokens;

      // Track longest/shortest
      if (token.text.length > stats.longestToken.length) {
        stats.longestToken = token.text;
      }
      if (token.text.length > 0 && token.text.length < stats.shortestToken.length) {
        stats.shortestToken = token.text;
      }
    });

    return stats;
  }
}

export default TokenizerService;