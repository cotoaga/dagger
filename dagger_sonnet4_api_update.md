# DAGGER Sonnet 4 API Integration - Dogfooding the Latest 🚀

## Objective
Update DAGGER to use Claude Sonnet 4 instead of the outdated 3.5 model. Time to eat our own dogfood with the best AI available!

## Current API Model Names (From Anthropic Docs)

### Claude 4 Family Available Models:
- **Claude Sonnet 4**: `claude-sonnet-4-20250514` 
- **Claude Opus 4**: `claude-opus-4-20250514`

### Current DAGGER Model (Outdated):
- **Claude 3.5 Sonnet**: `claude-3-5-sonnet-20241022`

## Task 1: Update ClaudeAPI.js Model Configuration

Find `src/services/ClaudeAPI.js` and update the model configuration:

```javascript
// FIND this configuration and UPDATE:
const API_CONFIG = {
  baseURL: 'https://api.anthropic.com/v1/messages',
  
  // CHANGE FROM:
  model: 'claude-3-5-sonnet-20241022',
  
  // TO:
  model: 'claude-sonnet-4-20250514',
  
  // Keep existing settings:
  max_tokens: 4000,
  temperature: 0.7
};
```

### Alternative: Add Model Selection

For flexibility, allow both models:

```javascript
// BETTER: Add model selection capability
const AVAILABLE_MODELS = {
  'sonnet-4': 'claude-sonnet-4-20250514',
  'opus-4': 'claude-opus-4-20250514',
  'sonnet-3.5': 'claude-3-5-sonnet-20241022' // Fallback
};

class ClaudeAPI {
  constructor() {
    this.currentModel = 'sonnet-4'; // Default to Sonnet 4
  }
  
  setModel(modelKey) {
    if (AVAILABLE_MODELS[modelKey]) {
      this.currentModel = modelKey;
      console.log(`🔄 Switched to ${modelKey}: ${AVAILABLE_MODELS[modelKey]}`);
    }
  }
  
  async generateResponse(prompt, options = {}) {
    const modelName = AVAILABLE_MODELS[this.currentModel];
    
    const requestBody = {
      model: modelName,
      max_tokens: options.max_tokens || 4000,
      temperature: options.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    console.log(`🤖 Using model: ${modelName}`);
    
    // ... rest of API call logic
  }
}
```

## Task 2: Update Model Dropdown in UI

Find the model selection dropdown in the header and update options:

```jsx
// FIND model selection dropdown and UPDATE:
<select value={selectedModel} onChange={handleModelChange}>
  <option value="sonnet-4">Claude Sonnet 4</option>
  <option value="opus-4">Claude Opus 4</option>
  <option value="sonnet-3.5">Claude 3.5 Sonnet (Legacy)</option>
</select>
```

### Add Model Change Handler

```javascript
// ADD to App.jsx:
const [selectedModel, setSelectedModel] = useState('sonnet-4');

const handleModelChange = (event) => {
  const newModel = event.target.value;
  setSelectedModel(newModel);
  
  // Update ClaudeAPI instance
  ClaudeAPI.setModel(newModel);
  
  console.log(`🔄 Switched to ${newModel}`);
};
```

## Task 3: Update Conversation Metadata Display

Update the model display in conversation metadata:

```jsx
// UPDATE conversation metadata to show full model name:
<div className="conversation-metadata">
  <span>{conv.processingTime}ms</span>
  <span>{conv.tokenCount} tokens</span>
  <span>
    {conv.model === 'claude-sonnet-4-20250514' ? '🧠 Sonnet 4' :
     conv.model === 'claude-opus-4-20250514' ? '🚀 Opus 4' :
     conv.model === 'claude-3-5-sonnet-20241022' ? '⚙️ Sonnet 3.5' :
     conv.model}
  </span>
</div>
```

## Task 4: Add Extended Thinking Support (Sonnet 4 Feature)

Claude Sonnet 4 supports extended thinking mode. Add beta header support:

```javascript
// UPDATE ClaudeAPI.js to support extended thinking:
async generateResponse(prompt, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': this.apiKey,
    'anthropic-version': '2023-06-01'
  };
  
  // ADD: Extended thinking support for Sonnet 4
  if (this.currentModel === 'sonnet-4' && options.extendedThinking) {
    headers['interleaved-thinking-2025-05-14'] = 'true';
    console.log('🧠 Extended thinking mode enabled');
  }
  
  const requestBody = {
    model: AVAILABLE_MODELS[this.currentModel],
    max_tokens: options.max_tokens || 4000,
    temperature: options.temperature || 0.7,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };
  
  // ... rest of API call
}
```

