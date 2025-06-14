# DAGGER Fork Implementation - Linear Mode + UI Polish 🗡️

## Objective
Add conversation forking in Linear mode with clean UI updates. When users click "Fork ➡️" they can create branches from any conversation.

## Task 1: Add Fork Button to Linear View

### File: Update conversation display in Linear mode

Find the conversation item display in your Linear view and add the fork button:

```jsx
// In the Linear view conversation display
<div className="conversation-item">
  {/* Existing conversation number and content */}
  <div className="conversation-header">
    <span className="conversation-number">{conv.displayNumber}></span>
    <span className="conversation-timestamp">{formatTime(conv.timestamp)}</span>
  </div>
  
  <div className="conversation-content">
    {/* Existing prompt and response display */}
  </div>
  
  {/* Conversation Actions */}
  <div className="conversation-actions">
    <button 
      className="action-btn copy-btn"
      onClick={() => copyConversation(conv)}
      title="Copy conversation"
    >
      📋 Copy
    </button>
    
    <button 
      className="action-btn fork-btn"
      onClick={() => handleForkConversation(conv.id)}
      title="Create branch from this conversation"
    >
      Fork ➡️
    </button>
  </div>
</div>
```

## Task 2: Add Fork Handler to App.jsx

Add fork functionality to the main App component:

```javascript
// Add to App.jsx state
const [showForkMenu, setShowForkMenu] = useState(false);
const [forkSourceId, setForkSourceId] = useState(null);

// Add fork handler
const handleForkConversation = (conversationId) => {
  const conversation = graphModel.getConversation(conversationId);
  console.log(`🍴 Fork conversation ${conversation.displayNumber}: ${conversation.prompt}`);
  
  setForkSourceId(conversationId);
  setShowForkMenu(true);
};

// Add fork creation handler (simplified for now)
const handleCreateFork = async (sourceId, branchType) => {
  try {
    console.log(`Creating ${branchType} fork from conversation ${sourceId}`);
    
    // For now, just create a simple branch indicator
    // Later this will create actual branch conversations
    alert(`🍴 ${branchType} branch created from conversation ${sourceId}!\n(Full branching coming next)`);
    
    setShowForkMenu(false);
    setForkSourceId(null);
    
  } catch (error) {
    console.error('Fork creation failed:', error);
    alert(`Failed to create fork: ${error.message}`);
  }
};

// Add copy conversation handler
const copyConversation = (conversation) => {
  const text = `**Conversation ${conversation.displayNumber}**\n\n**Prompt:** ${conversation.prompt}\n\n**Response:** ${conversation.response}`;
  
  navigator.clipboard.writeText(text).then(() => {
    console.log(`📋 Copied conversation ${conversation.displayNumber}`);
    // Optional: show brief success message
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
};
```

## Task 3: Create Simple Fork Menu Component

Create new file `src/components/ForkMenu.jsx`:

```jsx
/**
 * ForkMenu - Simple branch type selector
 * Shows when user clicks Fork button in Linear mode
 */
export function ForkMenu({ sourceConversationId, onCreateFork, onClose }) {
  const [selectedType, setSelectedType] = useState('knowledge');

  const branchTypes = [
    {
      type: 'virgin',
      emoji: '🌱',
      title: 'Virgin Branch',
      description: 'Fresh start, no context inheritance'
    },
    {
      type: 'personality', 
      emoji: '🎭',
      title: 'Personality Branch',
      description: 'KHAOS-Coder loaded, no conversation history'
    },
    {
      type: 'knowledge',
      emoji: '🧠', 
      title: 'Knowledge Branch',
      description: 'Full context with conversation history'
    }
  ];

  const handleCreate = () => {
    onCreateFork(sourceConversationId, selectedType);
  };

  return (
    <div className="fork-menu-overlay" onClick={onClose}>
      <div className="fork-menu" onClick={e => e.stopPropagation()}>
        <h3>🍴 Create Branch from Conversation {sourceConversationId}</h3>
        
        <div className="branch-types">
          {branchTypes.map(branch => (
            <label key={branch.type} className={selectedType === branch.type ? 'selected' : ''}>
              <input 
                type="radio" 
                value={branch.type}
                checked={selectedType === branch.type}
                onChange={e => setSelectedType(e.target.value)}
              />
              <div className="branch-option">
                <div className="branch-header">
                  <span className="branch-emoji">{branch.emoji}</span>
                  <strong>{branch.title}</strong>
                </div>
                <p>{branch.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="fork-actions">
          <button onClick={handleCreate} className="create-fork-btn">
            Create {selectedType} Branch
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Task 4: Import and Use ForkMenu in App.jsx

Add to App.jsx:

```javascript
// Add import
import { ForkMenu } from './components/ForkMenu.jsx';

