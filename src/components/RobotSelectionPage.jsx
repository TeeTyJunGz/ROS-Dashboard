import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, Wifi } from 'lucide-react'
import { useFleet } from '../context/FleetContext'
import RobotCard from './RobotCard'
import './RobotSelectionPage.css'

const ROBOT_STATUS_POLL_MS = 5000

export default function RobotSelectionPage() {
  const navigate = useNavigate()
  const { robots, selectRobot, updateRobotStatus } = useFleet()

  useEffect(() => {
    // Page title
    document.title = 'Fleet Management - ROS2 Dashboard'
  }, [])

  useEffect(() => {
    if (robots.length === 0) {
      return undefined
    }

    let isCancelled = false

    const refreshRobotStatuses = async () => {
      try {
        const response = await fetch('/api/robots/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            robots: robots.map((robot) => ({ id: robot.id, ip: robot.ip }))
          })
        })

        if (!response.ok) {
          throw new Error(`Status request failed: ${response.status}`)
        }

        const result = await response.json()
        if (isCancelled || !Array.isArray(result?.robots)) {
          return
        }

        result.robots.forEach((robotStatus) => {
          updateRobotStatus(robotStatus.id, robotStatus.alive ? 'online' : 'offline')
        })
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to refresh robot statuses:', error)
        }
      }
    }

    refreshRobotStatuses()
    const intervalId = window.setInterval(refreshRobotStatuses, ROBOT_STATUS_POLL_MS)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [robots, updateRobotStatus])

  const handleSelectRobot = (robotId) => {
    selectRobot(robotId)
    navigate(`/dashboard/${robotId}`)
  }

  const onlineCount = robots.filter((r) => r.status === 'online').length

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
                {onlineCount}/{robots.length} Online
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
            {onlineCount}
          </div>
          <div className="stat-label">Online</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {robots.length - onlineCount}
          </div>
          <div className="stat-label">Offline</div>
        </div>
      </div>
    </div>
  )
}
