# 🗡️ DAGGER MVPv0.2 - Advanced Knowledge Cartography Tool

**Sophisticated conversational AI interface with hierarchical branching, drag-to-merge capabilities, and temperature control**

> "The real problem isn't AI capabilities—it's that linear chat hits context bandwidth limits. You need distributed cognition: branch, explore, merge, then zoom back to your main thread without losing context."

## What is DAGGER MVPv0.2?

DAGGER transforms how humans and AI explore ideas together through sophisticated conversation management. Instead of linear chat where tangents destroy your main thread, DAGGER provides:

- **🌡️ Temperature Control**: Fine-tune AI creativity with real-time sliders (0.1=Focused ↔ 1.0=Creative)
- **🔀 Drag-to-Merge**: Visually merge conversation branches with hierarchical rules
- **🧠 Extended Thinking**: Advanced reasoning mode for Claude Sonnet 4 and Opus 4
- **🗺️ Graph Visualization**: Interactive conversation maps with Cytoscape.js
- **🌿 Smart Branching**: Explore tangents without losing your main conversation
- **📊 Real-time Analytics**: Track tokens, processing time, and conversation complexity
- **🎨 Professional UX**: Dark/light themes with sophisticated visual feedback

## Quick Start

DAGGER MVPv0.2 requires two servers for optimal performance:

### Prerequisites
```bash
npm install
```

### 1. API Proxy Server (Required First)
The enhanced proxy server handles Claude Sonnet 4 API communication with dynamic timeout scaling.

```bash
# Copy environment template
cp .env.example .env

# Add your Claude API key to .env
# CLAUDE_API_KEY=your_anthropic_key_here

# Start the enhanced proxy server
npm run dev:proxy
```

🟢 Proxy server starts on `http://localhost:3001` with Sonnet 4 support

### 2. DAGGER React App
```bash
# In a new terminal, start the advanced frontend
npm run dev
```

🟢 React app starts on `http://localhost:5173` (or auto-assigned port)

### Production Build
```bash
npm run build    # Optimized production build
npm run preview  # Preview production build locally
```

**Note:** Both servers must be running. The proxy handles API authentication, CORS, and advanced timeout management for complex conversations.

## Architecture

DAGGER MVPv0.2 uses an advanced proxy architecture supporting sophisticated conversation management:

### Enhanced Proxy Features
- **Claude Sonnet 4/Opus 4 API**: Full support for latest models with extended thinking
- **Dynamic Timeout Scaling**: Smart timeouts based on conversation complexity (30s-3min)
- **Temperature Passthrough**: Real-time creativity control with metadata tracking
- **Extended Thinking Headers**: `interleaved-thinking-2025-05-14` mode for advanced reasoning
- **API Key Security**: Server-side credential management
- **CORS Resolution**: Seamless browser-to-API communication

### Modern React Architecture
- **Cytoscape.js Integration**: Professional graph visualization with drag-to-merge
- **Sophisticated State Management**: Complex branching with merge conflict resolution
- **Event-Driven Interactions**: Real-time drag feedback and visual state updates
- **Performance Optimization**: Efficient rendering for large conversation trees

```
React App (5173) ← Enhanced Proxy (3001) ← Claude Sonnet 4/Opus 4 API
      ↓                    ↓                        ↓
 Graph Visualization  Timeout Scaling     Extended Thinking
 Drag-to-Merge       Temperature Control   Advanced Reasoning
 State Management    Error Handling        Model Selection
```

## Getting Started with MVPv0.2

1. **Setup & Launch**: Visit `http://localhost:5173` 
2. **API Configuration**: Enter your Claude API key and select model
3. **Temperature Control**: Adjust creativity slider (0.1=Focused, 1.0=Creative)
4. **Extended Thinking**: Enable for Sonnet 4/Opus 4 advanced reasoning
5. **Start Conversing**: Begin with perfect numbered flow:
   - `1>` Your first question → `>1` AI's response 
   - `2>` Continue main thread → `>2` AI responds
   - `2.1>` Branch exploration → `>2.1` AI responds to branch
