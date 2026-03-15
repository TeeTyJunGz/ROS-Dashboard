const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const WebSocket = require('ws')
const { execFile } = require('child_process')
const { spawn } = require('node-pty')
const { randomUUID } = require('crypto')
const AnsiToHtml = require('ansi-to-html')
const {
  countAdminUsers,
  createUser,
  DB_PATH,
  deleteUser,
  getDashboard,
  getLock,
  getPermissionForUser,
  getRobotById,
  getUserById,
  getUserByUsername,
  listPermissionsForUser,
  listRobots,
  listUsers,
  acquireLock,
  releaseLock,
  replacePermissionsForUser,
  saveDashboard,
  updateRobot,
} = require('./backend/db')
const { clearAuthCookie, getAuthTokenFromRequest, setAuthCookie, verifyAuthToken } = require('./backend/auth')

const app = express()
const PORT = process.env.PORT || 5000
const TERMINAL_PORT = process.env.TERMINAL_PORT || 5001
const LOCK_TTL_MS = 15000

// Middleware
app.use(cors({ credentials: true, origin: true }))
app.use(cookieParser())
app.use(express.json())

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

function toPermissionFlags(permission) {
  return {
    canView: Boolean(permission?.canView),
    canControl: Boolean(permission?.canControl),
    canEdit: Boolean(permission?.canEdit),
  }
}

function sanitizeDashboardState(value) {
  if (!value || !Array.isArray(value.pages) || value.pages.length === 0) {
    return null
  }

  const pages = value.pages
    .filter((page) => page && typeof page === 'object')
    .map((page, pageIndex) => ({
      id: typeof page.id === 'string' && page.id.length > 0 ? page.id : `page-${pageIndex + 1}`,
      name: typeof page.name === 'string' && page.name.length > 0 ? page.name : `Page ${pageIndex + 1}`,
      widgets: Array.isArray(page.widgets) ? page.widgets : [],
    }))

  if (pages.length === 0) {
    return null
  }

  const currentPageId = typeof value.currentPageId === 'string' && pages.some((page) => page.id === value.currentPageId)
    ? value.currentPageId
    : pages[0].id

  return { pages, currentPageId }
}

function buildUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    isAdmin: user.role === 'admin',
    createdAt: user.createdAt,
  }
}

function getAccessForRobot(user, robotId) {
  if (!user) {
    return { canView: false, canControl: false, canEdit: false }
  }

  if (user.role === 'admin') {
    return { canView: true, canControl: true, canEdit: true }
  }

  return toPermissionFlags(getPermissionForUser(user.id, robotId))
}

function serializeRobotForUser(user, robot) {
  return {
    ...robot,
    permissions: getAccessForRobot(user, robot.id),
  }
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    const robot = getRobotById(req.params.robotId)
    if (!robot) {
      return res.status(404).json({ error: 'Robot not found' })
    }

    req.robot = robot
    const access = getAccessForRobot(req.user, robot.id)
    req.robotAccess = access

    if (!access[permissionKey]) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  next()
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}

app.use((req, res, next) => {
  const token = getAuthTokenFromRequest(req)
  if (!token) {
    req.user = null
    return next()
  }

  try {
    const payload = verifyAuthToken(token)
    const user = getUserById(payload.id)
    req.user = user || null
  } catch (error) {
    req.user = null
  }

  next()
})

function ensureBootstrapAdmin() {
  if (countAdminUsers() > 0) {
    return
  }

  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (!username || !password) {
    console.warn('[Auth] No admin users found. Set ADMIN_USERNAME and ADMIN_PASSWORD before starting the server.')
    return
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  createUser({ username, passwordHash, role: 'admin' })
  console.log(`[Auth] Bootstrapped admin user "${username}" using ${DB_PATH}`)
}

ensureBootstrapAdmin()

app.post('/api/auth/login', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const user = getUserByUsername(username)
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  setAuthCookie(res, user)
  res.json({ user: buildUserResponse(user) })
})

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ success: true })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: buildUserResponse(req.user) })
})

app.get('/api/auth/bootstrap-status', (req, res) => {
  res.json({
    hasAdmin: countAdminUsers() > 0,
    adminConfigured: Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD),
  })
})

app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  const users = listUsers().map((user) => ({
    ...buildUserResponse(user),
    permissions: listPermissionsForUser(user.id).map((permission) => ({
      robotId: permission.robotId,
      ...toPermissionFlags(permission),
    })),
  }))

  res.json({ users })
})

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const role = req.body?.role === 'admin' ? 'admin' : 'user'
  const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : []

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  if (getUserByUsername(username)) {
    return res.status(409).json({ error: 'Username already exists' })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  const user = createUser({ username, passwordHash, role })
  replacePermissionsForUser(user.id, permissions)

  res.status(201).json({
    user: {
      ...buildUserResponse(user),
      permissions,
    },
  })
})

