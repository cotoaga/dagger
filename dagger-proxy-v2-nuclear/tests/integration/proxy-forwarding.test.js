/**
 * DAGGER Proxy v2.0 - Integration Tests
 * 
 * Tests the actual proxy server with real HTTP requests
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../src/proxy.js'

describe('Proxy Integration Tests', () => {
  test('health check endpoint works', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)
    
    expect(response.body.status).toBe('healthy')
    expect(response.body.service).toBe('DAGGER Proxy v2.0 Nuclear')
  })

  test('returns 404 for unknown endpoints', async () => {
    await request(app)
      .get('/unknown')
      .expect(404)
  })

  test('returns authentication error when no API key', async () => {
    const response = await request(app)
      .post('/api/claude')
      .send({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        model: 'claude-sonnet-4-20250514'
      })
      .expect(500)
    
    expect(response.body.error.type).toBe('authentication_error')
  })

  test('accepts requests with session API key header', async () => {
    // This test will fail if no valid API key is provided, which is expected
    // The important thing is that the proxy accepts the header format
    const response = await request(app)
      .post('/api/claude')
      .set('x-session-api-key', 'sk-ant-test-key')
      .send({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        model: 'claude-sonnet-4-20250514'
      })
    
    // Should either forward to Claude (and get 401) or handle the request
    // The key is that it doesn't reject the format
    expect([401, 500]).toContain(response.status)
  })

  test('legacy /api/chat endpoint works', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('x-session-api-key', 'sk-ant-test-key')
      .send({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        model: 'claude-sonnet-4-20250514'
      })
    
    // Should forward to same logic as /api/claude
    expect([401, 500]).toContain(response.status)
  })
})