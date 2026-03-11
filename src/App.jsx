import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FleetProvider } from './context/FleetContext'
import { TerminalWebSocketProvider } from './context/TerminalWebSocketContext'
import RobotSelectionPage from './components/RobotSelectionPage'
import DashboardApp from './DashboardApp'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <FleetProvider>
        <TerminalWebSocketProvider>
          <Routes>
            <Route path="/" element={<RobotSelectionPage />} />
            <Route path="/dashboard/:robotId" element={<DashboardApp />} />
            <Route path="*" element={<RobotSelectionPage />} />
          </Routes>
        </TerminalWebSocketProvider>
      </FleetProvider>
    </BrowserRouter>
  )
}

