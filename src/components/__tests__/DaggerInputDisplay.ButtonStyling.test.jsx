import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DaggerInputDisplay } from '../DaggerInputDisplay.jsx'

describe('DaggerInputDisplay Button Styling', () => {
  let mockInteraction
  
  beforeEach(() => {
    mockInteraction = {
      id: 'test-interaction',
      displayNumber: '1',
      content: 'This is a test interaction content',
      timestamp: Date.now()
    }
  })

  describe('Inspect Tokens Button Styling', () => {
    test('should have professional grey background with white text', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      expect(inspectButton).toBeInTheDocument()
      
      // Should use the nav-btn-style class instead of the yellow tokenizer-btn
      expect(inspectButton).toHaveClass('action-btn')
      expect(inspectButton).toHaveClass('nav-btn-style')
      
      // Should NOT have the yellow/brown styling
      expect(inspectButton).not.toHaveClass('tokenizer-btn')
    })

    test('should match visual weight of navigation buttons', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Should have consistent padding and spacing with nav buttons
      const computedStyle = window.getComputedStyle(inspectButton)
      expect(computedStyle.padding).toBe('8px 12px')
      expect(computedStyle.borderRadius).toBe('6px')
      expect(computedStyle.fontSize).toBe('0.85em')
    })

    test('should have proper hover states', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Should have hover transition
      const computedStyle = window.getComputedStyle(inspectButton)
      expect(computedStyle.transition).toContain('0.2s')
      expect(computedStyle.cursor).toBe('pointer')
    })

    test('should maintain accessibility standards', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // Should have proper ARIA attributes and tooltip
      expect(inspectButton).toHaveAttribute('title', expect.stringContaining('Inspect Tokens'))
      expect(inspectButton).toHaveTextContent('🔍 Inspect Tokens')
      
      // Should be keyboard accessible
      expect(inspectButton).not.toHaveAttribute('tabindex', '-1')
    })

    test('should use CSS variables for theming compatibility', () => {
      render(
        <DaggerInputDisplay 
          interaction={mockInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const inspectButton = screen.getByTitle(/Inspect Tokens/i)
      
      // The button should use CSS variables that work in both light and dark modes
      expect(inspectButton).toHaveClass('nav-btn-style')
      
      // Should not use hardcoded colors that break theming
      const computedStyle = window.getComputedStyle(inspectButton)
      expect(computedStyle.backgroundColor).not.toBe('rgb(254, 243, 199)') // Old yellow color
      expect(computedStyle.color).not.toBe('rgb(146, 64, 14)') // Old brown text
    })
  })

  describe('Button Consistency', () => {
    test('should align with other action buttons in header', () => {
      // Create a long interaction to ensure both Inspect Tokens and Expand buttons appear
      const longInteraction = {
        ...mockInteraction,
        content: 'Line 1\nLine 2\nLine 3\nLine 4\nThis is a long interaction'
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
      
      // Both buttons should be present and consistently styled
      expect(inspectButton).toBeInTheDocument()
      expect(expandButton).toBeInTheDocument()
      
      // Should have consistent gap in header-actions
      const headerActions = inspectButton.closest('.header-actions')
      expect(headerActions).toHaveStyle({ gap: '8px' })
    })

    test('should not break existing collapse button styling', () => {
      const longInteraction = {
        ...mockInteraction,
        content: 'Line 1\nLine 2\nLine 3\nLine 4\nThis is a long interaction'
      }
      
      render(
        <DaggerInputDisplay 
          interaction={longInteraction}
          onCopy={vi.fn()}
          onFork={vi.fn()}
          showActions={true}
        />
      )

      const expandButton = screen.getByTitle(/Expand input/i)
      
      // Collapse button should retain its purple styling
      expect(expandButton).toHaveClass('input-collapse')
      expect(expandButton).toHaveTextContent('📖 Expand')
    })
  })
})