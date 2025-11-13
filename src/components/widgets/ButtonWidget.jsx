import React from 'react'
import { useWebSocket } from '../../context/WebSocketContext'
import './ButtonWidget.css'

const ButtonWidget = ({ widget }) => {
  const { publishMessage } = useWebSocket()
  const { publishTopic, dataOut, label } = widget.config || {}
  const buttonLabel = label || 'Button'

  const handleClick = () => {
    if (publishTopic) {
      publishMessage(publishTopic, 'std_msgs/String', { data: dataOut || 'pressed' })
    }
  }

  return (
    <div className="button-widget">
      <button
        className="button-action"
        onClick={handleClick}
        disabled={!publishTopic}
      >
      {buttonLabel}
      </button>
    </div>
  )
}

export default ButtonWidget

