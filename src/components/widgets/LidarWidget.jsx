import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useWebSocket } from '../../context/WebSocketContext'
import './LidarWidget.css'

const LidarWidget = ({ widget }) => {
  const { messages, subscribeToTopic, unsubscribeFromTopic } = useWebSocket()
  const {
    subscribeTopic,
    pointSize = 2,
    useDistanceColor = true,
    customColor = '#00d4ff'
  } = widget.config || {}

  const topic = subscribeTopic
  const [pointData, setPointData] = useState({
    positions: [],
    colors: null,
    messageType: 'waiting'
  })
  const subscriptionRef = useRef(null)

  // Subscribe to topic once
  useEffect(() => {
    if (!topic) {
      setPointData({
        positions: [],
        colors: null,
        messageType: 'waiting'
      })
      return
    }

    // Only subscribe once when topic changes
    if (subscriptionRef.current !== topic) {
      // Unsubscribe from old topic if exists
      if (subscriptionRef.current) {
        unsubscribeFromTopic(subscriptionRef.current)
      }
      // Subscribe to new topic
      subscribeToTopic(topic)
      subscriptionRef.current = topic
      console.log(`[LidarWidget] Subscribed to: ${topic}`)
    }

    return () => {
      // Cleanup on unmount
      if (subscriptionRef.current) {
        unsubscribeFromTopic(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [topic])

  // Process incoming messages and convert to point cloud
  useEffect(() => {
    if (!topic || !messages[topic]) {
      console.log(`[LidarWidget] No topic or no messages: topic=${topic}, hasMsg=${!!messages[topic]}`)
      return
    }

    const message = messages[topic]
    if (!message || !message.data) {
      console.log(`[LidarWidget] No message data`)
      return
    }

    const msgData = message.data
    let positions = []
    let colors = null
    let detectedType = null

    console.log(`[LidarWidget] Processing message from ${topic}`)

    // Detect message type and parse accordingly
    if (msgData.ranges) {
      // LaserScan message type (ranges can be Array or Float32Array)
      detectedType = 'laserscan'
      const result = parseLaserScan(msgData, useDistanceColor, customColor)
      positions = result.positions
      colors = result.colors
      console.log(`[LidarWidget] Parsed LaserScan: ${positions.length / 3} points`)
    } else if (msgData.data || msgData.points) {
      // PointCloud2 message type
      detectedType = 'pointcloud2'
      const result = parsePointCloud2(msgData, useDistanceColor, customColor)
      positions = result.positions
      colors = result.colors
      console.log(`[LidarWidget] Parsed PointCloud2: ${positions.length / 3} points`)
    } else {
      console.warn(`[LidarWidget] Unknown message type:`, Object.keys(msgData))
      return
    }

    console.log(`[LidarWidget] Before setPointData: positions=${positions.length}, messageType=${detectedType}`)

    if (positions.length > 0) {
      console.log(`[LidarWidget] Setting point data with ${positions.length / 3} points`)
      setPointData({
        positions,
        colors,
        messageType: detectedType
      })
    } else {
      console.warn(`[LidarWidget] No positions to render!`)
    }
  }, [messages, topic, useDistanceColor, customColor])

  const pointSizeValue = useMemo(() => {
    const parsed = parseFloat(pointSize)
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1) : 0.1
  }, [pointSize])

  return (
    <div className="lidar-widget">
      <div className="lidar-canvas">
        <Canvas camera={{ position: [0, 10, 15], fov: 75 }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 20, 10]} intensity={0.8} />
          <pointLight position={[-10, 15, -10]} intensity={0.4} />
          
          {/* Grid helper for reference */}
          <gridHelper args={[20, 10]} />
          
          <PointCloudRenderer
            positions={pointData.positions}
            colors={pointData.colors}
            pointSize={pointSizeValue}
            useDistanceColor={useDistanceColor}
            customColor={customColor}
          />
          <OrbitControls
            autoRotate={false}
            autoRotateSpeed={2}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Canvas>
      </div>
      <div className="lidar-info">
        <span className="lidar-type">
          {pointData.messageType === 'laserscan' && '2D LaserScan'}
          {pointData.messageType === 'pointcloud2' && '3D PointCloud2'}
          {pointData.messageType === 'waiting' && '⏳ Waiting for data...'}
        </span>
        <span className="lidar-points">{Math.floor(pointData.positions.length / 3)} points</span>
      </div>
    </div>
  )
}

/**
 * Parse ROS2 LaserScan message and convert to 3D Cartesian coordinates
 * LaserScan: polar coordinates (angles, ranges) -> Cartesian (x, y, z on XZ plane)
 */
function parseLaserScan(msgData, useDistanceColor, customColor) {
  const ranges = msgData.ranges || []
  const angleMin = msgData.angle_min || 0
  const angleMax = msgData.angle_max || (Math.PI * 2)
  const angleIncrement = msgData.angle_increment || ((angleMax - angleMin) / ranges.length)
  const rangeMin = msgData.range_min || 0
  const rangeMax = msgData.range_max || 100

  console.log(`[parseLaserScan] Received ${ranges.length} ranges`, {
    angleMin,
    angleMax,
    angleIncrement,
    rangeMin,
    rangeMax,
    firstRange: ranges[0],
    lastRange: ranges[ranges.length - 1]
  })

  const positions = []
  const colors = []

  let minDistance = Infinity
  let maxDistance = 0

  // First pass: find min/max distances for color mapping and collect valid points
  const validPoints = []
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]
    if (range >= rangeMin && range <= rangeMax && isFinite(range)) {
      validPoints.push({ index: i, range })
      minDistance = Math.min(minDistance, range)
      maxDistance = Math.max(maxDistance, range)
    }
  }

  console.log(`[parseLaserScan] Valid points: ${validPoints.length} / ${ranges.length}`)

  // Prevent division by zero
  if (minDistance === Infinity) {
    console.warn('[parseLaserScan] No valid points found!')
    minDistance = 0
  }
  if (maxDistance === minDistance) {
    maxDistance = minDistance + 0.1
  }

  console.log(`[parseLaserScan] Distance range: ${minDistance.toFixed(3)} - ${maxDistance.toFixed(3)}`)

  // Second pass: convert polar to Cartesian coordinates
  for (const point of validPoints) {
    const { index, range } = point
    const angle = angleMin + index * angleIncrement

    // Convert polar (angle, range) to Cartesian (x, z) on horizontal plane (y=0)
    const x = range * Math.cos(angle)
    const z = range * Math.sin(angle)
    const y = 0 // LaserScan is 2D, place on XZ plane

    positions.push(x, y, z)

    // Calculate color based on distance
    if (useDistanceColor) {
      const distanceBias = (range - minDistance) / (maxDistance - minDistance)
      const rgbColor = distanceToColor(distanceBias)
      colors.push(rgbColor[0], rgbColor[1], rgbColor[2])
    } else {
      const rgbColor = hexToRgb(customColor)
      colors.push(rgbColor[0], rgbColor[1], rgbColor[2])
    }
  }

  console.log(`[parseLaserScan] Final: ${positions.length / 3} points, ${colors.length / 3} colors`)

  return {
    positions,
    colors: colors.length > 0 ? new Uint8Array(colors) : null
  }
}

