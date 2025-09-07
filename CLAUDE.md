# 🗡️ DAGGER - Advanced Knowledge Cartography Platform
**Nuclear transparency proxy with token economics and distributed cognition architecture**

> "Context bandwidth is the bottleneck. DAGGER transforms linear chat into navigable knowledge topology where thoughts branch, merge, and scale beyond single conversation limits."

**Status: DEVELOPMENT BUILD ✅**
- Drag-to-merge conversation branching: OPERATIONAL
- Temperature-controlled AI creativity: OPERATIONAL  
- Extended thinking mode (Claude Sonnet 4): OPERATIONAL
- Real-time graph visualization: OPERATIONAL
- Hierarchical merge validation: OPERATIONAL
- Branch selection UI: FULLY OPERATIONAL ✅
- Session API key management: OPERATIONAL
- Linear-Graph view synchronization: OPERATIONAL
- Nuclear Proxy v2.0: COMPLETE TRANSPARENCY ✅
- Token economics & usage tracking: OPERATIONAL
- Tokenizer analysis tools: OPERATIONAL
- Console cleanup & production logging: OPERATIONAL ✅
- MessageFormatter bug fixes: OPERATIONAL ✅

## What Makes DAGGER v0.4.1 Revolutionary

DAGGER solves the fundamental constraint that kills deep thinking: **linear conversation interfaces hit context bandwidth limits**. Instead of losing your train of thought in tangents, DAGGER provides:

### 🧠 Distributed Cognition Architecture
- **Branch without losing context**: Explore tangents while preserving main thread
- **Drag-to-merge synthesis**: Visual hierarchical merging of conversation branches  
- **Extended thinking mode**: Advanced reasoning with Claude Sonnet 4
- **Temperature control**: Fine-tune AI creativity (0.1=Focused ↔ 1.0=Creative)
- **Real-time topology mapping**: Live conversation graph with Cytoscape.js
- **Token economics integration**: Real-time cost tracking and usage analytics
- **Nuclear transparency**: Zero-validation proxy with complete request/response visibility

### 🗺️ Knowledge Navigation System
- **Conversation cartography**: Map complex thinking as you explore it
- **Cross-branch synthesis**: Merge insights from parallel explorations
- **Dimensional navigation**: Zoom in/out/across conversation topology
- **Context preservation**: Never lose threading in complex discussions

## Technical Architecture

### Nuclear Transparency Dual-Server Design
DAGGER requires coordinated operation of two sophisticated systems:

#### 1. Nuclear Proxy Server v2.0 (Port 3001)
```bash
npm run dev:proxy
```
- **Nuclear Transparency**: Zero validation, complete request/response passthrough
- **Claude Sonnet 4 Integration**: Latest model support with extended thinking
- **Dynamic Timeout Scaling**: Smart API timeouts (30s-3min) based on complexity
- **Temperature Passthrough**: Real-time creativity control with metadata tracking
- **~280 lines total**: Focused implementation with comprehensive features
- **Test Coverage**: Comprehensive test suite with ongoing development
- **Legacy Compatibility**: `/api/chat` endpoint maintained

#### 2. Advanced React Application (Port 5173)
```bash
npm run dev
```
- **Cytoscape.js Graph Engine**: Professional DAG visualization with drag operations
- **Sophisticated State Management**: Complex branching with merge conflict resolution
- **Real-time Interaction System**: Drag feedback, visual state updates, branch validation
- **Token Economics Suite**: Real-time usage tracking, cost analytics, tokenizer tools
- **Performance Optimization**: Efficient rendering for large conversation networks

### Conversation Mental Model
```javascript
// Advanced Operations with Token Economics
graph.addConversation(prompt, response, {temperature: 0.7, model: 'claude-sonnet-4'})
graph.createBranch(parentId, branchType)
graph.dragToMerge(sourceNode, targetNode)  // Visual merge operations
graph.validateHierarchicalMerge(source, target)  // Prevents graph corruption
graph.exportWithMergeHistory()  // Complete topology export
tokenService.trackUsage(tokens, cost, model)  // NEW: Token economics tracking
tokenizerService.analyzeContent(text)  // NEW: Content analysis tools
```

## Quick Start

### Prerequisites
```bash
npm install
cp .env.example .env
# Add your Claude API key to .env
```

### 1. Start Nuclear Proxy Server v2.0
```bash
npm run dev:proxy
```
🟢 **Nuclear proxy operational on http://localhost:3001**
- Nuclear transparency active
- Sonnet 4 + Opus 4 support active
- Dynamic timeout scaling enabled
- Temperature passthrough operational

### 2. Launch Advanced Frontend  
```bash
npm run dev
```
🟢 **DAGGER interface active on http://localhost:5173**

### Production Deployment
```bash
npm run build     # Optimized production bundle
npm run preview   # Local production testing
```

**Both servers must be running simultaneously for full functionality.**

## Operational Features

### 🌡️ Advanced AI Control System
- **Real-time Temperature Control**: Creativity slider (0.1=Focused ↔ 1.0=Creative)
- **Extended Thinking Mode**: Advanced reasoning for Claude Sonnet 4
- **Multi-Model Support**: Sonnet 4 🧠, plus legacy 3.x compatibility
- **Smart Timeout Scaling**: Dynamic API timeouts based on conversation complexity
- **Visual Model Indicators**: Performance emojis and capability tags

