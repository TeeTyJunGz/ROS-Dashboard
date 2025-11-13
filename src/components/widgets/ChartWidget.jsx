import React, { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useWebSocket } from '../../context/WebSocketContext'
import './ChartWidget.css'

const ChartWidget = ({ widget }) => {
  const { messages, subscribeToTopic, unsubscribeFromTopic } = useWebSocket()
  const { subscribeTopic, field, maxData } = widget.config || {}
  const topic = subscribeTopic
  const maxPoints = maxData ? parseInt(maxData) : 100
  const [data, setData] = useState([])

  useEffect(() => {
    if (!topic) {
      return undefined
    }
    subscribeToTopic(topic, 'std_msgs/Float64')
    return () => {
      unsubscribeFromTopic(topic)
    }
  }, [topic, subscribeToTopic, unsubscribeFromTopic])

  useEffect(() => {
    setData([])
  }, [topic])

  useEffect(() => {
    if (!topic) return
    if (!topic) return
    const message = messages[topic]
    if (message && message.data) {
      const value = field ? message.data[field] : (message.data.value || message.data.data || 0)
      const timestamp = Date.now()
      
      setData(prev => {
        const newData = [...prev, { time: timestamp, value: parseFloat(value) || 0 }]
        return newData.slice(-(maxPoints || 100))
      })
    }
  }, [messages, topic, field, maxPoints])

  return (
    <div className="chart-widget">
      <div className="chart-container">
        {data.length === 0 ? (
          <div className="chart-empty">No data yet...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="time"
                stroke="#999"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: '4px' }}
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00d4ff"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default ChartWidget

