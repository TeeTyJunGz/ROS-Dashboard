import React from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FleetProvider } from './context/FleetContext'
import LoginPage from './components/LoginPage'
import RobotSelectionPage from './components/RobotSelectionPage'
import AdminPage from './components/AdminPage'
import DashboardApp from './DashboardApp'
import './App.css'

function AuthenticatedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function AdminRoute() {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FleetProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthenticatedRoute />}>
              <Route path="/" element={<RobotSelectionPage />} />
              <Route path="/dashboard/:robotId" element={<DashboardApp />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FleetProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

