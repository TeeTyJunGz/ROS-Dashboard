import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, Wifi } from 'lucide-react'
import { useFleet } from '../context/FleetContext'
import RobotCard from './RobotCard'
import './RobotSelectionPage.css'

export default function RobotSelectionPage() {
  const navigate = useNavigate()
  const { robots, selectRobot } = useFleet()

  useEffect(() => {
    // Page title
    document.title = 'Fleet Management - ROS2 Dashboard'
  }, [])

  const handleSelectRobot = (robotId) => {
    selectRobot(robotId)
    navigate(`/dashboard/${robotId}`)
  }

  const connectedCount = robots.filter((r) => r.status === 'connected').length

  return (
    <div className="robot-selection-page">
      <div className="selection-header">
        <div className="header-top">
          <div className="header-logo">
            <Cpu size={32} />
            <h1>Fleet Management</h1>
          </div>
          <div className="header-info">
            <div className="info-badge">
              <Wifi size={18} />
              <span>
                {connectedCount}/{robots.length} Connected
              </span>
            </div>
          </div>
        </div>
        <p className="header-subtitle">Select a robot to view its dashboard and control panel</p>
      </div>

      <div className="robots-container">
        {robots.length > 0 ? (
          <div className="robots-grid">
            {robots.map((robot) => (
              <RobotCard
                key={robot.id}
                robot={robot}
                onSelect={handleSelectRobot}
              />
            ))}
          </div>
        ) : (
          <div className="no-robots">
            <p>No robots available</p>
          </div>
        )}
      </div>

      <div className="fleet-stats">
        <div className="stat-card">
          <div className="stat-value">{robots.length}</div>
          <div className="stat-label">Total Robots</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {connectedCount}
          </div>
          <div className="stat-label">Connected</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {robots.length - connectedCount}
          </div>
          <div className="stat-label">Offline</div>
        </div>
      </div>
    </div>
  )
}
