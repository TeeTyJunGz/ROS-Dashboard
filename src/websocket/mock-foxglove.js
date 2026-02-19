// Comprehensive mock Foxglove Bridge for dual TurtleBot robots
// Supports full Foxglove protocol with realistic TurtleBot topics
// Usage: npm run mock:bridge
// TurtleBot 1: ws://localhost:8765
// TurtleBot 2: ws://localhost:8766
/* eslint-disable no-console */
const WebSocket = require('ws')

// ============================================================================
// TOPIC CONFIGURATIONS - Shared across all robots
// ============================================================================

function now() {
  return Date.now()
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

function generateLidarScan() {
  // Simulate 360 degree lidar scan with 0.25 degree resolution (1440 points)
  const scan = []
  for (let i = 0; i < 1440; i++) {
    const angle = (i / 1440) * Math.PI * 2
    const range = 5 + Math.random() * 18 - Math.abs(Math.sin(angle)) * 3
    scan.push({
      angle,
      range: Math.max(0.1, range),
      intensity: Math.random() * 255,
    })
  }
  return scan
}

function generateCameraData() {
  // Simulate RGB camera feed
  const width = 640
  const height = 480
  const data = []
  for (let i = 0; i < width * height * 3; i++) {
    data.push(Math.floor(Math.random() * 255))
  }
  return Buffer.from(data).toString('base64')
}

// ============================================================================
// ROBOT SIMULATOR CLASS
// ============================================================================

class TurtleBotServer {
  constructor(robotId, robotName, port) {
    this.robotId = robotId
    this.robotName = robotName
    this.port = port
    this.wss = null
    this.clients = new Set()
    
    // Robot state
    this.state = {
      odom: {
        x: Math.random() * 10,
        y: Math.random() * 10,
        theta: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
        vtheta: 0,
      },
      battery: 80 + Math.random() * 20,
      imu: {
        acc_x: 0,
        acc_y: 0,
        acc_z: 9.81,
        gyro_x: 0,
        gyro_y: 0,
        gyro_z: 0,
      },
      scan: generateLidarScan(),
      camera_rgb: generateCameraData(),
      timestamp: now(),
    }
  }

  // Create topic configurations dynamically for this robot
  getTopicConfigs() {
    const state = this.state
    
    return {
      // OLD TOPICS (backward compatible)
      '/sensor_data': {
        type: 'std_msgs/Float64',
        hz: 10,
        generator: () => ({
          value: (Math.sin(now() / 250) * 0.5 + 0.5) * 100
        })
      },
      '/rosout': {
        type: 'rosgraph_msgs/Log',
        hz: 2,
        generator: () => ({
          level: 2,
          name: `${this.robotName}_node`,
          msg: `[${this.robotName}] Log @ ${new Date().toLocaleTimeString()}`
        })
      },
      '/chatter': {
        type: 'std_msgs/String',
        hz: 2,
        generator: () => ({
          data: `Hello from ${this.robotName} @ ${new Date().toLocaleTimeString()}`
        })
      },
      '/velodyne_points': {
        type: 'sensor_msgs/PointCloud2',
        hz: 15,
        generator: () => ({
          points: generatePointCloudPoints(800)
        })
      },

      // NEW TURTLEBOT TOPICS (realistic)
      '/odom': {
        type: 'nav_msgs/Odometry',
        hz: 10,
        generator: () => {
          // Update position based on velocity
          state.odom.x += state.odom.vx * 0.1
          state.odom.y += state.odom.vy * 0.1
          state.odom.theta += state.odom.vtheta * 0.1

          return {
            header: {
              frame_id: 'odom',
              stamp: { secs: Math.floor(now() / 1000), nsecs: (now() % 1000) * 1000000 }
            },
            child_frame_id: 'base_footprint',
            pose: {
              pose: {
                position: {
                  x: state.odom.x,
                  y: state.odom.y,
                  z: 0
                },
                orientation: {
                  x: 0,
                  y: 0,
                  z: Math.sin(state.odom.theta / 2),
                  w: Math.cos(state.odom.theta / 2)
                }
              },
              covariance: [0.1, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0.05, 0, 0, 0, 0, 0, 0, 0.05, 0, 0, 0, 0, 0, 0, 0.1]
            },
            twist: {
              twist: {
                linear: {
                  x: state.odom.vx,
                  y: state.odom.vy,
                  z: 0
                },
                angular: {
                  x: 0,
                  y: 0,
                  z: state.odom.vtheta
                }
              },
              covariance: [0.1, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0.05, 0, 0, 0, 0, 0, 0, 0.05, 0, 0, 0, 0, 0, 0, 0.1]
            }
          }
        }
      },

      '/scan': {
        type: 'sensor_msgs/LaserScan',
        hz: 10,
        generator: () => {
          // Update with slight variations
          state.scan.forEach((point) => {
            point.range = Math.max(0.1, point.range + (Math.random() - 0.5) * 0.2)
            point.intensity = Math.random() * 255
          })

          return {
            header: {
              frame_id: 'laser',
              stamp: { secs: Math.floor(now() / 1000), nsecs: (now() % 1000) * 1000000 }
            },
            angle_min: 0,
            angle_max: Math.PI * 2,
            angle_increment: Math.PI * 2 / 1440,
            time_increment: 0,
            scan_time: 0.1,
            range_min: 0.1,
            range_max: 25.0,
            ranges: state.scan.map((s) => s.range),
            intensities: state.scan.map((s) => s.intensity)
          }
        }
      },

      '/battery_state': {
        type: 'sensor_msgs/BatteryState',
        hz: 2,
        generator: () => {
          // Simulate battery drain
          if (state.battery > 20) {
            state.battery -= 0.05
          }

          return {
            header: {
              frame_id: 'battery',
              stamp: { secs: Math.floor(now() / 1000), nsecs: (now() % 1000) * 1000000 }
            },
            voltage: 11.8 + (state.battery / 100) * 0.3,
            current: -5.5 + Math.random() * 2,
            charge: state.battery,
            capacity: 100,
            design_capacity: 100,
            percentage: Math.max(20, state.battery),
            power_supply_status: state.battery > 30 ? 2 : 1,
            power_supply_health: 2,
            power_supply_technology: 3,
            present: true,
            cell_voltage: [3.8, 3.85, 3.88, 3.87],
            location: `${this.robotName}_battery`,
            serial_number: `BAT-${this.robotId}`
          }
        }
      },

      '/imu': {
        type: 'sensor_msgs/Imu',
        hz: 20,
        generator: () => {
          // Update IMU with small noise
          state.imu.acc_x = (Math.random() - 0.5) * 0.5
          state.imu.acc_y = (Math.random() - 0.5) * 0.5
          state.imu.gyro_z = (Math.random() - 0.5) * 0.1

          return {
            header: {
              frame_id: 'imu_link',
              stamp: { secs: Math.floor(now() / 1000), nsecs: (now() % 1000) * 1000000 }
            },
            orientation: {
              x: Math.sin(state.odom.theta / 4),
              y: 0,
              z: 0,
              w: Math.cos(state.odom.theta / 4)
            },
            orientation_covariance: [0.0025, 0, 0, 0, 0.0025, 0, 0, 0, 0.0025],
            angular_velocity: {
              x: state.imu.gyro_x,
              y: state.imu.gyro_x * 0.1,
              z: state.imu.gyro_z
            },
            angular_velocity_covariance: [0.0009, 0, 0, 0, 0.0009, 0, 0, 0, 0.0009],
            linear_acceleration: {
              x: state.imu.acc_x,
              y: state.imu.acc_y,
              z: state.imu.acc_z
            },
            linear_acceleration_covariance: [0.0225, 0, 0, 0, 0.0225, 0, 0, 0, 0.0225]
          }
        }
      },

      '/camera/rgb/image_raw': {
        type: 'sensor_msgs/Image',
        hz: 5,
        generator: () => {
          // Regenerate camera data occasionally
          if (Math.random() < 0.3) {
            state.camera_rgb = generateCameraData()
          }

          return {
            header: {
              frame_id: 'camera_rgb_optical_frame',
              stamp: { secs: Math.floor(now() / 1000), nsecs: (now() % 1000) * 1000000 }
            },
            height: 480,
            width: 640,
            encoding: 'rgb8',
            is_bigendian: 0,
            step: 1920,
            data: state.camera_rgb
          }
        }
      },

      '/cmd_vel': {
        type: 'geometry_msgs/Twist',
        hz: 0,
        generator: () => ({
          linear: { x: state.odom.vx, y: state.odom.vy, z: 0 },
          angular: { x: 0, y: 0, z: state.odom.vtheta }
        })
      }
    }
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port })
    console.log(`\n🤖 ${this.robotName} Bridge starting on ws://localhost:${this.port}`)

    this.wss.on('connection', (ws) => {
      console.log(`  ✅ Client connected to ${this.robotName}`)
      this.clients.add(ws)

      // Per-connection state
      const clientState = {
        subscriptions: new Map(),
        timers: new Map()
      }

      ws.on('message', (raw) => {
        this.handleMessage(ws, raw, clientState)
      })

      ws.on('close', () => {
        console.log(`  ❌ Client disconnected from ${this.robotName}`)
        // Cleanup
        for (const timer of clientState.timers.values()) {
          clearInterval(timer.intervalId)
        }
        clientState.timers.clear()
        clientState.subscriptions.clear()
        this.clients.delete(ws)
      })

      ws.on('error', (error) => {
        console.error(`  ⚠️  ${this.robotName} error:`, error.message)
      })
    })

    console.log(`  📍 Listening for connections...`)
  }

  handleMessage(ws, raw, clientState) {
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      console.warn(`  ⚠️  Non-JSON message from ${this.robotName}`)
      return
    }

    const topicConfigs = this.getTopicConfigs()

    if (data.op === 'subscribe' && data.topic) {
      const config = topicConfigs[data.topic]
      if (config) {
        clientState.subscriptions.set(data.topic, config)
        this.startTopicTimer(ws, data.topic, config, clientState)
        console.log(`  📡 [${this.robotName}] subscribe: ${data.topic} (${config.type}) @ ${config.hz}Hz`)
      } else {
        console.warn(`  ⚠️  [${this.robotName}] unknown topic: ${data.topic}`)
      }
      return
    }

    if (data.op === 'unsubscribe' && data.topic) {
      clientState.subscriptions.delete(data.topic)
      this.stopTopicTimer(data.topic, clientState)
      console.log(`  🛑 [${this.robotName}] unsubscribe: ${data.topic}`)
      return
    }

    if (data.op === 'advertise') {
      console.log(`  📢 [${this.robotName}] advertise: ${data.topic}`)
      return
    }

    if (data.op === 'publish' && data.topic) {
      if (data.topic === '/cmd_vel') {
        // Handle velocity commands from joystick
        if (data.msg) {
          this.state.odom.vx = data.msg.linear?.x || 0
          this.state.odom.vy = data.msg.linear?.y || 0
          this.state.odom.vtheta = data.msg.angular?.z || 0
          console.log(
            `  🎮 [${this.robotName}] cmd_vel: vx=${this.state.odom.vx.toFixed(2)}, vtheta=${this.state.odom.vtheta.toFixed(2)}`
          )
        }
      }
      return
    }
  }

  startTopicTimer(ws, topic, config, clientState) {
    if (clientState.timers.has(topic)) return

    if (config.hz <= 0) return // Don't stream topics with 0 Hz

    const intervalMs = 1000 / config.hz
    const intervalId = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(intervalId)
        clientState.timers.delete(topic)
        return
      }

      const msg = config.generator()
      const frame = JSON.stringify({ op: 'message', topic, msg })
      ws.send(frame)
    }, intervalMs)

    clientState.timers.set(topic, { intervalId, config })
  }

  stopTopicTimer(topic, clientState) {
    const entry = clientState.timers.get(topic)
    if (entry) {
      clearInterval(entry.intervalId)
      clientState.timers.delete(topic)
    }
  }

  stop() {
    if (this.wss) {
      this.wss.close()
      console.log(`\n🛑 ${this.robotName} bridge stopped`)
    }
  }
}

// ============================================================================
// START SERVERS
// ============================================================================

console.log('\n' + '='.repeat(70))
console.log('🚀 Starting Mock Foxglove Bridges with Dual TurtleBots')
console.log('='.repeat(70))

const turtlebot1 = new TurtleBotServer('turtlebot-1', 'TurtleBot 1', 8765)
const turtlebot2 = new TurtleBotServer('turtlebot-2', 'TurtleBot 2', 8766)

turtlebot1.start()
turtlebot2.start()

console.log('\n✨ All bridges ready! Supported topics:')
console.log('   OLD (compatible): /sensor_data, /rosout, /chatter, /velodyne_points')
console.log('   NEW (TurtleBot):  /odom, /scan, /battery_state, /imu,')
console.log('                     /camera/rgb/image_raw, /cmd_vel')
console.log('\n' + '='.repeat(70) + '\n')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bridges...')
  turtlebot1.stop()
  turtlebot2.stop()
  process.exit()
})