6. **Graph Visualization**: Switch to Graph View to see conversation structure
7. **Drag-to-Merge**: Drag end nodes to merge branches hierarchically
8. **Advanced Features**: Enjoy auto-collapse, copy functions, real-time analytics

## Features

### 🌡️ Advanced AI Control
- **Temperature Control**: Real-time creativity adjustment (0.1=Focused ↔ 1.0=Creative)
- **Extended Thinking**: Advanced reasoning mode for Claude Sonnet 4 and Opus 4
- **Model Selection**: Claude Sonnet 4, Opus 4, plus legacy 3.x models
- **Model Indicators**: Visual tags with performance emojis (🧠 Sonnet 4, 🚀 Opus 4)
- **Smart Timeout Scaling**: Dynamic API timeouts based on conversation complexity

### 🔀 Sophisticated Branch Management
- **Drag-to-Merge**: Visual branch merging with hierarchical validation
- **End Node Detection**: Automatic identification of mergeable conversation endpoints
- **Merge Conflict Prevention**: Hierarchical rules prevent graph corruption
- **Branch Lifecycle**: Complete state management from creation to closure
- **Visual Feedback**: Real-time drag indicators and merge target highlighting

### 🗺️ Interactive Graph Visualization
- **Cytoscape.js Integration**: Professional DAG rendering with smooth animations
- **Linear ↔ Graph Views**: Seamless switching between conversation modes
- **Node Interaction**: Click to select, drag to merge, visual state feedback
- **Hierarchical Layout**: Automatic organization of complex conversation trees
- **Performance Optimization**: Efficient rendering for large conversation networks

### 💎 Professional UX/UI
- **Perfect Numbering**: Intuitive flow `1> >1 2> >2 2.1> >2.1`
- **Dark/Light Themes**: Comprehensive theming with smooth transitions
- **Smart Auto-collapse**: Content management for complex conversations
- **Auto-resize Textarea**: Dynamic input scaling with keyboard shortcuts
- **Real-time Analytics**: Live tracking of tokens, processing time, complexity
- **Copy Integration**: One-click copying throughout the interface
- **Persistent Storage**: Full conversation history with merge state preservation

### 🛠️ Technical Excellence
- **Test-Driven Development**: 25+ core tests with drag-to-merge validation
- **Event-Driven Architecture**: Responsive interactions with sophisticated state management
- **UUID + Display Number**: Dual ID system for internal consistency and user clarity
- **Error Handling**: Graceful failure recovery with user-friendly messaging
- **Performance**: Sub-2s response times with dynamic timeout optimization
- **Cross-browser**: Modern browser support with responsive design
- **Production Ready**: Optimized build pipeline with zero warnings

## Component Architecture

### Enhanced MVPv0.2 Structure

```
src/
├── models/
│   └── GraphModel.js          # Sophisticated conversation graph with merge management
├── services/
│   └── ClaudeAPI.js           # Enhanced Claude Sonnet 4/Opus 4 integration
├── components/
│   ├── DaggerInput.jsx        # Temperature control + auto-resize input
│   ├── DaggerOutput.jsx       # Merge status + markdown rendering
│   ├── DaggerInputDisplay.jsx # Historical conversation display
│   ├── GraphView.jsx          # Cytoscape.js visualization with drag-to-merge
│   ├── ForkMenu.jsx           # Advanced branching interface
│   └── ActiveThreads.jsx      # Developer debugging component
├── App.jsx                    # Orchestration with graph/linear view switching
├── App.css                    # Comprehensive theming and drag-to-merge styles
└── dagger-api-proxy.js        # Enhanced proxy server with timeout scaling
```

### Advanced Conversation Mental Model

DAGGER MVPv0.2 models sophisticated conversation flows with merge capabilities:

