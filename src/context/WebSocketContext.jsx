import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const WebSocketContext = createContext(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState({})
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Foxglove Bridge WebSocket URL
  // Default: ws://localhost:8765 (Foxglove Bridge default port)
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8765'

  const subscribeToTopic = useCallback((topic, messageType) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot subscribe to topic:', topic)
      return
    }

    // Foxglove Bridge subscription format
    const subscribeMessage = {
      op: 'subscribe',
      topic: topic,
      type: messageType
    }

    wsRef.current.send(JSON.stringify(subscribeMessage))
    console.log('Subscribed to topic:', topic)
  }, [])

  const unsubscribeFromTopic = useCallback((topic) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    const unsubscribeMessage = {
      op: 'unsubscribe',
      topic: topic
    }

    wsRef.current.send(JSON.stringify(unsubscribeMessage))
    console.log('Unsubscribed from topic:', topic)
  }, [])

  const publishMessage = useCallback((topic, messageType, message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot publish message')
      return
    }

    const publishMessage = {
      op: 'advertise',
      topic: topic,
      type: messageType
    }

    wsRef.current.send(JSON.stringify(publishMessage))

    // Send the actual message
    const messageData = {
      op: 'publish',
      topic: topic,
      msg: message
    }

    wsRef.current.send(JSON.stringify(messageData))
  }, [])

  const handleMessage = useCallback((data) => {
    if (data.op === 'message' && data.topic) {
      setMessages(prev => ({
        ...prev,
        [data.topic]: {
          data: data.msg,
          timestamp: Date.now()
        }
      }))
    }
  }, [])

  const connect = useCallback(() => {
    try {
      console.log('Connecting to Foxglove Bridge at:', WS_URL)
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log('Connected to Foxglove Bridge')
        setIsConnected(true)
        
        // Subscribe to common topics (can be customized)
        subscribeToTopic('/rosout', 'rosgraph_msgs/Log')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('WebSocket connection closed')
        setIsConnected(false)
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setIsConnected(false)
    }
  }, [WS_URL, handleMessage, subscribeToTopic])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    // Auto-connect on mount
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  const value = {
    isConnected,
    messages,
    connect,
    disconnect,
    subscribeToTopic,
    unsubscribeFromTopic,
    publishMessage
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

