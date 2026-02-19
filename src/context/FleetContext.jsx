import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const FleetContext = createContext()

const DEFAULT_ROBOTS = [
  {
    id: 'turtlebot-1',
    name: 'TurtleBot 1',
    ip: '192.168.1.100',
    status: 'connected',
    bridgeUrl: 'ws://localhost:8765',
    lastUpdated: new Date(),
  },
  {
    id: 'turtlebot-2',
    name: 'TurtleBot 2',
    ip: '192.168.1.101',
    status: 'connected',
    bridgeUrl: 'ws://localhost:8766',
    lastUpdated: new Date(),
  },
]

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
        return parsed
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
        robot.id === robotId ? { ...robot, ip } : robot
      )
    )
  }, [])

  const updateRobotStatus = useCallback((robotId, status) => {
    setRobots((prevRobots) =>
      prevRobots.map((robot) =>
        robot.id === robotId 
          ? { ...robot, status, lastUpdated: new Date() } 
          : robot
      )
    )
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
