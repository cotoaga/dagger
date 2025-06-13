import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        secure: true,
        ws: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.log('❌ Proxy error:', err.message)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('🔄 Proxying:', req.method, req.url, '→', proxyReq.path)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('✅ Response:', proxyRes.statusCode, req.url)
          })
        }
      }
    }
  }
})
