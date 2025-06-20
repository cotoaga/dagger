# 🚀 DAGGER MVPv0.2 Vercel Deployment Guide

**Deploy the Advanced Knowledge Cartography Tool to Vercel with Full Features**

## Overview

DAGGER MVPv0.2 requires special deployment considerations due to its sophisticated architecture:
- **Frontend**: React app with Cytoscape.js graph visualization
- **Backend**: Express proxy server for Claude API integration
- **Features**: Drag-to-merge, temperature control, extended thinking mode

This guide covers deploying both components to Vercel with optimal performance.

## Architecture Options

### Option 1: Vercel Functions (Recommended)
Deploy the proxy as a Vercel serverless function alongside the React frontend.

### Option 2: Hybrid Deployment
Deploy frontend to Vercel + backend to separate service (Railway, Render, etc.)

## 🎯 Option 1: Full Vercel Deployment (Recommended)

### Step 1: Prepare Project Structure

Create the required Vercel configuration:

```bash
# Create Vercel API directory
mkdir -p api

# Move proxy logic to Vercel function format
# We'll create this file next
```

### Step 2: Create Vercel Function for API Proxy

Create `api/claude.js`:

```javascript
// api/claude.js - Vercel serverless function
import cors from 'cors';

// Enable CORS for all origins in production
const corsHandler = cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'anthropic-version', 'interleaved-thinking-2025-05-14']
});

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsHandler(req, res, () => res.status(200).end());
  }

  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    
    if (!CLAUDE_API_KEY) {
      console.error('❌ CLAUDE_API_KEY environment variable is required');
      return res.status(500).json({ 
        error: 'Server configuration error - API key not configured' 
      });
    }

    try {
      console.log('🔄 Proxying Claude API request...');
      
      // Comprehensive request validation
      const { messages, model, max_tokens, temperature } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid request: messages array required' 
        });
      }

      // Validate message format
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (!message.role || !message.content || !['user', 'assistant'].includes(message.role)) {
          return res.status(400).json({ 
            error: `Invalid message format at index ${i}`,
            expected: { role: 'user|assistant', content: 'string' }
          });
        }
      }

      // Build headers for Claude API
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01'
      };
      
      // Pass through extended thinking header if present
      if (req.headers['interleaved-thinking-2025-05-14']) {
        headers['interleaved-thinking-2025-05-14'] = req.headers['interleaved-thinking-2025-05-14'];
        console.log('🧠 Extended thinking mode enabled for this request');
      }

      // Build Anthropic API payload
      const anthropicPayload = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 4096,
        temperature: temperature !== undefined ? temperature : 0.7,
        messages: messages
      };

      console.log(`🤖 Using model: ${anthropicPayload.model}`);
      console.log(`💬 Message count: ${anthropicPayload.messages.length}`);
      console.log(`🌡️ Temperature: ${anthropicPayload.temperature}`);
      
      // Calculate dynamic timeout based on conversation length
      const messageCount = anthropicPayload.messages.length;
      const baseTimeout = 30000; // 30 seconds base
      const timeoutPerMessage = 10000; // 10 seconds per message
      const maxTimeout = 180000; // 3 minutes max
      
      const dynamicTimeout = Math.min(
        baseTimeout + (messageCount * timeoutPerMessage),
        maxTimeout
      );
      
      console.log(`⏱️ Setting timeout to ${dynamicTimeout/1000} seconds for ${messageCount} messages`);
      
      // Make request to Claude API with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log(`⏱️ Request timeout after ${dynamicTimeout/1000} seconds`);
        controller.abort();
      }, dynamicTimeout);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(anthropicPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      const data = await response.json();
      
      console.log(`✅ Claude API response: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = 'Claude API Error';
        
        switch (response.status) {
          case 401:
            errorMessage = '🔑 Invalid Claude API key';
            break;
          case 429:
            errorMessage = '⏱️ Rate limit exceeded';
            break;
          case 400:
            errorMessage = '📝 Invalid request format';
            break;
          case 500:
            errorMessage = '🌐 Claude API server error';
            break;
          default:
            errorMessage = `Claude API Error ${response.status}`;
        }
        
        console.error(`❌ ${errorMessage}`);
        return res.status(response.status).json({ 
          error: errorMessage,
          details: data 
        });
      }
      
      res.json(data);
      
    } catch (error) {
      console.error('❌ Proxy error:', error);
      
      if (error.name === 'AbortError') {
        console.error(`❌ Request aborted due to timeout`);
        return res.status(408).json({ 
          error: "⏱️ Request timeout - Claude API response took too long",
          suggestion: "Try shorter conversation context"
        });
      }
      
      res.status(500).json({ 
        error: 'Proxy server error',
        message: error.message 
      });
    }
  });
}
```

### Step 3: Create Vercel Configuration

Create `vercel.json`:

```json
{
  "version": 2,
  "name": "dagger-mvp-v02",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "functions": {
    "api/claude.js": {
      "maxDuration": 300
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 4: Update Package.json for Vercel

Add build script for Vercel:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:proxy": "node dagger-api-proxy.js",
    "build": "vite build",
    "vercel-build": "npm run build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

### Step 5: Update Frontend API Configuration

Update `src/services/ClaudeAPI.js` to use correct endpoints:

```javascript
// In ClaudeAPI.js constructor
constructor() {
  this.apiKey = localStorage.getItem('claude-api-key');
  this.baseURL = import.meta.env.DEV 
    ? 'http://localhost:3001/api/claude'  // Local development
    : '/api/claude';                      // Vercel production
  // ... rest of constructor
}
```

### Step 6: Environment Variables Setup

In your Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add the following variables:

```bash
# Required
CLAUDE_API_KEY=your_anthropic_api_key_here

# Optional
NODE_ENV=production
VERCEL_ENV=production
```

### Step 7: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Or connect GitHub repository for automatic deployments
```

## 🔧 Option 2: Hybrid Deployment

### Frontend: Vercel
Follow steps above but configure API to point to external service:

```javascript
// In ClaudeAPI.js
this.baseURL = import.meta.env.DEV 
  ? 'http://localhost:3001/api/claude'
  : 'https://your-api-service.railway.app/api/claude';
```

### Backend: Railway/Render/Heroku

Deploy `dagger-api-proxy.js` as a standalone Express server:

```bash
# For Railway
railway login
railway init
railway add
railway up

# For Render
# Connect GitHub repo and deploy as Web Service
```

## 🚀 Production Optimizations

### Step 1: Update Build Configuration

Create `vite.config.js` optimizations:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'graph-vendor': ['cytoscape', 'cytoscape-dagre'],
          'markdown-vendor': ['react-markdown', 'react-syntax-highlighter']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  }
})
```

### Step 2: Add Performance Headers

Update `vercel.json` with performance headers:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 🔍 Testing Production Deployment

### Local Production Testing

```bash
# Build and test locally
npm run build
npm run preview

# Test API endpoints
curl -X POST http://localhost:4173/api/claude \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "temperature": 0.7,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Production Health Check

```bash
# Test deployed application
curl -X POST https://your-app.vercel.app/api/claude \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "temperature": 0.7,
    "messages": [{"role": "user", "content": "Test deployment"}]
  }'
```

## 🎯 Performance Monitoring

### Vercel Analytics
Enable in dashboard for:
- Core Web Vitals tracking
- Real User Monitoring
- Performance insights

### Custom Monitoring
Add to `src/main.jsx`:

```javascript
// Production performance monitoring
if (import.meta.env.PROD) {
  // Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}
```

## 🔒 Security Considerations

1. **API Key Security**: Store in Vercel environment variables only
2. **CORS Configuration**: Restrict to your domain in production
3. **Rate Limiting**: Implement if needed for high traffic
4. **Error Handling**: Don't expose sensitive information in error messages

## 🚨 Troubleshooting

### Common Issues

1. **API Function Timeout**: Increase timeout in `vercel.json`
2. **CORS Errors**: Check origin configuration in `api/claude.js`
3. **Build Failures**: Verify all dependencies in `package.json`
4. **Environment Variables**: Ensure API key is set in Vercel dashboard

### Debug Commands

```bash
# Check build locally
npm run build && npm run preview

# Inspect Vercel function logs
vercel logs

# Test API endpoints
vercel dev
```

---

## ✅ Deployment Checklist

- [ ] Created `api/claude.js` Vercel function
- [ ] Added `vercel.json` configuration
- [ ] Updated `ClaudeAPI.js` for production endpoints
- [ ] Set environment variables in Vercel dashboard
- [ ] Optimized build configuration
- [ ] Tested locally with `npm run build && npm run preview`
- [ ] Deployed with `vercel --prod`
- [ ] Verified all features work in production
- [ ] Set up monitoring and analytics

**Status**: 🚀 **DAGGER MVPv0.2 Ready for Vercel Production Deployment**

*Advanced knowledge cartography tool with full feature support in serverless environment*