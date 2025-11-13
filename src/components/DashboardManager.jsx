import React, { useRef, useState } from 'react'
import { X, Upload, Download } from 'lucide-react'
import './DashboardManager.css'

const DashboardManager = ({ isOpen, onClose, pages, currentPageId, onImport }) => {
  const fileInputRef = useRef(null)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleExport = () => {
    try {
      const data = JSON.stringify({ pages, currentPageId }, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
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
      setError('Failed to export dashboard. Please try again.')
    }
  }

  const handleImportClick = () => {
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result
        const parsed = JSON.parse(content)
        onImport(parsed)
        setError(null)
      } catch (importError) {
        console.error('Failed to import dashboard:', importError)
        setError('Invalid dashboard file. Please select a valid JSON export.')
      }
    }
    reader.readAsText(file)
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
            <button className="manager-action-button" onClick={handleExport}>
              <Download size={18} />
              <span>Export Dashboard</span>
            </button>
            <button className="manager-action-button" onClick={handleImportClick}>
              <Upload size={18} />
              <span>Import Dashboard</span>
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

