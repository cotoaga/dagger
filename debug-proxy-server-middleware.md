# EMERGENCY: Debug Proxy Server Middleware - The Forgotten Middle Layer

**SMOKING GUN IDENTIFIED**: Proxy server rejecting perfect Claude API payloads
**ROOT CAUSE HYPOTHESIS**: Forgotten middleware/validation layer in proxy breaking system messages
**EVIDENCE**: Frontend builds perfect payloads, proxy returns 400 Bad Request

---

## Strategic Analysis

**The Stinking Middle Layer Pattern**:
- ✅ **Frontend**: Builds perfect Claude API payloads
- ❌ **Proxy Server**: Has forgotten middleware that validates/transforms requests
- ✅ **Claude API**: Would accept the payloads if they reached it

**Classic Symptoms**:
- Virgin branches work (simple payloads pass middleware)
- Personality/Knowledge branches fail (complex payloads rejected by middleware)
- Perfect API payload format but 400 errors

---

## Step 1: Emergency Proxy Server Investigation

### 1.1: Check Proxy Server Logs

**File**: Check the terminal running `npm run dev:proxy`
**Look for**: Error messages when the 400 occurs

**What to Find**:
- Validation errors
- Middleware rejection messages
- Request transformation failures
- System message handling errors

### 1.2: Locate Proxy Server File

**File**: `dagger-api-proxy.js` (or similar proxy server file)
**Action**: Find the main proxy server implementation

**Add Immediate Logging**:
```javascript
// At the start of request handler
app.post('/api/claude', (req, res) => {
  console.log('🔍 PROXY: Incoming request');
  console.log('🔍 PROXY: Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 PROXY: Request headers:', req.headers);
  console.log('🔍 PROXY: Content-Type:', req.headers['content-type']);
  
  // ... rest of proxy logic
});
```

---

## Step 2: Find the Forgotten Middleware

### 2.1: Search for Request Validation

**Look for patterns like**:
```javascript
// Middleware that might be rejecting system messages
if (req.body.messages && req.body.messages[0].role === 'system') {
  return res.status(400).json({error: 'System messages not allowed'});
}

// Or validation that doesn't understand new format
if (!validateMessageFormat(req.body)) {
  return res.status(400).json({error: 'Invalid request format'});
}

// Or transformation that breaks system messages
req.body.messages = transformMessages(req.body.messages);
```

### 2.2: Check for Outdated API Format Handling

**Look for code that expects old format**:
```javascript
// OLD FORMAT (might be hardcoded in proxy)
{
  "prompt": "user input",
  "system": "system message"
}

// NEW FORMAT (what frontend is sending)
{
  "messages": [
    {"role": "system", "content": [...]},
    {"role": "user", "content": [...]}
  ]
}
```

### 2.3: Find Message Transformation Logic

**Look for**:
- Message array processing
- System message extraction/removal
- Format conversion between DAGGER and Claude API
- Any hardcoded message validation

---

## Step 3: Emergency Debugging Protocol

### 3.1: Add Comprehensive Proxy Logging

**File**: Proxy server main handler
**Add before any processing**:
```javascript
app.post('/api/claude', async (req, res) => {
  console.log('🚨 PROXY EMERGENCY DEBUG START');
  console.log('🚨 Timestamp:', new Date().toISOString());
  console.log('🚨 Request method:', req.method);
  console.log('🚨 Request path:', req.path);
  console.log('🚨 Content-Type:', req.headers['content-type']);
  console.log('🚨 Request body type:', typeof req.body);
  console.log('🚨 Request body:', JSON.stringify(req.body, null, 2));
  
  // Check for specific issues
  console.log('🚨 Has messages array:', !!req.body.messages);
  console.log('🚨 Messages length:', req.body.messages?.length);
  if (req.body.messages?.[0]) {
    console.log('🚨 First message role:', req.body.messages[0].role);
    console.log('🚨 First message content type:', typeof req.body.messages[0].content);
  }
  
  try {
    // Your existing proxy logic here
    console.log('🚨 About to forward to Claude API');
    
  } catch (error) {
    console.log('🚨 PROXY ERROR:', error.message);
    console.log('🚨 PROXY ERROR STACK:', error.stack);
    return res.status(400).json({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});
```

