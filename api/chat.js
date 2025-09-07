/**
 * 🗡️ DAGGER Vercel Edge Function - Nuclear Transparency
 * 
 * Converted from proxy.js - Core Claude API forwarding logic only
 * ZERO VALIDATION - COMPLETE TRANSPARENCY - NO MIDDLEWARE COMPLEXITY
 */

/**
 * Transform MessageFormatter output to Claude API format
 * Extracts system messages to top-level parameter (Claude API requirement)
 */
function transformForClaudeAPI(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { system: null, messages: [] };
  }
  
  let systemMessage = null;
  const filteredMessages = [];
  
  for (const message of messages) {
    if (message.role === 'system') {
      // Extract system message content as string
      systemMessage = message.content[0]?.text || '';
    } else {
      // Keep non-system messages in array
      filteredMessages.push(message);
    }
  }
  
  return {
    system: systemMessage,
    messages: filteredMessages
  };
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-api-key, anthropic-beta');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key (session header takes priority over environment)
    const apiKey = req.headers['x-session-api-key'] || process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: {
          type: 'authentication_error',
          message: 'No Claude API key configured'
        }
      });
    }
    
    // Transform MessageFormatter output to Claude API format
    const { system, messages } = transformForClaudeAPI(req.body.messages);
    
    // Build Claude API request with correct format
    const claudeRequest = {
      model: req.body.model || 'claude-sonnet-4-20250514',
      max_tokens: req.body.max_tokens || 4000,
      temperature: req.body.temperature !== undefined ? req.body.temperature : 0.7,
      messages: messages // NO system messages in this array
    };
    
    // Add system parameter if extracted
    if (system) {
      claudeRequest.system = system;
    }
    
    // Forward to Claude API with correct format
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Forward extended thinking header if present
        ...(req.headers['anthropic-beta'] && { 'anthropic-beta': req.headers['anthropic-beta'] })
      },
      body: JSON.stringify(claudeRequest)
    });
    
    // Return Claude response transparently
    const data = await claudeResponse.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-api-key, anthropic-beta');
    
    res.status(claudeResponse.status).json(data);
    
  } catch (error) {
    console.error('❌ Edge function error:', error);
    
    // Set CORS headers for error response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-api-key, anthropic-beta');
    
    res.status(500).json({
      error: {
        type: 'proxy_error',
        message: 'Edge function error'
      }
    });
  }
}