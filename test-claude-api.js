// Standalone test file for Claude API
// Run with: node test-claude-api.js

async function testClaudeAPI() {
  const minimalPayload = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Hello, just testing the API format.'
      }
    ]
  };
  
  console.log('🧪 Testing minimal Claude API request...');
  console.log('📦 Payload:', JSON.stringify(minimalPayload, null, 2));
  
  try {
    const response = await fetch('http://localhost:3001/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalPayload)
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📦 Raw response:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Success! Parsed response:', data);
      } catch (parseError) {
        console.log('⚠️ Response received but failed to parse as JSON:', parseError.message);
      }
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Add a second test with Sonnet 4
async function testClaudeAPI_Sonnet4() {
  const sonnet4Payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Hello from Sonnet 4 test.'
      }
    ]
  };
  
  console.log('\n🧪 Testing Sonnet 4 API request...');
  console.log('📦 Payload:', JSON.stringify(sonnet4Payload, null, 2));
  
  try {
    const response = await fetch('http://localhost:3001/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sonnet4Payload)
    });
    
    console.log('📡 Response status:', response.status);
    const responseText = await response.text();
    console.log('📦 Raw response:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Sonnet 4 Success! Parsed response:', data);
      } catch (parseError) {
        console.log('⚠️ Sonnet 4 response received but failed to parse as JSON:', parseError.message);
      }
    } else {
      console.log('❌ Sonnet 4 request failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Sonnet 4 test failed:', error);
  }
}

// Run tests
console.log('🚀 Starting Claude API tests...');
console.log('Make sure the proxy server is running: npm run dev:proxy\n');

testClaudeAPI()
  .then(() => testClaudeAPI_Sonnet4())
  .then(() => console.log('\n🏁 Tests completed'));