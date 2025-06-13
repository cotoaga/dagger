import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DaggerOutput } from './DaggerOutput.jsx'

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

describe('DaggerOutput', () => {
  const mockResponse = {
    content: '# Test Response\n\nThis is a **markdown** response with:\n\n```javascript\nconsole.log("code block")\n```\n\nAnd some regular text.',
    inputTokens: 10,
    outputTokens: 25,
    totalTokens: 35,
    timestamp: new Date('2024-01-01T10:00:00Z'),
    processingTimeMs: 1500
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should render markdown content with syntax highlighting', () => {
    render(<DaggerOutput response={mockResponse} displayNumber="1" />)
    
    // Check for markdown elements
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Response')
    expect(screen.getByText('markdown')).toBeInTheDocument()
    // Check for code content (syntax highlighter breaks it into spans)
    expect(screen.getByText('console')).toBeInTheDocument()
    expect(screen.getByText('log')).toBeInTheDocument()
    expect(screen.getByText('"code block"')).toBeInTheDocument()
  })

  test('should display processing metadata', () => {
    render(<DaggerOutput response={mockResponse} displayNumber="1" />)
    
    expect(screen.getByText(/1\.5s/)).toBeInTheDocument() // processing time
    expect(screen.getByText(/35 tokens/)).toBeInTheDocument() // total tokens
    expect(screen.getByText(/123 chars/)).toBeInTheDocument() // character count (actual length)
  })

  test('should display timestamp', () => {
    render(<DaggerOutput response={mockResponse} displayNumber="1" />)
    
    // Should display formatted timestamp (may include time)
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument()
  })

  test('should copy content to clipboard when copy button clicked', async () => {
    render(<DaggerOutput response={mockResponse} displayNumber="1" />)
    
    const copyButton = screen.getByText(/copy/i)
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockResponse.content)
    })
  })

  test('should show copy success feedback', async () => {
    render(<DaggerOutput response={mockResponse} displayNumber="1" />)
    
    const copyButton = screen.getByText(/copy/i)
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeInTheDocument()
    })
    
    // Should revert back to "Copy" after timeout
    await waitFor(() => {
      expect(screen.getByText(/copy/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should handle copy failure gracefully', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Copy failed'))
    
    render(<DaggerOutput response={mockResponse} displayNumber="1" />)
    
    const copyButton = screen.getByText(/copy/i)
    fireEvent.click(copyButton)
    
    // Should not crash and should still show button
    await waitFor(() => {
      expect(screen.getByText(/copy/i)).toBeInTheDocument()
    })
  })

  test('should display response metadata in footer', () => {
    render(<DaggerOutput response={mockResponse} displayNumber="1" />)
    
    const wordCount = mockResponse.content.trim().split(/\s+/).length
    
    expect(screen.getByText(new RegExp(`${mockResponse.content.length} chars`))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${wordCount} words`))).toBeInTheDocument()
    expect(screen.getByText(/35 tokens/)).toBeInTheDocument()
  })

  test('should show loading state when content is being processed', () => {
    render(<DaggerOutput response={null} displayNumber="1" isLoading={true} />)
    
    expect(screen.getByText(/thinking/i)).toBeInTheDocument()
  })

  test('should handle empty or null response gracefully', () => {
    render(<DaggerOutput response={null} displayNumber="1" />)
    
    // Should render without crashing
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})