/**
 * Parse ROS2 PointCloud2 message
 * Handles both structured and unstructured point data
 */
function parsePointCloud2(msgData, useDistanceColor, customColor) {
  const positions = []
  const colors = []

  if (Array.isArray(msgData.points) && msgData.points.length > 0) {
    // Structured point data
    let minDistance = Infinity
    let maxDistance = 0

    // First pass: find bounds
    for (const point of msgData.points) {
      const x = point.x || 0
      const y = point.y || 0
      const z = point.z || 0
      const distance = Math.sqrt(x * x + y * y + z * z)
      minDistance = Math.min(minDistance, distance)
      maxDistance = Math.max(maxDistance, distance)
    }

    if (minDistance === Infinity) minDistance = 0
    if (maxDistance === minDistance) maxDistance = minDistance + 1

    // Second pass: add points with colors
    for (const point of msgData.points) {
      const x = point.x || 0
      const y = point.y || 0
      const z = point.z || 0

      positions.push(x, y, z)

      if (useDistanceColor) {
        const distance = Math.sqrt(x * x + y * y + z * z)
        const distanceBias = (distance - minDistance) / (maxDistance - minDistance)
        const rgbColor = distanceToColor(distanceBias)
        colors.push(...rgbColor)
      } else {
        const rgbColor = hexToRgb(customColor)
        colors.push(...rgbColor)
      }
    }
  }

  return {
    positions,
    colors: colors.length > 0 ? new Uint8Array(colors) : null
  }
}

/**
 * Convert distance bias (0-1) to RGB color (Viridis-like colormap)
 * Red (near) -> Yellow -> Cyan -> Blue (far)
 */
function distanceToColor(bias) {
  // Clamp bias to [0, 1]
  bias = Math.max(0, Math.min(1, bias))

  let r, g, b

  if (bias < 0.25) {
    // Red to Orange (0.0 - 0.25)
    const t = bias / 0.25
    r = 255
    g = Math.round(165 * t)
    b = 0
  } else if (bias < 0.5) {
    // Orange to Yellow (0.25 - 0.5)
    const t = (bias - 0.25) / 0.25
    r = 255
    g = Math.round(165 + (255 - 165) * t)
    b = 0
  } else if (bias < 0.75) {
    // Yellow to Cyan (0.5 - 0.75)
    const t = (bias - 0.5) / 0.25
    r = Math.round(255 * (1 - t))
    g = 255
    b = Math.round(255 * t)
  } else {
    // Cyan to Blue (0.75 - 1.0)
    const t = (bias - 0.75) / 0.25
    r = 0
    g = Math.round(255 * (1 - t))
    b = 255
  }

  return [r, g, b]
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ]
  }
  return [0, 212, 255] // Default cyan
}

/**
 * Three.js Point Cloud Renderer Component
 */
function PointCloudRenderer({ positions, colors, pointSize, useDistanceColor, customColor }) {
  const geometryRef = useRef()

  useEffect(() => {
    if (!geometryRef.current || !positions || positions.length === 0) {
      return
    }

    const geometry = geometryRef.current

    // Create or update position attribute
    const positionData = new Float32Array(positions)
    if (geometry.hasAttribute('position')) {
      geometry.getAttribute('position').array = positionData
      geometry.getAttribute('position').needsUpdate = true
    } else {
      geometry.setAttribute('position', new THREE.BufferAttribute(positionData, 3))
    }

    // Create or update color attribute
    if (colors && colors.length > 0) {
      const colorData = colors instanceof Uint8Array ? colors : new Uint8Array(colors)
      if (geometry.hasAttribute('color')) {
        geometry.getAttribute('color').array = colorData
        geometry.getAttribute('color').needsUpdate = true
      } else {
        geometry.setAttribute('color', new THREE.BufferAttribute(colorData, 3, true))
      }
    }

    geometry.computeBoundingSphere()
    console.log(`[PointCloudRenderer] Updated geometry with ${positions.length / 3} points`)
  }, [positions, colors])

  if (!positions || positions.length === 0) {
    return null
  }

  return (
    <points>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        transparent
        vertexColors={!!colors}
        color={!colors ? customColor : undefined}
        size={pointSize}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  )
}

export default LidarWidget

