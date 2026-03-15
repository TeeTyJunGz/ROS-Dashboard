import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFleet } from '../../context/FleetContext'
import { useRobotAccess } from '../../context/RobotAccessContext'
import './TerminalWidget.css'

const RECONNECT_DELAY_MS = 3000
const DEFAULT_TERMINAL_PORT = 5001
const MAX_OUTPUT_LINES = 1000

const TerminalWidget = ({ widget }) => {
  const { robotId } = useParams()
  const { getRobot } = useFleet()
  const { canControlWidgets } = useRobotAccess()
  const selectedRobot = getRobot(robotId)
  const [command, setCommand] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [output, setOutput] = useState('')
  const outputRef = useRef(null)
  const inputRef = useRef(null)
  const wsRef = useRef(null)
  const outputBufferRef = useRef([])
  const reconnectTimeoutRef = useRef(null)
  const isUnmountingRef = useRef(false)

  const terminalPort = useMemo(() => {
    const parsedPort = parseInt(widget?.config?.port, 10)
    return Number.isFinite(parsedPort) ? parsedPort : DEFAULT_TERMINAL_PORT
  }, [widget])

  const terminalUrl = useMemo(() => {
    if (!selectedRobot?.ip) {
      return ''
    }

    return `ws://${selectedRobot.ip}:${terminalPort}`
  }, [selectedRobot, terminalPort])

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

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
      if (isUnmountingRef.current || !terminalUrl || !canControlWidgets) {
        setIsConnected(false)
        return
      }

      try {
        wsRef.current = new WebSocket(terminalUrl)

        wsRef.current.onopen = () => {
          if (isUnmountingRef.current) return
          setIsConnected(true)
          setOutput('')
          outputBufferRef.current = []
        }

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'output') {
              outputBufferRef.current.push(message.data)

              const totalBrs = outputBufferRef.current.join('').split('<br>').length
              if (totalBrs > MAX_OUTPUT_LINES) {
                outputBufferRef.current.shift()
              }

              setOutput(outputBufferRef.current.join(''))
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
          setIsConnected(false)
          reconnectTimeoutRef.current = setTimeout(connectTerminal, RECONNECT_DELAY_MS)
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
  }, [canControlWidgets, terminalUrl])

  const sendInput = (data) => {
    if (canControlWidgets && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data
      }))
    }
  }

  const handleKeyDown = (e) => {
    // Ctrl+C - interrupt running command
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      sendInput('\x03')
      // Don't clear command, let user see what they were typing
      return
    }

    // Ctrl+D - EOF
    if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      sendInput('\x04')
      return
    }

    // Ctrl+L - clear screen
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault()
      sendInput('\x0c')
      return
    }

    // Enter - send complete command
    if (e.key === 'Enter') {
      e.preventDefault()
      if (command.trim()) {
        sendInput(command + '\n')
        setCommand('')  // Clear after sending
      }
      return
    }
  }

  const handleChange = (e) => {
    // Simple character-by-character input
    // No fancy line editing - user types normally
    setCommand(e.target.value)
  }

  return (
    <div className="terminal-widget">
      <div className="terminal-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {isConnected ? `Connected ${selectedRobot?.ip || ''}:${terminalPort}` : `Connecting ${selectedRobot?.ip || ''}:${terminalPort}...`}
        </span>
      </div>

      <div className="terminal-output" ref={outputRef}>
        {!canControlWidgets ? (
          <div className="terminal-waiting">Acquire the control lock to use the terminal.</div>
        ) : !isConnected ? (
          <div className="terminal-waiting">Connecting to terminal...</div>
        ) : output ? (
          <div dangerouslySetInnerHTML={{ __html: output }} />
        ) : (
          <div className="terminal-waiting">Type a command to start...</div>
        )}
      </div>

      <div className="terminal-input-area">
        <span className="terminal-prompt">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter command (e.g., ls, ros2 topic list, ros2 topic echo /chatter)"
          disabled={!isConnected || !canControlWidgets}
          className="terminal-input"
          autoFocus
          spellCheck="false"
          autoComplete="off"
        />
      </div>
    </div>
  )
}

export default TerminalWidget
