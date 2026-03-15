import React, { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronDown, Trash2, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFleet } from '../context/FleetContext'
import { apiRequest } from '../utils/api'
import './AdminPage.css'

function buildEmptyPermissions(robots) {
  return robots.map((robot) => ({
    robotId: robot.id,
    canView: false,
    canControl: false,
    canEdit: false,
  }))
}

function buildPermissionMap(permissions) {
  return new Map((permissions || []).map((permission) => [permission.robotId, permission]))
}

function updatePermissionsList(permissions, robotId, key, nextValue) {
  return permissions.map((permission) => {
    if (permission.robotId !== robotId) {
      return permission
    }

    const nextPermission = { ...permission, [key]: nextValue }
    if ((key === 'canControl' || key === 'canEdit') && nextValue) {
      nextPermission.canView = true
    }
    if (key === 'canView' && !nextValue) {
      nextPermission.canControl = false
      nextPermission.canEdit = false
    }
    return nextPermission
  })
}

function getPermissionSummary(permission) {
  if (!permission?.canView) {
    return 'No access'
  }
  if (permission.canEdit) {
    return 'View, control, edit'
  }
  if (permission.canControl) {
    return 'View and control'
  }
  return 'View only'
}

export default function AdminPage() {
  const { isAdmin, user: currentUser } = useAuth()
  const { robots } = useFleet()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedManageRobotId, setSelectedManageRobotId] = useState('')
  const [selectedCreateRobotId, setSelectedCreateRobotId] = useState('')
  const [formState, setFormState] = useState({
    username: '',
    password: '',
    role: 'user',
    permissions: [],
  })
  const [draftPermissions, setDraftPermissions] = useState([])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await apiRequest('/api/users')
      setUsers(response.users)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  useEffect(() => {
    setFormState((current) => ({
      ...current,
      permissions: current.permissions.length > 0 ? current.permissions : buildEmptyPermissions(robots),
    }))

    if (!selectedCreateRobotId && robots[0]) {
      setSelectedCreateRobotId(robots[0].id)
    }
    if (!selectedManageRobotId && robots[0]) {
      setSelectedManageRobotId(robots[0].id)
    }
  }, [robots, selectedCreateRobotId, selectedManageRobotId])

  useEffect(() => {
    if (!selectedUserId && users[0]) {
      setSelectedUserId(String(users[0].id))
    }
    if (selectedUserId && !users.some((entry) => String(entry.id) === String(selectedUserId))) {
      setSelectedUserId(users[0] ? String(users[0].id) : '')
    }
  }, [selectedUserId, users])

  const selectedUser = useMemo(
    () => users.find((entry) => String(entry.id) === String(selectedUserId)) || null,
    [selectedUserId, users]
  )

  useEffect(() => {
    if (!selectedUser) {
      setDraftPermissions(buildEmptyPermissions(robots))
      return
    }

    const permissionMap = buildPermissionMap(selectedUser.permissions)
    setDraftPermissions(
      robots.map((robot) => ({
        robotId: robot.id,
        canView: Boolean(permissionMap.get(robot.id)?.canView),
        canControl: Boolean(permissionMap.get(robot.id)?.canControl),
        canEdit: Boolean(permissionMap.get(robot.id)?.canEdit),
      }))
    )
  }, [robots, selectedUser])

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const createPermission = formState.permissions.find((permission) => permission.robotId === selectedCreateRobotId)
  const managePermission = draftPermissions.find((permission) => permission.robotId === selectedManageRobotId)

  const handleCreatePermissionChange = (key, nextValue) => {
    setFormState((current) => ({
      ...current,
      permissions: updatePermissionsList(current.permissions, selectedCreateRobotId, key, nextValue),
    }))
  }

  const handleManagePermissionChange = (key, nextValue) => {
    setDraftPermissions((current) => updatePermissionsList(current, selectedManageRobotId, key, nextValue))
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        body: formState,
      })

      const nextUsers = [...users, response.user].sort((left, right) => left.username.localeCompare(right.username))
      setUsers(nextUsers)
      setSelectedUserId(String(response.user.id))
      setFormState({
        username: '',
        password: '',
        role: 'user',
        permissions: buildEmptyPermissions(robots),
      })
      setNotice('User created successfully.')
      setError('')
    } catch (createError) {
      setError(createError.message)
      setNotice('')
    }
  }

  const handlePermissionSave = async () => {
    if (!selectedUser) {
      return
    }

    try {
      const response = await apiRequest(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PUT',
        body: { permissions: draftPermissions },
      })

      setUsers((current) => current.map((entry) => (entry.id === selectedUser.id ? response.user : entry)))
      setNotice(`Permissions updated for ${selectedUser.username}.`)
      setError('')
    } catch (saveError) {
      setError(saveError.message)
      setNotice('')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      return
    }

    const confirmed = window.confirm(`Delete user "${selectedUser.username}"?`)
    if (!confirmed) {
      return
    }

    try {
      await apiRequest(`/api/users/${selectedUser.id}`, { method: 'DELETE' })
      const nextUsers = users.filter((entry) => entry.id !== selectedUser.id)
      setUsers(nextUsers)
      setSelectedUserId(nextUsers[0] ? String(nextUsers[0].id) : '')
      setNotice(`Deleted user ${selectedUser.username}.`)
      setError('')
    } catch (deleteError) {
      setError(deleteError.message)
      setNotice('')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="admin-eyebrow">Security</p>
            <h1>User Access Control</h1>
            <p className="admin-subtitle">Create accounts, pick a user from the dropdown, then adjust permissions one robot at a time.</p>
          </div>
          <button className="admin-refresh" onClick={loadUsers} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div className="admin-alert error">{error}</div>}
        {notice && <div className="admin-alert success">{notice}</div>}

        <div className="admin-layout">
          <form className="admin-card admin-card-create" onSubmit={handleCreateUser}>
            <div className="admin-card-heading">
              <div className="admin-card-icon"><UserPlus size={18} /></div>
              <div>
                <h2>Create User</h2>
                <p>New accounts start with no robot access until you enable it.</p>
              </div>
            </div>

            <label>
              Username
              <input
                type="text"
                value={formState.username}
                onChange={(event) => setFormState((current) => ({ ...current, username: event.target.value }))}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>

            <label>
              Role
              <div className="admin-select-wrap">
                <select
                  value={formState.role}
                  onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown size={16} />
              </div>
            </label>

            <div className="admin-permission-panel">
              <div className="admin-panel-header">
                <span>Robot Access</span>
                <span className="admin-summary-text">{getPermissionSummary(createPermission)}</span>
              </div>
              <label>
                Select Robot
                <div className="admin-select-wrap">
                  <select
                    value={selectedCreateRobotId}
                    onChange={(event) => setSelectedCreateRobotId(event.target.value)}
                  >
                    {robots.map((robot) => (
                      <option key={robot.id} value={robot.id}>{robot.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <div className="admin-toggle-list">
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={Boolean(createPermission?.canView)}
                    onChange={(event) => handleCreatePermissionChange('canView', event.target.checked)}
                  />
                  <span>View dashboard</span>
                </label>
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={Boolean(createPermission?.canControl)}
                    onChange={(event) => handleCreatePermissionChange('canControl', event.target.checked)}
                  />
                  <span>Control widgets</span>
                </label>
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={Boolean(createPermission?.canEdit)}
                    onChange={(event) => handleCreatePermissionChange('canEdit', event.target.checked)}
                  />
                  <span>Edit layout</span>
                </label>
              </div>
            </div>

            <button type="submit" className="admin-primary-button">Create User</button>
          </form>

          <div className="admin-card admin-card-manage">
            <div className="admin-card-heading">
              <div className="admin-card-icon"><Users size={18} /></div>
              <div>
                <h2>Manage Users</h2>
                <p>Choose one user and one robot at a time so the panel stays compact.</p>
              </div>
            </div>

            {loading ? (
              <p className="admin-empty">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="admin-empty">No users found.</p>
            ) : (
              <>
                <label>
                  Select User
                  <div className="admin-select-wrap">
                    <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                      {users.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.username}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </label>

                {selectedUser && (
                  <>
                    <div className="admin-user-hero">
                      <div>
                        <strong>{selectedUser.username}</strong>
                        <p>{selectedUser.role === 'admin' ? 'Administrator account' : 'Standard user account'}</p>
                      </div>
                      <span className={`admin-role-badge ${selectedUser.role}`}>{selectedUser.role}</span>
                    </div>

                    {selectedUser.role === 'admin' ? (
                      <div className="admin-permission-panel muted">
                        <div className="admin-panel-header">
                          <span>Full Access</span>
                        </div>
                        <p>Admins already have view, control, and edit access to every robot.</p>
                      </div>
                    ) : (
                      <div className="admin-permission-panel">
                        <div className="admin-panel-header">
                          <span>Robot Permissions</span>
                          <span className="admin-summary-text">{getPermissionSummary(managePermission)}</span>
                        </div>

                        <label>
                          Select Robot
                          <div className="admin-select-wrap">
                            <select
                              value={selectedManageRobotId}
                              onChange={(event) => setSelectedManageRobotId(event.target.value)}
                            >
                              {robots.map((robot) => (
                                <option key={robot.id} value={robot.id}>{robot.name}</option>
                              ))}
                            </select>
                            <ChevronDown size={16} />
                          </div>
                        </label>

                        <div className="admin-toggle-list">
                          <label className="admin-toggle-row">
                            <input
                              type="checkbox"
                              checked={Boolean(managePermission?.canView)}
                              onChange={(event) => handleManagePermissionChange('canView', event.target.checked)}
                            />
                            <span>View dashboard</span>
                          </label>
                          <label className="admin-toggle-row">
                            <input
                              type="checkbox"
                              checked={Boolean(managePermission?.canControl)}
                              onChange={(event) => handleManagePermissionChange('canControl', event.target.checked)}
                            />
                            <span>Control widgets</span>
                          </label>
                          <label className="admin-toggle-row">
                            <input
                              type="checkbox"
                              checked={Boolean(managePermission?.canEdit)}
                              onChange={(event) => handleManagePermissionChange('canEdit', event.target.checked)}
                            />
                            <span>Edit layout</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="admin-actions-row">
                      {selectedUser.role !== 'admin' && (
                        <button type="button" className="admin-primary-button" onClick={handlePermissionSave}>
                          Save Permissions
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={handleDeleteUser}
                        disabled={selectedUser.id === currentUser?.id}
                        title={selectedUser.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user'}
                      >
                        <Trash2 size={16} />
                        <span>Delete User</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}