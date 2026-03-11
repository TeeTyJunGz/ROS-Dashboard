import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const FleetContext = createContext()

const DEFAULT_BRIDGE_PORT = 8765

const buildBridgeUrl = (ip, bridgePort = DEFAULT_BRIDGE_PORT) => `ws://${ip}:${bridgePort}`

const DEFAULT_ROBOTS = [
  {
    id: 'turtlebot-1',
    name: 'TurtleBot 1',
    ip: '192.168.1.69',
    bridgePort: DEFAULT_BRIDGE_PORT,
    status: 'unknown',
    bridgeUrl: buildBridgeUrl('192.168.1.69', DEFAULT_BRIDGE_PORT),
    lastUpdated: new Date(),
  },
  {
    id: 'turtlebot-2',
    name: 'TurtleBot 2',
    ip: '192.168.1.85',
    bridgePort: DEFAULT_BRIDGE_PORT,
    status: 'unknown',
    bridgeUrl: buildBridgeUrl('192.168.1.85', DEFAULT_BRIDGE_PORT),
    lastUpdated: new Date(),
  },
]

const getBridgePortFromRobot = (robot) => {
  if (Number.isFinite(robot?.bridgePort)) {
    return robot.bridgePort
  }

  if (typeof robot?.bridgePort === 'string' && robot.bridgePort.trim() !== '') {
    const parsedPort = parseInt(robot.bridgePort, 10)
    if (Number.isFinite(parsedPort)) {
      return parsedPort
    }
  }

  if (typeof robot?.bridgeUrl === 'string') {
    try {
      return parseInt(new URL(robot.bridgeUrl).port, 10) || DEFAULT_BRIDGE_PORT
    } catch (error) {
      // Ignore malformed stored URLs and fall back to the default port.
    }
  }

  return DEFAULT_BRIDGE_PORT
}

const normalizeRobot = (robot) => {
  const bridgePort = getBridgePortFromRobot(robot)
  const ip = robot?.ip || '127.0.0.1'

  return {
    ...robot,
    ip,
    bridgePort,
    status: robot?.status || 'unknown',
    bridgeUrl: buildBridgeUrl(ip, bridgePort),
    lastUpdated: robot?.lastUpdated || new Date(),
  }
}

// Helper function to slugify names to IDs
const slugifyName = (name) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// Utility to get unique robotId when name changes
const getUniqueRobotId = (name, existingRobots, excludeId = null) => {
  let baseId = slugifyName(name)
  let id = baseId
  let counter = 2

  // Check if this ID already exists (excluding current robot)
  while (existingRobots.some(r => r.id === id && r.id !== excludeId)) {
    id = `${baseId}-${counter}`
    counter++
  }

  return id
}

// Load initial robots from localStorage or use defaults
const getInitialRobots = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_ROBOTS
  }

  try {
    const stored = window.localStorage.getItem('robotsFleetData')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeRobot)
      }
    }
  } catch (error) {
    console.error('Failed to load robots from localStorage:', error)
  }

  return DEFAULT_ROBOTS
}

export function FleetProvider({ children }) {
  const [robots, setRobots] = useState(getInitialRobots())

  const [selectedRobotId, setSelectedRobotId] = useState('turtlebot-1')

  // Save robots to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('robotsFleetData', JSON.stringify(robots))
    } catch (error) {
      console.error('Failed to persist robots to localStorage:', error)
    }
  }, [robots])

  const selectRobot = useCallback((robotId) => {
    setSelectedRobotId(robotId)
  }, [])

  const updateRobotName = useCallback((robotId, name) => {
    setRobots((prevRobots) => {
      // Generate new ID based on the new name
      const newId = getUniqueRobotId(name, prevRobots, robotId)
      
      // Update robot with new name and ID
      const updatedRobots = prevRobots.map((robot) => {
        if (robot.id === robotId) {
          return { ...robot, name, id: newId }
        }
        return robot
      })

      // If the selected robot was renamed, update selected ID
      if (selectedRobotId === robotId) {
        setSelectedRobotId(newId)
      }

      return updatedRobots
    })
  }, [selectedRobotId])

  const updateRobotIP = useCallback((robotId, ip) => {
    setRobots((prevRobots) =>
      prevRobots.map((robot) =>
        robot.id === robotId
          ? {
              ...robot,
              ip,
              bridgeUrl: buildBridgeUrl(ip, getBridgePortFromRobot(robot)),
              terminalUrl: `ws://${ip}:5001`
            }
          : robot
      )
    )
  }, [])

  const updateRobotBridgePort = useCallback((robotId, bridgePort) => {
    const parsedPort = parseInt(bridgePort, 10)
    const nextBridgePort = Number.isFinite(parsedPort) ? parsedPort : DEFAULT_BRIDGE_PORT

    setRobots((prevRobots) =>
      prevRobots.map((robot) =>
        robot.id === robotId
          ? {
              ...robot,
              bridgePort: nextBridgePort,
              bridgeUrl: buildBridgeUrl(robot.ip, nextBridgePort)
            }
          : robot
      )
    )
  }, [])

  const updateRobotStatus = useCallback((robotId, status) => {
    setRobots((prevRobots) => {
      let hasChanged = false

      const nextRobots = prevRobots.map((robot) => {
        if (robot.id !== robotId) {
          return robot
        }

        if (robot.status === status) {
          return robot
        }

        hasChanged = true
        return { ...robot, status, lastUpdated: new Date() }
      })

      return hasChanged ? nextRobots : prevRobots
    })
  }, [])

  const getRobot = useCallback((robotId) => {
    return robots.find((r) => r.id === robotId)
  }, [robots])

  const getRobotByOldId = useCallback((oldId) => {
    // This is used to find a robot even if its ID has changed
    // For now, we'll just return the same as getRobot
    return robots.find((r) => r.id === oldId)
  }, [robots])

  const getSelectedRobot = useCallback(() => {
    return robots.find((r) => r.id === selectedRobotId)
  }, [robots, selectedRobotId])

  const value = {
    robots,
    selectedRobotId,
    selectRobot,
    updateRobotName,
    updateRobotIP,
    updateRobotBridgePort,
    updateRobotStatus,
    getRobot,
    getRobotByOldId,
    getSelectedRobot,
  }

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>
}

export function useFleet() {
  const context = useContext(FleetContext)
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider')
  }
  return context
}
