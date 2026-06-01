import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Cpu, Plus, Wifi, X } from 'lucide-react'
import { useFleet } from '../context/FleetContext'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../utils/api'
import RobotCard from './RobotCard'
import './RobotSelectionPage.css'

const ROBOT_STATUS_POLL_MS = 5000
const DEFAULT_NEW_ROBOT = {
  name: '',
  ip: '',
  bridgePort: '8765',
  terminalPort: '5001',
  mjpegPort: '8081',
}

export default function RobotSelectionPage() {
  const navigate = useNavigate()
  const { robots, selectRobot, updateRobotStatus, createRobot, deleteRobot } = useFleet()
  const { user, isAdmin, logout } = useAuth()
  const [newRobot, setNewRobot] = useState(DEFAULT_NEW_ROBOT)
  const [robotActionError, setRobotActionError] = useState('')
  const [isSubmittingRobot, setIsSubmittingRobot] = useState(false)
  const [deletingRobotId, setDeletingRobotId] = useState(null)
  const [isRobotModalOpen, setIsRobotModalOpen] = useState(false)

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
          credentials: 'include',
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

  const hasRobots = robots.length > 0

  const handleNewRobotChange = (event) => {
    const { name, value } = event.target
    setNewRobot((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleAddRobot = async (event) => {
    event.preventDefault()
    setRobotActionError('')
    setIsSubmittingRobot(true)

    try {
      const createdRobot = await createRobot({
        name: newRobot.name.trim(),
        ip: newRobot.ip.trim(),
        bridgePort: parseInt(newRobot.bridgePort, 10) || 8765,
        terminalPort: parseInt(newRobot.terminalPort, 10) || 5001,
        mjpegPort: parseInt(newRobot.mjpegPort, 10) || 8081,
      })

      setNewRobot(DEFAULT_NEW_ROBOT)
      setIsRobotModalOpen(false)
      if (createdRobot?.id) {
        selectRobot(createdRobot.id)
      }
    } catch (error) {
      setRobotActionError(error instanceof ApiError ? error.message : 'Failed to add robot')
    } finally {
      setIsSubmittingRobot(false)
    }
  }

  const openRobotModal = () => {
    setRobotActionError('')
    setIsRobotModalOpen(true)
  }

  const closeRobotModal = () => {
    if (isSubmittingRobot) {
      return
    }

    setRobotActionError('')
    setNewRobot(DEFAULT_NEW_ROBOT)
    setIsRobotModalOpen(false)
  }

  const handleDeleteRobot = async (robot) => {
    const confirmed = window.confirm(`Delete ${robot.name}? This will also remove its saved dashboard and lock state.`)
    if (!confirmed) {
      return
    }

    setRobotActionError('')
    setDeletingRobotId(robot.id)

    try {
      await deleteRobot(robot.id)
    } catch (error) {
      setRobotActionError(error instanceof ApiError ? error.message : 'Failed to delete robot')
    } finally {
      setDeletingRobotId(null)
    }
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
            {isAdmin && (
              <button className="add-robot-icon-button" onClick={openRobotModal} title="Add robot" type="button">
                <Plus size={20} />
              </button>
            )}
            <div className="info-badge">
              <span>{user?.username}</span>
            </div>
            {isAdmin && (
              <Link className="info-badge" to="/admin">
                Permission
              </Link>
            )}
            <div className="info-badge">
              <Wifi size={18} />
              <span>
                {onlineCount}/{robots.length} Online
              </span>
            </div>
            <button className="info-badge" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
        <p className="header-subtitle">Select a robot to view its dashboard and control panel</p>
      </div>

      {isAdmin && isRobotModalOpen && (
        <div className="robot-modal-backdrop" onClick={closeRobotModal}>
          <section className="robot-modal" onClick={(event) => event.stopPropagation()}>
            <div className="robot-modal-header">
              <div>
                <h2>Add New Robot</h2>
                <p>Enter the robot connection details to add it to your fleet.</p>
              </div>
              <button className="robot-modal-close" onClick={closeRobotModal} type="button" title="Close add robot dialog">
                <X size={18} />
              </button>
            </div>

            <form className="robot-modal-form" onSubmit={handleAddRobot}>
              <label className="robot-management-field">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={newRobot.name}
                  onChange={handleNewRobotChange}
                  placeholder="Warehouse Rover 3"
                  required
                />
              </label>

              <label className="robot-management-field">
                <span>IP Address</span>
                <input
                  type="text"
                  name="ip"
                  value={newRobot.ip}
                  onChange={handleNewRobotChange}
                  placeholder="192.168.1.100"
                  required
                />
              </label>

              <div className="robot-modal-port-grid">
                <label className="robot-management-field">
                  <span>Bridge Port</span>
                  <input
                    type="number"
                    name="bridgePort"
                    value={newRobot.bridgePort}
                    onChange={handleNewRobotChange}
                    min="1"
                    max="65535"
                    required
                  />
                </label>

                <label className="robot-management-field">
                  <span>Terminal Port</span>
                  <input
                    type="number"
                    name="terminalPort"
                    value={newRobot.terminalPort}
                    onChange={handleNewRobotChange}
                    min="1"
                    max="65535"
                    required
                  />
                </label>

                <label className="robot-management-field">
                  <span>MJPEG Port</span>
                  <input
                    type="number"
                    name="mjpegPort"
                    value={newRobot.mjpegPort}
                    onChange={handleNewRobotChange}
                    min="1"
                    max="65535"
                    required
                  />
                </label>
              </div>

              {robotActionError && <p className="robot-management-error">{robotActionError}</p>}

              <button className="robot-management-submit robot-modal-submit" type="submit" disabled={isSubmittingRobot}>
                <span>{isSubmittingRobot ? 'Creating Robot...' : 'Create Robot'}</span>
              </button>
            </form>
          </section>
        </div>
      )}

      <div className="robots-container">
        {hasRobots ? (
          <div className="robots-grid">
            {robots.map((robot) => (
              <RobotCard
                key={robot.id}
                robot={robot}
                onSelect={handleSelectRobot}
                onDelete={isAdmin ? () => handleDeleteRobot(robot) : null}
                isDeleting={deletingRobotId === robot.id}
                disableDelete={deletingRobotId !== null}
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
