import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { apiRequest } from '../utils/api'

const FleetContext = createContext(null)

const normalizeRobot = (robot) => {
  return {
    ...robot,
    status: robot?.status || 'unknown',
    permissions: {
      canView: Boolean(robot?.permissions?.canView),
      canControl: Boolean(robot?.permissions?.canControl),
      canEdit: Boolean(robot?.permissions?.canEdit),
    },
    lastUpdated: robot?.lastUpdated || null,
  }
}

export function FleetProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [robots, setRobots] = useState([])
  const [selectedRobotId, setSelectedRobotId] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshRobots = useCallback(async () => {
    if (!isAuthenticated) {
      setRobots([])
      setSelectedRobotId(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/api/robots')
      const nextRobots = (response.robots || []).map(normalizeRobot)
      setRobots(nextRobots)
      setSelectedRobotId((current) => {
        if (current && nextRobots.some((robot) => robot.id === current)) {
          return current
        }
        return nextRobots[0]?.id || null
      })
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (authLoading) {
      return
    }

    refreshRobots().catch((error) => {
      console.error('Failed to load robots:', error)
      setLoading(false)
    })
  }, [authLoading, refreshRobots])

  const selectRobot = useCallback((robotId) => {
    setSelectedRobotId(robotId)
  }, [])

  const updateRobot = useCallback(async (robotId, patch) => {
    const response = await apiRequest(`/api/robots/${robotId}`, {
      method: 'PUT',
      body: patch,
    })

    setRobots((current) => current.map((robot) => (robot.id === robotId ? normalizeRobot(response.robot) : robot)))
    return response.robot
  }, [])

  const updateRobotName = useCallback((robotId, name) => updateRobot(robotId, { name }), [updateRobot])
  const updateRobotIP = useCallback((robotId, ip) => updateRobot(robotId, { ip }), [updateRobot])
  const updateRobotBridgePort = useCallback((robotId, bridgePort) => updateRobot(robotId, { bridgePort: parseInt(bridgePort, 10) || 8765 }), [updateRobot])

  const updateRobotStatus = useCallback((robotId, status) => {
    setRobots((current) => current.map((robot) => {
        if (robot.id !== robotId || robot.status === status) {
          return robot
        }
        return { ...robot, status, lastUpdated: new Date().toISOString() }
      }))
  }, [])

  const getRobot = useCallback((robotId) => {
    return robots.find((r) => r.id === robotId) || null
  }, [robots])

  const getSelectedRobot = useCallback(() => {
    return robots.find((r) => r.id === selectedRobotId) || null
  }, [robots, selectedRobotId])

  const value = useMemo(() => ({
    robots,
    selectedRobotId,
    loading,
    refreshRobots,
    selectRobot,
    updateRobotName,
    updateRobotIP,
    updateRobotBridgePort,
    updateRobotStatus,
    getRobot,
    getSelectedRobot,
  }), [getRobot, getSelectedRobot, loading, refreshRobots, robots, selectedRobotId, selectRobot, updateRobotBridgePort, updateRobotIP, updateRobotName, updateRobotStatus])

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>
}

export function useFleet() {
  const context = useContext(FleetContext)
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider')
  }
  return context
}
