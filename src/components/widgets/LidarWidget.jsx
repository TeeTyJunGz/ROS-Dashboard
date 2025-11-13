import React, { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Points, PointMaterial } from '@react-three/drei'
import { useWebSocket } from '../../context/WebSocketContext'
import './LidarWidget.css'

const LidarWidget = ({ widget }) => {
  const { messages, subscribeToTopic, unsubscribeFromTopic } = useWebSocket()
  const { subscribeTopic, pointSize } = widget.config || {}
  const topic = subscribeTopic

  useEffect(() => {
    if (topic) {
      subscribeToTopic(topic, 'sensor_msgs/PointCloud2')
    }
    return () => {
      if (topic) {
        unsubscribeFromTopic(topic)
      }
    }
  }, [topic, subscribeToTopic, unsubscribeFromTopic])

  useEffect(() => {
    const message = messages[topic]
    if (message && message.data) {
      // In a real implementation, parse PointCloud2 data
      // For MVP, we'll use mock data that's generated in the component
    }
  }, [messages, topic])

  return (
    <div className="lidar-widget">
      <div className="lidar-canvas">
        <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <PointCloud points={generateMockPointCloud(1000)} pointSize={pointSize || 2} />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  )
}

function PointCloud({ points, pointSize }) {
  return (
    <Points positions={points} limit={10000}>
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

