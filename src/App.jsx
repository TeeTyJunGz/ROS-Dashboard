import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FleetProvider } from './context/FleetContext'
import RobotSelectionPage from './components/RobotSelectionPage'
import DashboardApp from './DashboardApp'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <FleetProvider>
        <Routes>
          <Route path="/" element={<RobotSelectionPage />} />
          <Route path="/dashboard/:robotId" element={<DashboardApp />} />
          <Route path="*" element={<RobotSelectionPage />} />
        </Routes>
      </FleetProvider>
    </BrowserRouter>
  )
}

