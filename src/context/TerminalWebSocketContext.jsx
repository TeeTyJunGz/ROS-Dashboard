import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

const TerminalContext = createContext(null)

export const TerminalWebSocketProvider = ({ children, wsUrl = 'ws://localhost:5001' }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [output, setOutput] = useState('')
  const wsRef = useRef(null)
  const outputBufferRef = useRef([])
  const maxLinesRef = useRef(1000)
  const reconnectTimeoutRef = useRef(null)
  const isUnmountingRef = useRef(false)

  useEffect(() => {
    isUnmountingRef.current = false

    const closeCurrentSocket = () => {
      if (wsRef.current) {
        wsRef.current.onopen = null
        wsRef.current.onmessage = null
        wsRef.current.onerror = null
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }

    const connectTerminal = () => {
      if (isUnmountingRef.current) return
      if (!wsUrl) {
        setIsConnected(false)
        return
      }

      try {
        console.log(`[Terminal] Connecting to ${wsUrl}`)
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
          if (isUnmountingRef.current) return
          console.log('[Terminal] Connected to terminal server')
          setIsConnected(true)
          setOutput('')
          outputBufferRef.current = []
        }

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)

            if (message.type === 'connected') {
              console.log(`[Terminal] Session ID: ${message.sessionId}`)
            } else if (message.type === 'output') {
              // Add output to buffer
              outputBufferRef.current.push(message.data)

              // Keep buffer under max lines (rough limit based on <br> count)
              const totalBrs = outputBufferRef.current.join('').split('<br>').length
              if (totalBrs > maxLinesRef.current) {
                outputBufferRef.current.shift()
              }

              // Update state with accumulated output
              const fullOutput = outputBufferRef.current.join('')
              setOutput(fullOutput)
            }
          } catch (err) {
            console.error('[Terminal] Message parse error:', err)
          }
        }

        wsRef.current.onerror = (error) => {
          if (isUnmountingRef.current) return
          console.error('[Terminal] WebSocket error:', error)
          setIsConnected(false)
        }

        wsRef.current.onclose = () => {
          if (isUnmountingRef.current) return
          console.log('[Terminal] Disconnected from terminal server')
          setIsConnected(false)

          // Try to reconnect after 3 seconds (only if not unmounting)
          if (!isUnmountingRef.current) {
            reconnectTimeoutRef.current = setTimeout(connectTerminal, 3000)
          }
        }
      } catch (err) {
        console.error('[Terminal] Connection error:', err)
        setIsConnected(false)
      }
    }

    setOutput('')
    outputBufferRef.current = []
    connectTerminal()

    return () => {
      isUnmountingRef.current = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      closeCurrentSocket()
    }
  }, [wsUrl])

  const sendInput = (data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data: data
      }))
    }
  }

  const sendResize = (cols, rows) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        cols: cols,
        rows: rows
      }))
    }
  }

  const clearOutput = () => {
    setOutput('')
    outputBufferRef.current = []
  }

  const value = {
    isConnected,
    output,
    sendInput,
    sendResize,
    clearOutput
  }

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  )
}

export const useTerminal = () => {
  const context = useContext(TerminalContext)
  if (!context) {
    throw new Error('useTerminal must be used within TerminalWebSocketProvider')
  }
  return context
}
