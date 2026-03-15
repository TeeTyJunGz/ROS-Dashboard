import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ApiError, apiRequest } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bootstrapStatus, setBootstrapStatus] = useState({ hasAdmin: true, adminConfigured: true })

  const refreshSession = useCallback(async () => {
    setLoading(true)
    try {
      const [statusResponse, meResponse] = await Promise.all([
        apiRequest('/api/auth/bootstrap-status'),
        apiRequest('/api/auth/me').catch((error) => {
          if (error instanceof ApiError && error.status === 401) {
            return { user: null }
          }
          throw error
        }),
      ])

      setBootstrapStatus(statusResponse)
      setUser(meResponse.user || null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession().catch((error) => {
      console.error('Failed to initialize auth session:', error)
      setLoading(false)
    })
  }, [refreshSession])

  const login = useCallback(async (username, password) => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  const value = {
    user,
    loading,
    bootstrapStatus,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    logout,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}