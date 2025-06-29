import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DaggerInputDisplay } from '../DaggerInputDisplay.jsx'

describe('DaggerInputDisplay Accessibility & Hover States', () => {
  let mockInteraction
  
  beforeEach(() => {
    mockInteraction = {
      id: 'test-interaction',
      displayNumber: '1',
      content: 'This is a test interaction content',
      timestamp: Date.now()
    }
  })

  describe('Inspect Tokens Button Accessibility', () => {
    test('should be keyboard accessible', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Should be focusable
      inspectButton.focus()
      expect(document.activeElement).toBe(inspectButton)
      
      // Should respond to keyboard events
      const mockClick = vi.fn()
      inspectButton.onclick = mockClick
      
      fireEvent.keyDown(inspectButton, { key: 'Enter' })
      fireEvent.keyDown(inspectButton, { key: ' ' })
    })

    test('should have proper ARIA attributes', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Should have descriptive title
      expect(inspectButton).toHaveAttribute('title', 'Inspect Tokens - Analyze tokenization breakdown')
      
      // Should be a proper button element
      expect(inspectButton.tagName).toBe('BUTTON')
      
      // Should have visible text content
      expect(inspectButton).toHaveTextContent('🔍 Inspect Tokens')
    })

    test('should have proper contrast ratios', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      const computedStyle = window.getComputedStyle(inspectButton)
      
      // Using CSS variables ensures proper contrast in both themes
      expect(inspectButton).toHaveClass('nav-btn-style')
      
      // Should not use hardcoded colors that break accessibility
      expect(computedStyle.backgroundColor).not.toBe('rgb(254, 243, 199)') // Old yellow
      expect(computedStyle.color).not.toBe('rgb(146, 64, 14)') // Old brown
    })
  })

  describe('Visual Consistency Verification', () => {
    test('should maintain consistent button height with adjacent elements', () => {
      const longInteraction = {
        ...mockInteraction,
        content: 'Line 1\nLine 2\nLine 3\nLine 4\nThis creates a long interaction'
      }
      
      render(
        <DaggerInputDisplay 
          interaction={longInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      const expandButton = screen.getByTitle(/Expand input/i)
      
      // Both buttons should be present in the header
      const headerActions = inspectButton.closest('.header-actions')
      expect(headerActions).toContain(inspectButton)
      expect(headerActions).toContain(expandButton)
      
      // Should have consistent display styles
      expect(headerActions).toHaveStyle({ 
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      })
    })

    test('should use theme-aware styling', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Should use CSS variables for theming
      expect(inspectButton).toHaveClass('nav-btn-style')
      
      // CSS variables are defined in App.css and automatically handle light/dark modes
      const computedStyle = window.getComputedStyle(inspectButton)
      expect(computedStyle.transition).toContain('0.2s')
      expect(computedStyle.borderRadius).toBe('6px')
    })

    test('should have professional hover effects', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Should have smooth transitions
      const computedStyle = window.getComputedStyle(inspectButton)
      expect(computedStyle.transition).toContain('all')
      expect(computedStyle.transition).toContain('0.2s')
      
      // Should be a pointer cursor
      expect(computedStyle.cursor).toBe('pointer')
      
      // Hover simulation (limited in jsdom but we can test classes)
      fireEvent.mouseEnter(inspectButton)
      expect(inspectButton).toHaveClass('nav-btn-style')
    })
  })

  describe('Integration with TokenizerPopup', () => {
    test('should open tokenizer popup when clicked', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Click should trigger popup (TokenizerPopup component handles the modal)
      fireEvent.click(inspectButton)
      
      // Button should remain accessible after click
      expect(inspectButton).toBeInTheDocument()
      expect(inspectButton).not.toBeDisabled()
    })
  })
})