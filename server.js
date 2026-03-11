const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const WebSocket = require('ws')
const { spawn } = require('node-pty')
const { randomUUID } = require('crypto')
const AnsiToHtml = require('ansi-to-html')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Create a directory to store exported dashboards (optional)
const dashboardsDir = path.join(__dirname, 'dashboards')
if (!fs.existsSync(dashboardsDir)) {
  fs.mkdirSync(dashboardsDir, { recursive: true })
}

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

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dashboard API server is running' })
})

// Terminal Session Manager
const terminalSessions = new Map()

// WebSocket Server for Terminal (separate from Express)
const wss = new WebSocket.Server({ port: 5001 })

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
  console.log(`📊 Dashboard API server running on http://localhost:${PORT}`)
  console.log(`   POST /api/dashboard/export - Export dashboard`)
  console.log(`   POST /api/dashboard/import - Import dashboard`)
  console.log(`   GET  /api/health - Health check`)
  console.log(`🖥️  Terminal server running on ws://localhost:5001`)
})
