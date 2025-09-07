# KNOWN_ISSUES.md

## Current State Analysis (Pre-Migration)

### ✅ Working Features
- Both servers start successfully:
  - Proxy server: `npm run dev:proxy` starts on localhost:3001
  - Frontend: `npm run dev` starts on localhost:5175 (auto-increments from 5173)
- Nuclear Proxy v2.0 shows proper initialization with all features
- API key is configured correctly

### ⚠️ Current Setup Requirements
- Requires two terminal windows/processes
- Must start proxy first, then frontend
- Ports auto-increment when busy (5173 → 5174 → 5175)
- No automatic process management

### 🧪 Tests Status
- Some tests failing (API message format issues)
- Build works but has warnings about chunk sizes
- Overall functionality appears intact

### 💻 Environment
- Node.js proxy (~280 lines in dagger-api-proxy-v2.js)
- Vite React frontend
- Local development only (no production deployment)

### 🎯 Target for Migration
- Eliminate need for separate proxy server
- Single URL deployment
- Vercel Edge Function to replace proxy logic