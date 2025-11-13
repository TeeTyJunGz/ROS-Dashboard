import React, { useEffect, useRef, useState } from 'react'
import './CameraWidget.css'

const CameraWidget = ({ widget }) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsActive(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Failed to access camera. Please grant camera permissions.')
      setIsActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }

  return (
    <div className="camera-widget">
      {error ? (
        <div className="camera-error">
          <p>{error}</p>
          <button onClick={startCamera} className="camera-retry">
            Retry
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
      )}
    </div>
  )
}

export default CameraWidget

