import React, { useEffect, useRef, useState } from 'react'
import { useTerminal } from '../../context/TerminalWebSocketContext'
import './TerminalWidget.css'

const TerminalWidget = ({ widget }) => {
  const { isConnected, output, sendInput } = useTerminal()
  const [command, setCommand] = useState('')
  const outputRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

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
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>

      <div className="terminal-output" ref={outputRef}>
        {!isConnected ? (
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
          disabled={!isConnected}
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
