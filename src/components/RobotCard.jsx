import React, { useState, useEffect } from 'react'
import { Power, Edit2, Check, X } from 'lucide-react'
import { useFleet } from '../context/FleetContext'
import { useAuth } from '../context/AuthContext'
import './RobotCard.css'

export default function RobotCard({ robot, onSelect }) {
  const { updateRobotName, updateRobotIP, updateRobotBridgePort } = useFleet()
  const { isAdmin } = useAuth()
  const canEditRobot = isAdmin
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingIP, setIsEditingIP] = useState(false)
  const [isEditingPort, setIsEditingPort] = useState(false)
  const [tempName, setTempName] = useState(robot.name)
  const [tempIP, setTempIP] = useState(robot.ip)
  const [tempPort, setTempPort] = useState(String(robot.bridgePort || 8765))
  const [oldRobotId, setOldRobotId] = useState(robot.id)

  useEffect(() => {
    setTempName(robot.name)
    setTempIP(robot.ip)
    setTempPort(String(robot.bridgePort || 8765))
    setOldRobotId(robot.id)
  }, [robot.name, robot.ip, robot.bridgePort, robot.id])

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateRobotName(oldRobotId, tempName).catch((error) => {
        console.error('Failed to update robot name:', error)
      })
      setIsEditingName(false)
    }
  }

  const handleKeyDownName = (e) => {
    if (e.key === 'Enter') {
      handleSaveName()
    } else if (e.key === 'Escape') {
      handleCancelName()
    }
  }

  const handleSaveIP = () => {
    if (tempIP.trim()) {
      updateRobotIP(robot.id, tempIP).catch((error) => {
        console.error('Failed to update robot IP:', error)
      })
      setIsEditingIP(false)
    }
  }

  const handleKeyDownIP = (e) => {
    if (e.key === 'Enter') {
      handleSaveIP()
    } else if (e.key === 'Escape') {
      handleCancelIP()
    }
  }

  const handleSavePort = () => {
    if (tempPort.trim()) {
      updateRobotBridgePort(robot.id, tempPort).catch((error) => {
        console.error('Failed to update robot bridge port:', error)
      })
      setIsEditingPort(false)
    }
  }

  const handleKeyDownPort = (e) => {
    if (e.key === 'Enter') {
      handleSavePort()
    } else if (e.key === 'Escape') {
      handleCancelPort()
    }
  }

  const handleCancelName = () => {
    setTempName(robot.name)
    setIsEditingName(false)
  }

  const handleCancelIP = () => {
    setTempIP(robot.ip)
    setIsEditingIP(false)
  }

  const handleCancelPort = () => {
    setTempPort(String(robot.bridgePort || 8765))
    setIsEditingPort(false)
  }

  const statusColor = robot.status === 'online'
    ? '#22c55e'
    : robot.status === 'offline'
      ? '#ef4444'
      : '#f59e0b'
  const statusText = robot.status === 'online'
    ? 'Online'
    : robot.status === 'offline'
      ? 'Offline'
      : 'Checking'

  return (
    <div className="robot-card">
      <div className="robot-card-header">
        <div className="robot-title-section">
          <div
            className="status-indicator"
            style={{ backgroundColor: statusColor }}
            title={statusText}
          />
          {isEditingName ? (
            <div className="edit-input-group">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={handleKeyDownName}
                autoFocus
                className="robot-name-input"
              />
              <button
                onClick={handleSaveName}
                className="edit-btn save-btn"
                title="Save"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelName}
                className="edit-btn cancel-btn"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="robot-name-section">
              <h3 className="robot-name">{robot.name}</h3>
              <button
                onClick={() => setIsEditingName(true)}
                className="edit-btn"
                title="Rename robot"
                disabled={!canEditRobot}
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="robot-card-body">
        <div className="robot-info-group">
          <label>IP Address</label>
          {isEditingIP ? (
            <div className="edit-input-group">
              <input
                type="text"
                value={tempIP}
                onChange={(e) => setTempIP(e.target.value)}
                onKeyDown={handleKeyDownIP}
                autoFocus
                className="robot-ip-input"
              />
              <button
                onClick={handleSaveIP}
                className="edit-btn save-btn"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleCancelIP}
                className="edit-btn cancel-btn"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="robot-ip-section">
              <p className="robot-ip">{robot.ip}</p>
              <button
                onClick={() => setIsEditingIP(true)}
                className="edit-btn"
                title="Edit IP"
                disabled={!canEditRobot}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="robot-info-group">
          <label>Status</label>
          <div
            className={`status-badge ${robot.status === 'offline' ? 'disconnected' : ''}`}
            style={{ borderColor: statusColor, color: statusColor }}
          >
            <Power size={16} style={{ color: statusColor }} />
            <span>{statusText}</span>
          </div>
        </div>

        <div className="robot-info-group">
          <label>Bridge Port</label>
          {isEditingPort ? (
            <div className="edit-input-group">
              <input
                type="number"
                value={tempPort}
                onChange={(e) => setTempPort(e.target.value)}
                onKeyDown={handleKeyDownPort}
                autoFocus
                className="robot-ip-input"
                min="1"
                max="65535"
              />
              <button
                onClick={handleSavePort}
                className="edit-btn save-btn"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleCancelPort}
                className="edit-btn cancel-btn"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="robot-ip-section">
              <p className="robot-port">{robot.bridgePort || 8765}</p>
              <button
                onClick={() => setIsEditingPort(true)}
                className="edit-btn"
                title="Edit bridge port"
                disabled={!canEditRobot}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="robot-info-group">
          <label>Bridge URL</label>
          <p className="robot-port robot-bridge-url">{robot.bridgeUrl}</p>
        </div>

        <div className="robot-info-group">
          <label>Access</label>
          <p className="robot-port robot-bridge-url">
            {robot.permissions?.canControl ? 'Control' : 'View'}
            {robot.permissions?.canEdit ? ' + Edit' : ''}
          </p>
        </div>
      </div>

      <div className="robot-card-footer">
        <button
          onClick={() => onSelect(robot.id)}
          className="select-btn"
          disabled={robot.status === 'offline' || !robot.permissions?.canView}
        >
          Open Dashboard →
        </button>
      </div>
    </div>
  )
}
