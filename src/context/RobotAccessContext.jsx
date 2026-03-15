import React, { createContext, useContext } from 'react'

const RobotAccessContext = createContext(null)

export function RobotAccessProvider({ value, children }) {
  return <RobotAccessContext.Provider value={value}>{children}</RobotAccessContext.Provider>
}

export function useRobotAccess() {
  const context = useContext(RobotAccessContext)
  if (!context) {
    throw new Error('useRobotAccess must be used within a RobotAccessProvider')
  }
  return context
}