import React from 'react'

const TemperatureControl = ({ value = 0.7, onChange }) => {
  const handleSliderChange = (event) => {
    const newValue = parseFloat(event.target.value)
    onChange(newValue)
  }

  const percentage = Math.round(value * 100)
  
  // Determine creativity label based on temperature
  const getCreativityLabel = (temp) => {
    if (temp <= 0.3) return 'Focused'
    if (temp >= 0.9) return 'Creative'
    return `${percentage}%`
  }

  return (
    <div className="temperature-control" data-testid="temperature-control">
      <label htmlFor="temperature-slider">
        Creativity: {getCreativityLabel(value)}
      </label>
      <input
        id="temperature-slider"
        type="range"
        min="0.1"
        max="1.0"
        step="0.1"
        value={value}
        onChange={handleSliderChange}
        className="temperature-slider"
      />
    </div>
  )
}

export default TemperatureControl