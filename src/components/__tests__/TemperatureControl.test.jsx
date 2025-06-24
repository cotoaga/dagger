import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TemperatureControl from '../TemperatureControl.jsx'

describe('TemperatureControl Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should render temperature slider with default value', () => {
    // ARRANGE
    const mockOnChange = vi.fn()
    const defaultTemp = 0.7
    
    // ACT
    render(<TemperatureControl value={defaultTemp} onChange={mockOnChange} />)
    
    // ASSERT
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider.value).toBe('0.7')
  })

  test('should call onChange when slider value changes', () => {
    // ARRANGE
    const mockOnChange = vi.fn()
    render(<TemperatureControl value={0.7} onChange={mockOnChange} />)
    
    // ACT
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '0.5' } })
    
    // ASSERT
    expect(mockOnChange).toHaveBeenCalledWith(0.5)
  })

  test('should display temperature value as percentage', () => {
    // ARRANGE & ACT
    render(<TemperatureControl value={0.8} onChange={() => {}} />)
    
    // ASSERT
    expect(screen.getByText(/80%/)).toBeInTheDocument()
  })

  test('should display "Focused" label for low temperature', () => {
    // ARRANGE & ACT
    render(<TemperatureControl value={0.1} onChange={() => {}} />)
    
    // ASSERT
    expect(screen.getByText(/focused/i)).toBeInTheDocument()
  })

  test('should display "Creative" label for high temperature', () => {
    // ARRANGE & ACT
    render(<TemperatureControl value={1.0} onChange={() => {}} />)
    
    // ASSERT
    expect(screen.getByText(/creative/i)).toBeInTheDocument()
  })

  test('should have temperature-control test id', () => {
    // ARRANGE & ACT
    render(<TemperatureControl value={0.7} onChange={() => {}} />)
    
    // ASSERT
    expect(screen.getByTestId('temperature-control')).toBeInTheDocument()
  })

  test('should handle edge case values', () => {
    // ARRANGE
    const mockOnChange = vi.fn()
    render(<TemperatureControl value={0.7} onChange={mockOnChange} />)
    
    // ACT - Test minimum value
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '0.1' } })
    
    // ASSERT
    expect(mockOnChange).toHaveBeenCalledWith(0.1)
    
    // ACT - Test maximum value
    fireEvent.change(slider, { target: { value: '1.0' } })
    
    // ASSERT
    expect(mockOnChange).toHaveBeenCalledWith(1.0)
  })

  test('should display proper range (0.1 to 1.0)', () => {
    // ARRANGE & ACT
    render(<TemperatureControl value={0.7} onChange={() => {}} />)
    
    // ASSERT
    const slider = screen.getByRole('slider')
    expect(slider.min).toBe('0.1')
    expect(slider.max).toBe('1.0')
    expect(slider.step).toBe('0.1')
  })
})