app.put('/api/users/:userId/permissions', requireAuth, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.userId, 10)
  const user = getUserById(userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : []
  replacePermissionsForUser(userId, permissions)

  res.json({
    user: {
      ...buildUserResponse(user),
      permissions,
    },
  })
})

app.delete('/api/users/:userId', requireAuth, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.userId, 10)
  const user = getUserById(userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' })
  }

  deleteUser(userId)
  res.json({ success: true })
})

app.get('/api/robots', requireAuth, (req, res) => {
  const robots = listRobots()
    .map((robot) => serializeRobotForUser(req.user, robot))
    .filter((robot) => robot.permissions.canView)

  res.json({ robots })
})

app.put('/api/robots/:robotId', requireAuth, requireAdmin, (req, res) => {
  const robot = getRobotById(req.params.robotId)
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' })
  }

  const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : robot.name
  const ip = typeof req.body?.ip === 'string' && req.body.ip.trim() ? req.body.ip.trim() : robot.ip
  const bridgePort = Number.isFinite(Number(req.body?.bridgePort)) ? Number(req.body.bridgePort) : robot.bridgePort
  const terminalPort = Number.isFinite(Number(req.body?.terminalPort)) ? Number(req.body.terminalPort) : robot.terminalPort
  const mjpegPort = Number.isFinite(Number(req.body?.mjpegPort)) ? Number(req.body.mjpegPort) : robot.mjpegPort

  const updatedRobot = updateRobot(req.params.robotId, {
    name,
    ip,
    bridgePort,
    terminalPort,
    mjpegPort,
  })

  res.json({ robot: serializeRobotForUser(req.user, updatedRobot) })
})

/**
 * POST /api/dashboard/export
 * Export dashboard as a JSON file download
 * Body: { pages: [...], currentPageId: "..." }
 */
app.post('/api/dashboard/export', (req, res) => {
  try {
    const { pages, currentPageId } = req.body

    if (!pages) {
      return res.status(400).json({ error: 'pages is required' })
    }

    const dashboardData = {
      pages,
      currentPageId,
      exportedAt: new Date().toISOString()
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="ros-dashboard.json"')
    res.json(dashboardData)
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export dashboard' })
  }
})

/**
 * POST /api/dashboard/import
 * Import dashboard from uploaded JSON file
 * File: multipart form-data with field "file"
 */
app.post('/api/dashboard/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileContent = req.file.buffer.toString('utf-8')
    const dashboardData = JSON.parse(fileContent)

    if (!dashboardData.pages) {
      return res.status(400).json({ error: 'Invalid dashboard file: missing pages' })
    }

    res.json({
      success: true,
      data: dashboardData,
      message: 'Dashboard imported successfully'
    })
  } catch (error) {
    console.error('Import error:', error)
    
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON file' })
    }
    
    res.status(500).json({ error: 'Failed to import dashboard' })
  }
})

app.get('/api/robots/:robotId/dashboard', requireAuth, requirePermission('canView'), (req, res) => {
  const dashboard = getDashboard(req.robot.id)

  if (!dashboard) {
    return res.json({
      dashboard: {
        pages: [{ id: 'page-1', name: 'Page 1', widgets: [] }],
        currentPageId: 'page-1',
      },
      updatedAt: null,
    })
  }

  res.json({
    dashboard: JSON.parse(dashboard.stateJson),
    updatedAt: dashboard.updatedAt,
  })
})

app.put('/api/robots/:robotId/dashboard', requireAuth, requirePermission('canEdit'), (req, res) => {
  const dashboardState = sanitizeDashboardState(req.body)
  if (!dashboardState) {
    return res.status(400).json({ error: 'Invalid dashboard state' })
  }

  const saved = saveDashboard(req.robot.id, JSON.stringify(dashboardState), req.user.id)
  res.json({
    dashboard: JSON.parse(saved.stateJson),
    updatedAt: saved.updatedAt,
  })
})

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dashboard API server is running' })
})

app.get('/api/robots/:robotId/lock', requireAuth, requirePermission('canView'), (req, res) => {
  const lock = getLock(req.robot.id)
  res.json({
    lock: lock
      ? {
          robotId: lock.robotId,
          userId: lock.userId,
          username: lock.username,
          acquiredAt: lock.acquiredAt,
          expiresAt: lock.expiresAt,
          isOwnedByCurrentUser: lock.userId === req.user.id,
        }
      : null,
  })
})

app.post('/api/robots/:robotId/lock', requireAuth, requirePermission('canControl'), (req, res) => {
  const currentLock = getLock(req.robot.id)
  if (currentLock && currentLock.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(409).json({
      error: 'Robot is currently controlled by another user',
      lock: {
        robotId: currentLock.robotId,
        userId: currentLock.userId,
        username: currentLock.username,
        acquiredAt: currentLock.acquiredAt,
        expiresAt: currentLock.expiresAt,
        isOwnedByCurrentUser: false,
      },
    })
  }

  const lock = acquireLock(req.robot.id, req.user.id, LOCK_TTL_MS)
  res.json({
    lock: {
      robotId: lock.robotId,
      userId: lock.userId,
      username: lock.username,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
      isOwnedByCurrentUser: true,
    },
  })
})

