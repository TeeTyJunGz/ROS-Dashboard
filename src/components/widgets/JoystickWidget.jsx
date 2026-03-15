import React, { useState, useRef, useEffect } from 'react'
import { useWebSocket } from '../../context/WebSocketContext'
import { useRobotAccess } from '../../context/RobotAccessContext'
import './JoystickWidget.css'

const PUBLISH_INTERVAL_MS = 50

const JoystickWidget = ({ widget }) => {
  const { publishMessage } = useWebSocket()
  const { canControlWidgets } = useRobotAccess()
  const { publishTopic, maxData } = widget.config || {}
  const topic = publishTopic
  let linearMax = 1.0
  let angularMax = 1.0
  if (maxData) {
    const parts = maxData.split(',')
    if (parts.length === 2) {
      linearMax = parseFloat(parts[0].trim()) || 1.0
      angularMax = parseFloat(parts[1].trim()) || 1.0
    }
  }
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const joystickRef = useRef(null)
  const containerRef = useRef(null)
  const lastPublishTimeRef = useRef(0)

  const handleMouseDown = (e) => {
    if (!canControlWidgets) {
      return
    }

    setIsDragging(true)
    updatePosition(e)
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      updatePosition(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setPosition({ x: 0, y: 0 })
    publishVelocity(0, 0)
  }

  const updatePosition = (e) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const x = (e.clientX - centerX) / (rect.width / 2)
    const y = (e.clientY - centerY) / (rect.height / 2)
    
    const distance = Math.sqrt(x * x + y * y)
    const clampedDistance = Math.min(distance, 1)
    const angle = Math.atan2(y, x)
    
    const clampedX = Math.cos(angle) * clampedDistance
    const clampedY = Math.sin(angle) * clampedDistance
    
    setPosition({ x: clampedX, y: clampedY })
    
    // Convert to linear and angular velocity
    const linear = -clampedY * (linearMax || 1.0)
    const angular = clampedX * (angularMax || 1.0)
    
    publishVelocity(linear, angular)
  }

  const publishVelocity = (linear, angular) => {
    if (topic && canControlWidgets) {
      const now = performance.now()
      if ((linear !== 0 || angular !== 0) && now - lastPublishTimeRef.current < PUBLISH_INTERVAL_MS) {
        return
      }

      lastPublishTimeRef.current = now
      publishMessage(topic, 'geometry_msgs/msg/Twist', {
        linear: { x: linear, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: angular }
      })
    }
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [canControlWidgets, isDragging])

  return (
    <div className="joystick-widget">
      <div
        ref={containerRef}
        className="joystick-container"
        onMouseDown={handleMouseDown}
        style={{ opacity: canControlWidgets ? 1 : 0.5, pointerEvents: canControlWidgets ? 'auto' : 'none' }}
      >
        <div
          ref={joystickRef}
          className="joystick-handle"
          style={{
            transform: `translate(${position.x * 50}px, ${position.y * 50}px)`
          }}
        />
        <div className="joystick-center" />
      </div>
      <div className="joystick-values">
        <div>Linear: {(-position.y * (linearMax || 1.0)).toFixed(2)}</div>
        <div>Angular: {(position.x * (angularMax || 1.0)).toFixed(2)}</div>
      </div>
    </div>
  )
}

export default JoystickWidget

