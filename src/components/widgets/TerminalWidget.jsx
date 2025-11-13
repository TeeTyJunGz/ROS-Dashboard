import React, { useEffect, useRef, useState } from 'react'
import { useWebSocket } from '../../context/WebSocketContext'
import './TerminalWidget.css'

const TerminalWidget = ({ widget }) => {
  const { messages, subscribeToTopic, unsubscribeFromTopic } = useWebSocket()
  const { subscribeTopic, maxData } = widget.config || {}
  const topic = subscribeTopic
  const lines = maxData ? parseInt(maxData) : 50
  const [logMessages, setLogMessages] = useState([])
  const terminalRef = useRef(null)

  useEffect(() => {
    if (topic) {
      subscribeToTopic(topic, 'rosgraph_msgs/Log')
    }
    return () => {
      if (topic) {
        unsubscribeFromTopic(topic)
      }
    }
  }, [topic, subscribeToTopic, unsubscribeFromTopic])

  useEffect(() => {
    const message = messages[topic]
    if (message && message.data) {
      const timestamp = new Date(message.timestamp).toLocaleTimeString()
      const logEntry = `[${timestamp}] ${JSON.stringify(message.data)}`
      setLogMessages(prev => {
        const newLogs = [logEntry, ...prev]
        return newLogs.slice(0, lines || 50)
      })
    }
  }, [messages, topic, lines])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0
    }
  }, [logMessages])

  return (
    <div className="terminal-widget">
      <div className="terminal-output" ref={terminalRef}>
        {logMessages.length === 0 ? (
          <div className="terminal-empty">No messages yet...</div>
        ) : (
          logMessages.map((msg, idx) => (
            <div key={idx} className="terminal-line">
              {msg}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TerminalWidget

