import React, { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useWebSocket } from '../../context/WebSocketContext'
import { extractValue } from '../../utils/dataExtraction'
import './ChartWidget.css'

const ChartWidget = ({ widget }) => {
  const { messages, subscribeToTopic, unsubscribeFromTopic } = useWebSocket()
  const config = widget.config || {}

  // Support both old single-topic and new multi-series config
  // Memoize series to prevent infinite re-subscription loops
  const series = useMemo(() => config.series || [], [config.series])
  const maxPoints = useMemo(() => config.maxData ? parseInt(config.maxData) : 100, [config.maxData])

  const [data, setData] = useState([])
  const [hasData, setHasData] = useState(false)

  // Subscribe to all topics in series
  useEffect(() => {
    series.forEach(s => {
      if (s.topic) {
        subscribeToTopic(s.topic)
      }
    })

    return () => {
      series.forEach(s => {
        if (s.topic) {
          unsubscribeFromTopic(s.topic)
        }
      })
    }
  }, [series]) // Only depend on series topics, not the function references

  // Reset data when series config changes
  useEffect(() => {
    setData([])
    setHasData(false)
  }, [series.length])

  // Update chart data when messages arrive
  useEffect(() => {
    if (series.length === 0) return

    // Check if any message has data
    let hasNewData = false
    const newDataPoint = { time: Date.now() }

    series.forEach((s, idx) => {
      if (!s.topic) return

      const message = messages[s.topic]

      // Debug logging
      if (!message) {
        console.log(`[ChartWidget] No message for topic: ${s.topic}`)
        return
      }

      console.log(`[ChartWidget] Topic: ${s.topic}, Field: ${s.field}`, 'Message:', message)

      const value = extractValue(message.data, s.field || 'value')
      console.log(`[ChartWidget] Extracted value from ${s.field}: ${value}`)

      if (value !== null && value !== undefined) {
        newDataPoint[`series_${idx}`] = value
        hasNewData = true
      }
    })

    if (hasNewData) {
      console.log(`[ChartWidget] Adding data point:`, newDataPoint)
      setHasData(true)
      setData(prev => {
        const updated = [...prev, newDataPoint]
        return updated.slice(-(maxPoints || 100))
      })
    }
  }, [messages, series, maxPoints])

  if (series.length === 0) {
    return (
      <div className="chart-widget">
        <div className="chart-container">
          <div className="chart-empty">No data series configured</div>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-widget">
      <div className="chart-container">
        {!hasData ? (
          <div className="chart-empty">Waiting for data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="time"
                stroke="#999"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px'
                }}
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              {series.length > 1 && <Legend />}
              {series.map((s, idx) => (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={`series_${idx}`}
                  stroke={s.color || '#00d4ff'}
                  strokeWidth={2}
                  dot={false}
                  name={`${s.topic} (${s.field})`}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default ChartWidget

