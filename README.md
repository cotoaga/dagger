# 🗡️ DAGGER - Knowledge Cartography Tool

**Solving context bandwidth constraints in linear conversations through branching DAG visualization**

> "The real problem isn't AI capabilities—it's that linear chat hits context bandwidth limits. You need distributed cognition: branch, explore, then zoom back to your main thread without losing context."

## What is DAGGER?

DAGGER transforms how humans and AI explore ideas together. Instead of linear chat where tangents destroy your main thread, DAGGER lets you:

- **Branch**: Explore tangents without losing your main conversation
- **Navigate**: Jump between different exploration threads
- **Visualize**: See your conversation as a knowledge graph
- **Scale**: Handle complex multi-threaded discussions

## Quick Start

```bash
# Clone and setup
git clone [repo-url]
cd dagger
npm install

# Start both servers
npm run dev          # Frontend (port 5173/5174)
node api-server.js   # API proxy (port 3001)

# Run tests
npm test
```

1. Visit http://localhost:5173 (or 5174)
2. Enter your Anthropic Claude API key
3. Start exploring ideas with conversational flow:
   - `1>` Your first question
   - `>1` AI's response 
   - `2>` Your next question
   - `2.1>` Branch from question 2
   - `>2.1` AI responds to branch

## Features

### ✅ Conversational Flow
- **Perfect numbering**: `1> >1 2> >2 2.1> >2.1`
- **Auto-collapse**: Long content folds for forest view
- **Dark/Light modes**: Full theme support
- **Model selection**: Choose Claude Sonnet, Haiku, or Opus
- **Model tagging**: Responses tagged with generating model

### ✅ Professional UX
- **Auto-resize textarea**: Grows with content
- **Keyboard shortcuts**: ⌘+Enter to submit
- **Real-time stats**: Character, word, token counts
- **Copy to clipboard**: One-click response copying
- **Persistent storage**: Conversations survive browser restart

### ✅ Technical Excellence
- **Test-Driven Development**: 25+ passing tests
- **CORS handling**: Express proxy for API calls
- **Error handling**: Graceful API failures
- **UUID architecture**: Proper ID generation
- **Performance**: Sub-second response times

## Architecture

### Core Components

```
src/
├── models/
│   └── GraphModel.js          # Conversational graph with branching
├── services/
│   └── ClaudeAPI.js           # Anthropic API integration
├── components/
│   ├── DaggerInput.jsx        # Auto-resize input with shortcuts
│   ├── DaggerOutput.jsx       # Markdown + syntax highlighting
│   └── DaggerInputDisplay.jsx # Past conversation display
└── App.jsx                    # Main application orchestration
```

### Conversation Mental Model

DAGGER thinks in **conversational turns**, not generic nodes:

```javascript
// User actions
graph.addPromptNode(content)           // Start conversation: 1>
graph.addNextPrompt(content)           // Continue main thread: 2>
graph.addBranchFromPrompt(id, content) // Explore tangent: 2.1>

// AI actions  
graph.addResponseToPrompt(id, content) // Respond: >1, >2, >2.1
```

## The Journey

This implementation demonstrates the exact problem DAGGER solves:

**Linear Development Path:**
1. 📋 Read `claude-instructions.md` specifications
2. 🏗️ Setup React + Vite + TDD environment
3. 🔧 Fix UUID generation bug (the first major issue)
4. 🌐 Build ClaudeAPI service with CORS proxy
5. 🎨 Create DaggerInput/Output components
6. 🌙 Add dark mode support and model selection
7. 📊 Implement model tagging and CSS fixes
8. 📁 Add collapse/expand for better UX
9. 🔢 Perfect conversational numbering system
10. 🧠 **KHAOS-Coder intervention**: Rethink as conversation, not graph
11. ✅ Rebuild with conversation-aware TDD

**Key Insight**: We got lost in "generic graph thinking" until we stepped back and modeled the **human conversation mental model**. This is exactly why DAGGER is needed - to prevent getting lost in implementation weeds!

## Next Phase

- **Graph Visualization**: Cytoscape.js DAG view
- **Branching UI**: Visual branch creation from any node
- **Navigation**: Jump between conversation threads
- **Export**: Share conversation maps
- **Collaboration**: Multi-user exploration

## Development Notes

- **Test Coverage**: 25+ tests, all passing
- **Build Status**: Clean, no warnings
- **Performance**: ~2s API responses via proxy
- **Browser Support**: Modern browsers with localStorage
- **API Compatibility**: Anthropic Claude (all models)

---

**Status**: ✅ Core conversational interface complete and battle-tested

*Built with Test-Driven Development by KHAOS-Coder methodology*
