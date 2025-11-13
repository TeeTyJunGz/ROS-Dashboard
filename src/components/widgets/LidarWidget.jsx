import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Points, PointMaterial } from '@react-three/drei'
import { useWebSocket } from '../../context/WebSocketContext'
import './LidarWidget.css'

const LidarWidget = ({ widget }) => {
  const { messages, subscribeToTopic, unsubscribeFromTopic } = useWebSocket()
  const { subscribeTopic, pointSize } = widget.config || {}
  const topic = subscribeTopic
  const [pointCloud, setPointCloud] = useState(() => generateMockPointCloud(1000))

  useEffect(() => {
    if (!topic) {
      setPointCloud(generateMockPointCloud(1000))
      return undefined
    }
    subscribeToTopic(topic, 'sensor_msgs/PointCloud2')
    return () => {
      unsubscribeFromTopic(topic)
    }
  }, [topic, subscribeToTopic, unsubscribeFromTopic])

  useEffect(() => {
    if (!topic) return
    const message = messages[topic]
    if (message && message.data) {
      if (Array.isArray(message.data.points)) {
        const flattened = []
        for (const point of message.data.points) {
          const { x = 0, y = 0, z = 0 } = point || {}
          flattened.push(x, y, z)
        }
        if (flattened.length > 0) {
          setPointCloud(flattened)
          return
        }
      }
    }
  }, [messages, topic])

  const pointSizeValue = useMemo(() => {
    const parsed = parseFloat(pointSize)
    return Number.isFinite(parsed) ? parsed : 2
  }, [pointSize])

  return (
    <div className="lidar-widget">
      <div className="lidar-canvas">
        <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <PointCloud points={pointCloud} pointSize={pointSizeValue} />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  )
}

function PointCloud({ points, pointSize }) {
  const positions = useMemo(() => new Float32Array(points), [points])
  return (
    <Points positions={positions} limit={10000}>
      <PointMaterial
        transparent
        color="#00d4ff"
        size={pointSize}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  )
}

function generateMockPointCloud(count) {
  const points = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 5
    const height = (Math.random() - 0.5) * 2
    points.push(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    )
  }
  return points
}

export default LidarWidget

