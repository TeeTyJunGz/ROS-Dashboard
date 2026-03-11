import React, { useState } from 'react'
import ColorPicker from './ColorPicker'
import TopicSelector from './TopicSelector'
import { useWebSocket } from '../context/WebSocketContext'
import './ChartSettings.css'

/**
 * Chart Widget Settings Component
 * Configure multiple data series (up to 4)
 */
const ChartSettings = ({ config = {}, onSave }) => {
  const { availableTopics = [] } = useWebSocket()

  // Initialize series from config
  const initialSeries = config.series || [
    { topic: '', field: 'value', color: '#3498db' }
  ]

  const [series, setSeries] = useState(initialSeries)
  const [maxData, setMaxData] = useState(config.maxData || '100')

  // Update series at specific index
  const updateSeries = (idx, updates) => {
    const updated = [...series]
    updated[idx] = { ...updated[idx], ...updates }
    setSeries(updated)
  }

  // Add new series
  const addSeries = () => {
    if (series.length < 4) {
      setSeries([
        ...series,
        { topic: '', field: 'value', color: '#e74c3c' }
      ])
    }
  }

  // Remove series
  const removeSeries = (idx) => {
    setSeries(series.filter((_, i) => i !== idx))
  }

  // Save settings
  const handleSave = () => {
    onSave({
      series: series.filter(s => s.topic), // Only save configured series
      maxData
    })
  }

  return (
    <div className="chart-settings">
      <div className="settings-section">
        <h3>Data Series (Max 4)</h3>
        <div className="series-list">
          {series.map((s, idx) => (
            <div key={idx} className="series-item">
              <div className="series-header">
                <span className="series-number">Series {idx + 1}</span>
                {series.length > 1 && (
                  <button
                    className="btn-remove"
                    onClick={() => removeSeries(idx)}
                    title="Remove this series"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="series-config">
                {/* Topic Selection */}
                <div className="config-field">
                  <label>Topic</label>
                  <TopicSelector
                    value={s.topic}
                    onChange={(topic) => updateSeries(idx, { topic })}
                    availableTopics={availableTopics}
                  />
                </div>

                {/* Field Path */}
                <div className="config-field">
                  <label>Field Path</label>
                  <input
                    type="text"
                    className="field-input"
                    value={s.field}
                    onChange={(e) => updateSeries(idx, { field: e.target.value })}
                    placeholder="e.g., accelerometer.x or data.value"
                    title="Use dot notation for nested values"
                  />
                  <small className="help-text">
                    Examples: value, accelerometer.x, data.velocity[0]
                  </small>
                </div>

                {/* Color Selection */}
                <div className="config-field">
                  <label>Line Color</label>
                  <ColorPicker
                    value={s.color}
                    onChange={(color) => updateSeries(idx, { color })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {series.length < 4 && (
          <button className="btn-add-series" onClick={addSeries}>
            + Add Series
          </button>
        )}
      </div>

      <div className="settings-section">
        <h3>Options</h3>
        <div className="settings-field">
          <label>Max Data Points</label>
          <input
            type="number"
            value={maxData}
            onChange={(e) => setMaxData(e.target.value)}
            min="10"
            max="1000"
            title="Maximum number of points to display on chart"
          />
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-save" onClick={handleSave}>
          Save Settings
        </button>
      </div>

      <div className="settings-info">
        <p>
          <strong>Tips:</strong>
          <ul>
            <li>Use dot notation for nested fields: accelerometer.x</li>
            <li>Connect to bridge to see available topics</li>
            <li>Each series displays on its own line with custom color</li>
            <li>Up to 4 data series maximum</li>
          </ul>
        </p>
      </div>
    </div>
  )
}

export default ChartSettings
