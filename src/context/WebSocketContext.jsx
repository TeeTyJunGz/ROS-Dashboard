import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import FoxgloveClientWrapper from '../websocket/foxglove-client'

const WebSocketContext = createContext(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children, wsUrl = 'ws://localhost:8765' }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState({})
  const [availableTopics, setAvailableTopics] = useState([])
  const clientRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Setup subscribeToTopic function
  const subscribeToTopic = (topic, messageType) => {
    if (!clientRef.current || !clientRef.current.isConnected) {
      console.warn('[Dashboard] Foxglove Bridge not connected, cannot subscribe to topic:', topic)
      return
    }

    clientRef.current.subscribeToTopic(topic)
  }

  // Setup unsubscribeFromTopic function
  const unsubscribeFromTopic = (topic) => {
    if (!clientRef.current || !clientRef.current.isConnected) {
      return
    }

    clientRef.current.unsubscribeFromTopic(topic)
  }

  // Setup publishMessage function
  const publishMessage = (topic, messageType, message) => {
    if (!clientRef.current || !clientRef.current.isConnected) {
      console.warn('[Dashboard] Foxglove Bridge not connected, cannot publish message')
      return false
    }

    return clientRef.current.publishMessage(topic, messageType, message)
  }

  // Handle Foxglove message event
  const handleMessage = (msgData) => {
    const { topic, data } = msgData
    setMessages(prev => ({
      ...prev,
      [topic]: {
        data,
        timestamp: Date.now()
      }
    }))
  }

  // Handle Foxglove advertise event
  const handleAdvertise = (channels) => {
    // Extract topic names from advertised channels
    const topics = channels.map(ch => ch.topic)
    setAvailableTopics(topics)
    console.log(`[Dashboard] ${channels.length} topics available: ${topics.join(', ')}`)
  }

  // Main connection effect
  useEffect(() => {
    let isUnmounting = false

    const createConnection = () => {
      if (isUnmounting) return

      try {
        console.log('[Dashboard] Connecting to Foxglove Bridge at:', wsUrl)
        const client = new FoxgloveClientWrapper(wsUrl)

        // Register event handlers
        client.on('open', () => {
          if (!isUnmounting) {
            console.log('[Dashboard] ✓ Connected to Foxglove Bridge')
            setIsConnected(true)
          }
        })

        client.on('advertise', (channels) => {
          if (!isUnmounting) {
            handleAdvertise(channels)
          }
        })

        client.on('message', (msgData) => {
          if (!isUnmounting) {
            handleMessage(msgData)
          }
        })

        client.on('error', (error) => {
          if (!isUnmounting) {
            console.error('[Dashboard] Foxglove Bridge error:', error)
            setIsConnected(false)
          }
        })

        client.on('close', () => {
          if (!isUnmounting) {
            console.log('[Dashboard] Foxglove Bridge disconnected, will reconnect in 3 seconds...')
            setIsConnected(false)

            // Schedule reconnect
            reconnectTimeoutRef.current = setTimeout(() => {
              createConnection()
            }, 3000)
          }
        })

        clientRef.current = client
        client.connect()
      } catch (error) {
        console.error('[Dashboard] Failed to create Foxglove connection:', error)
        if (!isUnmounting) {
          setIsConnected(false)
          // Retry connection after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            createConnection()
          }, 3000)
        }
      }
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    // Disconnect old connection if exists
    if (clientRef.current) {
      clientRef.current.close()
      clientRef.current = null
    }

    // Create new connection after a short delay for URL changes
    const connectionTimer = setTimeout(() => {
      createConnection()
    }, 100)

    // Cleanup function
    return () => {
      isUnmounting = true
      clearTimeout(connectionTimer)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (clientRef.current) {
        clientRef.current.close()
        clientRef.current = null
      }
    }
  }, [wsUrl])


  const value = {
    isConnected,
    messages,
    availableTopics,
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

