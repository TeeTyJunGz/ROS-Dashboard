import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import ChartSettings from './ChartSettings'
import TopicSelector from './TopicSelector'
import { useWebSocket } from '../context/WebSocketContext'
import './SettingsPanel.css'

const SettingsPanel = ({ widget, isOpen, onClose, onSave }) => {
  const { availableTopics } = useWebSocket()
  const [settings, setSettings] = useState({
    subscribeTopic: widget?.config?.subscribeTopic || '',
    publishTopic: widget?.config?.publishTopic || '',
    messageType: widget?.config?.messageType || '',
    maxData: widget?.config?.maxData || '',
    dataOut: widget?.config?.dataOut || '',
    field: widget?.config?.field || '',
    label: widget?.config?.label || '',
    pointSize: widget?.config?.pointSize !== undefined ? widget.config.pointSize.toString() : '',
    useDistanceColor: widget?.config?.useDistanceColor !== false,
    customColor: widget?.config?.customColor || '#00d4ff'
  })

  useEffect(() => {
    if (widget) {
      setSettings({
        subscribeTopic: widget.config?.subscribeTopic || widget.config?.topic || '',
        publishTopic: widget.config?.publishTopic || '',
        messageType: widget.config?.messageType || '',
        maxData: widget.config?.maxData || widget.config?.maxPoints || widget.config?.lines || (widget.config?.linearMax && widget.config?.angularMax ? `${widget.config.linearMax}, ${widget.config.angularMax}` : '') || '',
        dataOut: widget.config?.dataOut || widget.config?.message || '',
        field: widget.config?.field || '',
        label: widget.config?.label || '',
        pointSize: widget.config?.pointSize !== undefined ? widget.config.pointSize.toString() : '',
        useDistanceColor: widget.config?.useDistanceColor !== false,
        customColor: widget.config?.customColor || '#00d4ff'
      })
    }
  }, [widget])

  if (!isOpen || !widget) return null

  // Special handling for ChartWidget with new multi-series settings
  if (widget.type === 'chart') {
    return (
      <div className="settings-panel-overlay" onClick={onClose}>
        <div className="settings-panel settings-panel-large" onClick={(e) => e.stopPropagation()}>
          <div className="settings-panel-header">
            <h2>Chart Widget Settings</h2>
            <button className="settings-panel-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="settings-panel-content">
            <ChartSettings
              config={widget.config || {}}
              onSave={(config) => {
                onSave(config)
                onClose()
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Generic settings for other widgets
  const canPublish = ['button', 'joystick'].includes(widget.type)
  const needsMaxData = ['chart', 'joystick', 'terminal'].includes(widget.type)
  const needsDataOut = ['button'].includes(widget.type)
  const needsField = ['chart'].includes(widget.type)
  const needsSubscribe = !['camera', 'button', 'joystick'].includes(widget.type)
  const needsLabel = widget.type === 'button'
  const needsPointSize = widget.type === 'lidar'

  const handleSave = () => {
    const config = {}
    if (needsSubscribe) {
      config.subscribeTopic = settings.subscribeTopic || ''
      config.topic = settings.subscribeTopic || ''
      config.messageType = settings.messageType || ''
    } else {
      config.subscribeTopic = ''
      config.topic = ''
      config.messageType = ''
    }

    if (canPublish) {
      config.publishTopic = settings.publishTopic || ''
    } else {
      config.publishTopic = ''
    }

    if (needsMaxData) {
      config.maxData = settings.maxData || ''
    } else {
      config.maxData = ''
    }

    if (needsDataOut) {
      config.dataOut = settings.dataOut || ''
      config.message = settings.dataOut || ''
    } else {
      config.dataOut = ''
      config.message = ''
    }

    if (needsField) {
      config.field = settings.field || ''
    } else {
      config.field = ''
    }

    if (needsLabel) {
      config.label = settings.label || 'Button'
    }

    if (needsPointSize) {
      const parsedPointSize = parseFloat(settings.pointSize)
      config.pointSize = Number.isFinite(parsedPointSize) ? parsedPointSize : 2
      config.useDistanceColor = settings.useDistanceColor
      config.customColor = settings.customColor || '#00d4ff'
    }

    // Also update legacy config fields for backward compatibility
    if (needsMaxData && settings.maxData) {
      if (widget.type === 'chart') config.maxPoints = parseInt(settings.maxData, 10) || 100
      if (widget.type === 'terminal') config.lines = parseInt(settings.maxData, 10) || 50
      if (widget.type === 'joystick') {
        const parts = settings.maxData.split(',')
        if (parts.length === 2) {
          config.linearMax = parseFloat(parts[0].trim()) || 1.0
          config.angularMax = parseFloat(parts[1].trim()) || 1.0
        }
      }
    }

    onSave(config)
    onClose()
  }

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h2>Widget Settings</h2>
          <button className="settings-panel-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="settings-panel-content">
          {needsSubscribe && (
            <div className="settings-section">
              <label>Subscribe Topic</label>
              <TopicSelector
                value={settings.subscribeTopic}
                onChange={(value) => setSettings({ ...settings, subscribeTopic: value })}
                availableTopics={availableTopics || []}
              />
            </div>
          )}

          {canPublish && (
            <div className="settings-section">
              <label>Publish Topic</label>
              <TopicSelector
                value={settings.publishTopic}
                onChange={(value) => setSettings({ ...settings, publishTopic: value })}
                availableTopics={availableTopics || []}
              />
            </div>
          )}

          {needsSubscribe && settings.subscribeTopic && (
            <div className="settings-section">
              <label>Message Type</label>
              <input
                type="text"
                value={settings.messageType}
                onChange={(e) => setSettings({ ...settings, messageType: e.target.value })}
                placeholder="e.g., std_msgs/String"
              />
            </div>
          )}

          {needsField && (
            <div className="settings-section">
              <label>Field Name (optional)</label>
              <input
                type="text"
                value={settings.field}
                onChange={(e) => setSettings({ ...settings, field: e.target.value })}
                placeholder="e.g., value"
              />
            </div>
          )}

          {needsMaxData && (
            <div className="settings-section">
              <label>
                {widget.type === 'chart' && 'Max Points'}
                {widget.type === 'terminal' && 'Max Lines'}
                {widget.type === 'joystick' && 'Max Velocities (linear, angular)'}
              </label>
              <input
                type="text"
                value={settings.maxData}
                onChange={(e) => setSettings({ ...settings, maxData: e.target.value })}
                placeholder={widget.type === 'joystick' ? 'e.g., 1.0, 1.0' : 'e.g., 100'}
              />
            </div>
          )}

          {needsDataOut && (
            <div className="settings-section">
              <label>Data to Send</label>
              <textarea
                value={settings.dataOut}
                onChange={(e) => setSettings({ ...settings, dataOut: e.target.value })}
                placeholder="Message or data to publish"
                rows={3}
              />
            </div>
          )}

          {needsLabel && (
            <div className="settings-section">
              <label>Button Label</label>
              <input
                type="text"
                value={settings.label}
                onChange={(e) => setSettings({ ...settings, label: e.target.value })}
                placeholder="Button"
              />
            </div>
          )}

          {needsPointSize && (
            <>
              <div className="settings-section">
                <label>
                  Point Size: <span className="settings-value">{settings.pointSize || '0.1'}</span>
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={settings.pointSize || 0.1}
                  onChange={(e) => setSettings({ ...settings, pointSize: e.target.value })}
                  className="settings-slider"
                />
              </div>

              <div className="settings-section">
                <label className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.useDistanceColor}
                    onChange={(e) => setSettings({ ...settings, useDistanceColor: e.target.checked })}
                  />
                  <span>Color by Distance</span>
                </label>
                <p className="settings-help-text">
                  When enabled, colors points from red (near) to blue (far)
                </p>
              </div>

              {!settings.useDistanceColor && (
                <div className="settings-section">
                  <label>Point Color</label>
                  <div className="settings-color-input">
                    <input
                      type="color"
                      value={settings.customColor}
                      onChange={(e) => setSettings({ ...settings, customColor: e.target.value })}
                      className="settings-color-picker"
                    />
                    <span className="settings-color-value">{settings.customColor}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="settings-panel-footer">
          <button className="settings-save" onClick={handleSave}>
            Save
          </button>
          <button className="settings-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel

