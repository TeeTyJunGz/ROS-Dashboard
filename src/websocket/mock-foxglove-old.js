// Simple mock Foxglove Bridge-like WebSocket server for local testing
// Usage: npm run mock:bridge
// Serves on ws://localhost:8765
/* eslint-disable no-console */
const WebSocket = require('ws')

const PORT = process.env.MOCK_BRIDGE_PORT ? Number(process.env.MOCK_BRIDGE_PORT) : 8765
const wss = new WebSocket.Server({ port: PORT })

console.log(`[mock-foxglove] Starting on ws://localhost:${PORT}`)

function now() {
  return Date.now()
}

function envRateForTopic(topic, defaultHz) {
  const key = topic.replace(/^\//, '').replace(/\//g, '_').toUpperCase()
  const envKey = `MOCK_RATE_${key}`
  const envValue = process.env[envKey]
  if (envValue) {
    const parsed = Number(envValue)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  if (process.env.MOCK_RATE_DEFAULT) {
    const fallback = Number(process.env.MOCK_RATE_DEFAULT)
    if (Number.isFinite(fallback) && fallback > 0) {
      return fallback
    }
  }
  return defaultHz
}

const TOPIC_CONFIGS = {
  '/sensor_data': {
    type: 'std_msgs/Float64',
    hz: envRateForTopic('/sensor_data', 10),
    generator: () => ({ value: (Math.sin(now() / 250) * 0.5 + 0.5) * 100 })
  },
  '/rosout': {
    type: 'rosgraph_msgs/Log',
    hz: envRateForTopic('/rosout', 2),
    generator: () => ({ level: 2, name: 'mock_node', msg: `Mock log ${new Date().toLocaleTimeString()}` })
  },
  '/chatter': {
    type: 'std_msgs/String',
    hz: envRateForTopic('/chatter', 2),
    generator: () => ({ data: `Hello @ ${new Date().toLocaleTimeString()}` })
  },
  '/velodyne_points': {
    type: 'sensor_msgs/PointCloud2',
    hz: envRateForTopic('/velodyne_points', 15),
    generator: () => ({ points: generatePointCloudPoints(800) })
  }
}

function resolveTopicConfig(topic, requestedType) {
  const base = TOPIC_CONFIGS[topic]
  if (base) {
    return {
      ...base,
      type: requestedType || base.type
    }
  }
  const hz = envRateForTopic(topic, 5)
  return {
    type: requestedType || '',
    hz,
    generator: () => ({ data: Math.random() })
  }
}

function generatePointCloudPoints(count) {
  const points = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 5
    const height = (Math.random() - 0.5) * 2
    points.push({
      x: Math.cos(angle) * radius,
      y: height,
      z: Math.sin(angle) * radius
    })
  }
  return points
}

// Per-connection state
function createClientState() {
  return {
    subscriptions: new Map(), // topic -> config
    timers: new Map() // topic -> { intervalId }
  }
}

function startTopicTimer(ws, state, topic, config) {
  if (state.timers.has(topic)) return
  const intervalMs = config.hz > 0 ? 1000 / config.hz : 1000
  const intervalId = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(intervalId)
      state.timers.delete(topic)
      return
    }
    const msg = config.generator()
    const frame = JSON.stringify({ op: 'message', topic, msg })
    ws.send(frame)
  }, intervalMs)
  state.timers.set(topic, { intervalId, config })
  console.log(`[mock-foxglove] streaming ${topic} @ ${config.hz} Hz`)
}

function stopTopicTimer(state, topic) {
  const entry = state.timers.get(topic)
  if (entry) {
    clearInterval(entry.intervalId)
    state.timers.delete(topic)
  }
}

wss.on('connection', (ws) => {
  console.log('[mock-foxglove] Client connected')
  const state = createClientState()

  ws.on('message', (raw) => {
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      console.warn('[mock-foxglove] Non-JSON message ignored')
      return
    }

    if (data.op === 'subscribe' && data.topic) {
      const config = resolveTopicConfig(data.topic, data.type || '')
      state.subscriptions.set(data.topic, config)
      startTopicTimer(ws, state, data.topic, config)
      console.log('[mock-foxglove] subscribe', data.topic, config.type)
      return
    }
    if (data.op === 'unsubscribe' && data.topic) {
      state.subscriptions.delete(data.topic)
      stopTopicTimer(state, data.topic)
      console.log('[mock-foxglove] unsubscribe', data.topic)
      return
    }
    if (data.op === 'advertise') {
      // No-op for mock; accept any advertise
      return
    }
    if (data.op === 'publish') {
      console.log('[mock-foxglove] publish', data.topic, data.msg)
      // Echo back a confirmation or just ignore
      return
    }
  })

  ws.on('close', () => {
    console.log('[mock-foxglove] Client disconnected')
    // Cleanup timers
    for (const id of state.timers.values()) clearInterval(id)
    state.timers.clear()
    state.subscriptions.clear()
  })
})

wss.on('listening', () => {
  console.log(`[mock-foxglove] Ready on ws://localhost:${PORT}`)
})