```javascript
// Enhanced user actions with temperature control
graph.addConversation(prompt, response, {temperature: 0.7, model: 'claude-sonnet-4'})
graph.createBranch(parentId, branchType)      // Create sophisticated branches
graph.addConversationToBranch(branchId, content)  // Continue branch threads

// Advanced merge operations
graph.canMergeNodes(sourceId, targetId)       // Hierarchical validation
graph.mergeNodes(sourceId, targetId)          // Execute merge with state tracking
graph.isThreadMerged(displayNumber)           // Check branch closure status

// Enhanced metadata tracking
graph.exportToMarkdown()                      // Export with temperature + merge history
```

## The Development Journey to MVPv0.2

This sophisticated implementation demonstrates the exact problem DAGGER solves - managing complexity without losing the main thread:

**Advanced Development Arc:**
1. 📋 **Foundation**: Read `claude-instructions.md` specifications
2. 🏗️ **Setup**: React + Vite + TDD environment with proxy architecture
3. 🔧 **Core Model**: Fix UUID generation, build conversation-aware GraphModel
4. 🌐 **API Integration**: ClaudeAPI service with CORS proxy and error handling
5. 🎨 **Component System**: DaggerInput/Output with auto-resize and markdown
6. 🌙 **UX Polish**: Dark mode, model selection, professional theming
7. 📊 **Model Tagging**: Performance indicators and CSS refinements
8. 📁 **Content Management**: Smart auto-collapse for conversation overview
9. 🔢 **Perfect Numbering**: Intuitive conversational flow system
10. 🧠 **Mental Model Shift**: Rethink as conversation, not generic graph
11. 🚀 **Sonnet 4 Integration**: Claude's latest models with extended thinking
12. 🌡️ **Temperature Control**: Real-time creativity adjustment with metadata
13. 🔀 **Drag-to-Merge**: Sophisticated hierarchical branch merging
14. 🚫 **Branch Lifecycle**: Complete state management for closed branches
15. 🐛 **Production Polish**: Debug fixes, performance optimization, ghost branch prevention

**Key Evolution**: From simple linear chat → conversation-aware interface → sophisticated knowledge cartography tool with visual branch management. Each phase solved real complexity problems while maintaining intuitive user experience.**

## Roadmap Beyond MVPv0.2

**✅ Completed in MVPv0.2:**
- Graph visualization with Cytoscape.js DAG view
- Visual branch creation and drag-to-merge functionality  
- Advanced navigation between conversation threads
- Enhanced export with merge history and metadata

**🎯 Future Development:**
- **Enhanced Graph Features**: Node clustering, layout optimization, search/filter
- **Advanced Export/Import**: Full conversation map sharing with version control
- **Real-time Collaboration**: Multi-user exploration with live updates
- **AI Integration**: Multi-model conversations, custom prompts per branch
- **Search & Discovery**: Full-text search, topic clustering, smart suggestions
- **Mobile Optimization**: Touch-friendly graph interactions for tablets/phones

## Technical Specifications

### Current MVPv0.2 Status
- **Test Coverage**: 25+ core tests, all passing with drag-to-merge validation
- **Build Status**: Clean production builds with zero warnings
- **Performance**: Sub-2s API responses with dynamic timeout scaling (30s-3min)
- **Browser Support**: Modern browsers with localStorage and advanced CSS
- **API Compatibility**: Claude Sonnet 4, Opus 4, plus legacy 3.x models
- **Graph Performance**: Efficient rendering for 100+ node conversation trees

### Development Quality
- **Architecture**: Clean MVC with conversation-aware mental models
- **Testing**: Test-Driven Development with comprehensive coverage
- **Performance**: Optimized for complex branching scenarios
- **UX**: Intuitive drag-to-merge with visual feedback systems
- **Scalability**: Built for large conversation networks

---

## Status: ✅ **DAGGER MVPv0.2 - Advanced Beta with Drag-to-Merge**

**Sophisticated knowledge cartography tool ready for complex conversation exploration**

*Built with Test-Driven Development and sophisticated user experience design*

### Verification Commands
```bash
npm test          # Run all tests
npm run build     # Production build verification  
npm run dev:proxy & npm run dev  # Full system launch
```

**All systems operational. Ready for advanced conversational AI exploration.**
