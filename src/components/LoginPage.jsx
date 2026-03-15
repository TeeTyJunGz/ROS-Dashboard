import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Lock, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const location = useLocation()
  const { isAuthenticated, loading, login, bootstrapStatus } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="login-page"><div className="login-card">Loading...</div></div>
  }

  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/'
    return <Navigate to={destination} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await login(username, password)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isBootstrapMissing = !bootstrapStatus.hasAdmin && !bootstrapStatus.adminConfigured

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Lock size={26} />
          </div>
          <div>
            <h1>ROS Dashboard Login</h1>
            <p>Sign in with an admin-created account to access robot dashboards.</p>
          </div>
        </div>

        {isBootstrapMissing && (
          <div className="login-alert">
            <ShieldAlert size={18} />
            <span>Set ADMIN_USERNAME and ADMIN_PASSWORD before first startup.</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={submitting || isBootstrapMissing}>
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}