### 🔀 Advanced Branch Management System
- **Visual Branch Management**: Drag conversation endpoints to merge hierarchically
- **End Node Detection**: Automatic identification of mergeable conversation points
- **Merge Conflict Prevention**: Hierarchical validation prevents graph corruption
- **Real-time Visual Feedback**: Drag indicators and merge target highlighting
- **Branch Lifecycle Tracking**: Complete state management from creation to closure
- **Robust Branch Selection**: Fixed UI with direct click handlers and immediate visual feedback
- **Three Branch Types**: Virgin (fresh start), Personality (custom AI), Knowledge (full context)
- **Context Inheritance**: Intelligent conversation history management per branch type

### 🗺️ Interactive Graph Visualization
- **Cytoscape.js Professional Rendering**: Smooth DAG layouts with drag operations
- **Linear ↔ Graph View Toggle**: Seamless switching between interface modes
- **Node Interaction System**: Click selection, drag merging, visual state feedback
- **Hierarchical Auto-Layout**: Intelligent organization of complex conversation trees
- **Performance Optimized**: Efficient rendering for 100+ node networks

### 💰 Token Economics Suite
- **Real-time Usage Tracking**: Live token counting with cost analytics
- **TokenUsageDisplay**: Visual token consumption and cost breakdown
- **TokenizerPopup**: Interactive content analysis and tokenization tools
- **Cost Optimization**: Model-aware pricing with usage recommendations
- **Historical Analytics**: Token usage patterns and cost trends

### 💎 Professional User Experience
- **Perfect Conversation Flow**: Intuitive `1> >1 2> >2 2.1> >2.1` numbering
- **Comprehensive Theming**: Dark/Light modes with smooth transitions
- **Smart Content Management**: Auto-collapse for complex conversation overview
- **Dynamic Input Scaling**: Auto-resize textarea with keyboard shortcuts
- **Real-time Analytics**: Live token counting, processing time, complexity metrics
- **Persistent Storage**: Full conversation + merge state preservation
- **Production Clean Console**: Environment-aware logging eliminates debug spam

### 🛠️ Recent Bug Fixes
- **MessageFormatter forEach Error**: Fixed parameter type mismatches in merge workflow
- **Console Debug Flood**: Implemented environment-aware Logger utility
- **getBranchPrefix Spam**: Eliminated high-volume debug logging from GraphModel
- **Merge Parameter Validation**: Added defensive programming for robust data handling
- **API Error Recovery**: Enhanced error handling in ClaudeAPI and MessageFormatter

## Development Excellence

### Quality Assurance
- **Test Coverage**: Comprehensive test suite with drag-to-merge validation
- **Build System**: Clean Vite production builds with zero warnings  
- **Performance**: Sub-2s response times with optimized timeout scaling
- **Cross-Browser**: Modern browser support with responsive design
- **Error Handling**: Graceful failure recovery with user-friendly messaging
- **UI Stability**: Fixed infinite render loops and event handler issues
- **Session Management**: Volatile API key support with automatic timeout handling
- **Production Console**: Clean output with environment-aware debug logging
- **Bug-Free Merging**: Resolved parameter type errors and forEach crashes

### Architecture Validation
- **Event-Driven Design**: Responsive interactions with sophisticated state management
- **Component Modularity**: Clean separation enabling rapid feature development
- **UUID + Display System**: Dual ID architecture for consistency and user clarity
- **Memory Management**: Efficient state handling for complex conversation trees

### Development Workflow
```bash
npm test          # Run comprehensive test suite
npm run build     # Verify production bundle
npm run dev:proxy & npm run dev  # Full system validation
```

**All systems verified operational. Ready for advanced conversational AI exploration.**

## The Knowledge Cartography Vision

### ✅ Current Features
- Operational drag-to-merge conversation branching
- Real-time graph visualization with professional DAG rendering
- Advanced AI control with temperature tuning and extended thinking
- Comprehensive architecture with ongoing testing
- **Nuclear Proxy v2.0**: Complete transparency with zero validation complexity
- **Token Economics Suite**: Real-time usage tracking, cost analytics, tokenizer tools
- **Recent Bug Fixes**: Resolved branch selection UI state conflicts
- **Performance Optimization**: Eliminated render loops and event handler issues
- **Session API Key Integration**: Volatile key management with dark mode UI
- **Cross-View Synchronization**: Seamless Linear ↔ Graph state management
- **Enhanced User Experience**: Immediate visual feedback and robust interaction patterns
- **Bug Resolution**: Fixed MessageFormatter parameter type errors and console spam
- **Production Polish**: Environment-aware logging and defensive programming throughout

### 🎯 Future Development Vectors
- **Enhanced Graph Intelligence**: Node clustering, smart layout optimization
- **Advanced Export/Import**: Conversation map sharing with version control
- **Real-time Collaboration**: Multi-user knowledge exploration
- **AI Orchestration**: Multi-model conversations with specialized AI personalities
- **Search & Discovery**: Full-text search, topic clustering, insight recommendations

### The Meta-Achievement
**DAGGER demonstrates its own value proposition**: This documentation was created using the exact branching/merging cognitive patterns that DAGGER enables. The tool validates itself through its own development process.

---

## Development Status

### Development Commands
```bash
# Start both servers
npm run dev:full                   # Start both servers concurrently
npm run dev:proxy                  # Start proxy server only
npm run dev                        # Start frontend only
npm test                           # Run test suite  
npm run build                      # Build production bundle
```

### Nuclear Proxy v2.0 - Complete Transparency

**Infrastructure Achievement**: Legacy proxy complexity eliminated, replaced with nuclear transparency:
- **Zero validation complexity**: Claude API is the validation authority
- **Complete transparency**: No request/response modification  
- **Focused implementation**: ~280 lines with comprehensive error handling
- **All branch types operational**: Virgin/Personality/Knowledge branches verified
- **Legacy compatibility**: `/api/chat` endpoint maintained

**Outcome**: DAGGER distributed cognition operates with zero infrastructure friction.