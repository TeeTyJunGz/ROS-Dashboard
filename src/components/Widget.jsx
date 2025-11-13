import React from 'react'
import { X, Settings } from 'lucide-react'
import CameraWidget from './widgets/CameraWidget'
import LidarWidget from './widgets/LidarWidget'
import ButtonWidget from './widgets/ButtonWidget'
import TerminalWidget from './widgets/TerminalWidget'
import JoystickWidget from './widgets/JoystickWidget'
import ChartWidget from './widgets/ChartWidget'
import TopicReaderWidget from './widgets/TopicReaderWidget'
import './Widget.css'

const WIDGET_COMPONENTS = {
  camera: CameraWidget,
  lidar: LidarWidget,
  button: ButtonWidget,
  terminal: TerminalWidget,
  joystick: JoystickWidget,
  chart: ChartWidget,
  topicReader: TopicReaderWidget
}

const Widget = ({ widget, onRemove, onOpenSettings }) => {
  const WidgetComponent = WIDGET_COMPONENTS[widget.type]

  if (!WidgetComponent) {
    return (
      <div className="widget">
        <div className="widget-header">
          <span>Unknown Widget</span>
        </div>
        <div className="widget-content">Widget type not found</div>
      </div>
    )
  }

  const handleButtonClick = (e, action) => {
    e.stopPropagation()
    action()
  }

  return (
    <div className="widget">
      <div className="widget-header">
        <span className="widget-title">{getWidgetTitle(widget.type)}</span>
        <div className="widget-header-buttons">
          <button
            className="widget-settings"
            onClick={(e) => handleButtonClick(e, () => onOpenSettings(widget.id))}
            onMouseDown={(e) => e.stopPropagation()}
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            className="widget-close"
            onClick={(e) => handleButtonClick(e, () => onRemove(widget.id))}
            onMouseDown={(e) => e.stopPropagation()}
            title="Remove widget"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className={`widget-content ${['camera', 'lidar'].includes(widget.type) ? 'no-padding' : ''}`}>
        <WidgetComponent widget={widget} />
      </div>
    </div>
  )
}

function getWidgetTitle(type) {
  const titles = {
    camera: 'Camera',
    lidar: 'Lidar Point Cloud',
    button: 'Button',
    terminal: 'Terminal',
    joystick: 'Joystick',
    chart: 'Chart',
    topicReader: 'Topic Reader'
  }
  return titles[type] || type
}

export default Widget