### Add Extended Thinking Toggle

```jsx
// ADD extended thinking toggle for Sonnet 4
{selectedModel === 'sonnet-4' && (
  <label className="extended-thinking-toggle">
    <input 
      type="checkbox" 
      checked={extendedThinking}
      onChange={e => setExtendedThinking(e.target.checked)}
    />
    🧠 Extended Thinking
  </label>
)}
```

## Task 5: Update Branch API Calls for Different Models

Different models for different branch types:

```javascript
// UPDATE branch creation to use appropriate models:
const handleCreateFork = async (sourceId, branchType) => {
  let branchModel;
  
  switch (branchType) {
    case 'virgin':
      branchModel = 'sonnet-4'; // Fresh conversations
      break;
    case 'personality':
      branchModel = 'sonnet-4'; // Personality + efficiency
      break;
    case 'knowledge':
      branchModel = 'opus-4';   // Complex context processing
      break;
    default:
      branchModel = selectedModel;
  }
  
  console.log(`🍴 Creating ${branchType} branch with ${branchModel}`);
  
  const newBranch = graphModel.createBranch(sourceId, branchType);
  
  // Set branch-specific model
  newBranch.preferredModel = branchModel;
  
  // ... rest of fork creation
};
```

## Task 6: Add Model Performance Indicators

Show model capabilities in UI:

```css
/* ADD model indicator styles */
.model-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
}

.model-sonnet-4 {
  background: #10b981;
  color: white;
}

.model-opus-4 {
  background: #f59e0b;
  color: white;
}

.model-sonnet-3-5 {
  background: #6b7280;
  color: white;
}
```

```jsx
// ADD model indicators to conversations:
<div className="conversation-header">
  <span className="conversation-number">{conv.displayNumber}</span>
  <span className={`model-indicator model-${getModelClass(conv.model)}`}>
    {getModelDisplayName(conv.model)}
  </span>
  <span className="conversation-timestamp">{formatTime(conv.timestamp)}</span>
</div>
```

## Task 7: Update Export Format

Include model information in exports:

```javascript
// UPDATE exportToMarkdown in GraphModel.js:
exportToMarkdown() {
  // ... existing code
  
  conversations.forEach((conv, index) => {
    markdown += `## ${conv.displayNumber}. Conversation\n`;
    markdown += `**Model:** ${getModelDisplayName(conv.model)}\n`;
    markdown += `**Timestamp:** ${new Date(conv.timestamp).toLocaleString()}\n\n`;
    
    // ... rest of export
  });
}
```

## Success Criteria

✅ **Sonnet 4 as default model**: New conversations use `claude-sonnet-4-20250514`  
✅ **Model selection working**: Can switch between Sonnet 4, Opus 4, legacy 3.5  
✅ **Extended thinking support**: Toggle for Sonnet 4's advanced reasoning  
✅ **Branch-specific models**: Knowledge branches use Opus 4, others use Sonnet 4  
✅ **Model indicators**: Clear visual indication of which model was used  
✅ **Export includes model**: Markdown exports show model information  

## Testing Steps

1. **Create new conversation**: Should use Sonnet 4 by default
2. **Switch models**: Dropdown should change API calls
3. **Test extended thinking**: Enable toggle, verify API headers
4. **Create branches**: Different branch types should use appropriate models
5. **Check metadata**: Conversations should show model used
6. **Export test**: Export should include model information

## Expected Results

**Console should show:**
```
🤖 Using model: claude-sonnet-4-20250514
🧠 Extended thinking mode enabled
🍴 Creating knowledge branch with opus-4
✅ Response from Sonnet 4 in 3.2s
```

**UI should display:**
- **Model selection**: "Claude Sonnet 4" selected by default
- **Conversation metadata**: "🧠 Sonnet 4" indicators
- **Extended thinking toggle**: Available for Sonnet 4
- **Better responses**: Improved quality from latest model

**This upgrades DAGGER to use the cutting-edge Sonnet 4 for superior performance!** 🚀

**Time to dogfood the latest and greatest AI in our thinking tool!** 🗡️