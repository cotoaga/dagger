# 🗡️ DAGGER v0.4.0
**Advanced Knowledge Cartography Platform with Nuclear Transparency**

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green)](https://github.com/your-repo/dagger)
[![Version](https://img.shields.io/badge/Version-0.4.0-blue)](https://github.com/your-repo/dagger/releases)
[![Test Coverage](https://img.shields.io/badge/Tests-25%2F25%20Passing-brightgreen)](https://github.com/your-repo/dagger)
[![Nuclear Proxy](https://img.shields.io/badge/Nuclear%20Proxy-v2.0-orange)](https://github.com/your-repo/dagger)

> **Distributed cognition architecture that transforms linear chat into navigable knowledge topology**

DAGGER solves the fundamental constraint of conversational AI: **context bandwidth limitations**. Instead of losing your train of thought in tangents, DAGGER provides sophisticated conversation branching with drag-to-merge synthesis, nuclear transparency proxy architecture, and real-time token economics, enabling true knowledge cartography.

## 🚀 Quick Start

### System Requirements
- **Node.js 18+** (crypto API support required)
- **Modern Browser** (Chrome, Firefox, Safari, Edge)
- **Claude API Key** (Anthropic account required)
- **Command Line Access** (Terminal/PowerShell)

### ⚠️ IMPORTANT: This is NOT a static HTML file
**DO NOT** try to open `index.html` directly in your browser. DAGGER is a sophisticated React application that requires development servers to function.

### Installation
```bash
git clone [your-repo-url]
cd dagger
npm install
cp .env.example .env
# Add your Claude API key to .env: CLAUDE_API_KEY=sk-ant-...
```

### Launch DAGGER v0.4.0 (BOTH SERVERS REQUIRED)
```bash
# Terminal 1: Start Nuclear Proxy v2.0 server (MUST RUN FIRST)
npm run dev:proxy
# ✅ Nuclear Proxy v2.0 operational on http://localhost:3001

# Terminal 2: Start advanced frontend (NEW TERMINAL)
npm run dev
# ✅ DAGGER interface active on http://localhost:5173
```

### 🎯 Access Your Knowledge Cartography Tool
**Open your browser to: http://localhost:5173**

### Why Two Servers?
- **Nuclear Proxy Server (3001)**: Zero-validation transparency, Claude API authentication, CORS, timeout scaling
- **React App (5173)**: Serves the sophisticated conversation interface with graph visualization and token economics
- **Both Required**: The frontend calls the proxy, which calls Claude API

**If you skip the Nuclear Proxy server, the Claude API integration will fail completely.**

### Production Deployment
```bash
npm run build     # Creates static files in /dist
npm run preview   # Local production testing
# Note: Still requires proxy server for Claude API calls
```

### Troubleshooting
- **Blank screen?** → Check both servers are running
- **API errors?** → Verify your Claude API key in .env
- **Module errors?** → Run `npm install` and restart servers
- **Port conflicts?** → Vite will auto-assign different ports if 5173 is busy

**Remember: DAGGER is distributed cognition architecture, not a simple webpage.** 🗡️

## ✨ v0.4.0 Key Features

### 🚀 Nuclear Transparency Architecture
- **Nuclear Proxy v2.0**: Zero-validation complete transparency (~50 lines total)
- **TDD Validated**: 18+ comprehensive tests, all passing
- **Zero Infrastructure Friction**: Claude API is the validation authority
- **Legacy Compatibility**: Full `/api/chat` endpoint support

### 💰 Token Economics Suite
- **Real-time Usage Tracking**: Live token counting with cost analytics
- **TokenUsageDisplay**: Visual token consumption and cost breakdown
- **TokenizerPopup**: Interactive content analysis and tokenization tools
- **Cost Optimization**: Model-aware pricing with usage recommendations

### 🧠 Advanced AI Control
- **Temperature Control**: Real-time creativity adjustment (0.1=Focused ↔ 1.0=Creative)
- **Extended Thinking**: Advanced reasoning mode for Claude Sonnet 4 + Opus 4
- **Multi-Model Support**: Latest Claude models with performance indicators
- **Smart Timeouts**: Dynamic scaling (30s-3min) based on conversation complexity

### 🔀 Drag-to-Merge Conversation System
- **Visual Branch Creation**: Explore tangents without losing main thread
- **Hierarchical Merging**: Drag conversation endpoints to merge intelligently
- **Conflict Prevention**: Automatic validation prevents graph corruption
- **Real-time Feedback**: Visual indicators during drag operations

### 🗺️ Interactive Knowledge Maps
- **Cytoscape.js Visualization**: Professional DAG rendering with smooth interactions
- **Linear ↔ Graph Views**: Seamless switching between interface modes
- **Conversation Topology**: Navigate complex thinking patterns visually
- **Performance Optimized**: Handle 100+ node conversation networks

### 💎 Professional Experience
- **Dark/Light Themes**: Comprehensive theming with smooth transitions
- **Perfect Numbering**: Intuitive conversation flow (1> >1 2> >2 2.1> >2.1)
- **Smart Content Management**: Auto-collapse for conversation overview
- **Real-time Analytics**: Token counting, processing metrics, complexity tracking
- **Session Management**: Volatile API key support with secure handling

## 🏗️ Architecture

### Nuclear Transparency Dual-Server Design
```
React App (5173) ← Nuclear Proxy v2.0 (3001) ← Claude Sonnet 4/Opus 4 API
      ↓                       ↓                        ↓
 Graph Visualization    Zero Validation         Extended Thinking
 Drag-to-Merge         Complete Transparency    Advanced Reasoning
 Token Economics       Dynamic Timeouts         Multi-Model Support
 State Management      Error Handling           Nuclear Transparency
```

### Core Technologies
- **Frontend**: React 19.1.0 + Vite 6.3.5
- **Visualization**: Cytoscape.js for graph rendering
- **AI Integration**: Anthropic Claude API with Nuclear Proxy v2.0 architecture
- **Token Economics**: Real-time usage tracking and cost analysis
- **Testing**: Vitest with comprehensive coverage
- **State**: localStorage with auto-save persistence

### Component Structure
```
src/
├── models/GraphModel.js          # Conversation graph with merge management
├── services/
│   ├── ClaudeAPI.js             # Nuclear Proxy API integration
│   ├── TokenCostService.js      # Token economics and cost tracking
│   └── TokenizerService.js      # Content analysis and tokenization
├── components/
│   ├── DaggerInput.jsx          # Temperature control + auto-resize input
│   ├── DaggerOutput.jsx         # Merge status + markdown rendering
│   ├── GraphView.jsx            # Cytoscape visualization + drag-to-merge
│   ├── ForkMenu.jsx             # Advanced branching interface
│   ├── TokenUsageDisplay.jsx    # Real-time token usage and cost display
│   └── TokenizerPopup.jsx       # Interactive tokenization analysis
└── App.jsx                      # Orchestration + view switching
```

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development servers
npm run dev:proxy    # Nuclear Proxy v2.0 server only
npm test             # Run comprehensive test suite
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Code quality check
```

### Testing
```bash
npm test
# 25/25 tests passing
# Coverage includes drag-to-merge validation and Nuclear Proxy v2.0
```

### Production Build
```bash
npm run build
# Optimized bundle with zero warnings
# Ready for deployment
```

### Development Quality
- ✅ **Test-Driven Development**: 25+ comprehensive tests
- ✅ **Clean Architecture**: MVC with conversation-aware mental models
- ✅ **Performance Optimized**: Sub-2s response times
- ✅ **Cross-Platform**: Modern browser compatibility
- ✅ **Production Ready**: Zero-warning builds

## 🤝 Contributing

### Development Philosophy
DAGGER is built with **distributed cognition principles** - human intuition + AI pattern recognition + visual knowledge mapping. Contributions should enhance this cognitive amplification architecture.

### Key Principles
- **Problem-First Thinking**: What cognitive behavior are we enabling?
- **Test-Driven Development**: Red-Green-Refactor workflow
- **Conversation-Aware Design**: Think in terms of knowledge cartography
- **Performance Conscious**: Optimize for complex conversation networks

### Getting Started
1. Fork the repository
2. Create feature branch: `git checkout -b feature/knowledge-enhancement`
3. Run tests: `npm test`
4. Build locally: `npm run build`
5. Submit PR with clear cognitive improvement description

### Testing Requirements
All new features must include:
- Unit tests for core functionality
- Integration tests for conversation flow
- Performance tests for graph operations
- User experience validation

## 📄 License & Philosophy

**Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**

**Copyright (c) 2025 Kurt Cotoaga**

### Crystal Clear Terms for the Cognitively Challenged:

**YES, YOU CAN COPY THIS.** In fact, I'm assuming you need help figuring out how distributed cognition actually works, so I'm giving you a helping hand:

- ✅ **Copy freely**: Clone, fork, study the code - I expect you to
- ✅ **Learn something**: This is how you build knowledge cartography tools that don't suck
- ✅ **Attribution required**: Give credit where it's due - Kurt Cotoaga built this
- ❌ **No commercial use**: Don't monetize my work without permission

### The Philosophy:
DAGGER exists because most "AI chat interfaces" miss the fundamental problem: **context bandwidth limitations kill deep thinking**. If you're building yet another linear chat wrapper, you're solving the wrong problem. This is how you actually amplify human-AI cognition.

**For complete legal details**: [Creative Commons BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/legalcode)

*No warranties given. Use your brain. Build better tools.* 🗡️

## 🙏 Acknowledgments

Built with distributed cognition principles, inspired by:
- **Cytoscape.js**: Professional graph visualization
- **Anthropic Claude**: Advanced conversational AI
- **React + Vite**: Modern development experience
- **Test-Driven Development**: Kent Beck's quality methodology

## 📞 Support

- **Documentation**: See [CLAUDE.md](CLAUDE.md) for detailed technical documentation
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for architecture and cognitive amplification topics

---

**DAGGER v0.4.0 - Nuclear transparency meets knowledge cartography** 🗡️

*Built by distributed cognition, with nuclear transparency, for cognitive amplification at scale*