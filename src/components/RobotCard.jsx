import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Power, Edit2, Check, X } from 'lucide-react'
import { useFleet } from '../context/FleetContext'
import './RobotCard.css'

export default function RobotCard({ robot, onSelect }) {
  const navigate = useNavigate()
  const { updateRobotName, updateRobotIP } = useFleet()
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingIP, setIsEditingIP] = useState(false)
  const [tempName, setTempName] = useState(robot.name)
  const [tempIP, setTempIP] = useState(robot.ip)
  const [oldRobotId, setOldRobotId] = useState(robot.id)

  useEffect(() => {
    setTempName(robot.name)
    setTempIP(robot.ip)
  }, [robot.name, robot.ip, robot.id])

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateRobotName(oldRobotId, tempName)
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
      updateRobotIP(robot.id, tempIP)
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

  const handleCancelName = () => {
    setTempName(robot.name)
    setIsEditingName(false)
  }

  const handleCancelIP = () => {
    setTempIP(robot.ip)
    setIsEditingIP(false)
  }

  const statusColor = robot.status === 'connected' ? '#22c55e' : '#ef4444'
  const statusText = robot.status === 'connected' ? 'Connected' : 'Disconnected'

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
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="robot-info-group">
          <label>Status</label>
          <div className="status-badge" style={{ borderColor: statusColor }}>
            <Power size={16} style={{ color: statusColor }} />
            <span>{statusText}</span>
          </div>
        </div>

        <div className="robot-info-group">
          <label>Bridge Port</label>
          <p className="robot-port">{robot.bridgeUrl.split(':').pop()}</p>
        </div>
      </div>

      <div className="robot-card-footer">
        <button
          onClick={() => onSelect(robot.id)}
          className="select-btn"
          disabled={robot.status !== 'connected'}
        >
          Open Dashboard →
        </button>
      </div>
    </div>
  )
}
