import React from 'react'
import { Camera, Radio, MousePointer2, Terminal, Gamepad2, BarChart3, FileText, X } from 'lucide-react'
import './WidgetPanel.css'

const WIDGET_TYPES = [
  { type: 'camera', label: 'Camera', icon: Camera },
  { type: 'lidar', label: 'Lidar', icon: Radio },
  { type: 'button', label: 'Button', icon: MousePointer2 },
  { type: 'terminal', label: 'Terminal', icon: Terminal },
  { type: 'joystick', label: 'Joystick', icon: Gamepad2 },
  { type: 'chart', label: 'Chart', icon: BarChart3 },
  { type: 'topicReader', label: 'Topic Reader', icon: FileText }
]

const WidgetPanel = ({ isOpen, onClose, onAddWidget }) => {
  if (!isOpen) return null

  return (
    <div className="widget-panel-overlay" onClick={onClose}>
      <div className="widget-panel" onClick={(e) => e.stopPropagation()}>
        <div className="widget-panel-header">
          <h2>Add Widget</h2>
          <button className="widget-panel-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="widget-list">
          {WIDGET_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              className="widget-item"
              onClick={() => {
                onAddWidget(type)
                onClose()
              }}
              title={`Add ${label} widget`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WidgetPanel
