import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useWebSocket } from '../context/WebSocketContext'
import './ConnectionStatus.css'

const ConnectionStatus = () => {
  const { isConnected } = useWebSocket()
  
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
      <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  )
}

export default ConnectionStatus

