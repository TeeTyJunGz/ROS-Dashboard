import React, { useEffect, useState } from 'react'
import { useWebSocket } from '../../context/WebSocketContext'
import './TopicReaderWidget.css'

const TopicReaderWidget = ({ widget }) => {
  const { messages, subscribeToTopic, unsubscribeFromTopic } = useWebSocket()
  const { subscribeTopic, messageType } = widget.config || {}
  const topic = subscribeTopic
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    if (!topic) {
      return undefined
    }
    subscribeToTopic(topic, messageType || 'std_msgs/String')
    return () => {
      unsubscribeFromTopic(topic)
    }
  }, [topic, messageType, subscribeToTopic, unsubscribeFromTopic])

  useEffect(() => {
    setLastMessage(null)
  }, [topic])

  useEffect(() => {
    if (!topic) return
    const message = messages[topic]
    if (message && message.data) {
      setLastMessage({
        data: message.data,
        timestamp: message.timestamp
      })
    }
  }, [messages, topic])

  const formatMessage = (data) => {
    if (typeof data === 'string') {
      return data
    }
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2)
    }
    return String(data)
  }

  return (
    <div className="topic-reader-widget">
      <div className="topic-reader-content">
        {!topic ? (
          <div className="topic-reader-empty">Configure a topic to start reading</div>
        ) : !lastMessage ? (
          <div className="topic-reader-empty">Waiting for messages...</div>
        ) : (
          <div className="topic-reader-message">
            <div className="topic-reader-header">
              <span className="topic-reader-topic">{topic}</span>
              <span className="topic-reader-timestamp">
                {new Date(lastMessage.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <pre className="topic-reader-data">
              {formatMessage(lastMessage.data)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default TopicReaderWidget

