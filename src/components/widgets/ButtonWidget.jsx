import React from 'react'
import { useWebSocket } from '../../context/WebSocketContext'
import { useRobotAccess } from '../../context/RobotAccessContext'
import './ButtonWidget.css'

const ButtonWidget = ({ widget }) => {
  const { publishMessage } = useWebSocket()
  const { canControlWidgets } = useRobotAccess()
  const { publishTopic, dataOut, label } = widget.config || {}
  const buttonLabel = label || 'Button'

  const handleClick = () => {
    if (publishTopic && canControlWidgets) {
      publishMessage(publishTopic, 'std_msgs/msg/String', { data: dataOut || 'pressed' })
    }
  }

  return (
    <div className="button-widget">
      <button
        className="button-action"
        onClick={handleClick}
        disabled={!publishTopic || !canControlWidgets}
      >
      {buttonLabel}
      </button>
    </div>
  )
}

export default ButtonWidget

