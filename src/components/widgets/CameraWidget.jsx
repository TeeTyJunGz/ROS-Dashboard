import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFleet } from '../../context/FleetContext'
import './CameraWidget.css'

const DEFAULT_CAMERA_STREAM_PORT = 8081

const CameraWidget = ({ widget }) => {
  const { robotId } = useParams()
  const { getRobot } = useFleet()
  const selectedRobot = getRobot(robotId)
  const [error, setError] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const streamUrl = useMemo(() => {
    if (widget?.config?.streamUrl) {
      return widget.config.streamUrl
    }

    if (selectedRobot?.ip) {
      return `http://${selectedRobot.ip}:${DEFAULT_CAMERA_STREAM_PORT}/stream`
    }

    return ''
  }, [selectedRobot, widget])

  const resolvedStreamUrl = useMemo(() => {
    if (!streamUrl) {
      return ''
    }

    const separator = streamUrl.includes('?') ? '&' : '?'
    return `${streamUrl}${separator}t=${reloadToken}`
  }, [streamUrl, reloadToken])

  useEffect(() => {
    if (!streamUrl) {
      setError('No camera stream URL configured for this widget.')
      setIsActive(false)
      return
    }

    setError(null)
    setIsActive(false)
  }, [streamUrl])

  const handleLoad = () => {
    setError(null)
    setIsActive(true)
  }

  const handleError = () => {
    setError('Failed to load camera stream. Verify the robot camera server is running and the URL is reachable.')
    setIsActive(false)
  }

  const handleRetry = () => {
    setReloadToken((value) => value + 1)
    setError(null)
  }

  return (
    <div className="camera-widget">
      {error ? (
        <div className="camera-error">
          <p>{error}</p>
          <button onClick={handleRetry} className="camera-retry">
            Retry
          </button>
        </div>
      ) : (
        <>
          {!isActive && <div className="camera-loading">Connecting to camera stream...</div>}
          <img
            key={resolvedStreamUrl}
            src={resolvedStreamUrl}
            alt="Robot camera stream"
            className={`camera-video ${isActive ? 'active' : 'loading'}`}
            onLoad={handleLoad}
            onError={handleError}
          />
        </>
      )}
    </div>
  )
}

export default CameraWidget

