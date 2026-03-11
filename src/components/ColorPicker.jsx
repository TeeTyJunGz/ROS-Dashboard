import React, { useState } from 'react'
import './ColorPicker.css'

/**
 * Color Picker Component
 * Shows preset palette + hex input
 */
const ColorPicker = ({ value = '#3498db', onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value.toUpperCase())

  // Preset color palette with good contrast
  const COLORS = [
    { name: 'Blue', hex: '#3498db' },
    { name: 'Red', hex: '#e74c3c' },
    { name: 'Green', hex: '#2ecc71' },
    { name: 'Purple', hex: '#9b59b6' },
    { name: 'Orange', hex: '#f39c12' },
    { name: 'Cyan', hex: '#1abc9c' },
    { name: 'Pink', hex: '#e91e63' },
    { name: 'Lime', hex: '#cddc39' },
    { name: 'Navy', hex: '#2c3e50' },
    { name: 'Teal', hex: '#16a085' },
    { name: 'Brown', hex: '#8b4513' },
    { name: 'Gray', hex: '#95a5a6' }
  ]

  const handleColorSelect = (hex) => {
    onChange(hex)
    setHexInput(hex.toUpperCase())
    setIsOpen(false)
  }

  const handleHexInput = (e) => {
    let val = e.target.value.toUpperCase()

    // Remove # if user typed it
    if (val.startsWith('#')) {
      val = val.substring(1)
    }

    setHexInput(val)

    // Validate hex format
    if (/^[0-9A-F]{6}$/.test(val)) {
      onChange(`#${val}`)
    }
  }

  return (
    <div className="color-picker">
      <div className="color-input-group">
        {/* Color preview square */}
        <div
          className="color-preview"
          style={{ backgroundColor: value }}
          onClick={() => setIsOpen(!isOpen)}
          title="Click to open color picker"
        />

        {/* Hex input */}
        <input
          type="text"
          className="hex-input"
          value={hexInput}
          onChange={handleHexInput}
          placeholder="#3498db"
          maxLength="7"
          title="Enter hex color code (e.g., #3498db)"
        />
      </div>

      {/* Dropdown palette */}
      {isOpen && (
        <div className="color-palette">
          {COLORS.map(color => (
            <button
              key={color.hex}
              className="color-button"
              style={{ backgroundColor: color.hex }}
              onClick={() => handleColorSelect(color.hex)}
              title={color.name}
            >
              {value && value.toUpperCase() === color.hex && (
                <span className="color-checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ColorPicker
