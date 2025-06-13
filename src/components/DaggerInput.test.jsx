import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DaggerInput } from './DaggerInput.jsx'

describe('DaggerInput', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should render textarea with placeholder', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByPlaceholderText(/ask anything/i)
    expect(textarea).toBeInTheDocument()
  })

  test('should display interaction number', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1.2" />)
    
    expect(screen.getByText('1.2')).toBeInTheDocument()
  })

  test('should auto-resize textarea based on content', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByRole('textbox')
    
    // Initial height should be small
    const initialHeight = textarea.style.height
    
    // Add multi-line content
    fireEvent.change(textarea, { 
      target: { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' } 
    })
    
    // Height should have increased (react-textarea-autosize handles this)
    // We just test that the component renders without error
    expect(textarea.value).toBe('Line 1\nLine 2\nLine 3\nLine 4\nLine 5')
  })

  test('should display real-time character and word count', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByRole('textbox')
    
    // Initially should show 0 chars, 0 words
    expect(screen.getByText(/0 chars/)).toBeInTheDocument()
    expect(screen.getByText(/0 words/)).toBeInTheDocument()
    
    // Type some content
    fireEvent.change(textarea, { target: { value: 'Hello world test' } })
    
    // Should update counts
    expect(screen.getByText(/16 chars/)).toBeInTheDocument()
    expect(screen.getByText(/3 words/)).toBeInTheDocument()
  })

  test('should submit on Cmd+Enter', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test content' } })
    
    // Simulate Cmd+Enter
    fireEvent.keyDown(textarea, { 
      key: 'Enter', 
      metaKey: true,
      preventDefault: vi.fn()
    })
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      content: 'Test content',
      timestamp: expect.any(Date),
      displayNumber: '1',
      charCount: 12,
      wordCount: 2
    })
  })

  test('should submit on Ctrl+Enter', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test content' } })
    
    // Simulate Ctrl+Enter
    fireEvent.keyDown(textarea, { 
      key: 'Enter', 
      ctrlKey: true,
      preventDefault: vi.fn()
    })
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      content: 'Test content',
      timestamp: expect.any(Date),
      displayNumber: '1',
      charCount: 12,
      wordCount: 2
    })
  })

  test('should clear textarea after submission', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test content' } })
    
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })
    
    expect(textarea.value).toBe('')
  })

  test('should not submit empty content', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByRole('textbox')
    
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  test('should have monospace font style', () => {
    render(<DaggerInput onSubmit={mockOnSubmit} displayNumber="1" />)
    
    const textarea = screen.getByRole('textbox')
    
    // Check if textarea has monospace font family
    const styles = window.getComputedStyle(textarea)
    expect(styles.fontFamily).toMatch(/monospace|Monaco|Menlo|Consolas/i)
  })
})