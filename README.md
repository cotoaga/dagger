# 🗡️ DAGGER v0.5.0 - Knowledge Cartography Platform

**Advanced conversational AI platform with distributed cognition architecture and XML-based prompt management**

> "Context bandwidth is the bottleneck. DAGGER transforms linear chat into navigable knowledge topology where thoughts branch, merge, and scale beyond single conversation limits."

## 🚀 Access DAGGER

**Production:** https://dagger.be-part-of.net  
**Status:** FULLY OPERATIONAL ✅

## What is DAGGER?

DAGGER solves the fundamental constraint that kills deep thinking: **linear conversation interfaces hit context bandwidth limits**. Instead of losing your train of thought in tangents, DAGGER provides:

### 🧠 Distributed Cognition Architecture
- **Branch without losing context**: Explore tangents while preserving main thread
- **Fancy click animations**: Circling progress bars → flash effects → activation
- **Drag-to-merge synthesis**: Visual hierarchical merging of conversation branches  
- **Extended thinking mode**: Advanced reasoning with Claude Sonnet 4
- **Temperature control**: Fine-tune AI creativity (0.1=Focused ↔ 1.0=Creative)
- **Real-time topology mapping**: Live conversation graph with Cytoscape.js
- **Token economics integration**: Real-time cost tracking and usage analytics
- **XML-based prompts**: KHAOS V7.1 personality system with direct file editing

### 🗺️ Knowledge Navigation System
- **Conversation cartography**: Map complex thinking as you explore it
- **Cross-branch synthesis**: Merge insights from parallel explorations
- **Dimensional navigation**: Zoom in/out/across conversation topology
- **Context preservation**: Never lose threading in complex discussions

## ✨ Latest Features (v0.5.0)

✅ **Enhanced Welcome Screen**: Fixed scrolling, dramatic click effects, reorganized grid  
✅ **"The Bar" Integration**: Direct access to Pan-Galactic Gargle Blaster prompt library  
✅ **XML-Based Prompt System**: KHAOS V7.1 with Navigator, Specialist, and Claude Classic  
✅ **Fancy Animations**: Circling progress bars with golden effects for "The Bar"  
✅ **Operational drag-to-merge conversation branching**  
✅ **Real-time graph visualization with professional DAG rendering**  
✅ **Advanced AI control with temperature tuning and extended thinking**  
✅ **Token Economics Suite**: Real-time usage tracking, cost analytics, tokenizer tools  
✅ **Session API Key Integration**: Volatile key management with dark mode UI  
✅ **Cross-View Synchronization**: Seamless Linear ↔ Graph state management

## 🛠️ Development

**⚠️ IMPORTANT: DAGGER requires Vercel deployment to function**

The local development server **cannot make API calls** without the Vercel backend:

```bash
npm install
npm run dev      # ❌ UI only - no API functionality
npm run build    # ✅ Build for Vercel deployment
npm test         # ✅ Run test suite (non-API tests)
npm run lint     # ✅ Check code quality
```

**For full development:** Deploy to Vercel and use the live URL.

### 🎭 Prompt Management

Dagger now uses an XML-based prompt system located in `src/prompts/`:

```
src/prompts/
├── personality/          # User-facing AI personalities
│   ├── khaos-navigator-v7.xml   # Default: Broad exploration
│   ├── khaos-specialist-v7.xml  # Surgical problem-solving  
│   └── vanilla-claude.xml        # Pure Claude experience
├── system/              # Merge and synthesis prompts
│   ├── khaos-synthesizer-v7.xml # Full branch synthesis
│   └── khaos-squeezer-v7.xml    # Executive summaries
└── decommissioned/      # Legacy prompts (preserved)
```

Edit XML files directly - redeploy to Vercel to see changes in production.

## API Key Setup

To use DAGGER, you need a Claude API key:

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Enter it in the session API key input when you first visit DAGGER
3. Your key is stored temporarily in the browser session only

## 🎯 Recent Updates

### v0.5.0 - Enhanced UX & XML Prompts
- ✅ Fixed home screen scrolling issues
- ✅ Removed Synthesizer from main grid (merge-only)
- ✅ Added "The Bar" for direct prompt library access
- ✅ Implemented fancy click animations with progress bars
- ✅ Created XML-based prompt management system
- ✅ KHAOS V7.1 personalities: Navigator, Specialist, Claude Classic
- ✅ Enhanced build optimization with chunk splitting

### v0.4.x - Foundation
- ✅ Eliminated dual-server architecture
- ✅ Single Vercel deployment
- ✅ Session-based API key management
- ✅ Token economics and usage tracking

---

**🗡️ DAGGER: From localhost chaos to production elegance**