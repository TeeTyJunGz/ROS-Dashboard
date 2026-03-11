import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useWebSocket } from '../../context/WebSocketContext'
import './LidarWidget.css'

const MAX_RENDER_POINTS = 6000
const MIN_UPDATE_INTERVAL_MS = 50

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
  const lastProcessedAtRef = useRef(0)

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
  const topicMessage = topic ? messages[topic] : null

  useEffect(() => {
    if (!topic || !topicMessage) {
      return
    }

    if (!topicMessage.data) {
      return
    }

    const now = performance.now()
    if (now - lastProcessedAtRef.current < MIN_UPDATE_INTERVAL_MS) {
      return
    }
    lastProcessedAtRef.current = now

    const msgData = topicMessage.data
    let positions = []
    let colors = null
    let detectedType = null

    // Detect message type and parse accordingly
    if (msgData.ranges) {
      // LaserScan message type (ranges can be Array or Float32Array)
      detectedType = 'laserscan'
      const result = parseLaserScan(msgData, useDistanceColor, customColor)
      positions = result.positions
      colors = result.colors
    } else if (msgData.data || msgData.points) {
      // PointCloud2 message type
      detectedType = 'pointcloud2'
      const result = parsePointCloud2(msgData, useDistanceColor, customColor)
      positions = result.positions
      colors = result.colors
    } else {
      console.warn(`[LidarWidget] Unknown message type:`, Object.keys(msgData))
      return
    }

    if (positions.length > 0) {
      setPointData({
        positions,
        colors,
        messageType: detectedType
      })
    }
  }, [topicMessage, topic, useDistanceColor, customColor])

  const pointSizeValue = useMemo(() => {
    const parsed = parseFloat(pointSize)
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1) : 0.1
  }, [pointSize])

  return (
    <div className="lidar-widget">
      <div className="lidar-canvas">
        <Canvas
          camera={{ position: [0, 10, 15], fov: 75 }}
          dpr={[1, 1.25]}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
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

  const positions = []
  const colors = []

  let minDistance = Infinity
  let maxDistance = 0
  const sampleStride = getSampleStride(ranges.length, MAX_RENDER_POINTS)

  // First pass: find min/max distances for color mapping and collect valid points
  const validPoints = []
  for (let i = 0; i < ranges.length; i += sampleStride) {
    const range = ranges[i]
    if (range >= rangeMin && range <= rangeMax && isFinite(range)) {
      validPoints.push({ index: i, range })
      minDistance = Math.min(minDistance, range)
      maxDistance = Math.max(maxDistance, range)
    }
  }

  // Prevent division by zero
  if (minDistance === Infinity) {
    minDistance = 0
  }
  if (maxDistance === minDistance) {
    maxDistance = minDistance + 0.1
  }

  // Second pass: convert polar to Cartesian coordinates
  for (const point of validPoints) {
    const { index, range } = point
    const angle = angleMin + index * angleIncrement

    // ROS LaserScan is in the XY plane with Z up. Map it into a Three.js scene with Y up.
    const rosX = range * Math.cos(angle)
    const rosY = range * Math.sin(angle)
    const rosZ = 0
    const scenePoint = rosPointToScene(rosX, rosY, rosZ)

    positions.push(scenePoint[0], scenePoint[1], scenePoint[2])

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
    const sampleStride = getSampleStride(msgData.points.length, MAX_RENDER_POINTS)
    // Structured point data
    let minDistance = Infinity
    let maxDistance = 0

    // First pass: find bounds
    for (let index = 0; index < msgData.points.length; index += sampleStride) {
      const point = msgData.points[index]
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
    for (let index = 0; index < msgData.points.length; index += sampleStride) {
      const point = msgData.points[index]
      const x = point.x || 0
      const y = point.y || 0
      const z = point.z || 0
      const scenePoint = rosPointToScene(x, y, z)

      positions.push(scenePoint[0], scenePoint[1], scenePoint[2])

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

  if (positions.length === 0 && msgData.fields && msgData.data && msgData.point_step) {
    const fieldsByName = new Map((msgData.fields || []).map(field => [field.name, field]))
    const xField = fieldsByName.get('x')
    const yField = fieldsByName.get('y')
    const zField = fieldsByName.get('z')

    if (!xField || !yField || !zField) {
      console.warn('[parsePointCloud2] Missing x/y/z fields:', msgData.fields)
    } else {
      const binaryData = toUint8Array(msgData.data)
      const pointStep = msgData.point_step
      const rowStep = msgData.row_step || pointStep * (msgData.width || 0)
      const width = msgData.width || 0
      const height = msgData.height || 1
      const littleEndian = !msgData.is_bigendian

      if (!binaryData || binaryData.length < pointStep) {
        console.warn('[parsePointCloud2] Binary data missing or shorter than one point')
      } else {
        const view = new DataView(binaryData.buffer, binaryData.byteOffset, binaryData.byteLength)
        const pointCount = width > 0 ? width * Math.max(height, 1) : Math.floor(binaryData.length / pointStep)
        const sampleStride = getSampleStride(pointCount, MAX_RENDER_POINTS)
        let minDistance = Infinity
        let maxDistance = 0
        const decodedPoints = []

        for (let row = 0; row < Math.max(height, 1); row++) {
          for (let col = 0; col < (width || pointCount); col += sampleStride) {
            const baseOffset = height > 1 && rowStep
              ? row * rowStep + col * pointStep
              : col * pointStep

            if (baseOffset + pointStep > binaryData.length) {
              continue
            }

            const x = readPointField(view, baseOffset + xField.offset, xField.datatype, littleEndian)
            const y = readPointField(view, baseOffset + yField.offset, yField.datatype, littleEndian)
            const z = readPointField(view, baseOffset + zField.offset, zField.datatype, littleEndian)

            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
              continue
            }

            const distance = Math.sqrt(x * x + y * y + z * z)
            decodedPoints.push({ x, y, z, distance })
            minDistance = Math.min(minDistance, distance)
            maxDistance = Math.max(maxDistance, distance)
          }
        }

        if (decodedPoints.length === 0) {
          console.warn('[parsePointCloud2] No valid points decoded from binary payload')
        } else {
          if (minDistance === Infinity) minDistance = 0
          if (maxDistance === minDistance) maxDistance = minDistance + 0.1

          for (const point of decodedPoints) {
            const scenePoint = rosPointToScene(point.x, point.y, point.z)
            positions.push(scenePoint[0], scenePoint[1], scenePoint[2])

            if (useDistanceColor) {
              const distanceBias = (point.distance - minDistance) / (maxDistance - minDistance)
              const rgbColor = distanceToColor(distanceBias)
              colors.push(rgbColor[0], rgbColor[1], rgbColor[2])
            } else {
              const rgbColor = hexToRgb(customColor)
              colors.push(rgbColor[0], rgbColor[1], rgbColor[2])
            }
          }
        }
      }
    }
  }

  return {
    positions,
    colors: colors.length > 0 ? new Uint8Array(colors) : null
  }
}

function toUint8Array(data) {
  if (!data) {
    return null
  }

  if (data instanceof Uint8Array) {
    return data
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }

  if (Array.isArray(data)) {
    return Uint8Array.from(data)
  }

  return null
}

function rosPointToScene(x, y, z) {
  return [x, z, -y]
}

function getSampleStride(pointCount, maxPoints) {
  if (!Number.isFinite(pointCount) || pointCount <= 0) {
    return 1
  }

  return Math.max(1, Math.ceil(pointCount / maxPoints))
}

function readPointField(view, offset, datatype, littleEndian) {
  switch (datatype) {
    case 1:
      return view.getInt8(offset)
    case 2:
      return view.getUint8(offset)
    case 3:
      return view.getInt16(offset, littleEndian)
    case 4:
      return view.getUint16(offset, littleEndian)
    case 5:
      return view.getInt32(offset, littleEndian)
    case 6:
      return view.getUint32(offset, littleEndian)
    case 7:
      return view.getFloat32(offset, littleEndian)
    case 8:
      return view.getFloat64(offset, littleEndian)
    default:
      return NaN
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

