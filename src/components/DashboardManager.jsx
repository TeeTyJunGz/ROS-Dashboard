import React, { useRef, useState } from 'react'
import { X, Upload, Download } from 'lucide-react'
import './DashboardManager.css'

const DashboardManager = ({ isOpen, onClose, pages, currentPageId, onImport }) => {
  const fileInputRef = useRef(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  if (!isOpen) return null

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pages, currentPageId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export dashboard')
      }

      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ros-dashboard.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setError(null)
    } catch (exportError) {
      console.error('Failed to export dashboard:', exportError)
      setError(`Export failed: ${exportError.message}. Make sure the API server is running on ${API_BASE_URL}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImportClick = () => {
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/api/dashboard/import`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import dashboard')
      }

      const result = await response.json()
      onImport(result.data)
      setError(null)
    } catch (importError) {
      console.error('Failed to import dashboard:', importError)
      setError(`Import failed: ${importError.message}. Make sure the API server is running on ${API_BASE_URL}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="manager-panel-overlay" onClick={onClose}>
      <div className="manager-panel" onClick={(e) => e.stopPropagation()}>
        <div className="manager-panel-header">
          <h2>Dashboard Manager</h2>
          <button className="manager-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="manager-panel-content">
          <p className="manager-description">
            Export your current dashboard configuration or import one shared by a teammate.
          </p>
          <div className="manager-actions">
            <button className="manager-action-button" onClick={handleImportClick} disabled={loading}>
              <Download size={18} />
              <span>{loading ? 'Processing...' : 'Import Dashboard'}</span>
            </button>
            <button className="manager-action-button" onClick={handleExport} disabled={loading}>
              <Upload size={18} />
              <span>{loading ? 'Processing...' : 'Export Dashboard'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="manager-file-input"
              onChange={handleFileChange}
            />
          </div>
          {error && <div className="manager-error">{error}</div>}
        </div>
      </div>
    </div>
  )
}

export default DashboardManager