// Add to JSX render (after main content)
{showForkMenu && (
  <ForkMenu
    sourceConversationId={forkSourceId}
    onCreateFork={handleCreateFork}
    onClose={() => {
      setShowForkMenu(false);
      setForkSourceId(null);
    }}
  />
)}
```

## Task 5: Update Header Button Labels

In the header actions, update button labels:

```jsx
<div className="header-actions">
  <button onClick={handleExport}>📥 Export</button>
  <button onClick={handleReset} style={{color: 'red'}}>🔥 Reset All</button>
</div>
```

## Task 6: Add CSS for Fork Interface

Add to `App.css`:

```css
/* Conversation Actions */
.conversation-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #4a5568;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #4a5568;
  background: transparent;
  color: #a0aec0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #4a5568;
  color: #e2e8f0;
}

.fork-btn:hover {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

.copy-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* Fork Menu */
.fork-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.fork-menu {
  background: #2d3748;
  border: 2px solid #4a5568;
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  color: #e2e8f0;
}

.fork-menu h3 {
  margin: 0 0 20px 0;
  text-align: center;
}

.branch-types {
  margin: 16px 0;
}

.branch-types label {
  display: block;
  margin: 8px 0;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.branch-types label.selected .branch-option {
  background: #1a202c;
  border-color: #f59e0b;
}

.branch-option {
  border: 2px solid #4a5568;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
}

.branch-option:hover {
  border-color: #63b3ed;
  background: #1a202c;
}

.branch-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.branch-emoji {
  font-size: 18px;
}

.branch-option p {
  margin: 0;
  font-size: 14px;
  color: #a0aec0;
}

.fork-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.create-fork-btn {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.create-fork-btn:hover {
  background: #d97706;
}

.cancel-btn {
  background: transparent;
  color: #a0aec0;
  border: 1px solid #4a5568;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #4a5568;
}

/* Hide radio buttons in fork menu */
.branch-types input[type="radio"] {
  display: none;
}
```

## Expected Behavior After Implementation

### Linear View Changes:
1. **Each conversation** shows "📋 Copy" and "Fork ➡️" buttons
2. **Copy button** copies conversation text to clipboard
3. **Fork button** opens branch selection modal

### Fork Flow:
1. **Click "Fork ➡️"** → Modal opens with branch type options
2. **Select branch type** → Virgin/Personality/Knowledge options
3. **Click "Create [type] Branch"** → Shows success message (for now)
4. **Modal closes** → Ready for next fork

### UI Polish:
1. **Export button** shows "📥 Export" instead of "📥 Export Clean"
2. **Copy button** has emoji for consistency
3. **Fork button** uses arrow emoji for action clarity

## Testing Steps

1. **Add conversations** in Linear mode
2. **Test copy button** - should copy to clipboard
3. **Test fork button** - should open modal
4. **Test branch selection** - should show different types
5. **Test modal actions** - create and cancel should work
6. **Verify UI polish** - emojis and labels correct

**This creates the forking interface foundation. The next chunk will implement actual branch creation in the data model.** 🗡️