app.post('/api/robots/:robotId/lock/heartbeat', requireAuth, requirePermission('canControl'), (req, res) => {
  const currentLock = getLock(req.robot.id)
  if (!currentLock) {
    return res.status(404).json({ error: 'No active lock' })
  }

  if (currentLock.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Lock is owned by another user' })
  }

  const lock = acquireLock(req.robot.id, currentLock.userId, LOCK_TTL_MS)
  res.json({
    lock: {
      robotId: lock.robotId,
      userId: lock.userId,
      username: lock.username,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
      isOwnedByCurrentUser: lock.userId === req.user.id,
    },
  })
})

app.delete('/api/robots/:robotId/lock', requireAuth, requirePermission('canControl'), (req, res) => {
  const currentLock = getLock(req.robot.id)
  if (!currentLock) {
    return res.json({ success: true })
  }

  if (currentLock.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Lock is owned by another user' })
  }

  releaseLock(req.robot.id)
  res.json({ success: true })
})

/**
 * POST /api/robots/status
 * Check whether robot hosts respond to ping independently of Foxglove bridge status.
 * Body: { robots: [{ id: string, ip: string }] }
 */
app.post('/api/robots/status', async (req, res) => {
  try {
    const requestRobots = Array.isArray(req.body?.robots) ? req.body.robots : []
    const robots = requestRobots.filter((robot) => getAccessForRobot(req.user, robot.id).canView)
    if (robots.length === 0) {
      return res.status(400).json({ error: 'robots array is required' })
    }

    const results = await Promise.all(
      robots.map(async (robot) => {
        const ip = typeof robot?.ip === 'string' ? robot.ip.trim() : ''
        if (!ip) {
          return {
            id: robot?.id,
            ip,
            alive: false
          }
        }

        const alive = await pingHost(ip)
        return {
          id: robot.id,
          ip,
          alive
        }
      })
    )

    res.json({ robots: results })
  } catch (error) {
    console.error('Robot status check error:', error)
    res.status(500).json({ error: 'Failed to check robot status' })
  }
})

// Terminal Session Manager
const terminalSessions = new Map()

function pingHost(ip) {
  return new Promise((resolve) => {
    execFile('ping', ['-c', '1', '-W', '1', ip], (error) => {
      resolve(!error)
    })
  })
}

// WebSocket Server for Terminal (separate from Express)
const wss = new WebSocket.Server({ port: TERMINAL_PORT })

wss.on('connection', (ws) => {
  const sessionId = randomUUID()
  const ansiToHtml = new AnsiToHtml()

  // Create PTY session with bash shell
  const pty = spawn('/bin/bash', [], {
    name: 'xterm-color',
    cols: 120,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  })

  terminalSessions.set(sessionId, { pty, ws })

  // PTY stdout/stderr → WebSocket client
  pty.on('data', (buffer) => {
    try {
      let output = buffer.toString()

      // Filter out unwanted ANSI sequences
      // Remove bracketed paste mode sequences
      output = output.replace(/\?2004[hl]/g, '')
      // Remove terminal title sequences
      output = output.replace(/\]0;[^\u0007]*\u0007/g, '')
      output = output.replace(/\]0;[^\x07]*\x07/g, '')
      // Remove other OSC sequences (Operating System Command)
      output = output.replace(/\x1b\][^\x07]*\x07/g, '')

      const htmlOutput = ansiToHtml.toHtml(output)
      ws.send(JSON.stringify({
        type: 'output',
        data: htmlOutput
      }))
    } catch (err) {
      console.error('[Terminal] Output conversion error:', err)
    }
  })

  // WebSocket client → PTY stdin
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message)

      if (msg.type === 'input') {
        // User typed a command
        pty.write(msg.data)
      } else if (msg.type === 'resize') {
        // Terminal was resized
        pty.resize(msg.cols, msg.rows)
      }
    } catch (err) {
      console.error('[Terminal] Message error:', err)
    }
  })

  // Cleanup on disconnect
  ws.on('close', () => {
    if (pty) {
      pty.kill()
    }
    terminalSessions.delete(sessionId)
    console.log(`[Terminal] Session ${sessionId} closed`)
  })

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId: sessionId
  }))

  console.log(`[Terminal] New session: ${sessionId}`)
})

// Start Express server
app.listen(PORT, () => {
  console.log(`Dashboard API server running on http://localhost:${PORT}`)
  console.log('  POST /api/auth/login - Login')
  console.log('  GET  /api/auth/me - Current user')
  console.log('  GET  /api/robots - List accessible robots')
  console.log('  GET  /api/health - Health check')
  console.log(`Terminal server running on ws://localhost:${TERMINAL_PORT}`)
})
