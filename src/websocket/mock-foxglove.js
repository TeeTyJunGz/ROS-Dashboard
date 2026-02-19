// Realistic TurtleBot ROS2 multi-robot mock Foxglove Bridge
// Usage: npm run mock:bridge
// Serves TurtleBot 1 on ws://localhost:8765 and TurtleBot 2 on ws://localhost:8766
/* eslint-disable no-console */
const WebSocket = require('ws')

// Realistic TurtleBot ROS2 topic data simulator
class TurtleBotSimulator {
  constructor(robotId, robotName, port) {
    this.robotId = robotId
    this.robotName = robotName
    this.port = port
    this.wss = null
    this.clients = new Set()
    this.simulationData = {
      odom: {
        x: Math.random() * 10,
        y: Math.random() * 10,
        theta: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
        vtheta: 0,
      },
      battery: 100,
      imu: {
        acc_x: 0,
        acc_y: 0,
        acc_z: 9.81,
        gyro_x: 0,
        gyro_y: 0,
        gyro_z: 0,
      },
      scan: [],
      camera_rgb: null,
      diagnostics: {
        status: 'OK',
        errorCount: 0,
        warningCount: 0,
      },
    }

    // Pre-generate realistic lidar scan data
    this.generateLidarScan()
    this.generateCameraData()
  }

  generateLidarScan() {
    // Simulate 360 degree lidar scan with 0.25 degree resolution (1440 points)
    const scan = []
    for (let i = 0; i < 1440; i++) {
      const angle = (i / 1440) * Math.PI * 2
      // Simulate obstacles and free space
      const range = 5 + Math.random() * 18 - Math.abs(Math.sin(angle)) * 3
      scan.push({
        angle,
        range: Math.max(0.1, range),
        intensity: Math.random() * 255,
      })
    }
    this.simulationData.scan = scan
  }

  generateCameraData() {
    // Simulate camera feed with realistic RGB data
    const width = 640
    const height = 480
    const data = []
    for (let i = 0; i < width * height * 3; i++) {
      data.push(Math.floor(Math.random() * 255))
    }
    this.simulationData.camera_rgb = {
      width,
      height,
      encoding: 'rgb8',
      frame_id: 'camera_link',
      data: Buffer.from(data).toString('base64'),
    }
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port })
    console.log(`🤖 ${this.robotName} Bridge simulator running on ws://localhost:${this.port}`)

    this.wss.on('connection', (ws) => {
      console.log(`✅ Client connected to ${this.robotName}`)
      this.clients.add(ws)

      ws.on('message', (message) => {
        this.handleMessage(ws, message)
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        console.log(`❌ Client disconnected from ${this.robotName}`)
      })
    })

    // Start simulation loop - update data every 100ms (10Hz)
    this.simulationInterval = setInterval(() => {
      this.updateSimulation()
      this.broadcastData()
    }, 100)
  }

  updateSimulation() {
    // Simulate odometry changes (position tracking)
    this.simulationData.odom.x += this.simulationData.odom.vx * 0.1
    this.simulationData.odom.y += this.simulationData.odom.vy * 0.1
    this.simulationData.odom.theta += this.simulationData.odom.vtheta * 0.1

    // Simulate battery drain slowly (realistic TurtleBot battery)
    if (this.simulationData.battery > 20) {
      this.simulationData.battery -= 0.02
    }

    // Simulate small IMU noise (accelerometer and gyro)
    this.simulationData.imu.acc_x = (Math.random() - 0.5) * 0.5
    this.simulationData.imu.acc_y = (Math.random() - 0.5) * 0.5
    this.simulationData.imu.gyro_z = (Math.random() - 0.5) * 0.1

    // Update scan with slight variations (lidar noise)
    this.simulationData.scan.forEach((point) => {
      point.range = Math.max(0.1, point.range + (Math.random() - 0.5) * 0.2)
      point.intensity = Math.random() * 255
    })

    // Regenerate camera data occasionally (camera frame)
    if (Math.random() < 0.1) {
      this.generateCameraData()
    }
  }

  broadcastData() {
    const message = JSON.stringify({
      type: 'message',
      timestamp: Date.now(),
      robotId: this.robotId,
      robotName: this.robotName,
      topics: {
        '/odom': {
          data: {
            pose: {
              pose: {
                position: {
                  x: this.simulationData.odom.x,
                  y: this.simulationData.odom.y,
                  z: 0,
                },
                orientation: {
                  x: 0,
                  y: 0,
                  z: Math.sin(this.simulationData.odom.theta / 2),
                  w: Math.cos(this.simulationData.odom.theta / 2),
                },
              },
              twist: {
                twist: {
                  linear: {
                    x: this.simulationData.odom.vx,
                    y: this.simulationData.odom.vy,
                    z: 0,
                  },
                  angular: {
                    x: 0,
                    y: 0,
                    z: this.simulationData.odom.vtheta,
                  },
                },
              },
            },
          },
        },
        '/scan': {
          data: {
            ranges: this.simulationData.scan.map((s) => s.range),
            intensities: this.simulationData.scan.map((s) => s.intensity),
            angle_min: 0,
            angle_max: Math.PI * 2,
            angle_increment: Math.PI * 2 / 1440,
            time_increment: 0,
            scan_time: 0.1,
            range_min: 0.1,
            range_max: 25.0,
          },
        },
        '/battery_state': {
          data: {
            percentage: Math.max(20, Math.round(this.simulationData.battery)),
            power_supply_status: 1,
            power_supply_health: 2,
          },
        },
        '/imu': {
          data: {
            linear_acceleration: {
              x: this.simulationData.imu.acc_x,
              y: this.simulationData.imu.acc_y,
              z: this.simulationData.imu.acc_z,
            },
            angular_velocity: {
              x: this.simulationData.imu.gyro_x,
              y: this.simulationData.imu.gyro_y,
              z: this.simulationData.imu.gyro_z,
            },
          },
        },
        '/camera/rgb/image_raw': {
          data: this.simulationData.camera_rgb,
        },
      },
    })

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message)

      // Handle command messages (e.g., publishing to cmd_vel)
      if (data.type === 'publish' && data.topic === '/cmd_vel') {
        this.simulationData.odom.vx = data.message.linear.x
        this.simulationData.odom.vy = data.message.linear.y
        this.simulationData.odom.vtheta = data.message.angular.z
      }

      // Handle subscription requests
      if (data.type === 'subscribe') {
        ws.send(
          JSON.stringify({
            type: 'subscription_response',
            topic: data.topic,
            status: 'subscribed',
          })
        )
      }
    } catch (error) {
      console.error(`Error handling message from ${this.robotName}:`, error)
    }
  }

  stop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
    }
    if (this.wss) {
      this.wss.close()
    }
  }
}

// Create and start two TurtleBot simulators running on different ports
const turtlebot1 = new TurtleBotSimulator('turtlebot-1', 'TurtleBot 1', 8765)
const turtlebot2 = new TurtleBotSimulator('turtlebot-2', 'TurtleBot 2', 8766)

console.log('\n🚀 Starting Mock Foxglove Bridge with 2 TurtleBots...')
console.log('📍 TurtleBot 1: ws://localhost:8765')
console.log('📍 TurtleBot 2: ws://localhost:8766')
console.log('🔴 Both robots are in connected state with realistic sensor data\n')

turtlebot1.start()
turtlebot2.start()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bridge...')
  turtlebot1.stop()
  turtlebot2.stop()
  process.exit()
})