### 3.2: Find Hidden Validation Functions

**Search the proxy codebase for**:
- `validate`
- `transform` 
- `sanitize`
- `filter`
- `messages`
- `system`

**Look for functions that might be silently rejecting requests**

### 3.3: Check API Key and Headers

**Add API key debugging**:
```javascript
console.log('🚨 API Key present:', !!process.env.CLAUDE_API_KEY);
console.log('🚨 API Key length:', process.env.CLAUDE_API_KEY?.length);
console.log('🚨 Authorization header:', req.headers.authorization);
```

---

## Step 4: Common Middle Layer Issues

### 4.1: System Message Filtering

**BAD**: Proxy removes system messages
```javascript
// This would break personality branches
req.body.messages = req.body.messages.filter(msg => msg.role !== 'system');
```

**GOOD**: Proxy forwards all messages
```javascript
// System messages should be forwarded to Claude API
// Claude API handles system messages properly
```

### 4.2: Message Format Transformation

**BAD**: Proxy expects old format
```javascript
// Old DAGGER might have used this format
const claudeRequest = {
  prompt: req.body.prompt,
  system: req.body.system
};
```

**GOOD**: Proxy forwards new message array format
```javascript
// New format should be forwarded as-is
const claudeRequest = {
  model: req.body.model,
  messages: req.body.messages,
  max_tokens: req.body.max_tokens,
  temperature: req.body.temperature
};
```

### 4.3: Content Array Validation

**BAD**: Proxy doesn't understand content arrays
```javascript
// Might be checking for string content
if (typeof message.content !== 'string') {
  throw new Error('Invalid message format');
}
```

**GOOD**: Proxy handles Claude API content format
```javascript
// Claude API expects content as array of objects
// [{"type": "text", "text": "actual message"}]
```

---

## Step 5: Quick Test - Bypass Proxy

### 5.1: Test Direct API Call

**Create temporary test file**: `test-direct-api.js`
```javascript
const fetch = require('node-fetch');

const testPayload = {
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4000,
  "temperature": 0.7,
  "messages": [
    {
      "role": "system",
      "content": [{"type": "text", "text": "You are KHAOS..."}]
    },
    {
      "role": "user", 
      "content": [{"type": "text", "text": "Hello KHAOS, you are KHAOS, right?"}]
    }
  ]
};

fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify(testPayload)
})
.then(res => res.json())
.then(data => console.log('Direct API result:', data))
.catch(err => console.error('Direct API error:', err));
```

**Run**: `node test-direct-api.js`
**Expected**: If this works, the proxy is definitely the problem

---

## Step 6: Emergency Fix Protocol

### 6.1: If Validation is Broken

**Find and disable broken validation**:
```javascript
// Comment out problematic validation
/*
if (!isValidMessageFormat(req.body)) {
  return res.status(400).json({error: 'Invalid format'});
}
*/
```

### 6.2: If Transformation is Broken

**Find and fix message transformation**:
```javascript
// Ensure proxy forwards messages as-is
const claudeApiPayload = {
  ...req.body,  // Forward everything from frontend
  // Don't transform messages array
};
```

### 6.3: If Headers are Missing

**Add missing Claude API headers**:
```javascript
const claudeHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': process.env.CLAUDE_API_KEY,
  'anthropic-version': '2023-06-01'
};
```

---

## Success Criteria

### Immediate Success:
- ✅ **Proxy logs show incoming requests** clearly
- ✅ **No 400 errors from proxy** for valid payloads
- ✅ **Requests reach Claude API** successfully
- ✅ **System messages preserved** through proxy

### Feature Success:
- ✅ **Personality branches work** with system messages
- ✅ **Knowledge branches work** with context
- ✅ **All conversation types functional**

### Verification:
- ✅ **Proxy terminal shows success logs** instead of errors
- ✅ **Frontend gets Claude responses** instead of 400 errors
- ✅ **DAGGER fully functional** across all branch types

**Emergency Priority**: Find and fix the forgotten middleware that's rejecting perfect Claude API payloads.

**The middle layer is always the stinkiest layer!** 🦨