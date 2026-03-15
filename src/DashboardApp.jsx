import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Dashboard, { MIN_SIZES_PX } from './components/Dashboard'
import WidgetPanel from './components/WidgetPanel'
import PageTabs from './components/PageTabs'
import SettingsPanel from './components/SettingsPanel'
import DashboardManager from './components/DashboardManager'
import ConnectionStatus from './components/ConnectionStatus'
import { ArrowLeft, Lock, Plus, Settings as SettingsIcon, Unlock, X } from 'lucide-react'
import { useFleet } from './context/FleetContext'
import { RobotAccessProvider } from './context/RobotAccessContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { apiRequest } from './utils/api'
import './DashboardApp.css'

const DEFAULT_STATE = {
  pages: [
    { id: 'page-1', name: 'Page 1', widgets: [] }
  ],
  currentPageId: 'page-1'
}

const DASHBOARD_COLS = 12
const ROW_HEIGHT = 60
const PAGE_PANEL_WIDTH = 200

const DEFAULT_CAMERA_STREAM_PORT = 8081
const LOCK_POLL_INTERVAL_MS = 4000
const HEARTBEAT_INTERVAL_MS = 5000
const SAVE_DEBOUNCE_MS = 600

const getDefaultCameraStreamUrl = (selectedRobot) => {
  if (!selectedRobot?.ip) {
    return ''
  }

  return selectedRobot.cameraUrl || `http://${selectedRobot.ip}:${DEFAULT_CAMERA_STREAM_PORT}/stream`
}

const getDefaultSize = (widgetType) => {
  const minSize = MIN_SIZES_PX[widgetType] || { width: 200, height: 150 }
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const dashboardWidth = Math.max(600, viewportWidth - PAGE_PANEL_WIDTH)
  const colWidth = dashboardWidth / DASHBOARD_COLS
  const w = Math.max(2, Math.ceil(minSize.width / colWidth))
  const h = Math.max(2, Math.ceil(minSize.height / ROW_HEIGHT))
  return { w, h }
}

function getDefaultConfig(widgetType, selectedRobot) {
  const configs = {
    camera: {
      streamUrl: getDefaultCameraStreamUrl(selectedRobot)
    },
    lidar: { subscribeTopic: '/velodyne_points', pointSize: 0.1 },
    button: { publishTopic: '/cmd', dataOut: 'pressed', label: 'Button' },
    terminal: { port: selectedRobot?.terminalPort || 5001 },
    joystick: { publishTopic: '/cmd_vel', maxData: '1.0, 1.0' },
    chart: { subscribeTopic: '/sensor_data', field: 'value', maxData: '100' },
    topicReader: { subscribeTopic: '/chatter', messageType: 'std_msgs/String' }
  }
  return configs[widgetType] || {}
}

function DashboardContent() {
  const navigate = useNavigate()
  const { robotId } = useParams()
  const { getRobot, loading: fleetLoading } = useFleet()
  const selectedRobot = getRobot(robotId)
  const [pages, setPages] = useState(DEFAULT_STATE.pages)
  const [currentPageId, setCurrentPageId] = useState(DEFAULT_STATE.currentPageId)
  const [isWidgetPanelOpen, setIsWidgetPanelOpen] = useState(false)
  const [isManagerPanelOpen, setIsManagerPanelOpen] = useState(false)
  const [settingsWidgetId, setSettingsWidgetId] = useState(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const [lockState, setLockState] = useState(null)
  const [dismissedNotices, setDismissedNotices] = useState([])
  const hasLoadedDashboardRef = useRef(false)
  const saveTimeoutRef = useRef(null)

  const currentPage = pages.find(p => p.id === currentPageId) || pages[0]
  const currentWidgets = currentPage?.widgets || []

  useEffect(() => {
    if (!fleetLoading && !selectedRobot) {
      navigate('/', { replace: true })
    }
  }, [fleetLoading, navigate, selectedRobot])

  useEffect(() => {
    if (selectedRobot) {
      document.title = `${selectedRobot.name} - ROS2 Dashboard`
    }
  }, [selectedRobot])

  useEffect(() => {
    setDismissedNotices([])
  }, [robotId])

  useEffect(() => {
    if (!selectedRobot) {
      return
    }

    let cancelled = false
    hasLoadedDashboardRef.current = false
    setIsLoadingDashboard(true)
    setDashboardError('')

    apiRequest(`/api/robots/${selectedRobot.id}/dashboard`)
      .then((response) => {
        if (cancelled) {
          return
        }

        const nextDashboard = response.dashboard || DEFAULT_STATE
        setPages(Array.isArray(nextDashboard.pages) && nextDashboard.pages.length > 0 ? nextDashboard.pages : DEFAULT_STATE.pages)
        setCurrentPageId(nextDashboard.currentPageId || nextDashboard.pages?.[0]?.id || DEFAULT_STATE.currentPageId)
        hasLoadedDashboardRef.current = true
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load dashboard:', error)
          setDashboardError(error.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDashboard(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedRobot])

  const permissions = selectedRobot?.permissions || { canView: false, canControl: false, canEdit: false }
  const hasControlLock = Boolean(lockState?.isOwnedByCurrentUser)
  const canControlWidgets = permissions.canControl && hasControlLock
  const isLockedByAnotherUser = Boolean(lockState && !lockState.isOwnedByCurrentUser)

  const refreshLock = useCallback(async () => {
    if (!selectedRobot) {
      setLockState(null)
      return
    }

    const response = await apiRequest(`/api/robots/${selectedRobot.id}/lock`)
    setLockState(response.lock)
  }, [selectedRobot])

  useEffect(() => {
    if (!selectedRobot || !permissions.canView) {
      return undefined
    }

    refreshLock().catch((error) => {
      console.error('Failed to load lock state:', error)
    })

    const intervalId = window.setInterval(() => {
      refreshLock().catch((error) => {
        console.error('Failed to refresh lock state:', error)
      })
    }, LOCK_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [permissions.canView, refreshLock, selectedRobot])

  useEffect(() => {
    if (!selectedRobot || !hasControlLock) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      apiRequest(`/api/robots/${selectedRobot.id}/lock/heartbeat`, { method: 'POST' })
        .then((response) => setLockState(response.lock))
        .catch((error) => {
          console.error('Failed to renew robot lock:', error)
        })
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasControlLock, selectedRobot])

  useEffect(() => {
    if (!selectedRobot || !permissions.canEdit || !hasLoadedDashboardRef.current) {
      return undefined
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      apiRequest(`/api/robots/${selectedRobot.id}/dashboard`, {
        method: 'PUT',
        body: { pages, currentPageId }
      }).catch((error) => {
        console.error('Failed to save dashboard:', error)
      })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [currentPageId, pages, permissions.canEdit, selectedRobot])

  const addWidget = useCallback((widgetType) => {
    if (!permissions.canEdit) {
      return
    }

    const { w, h } = getDefaultSize(widgetType)
    const newWidget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      x: 0,
      y: 0,
      w,
      h,
      config: getDefaultConfig(widgetType, selectedRobot)
    }
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, widgets: [...page.widgets, newWidget] }
        : page
    ))
  }, [currentPageId, permissions.canEdit, selectedRobot])

  const removeWidget = useCallback((widgetId) => {
    if (!permissions.canEdit) {
      return
    }

    setPages(prev => prev.map(page => 
      page.id === currentPageId
        ? { ...page, widgets: page.widgets.filter(w => w.id !== widgetId) }
        : page
    ))
  }, [currentPageId, permissions.canEdit])

  const updateWidgetLayout = useCallback((layout) => {
    if (!permissions.canEdit) {
      return
    }

    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page
      return {
        ...page,
        widgets: page.widgets.map(widget => {
          const layoutItem = layout.find(l => l.i === widget.id)
          if (layoutItem) {
            return {
              ...widget,
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h
            }
          }
          return widget
        })
      }
    }))
  }, [currentPageId, permissions.canEdit])

  const updateWidgetConfig = useCallback((widgetId, config) => {
    if (!permissions.canEdit) {
      return
    }

    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page
      return {
        ...page,
        widgets: page.widgets.map(w => 
          w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
        )
      }
    }))
  }, [currentPageId, permissions.canEdit])

  const handlePageAdd = useCallback(() => {
    if (!permissions.canEdit) {
      return
    }

    setPages(prev => {
      const newPage = {
        id: `page-${Date.now()}`,
        name: `Page ${prev.length + 1}`,
        widgets: []
      }
      setCurrentPageId(newPage.id)
      return [...prev, newPage]
    })
  }, [permissions.canEdit])

  const handlePageChange = useCallback((pageId) => {
    setCurrentPageId(pageId)
  }, [])

  const handlePageRename = useCallback((pageId, newName) => {
    if (!permissions.canEdit) {
      return
    }

    setPages(prev => prev.map(page =>
      page.id === pageId ? { ...page, name: newName } : page
    ))
  }, [permissions.canEdit])

  const handlePageDelete = useCallback((pageId) => {
    if (!permissions.canEdit) {
      return
    }

    setPages(prev => {
      if (prev.length === 1) {
        alert('Cannot delete the last page')
        return prev
      }

      const filtered = prev.filter(p => p.id !== pageId)
      if (filtered.length === 0) {
        return prev
      }

      if (currentPageId === pageId) {
        setCurrentPageId(filtered[0].id)
      }

      return filtered
    })
  }, [currentPageId, permissions.canEdit])

  const handleOpenSettings = useCallback((widgetId) => {
    if (!permissions.canEdit) {
      return
    }

    setSettingsWidgetId(widgetId)
  }, [permissions.canEdit])

  const handleCloseSettings = useCallback(() => {
    setSettingsWidgetId(null)
  }, [])

  const handleSaveSettings = useCallback((config) => {
    if (settingsWidgetId) {
      updateWidgetConfig(settingsWidgetId, config)
    }
  }, [settingsWidgetId, updateWidgetConfig])

  const handleImportDashboard = useCallback((state) => {
    if (!permissions.canEdit || !state || !Array.isArray(state.pages) || state.pages.length === 0) {
      alert('Invalid dashboard file')
      return
    }

    const timestamp = Date.now()
    const sanitizedPages = state.pages.map((page, pageIndex) => {
      const pageId = typeof page.id === 'string' && page.id.length > 0
        ? page.id
        : `imported-page-${timestamp}-${pageIndex}`
      const pageName = typeof page.name === 'string' && page.name.length > 0
        ? page.name
        : `Imported Page ${pageIndex + 1}`

      const widgets = Array.isArray(page.widgets) ? page.widgets : []

      const sanitizedWidgets = widgets
        .filter(widget => typeof widget.type === 'string' && widget.type.length > 0)
        .map((widget, widgetIndex) => {
          const size = getDefaultSize(widget.type)
          return {
            id: typeof widget.id === 'string' && widget.id.length > 0
              ? widget.id
              : `imported-widget-${timestamp}-${pageIndex}-${widgetIndex}`,
            type: widget.type,
            x: Number.isFinite(widget.x) ? widget.x : 0,
            y: Number.isFinite(widget.y) ? widget.y : 0,
            w: Number.isFinite(widget.w) ? widget.w : size.w,
            h: Number.isFinite(widget.h) ? widget.h : size.h,
            config: widget.config && typeof widget.config === 'object'
              ? widget.config
              : getDefaultConfig(widget.type, selectedRobot)
          }
        })

      return {
        id: pageId,
        name: pageName,
        widgets: sanitizedWidgets
      }
    })

    const nextPageId = state.currentPageId && sanitizedPages.some(p => p.id === state.currentPageId)
      ? state.currentPageId
      : sanitizedPages[0].id

    setPages(sanitizedPages)
    setCurrentPageId(nextPageId)
    setSettingsWidgetId(null)
    setIsWidgetPanelOpen(false)
  }, [permissions.canEdit, selectedRobot])

  const acquireLock = useCallback(async () => {
    if (!selectedRobot || !permissions.canControl) {
      return
    }

    try {
      const response = await apiRequest(`/api/robots/${selectedRobot.id}/lock`, { method: 'POST' })
      setLockState(response.lock)
    } catch (error) {
      alert(error.message)
      refreshLock().catch(() => {})
    }
  }, [permissions.canControl, refreshLock, selectedRobot])

  const releaseRobotLock = useCallback(async () => {
    if (!selectedRobot || !hasControlLock) {
      return
    }

    await apiRequest(`/api/robots/${selectedRobot.id}/lock`, { method: 'DELETE' })
    setLockState(null)
  }, [hasControlLock, selectedRobot])

  const settingsWidget = currentWidgets.find(w => w.id === settingsWidgetId)

  const notices = [
    dashboardError
      ? { id: 'dashboard-error', tone: 'error', message: dashboardError }
      : null,
    !permissions.canEdit
      ? { id: 'view-only', tone: 'info', message: 'View-only access. Layout changes are disabled.' }
      : null,
    permissions.canControl && !hasControlLock
      ? { id: 'control-lock-needed', tone: 'warning', message: 'Control is available, but control widgets stay read-only until you acquire the robot lock.' }
      : null,
    isLockedByAnotherUser && lockState?.username
      ? { id: 'locked-other-user', tone: 'warning', message: `${lockState.username} currently holds the control lock for this robot.` }
      : null,
  ].filter(Boolean).filter((notice) => !dismissedNotices.includes(notice.id))

  const robotAccessValue = useMemo(() => ({
    canEdit: permissions.canEdit,
    canControl: permissions.canControl,
    hasControlLock,
    canControlWidgets,
    isLockedByAnotherUser,
    lockState,
  }), [canControlWidgets, hasControlLock, isLockedByAnotherUser, lockState, permissions.canControl, permissions.canEdit])

  if (fleetLoading || isLoadingDashboard || !selectedRobot) {
    return (
      <div className="app">
        <div className="dashboard-empty">
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <RobotAccessProvider value={robotAccessValue}>
      <div className="app">
        <header className="app-header">
          <div className="app-header-left">
            <a href="/" className="back-button" title="Back to fleet">
              <ArrowLeft size={20} />
            </a>
            <div className="app-header-title">
              <h1>ROS2 Dashboard</h1>
              {selectedRobot && <span className="robot-badge">{selectedRobot.name}</span>}
            </div>
          </div>
          <div className="app-header-right">
            {permissions.canControl && (
              <button
                className="dashboard-manage-toggle"
                onClick={hasControlLock ? releaseRobotLock : acquireLock}
                title={hasControlLock ? 'Release control lock' : 'Acquire control lock'}
              >
                {hasControlLock ? <Unlock size={20} /> : <Lock size={20} />}
              </button>
            )}
            <button
              className="dashboard-manage-toggle"
              onClick={() => {
                setIsWidgetPanelOpen(false)
                setIsManagerPanelOpen(!isManagerPanelOpen)
              }}
              title="Import / Export dashboard"
            >
              <SettingsIcon size={20} />
            </button>
            <button
              className="widget-panel-toggle"
              onClick={() => {
                if (!permissions.canEdit) {
                  return
                }
                setIsManagerPanelOpen(false)
                setIsWidgetPanelOpen(!isWidgetPanelOpen)
              }}
              title={permissions.canEdit ? 'Add widget' : 'Edit permission required'}
              disabled={!permissions.canEdit}
            >
              <Plus size={20} />
            </button>
            <ConnectionStatus />
          </div>
        </header>
        <div className="app-content">
          <PageTabs
            pages={pages}
            currentPageId={currentPageId}
            onPageChange={handlePageChange}
            onPageAdd={handlePageAdd}
            onPageRename={handlePageRename}
            onPageDelete={handlePageDelete}
            canEdit={permissions.canEdit}
          />
          <Dashboard
            widgets={currentWidgets}
            onRemoveWidget={removeWidget}
            onLayoutChange={updateWidgetLayout}
            onOpenSettings={handleOpenSettings}
            canEdit={permissions.canEdit}
          />
        </div>
        <WidgetPanel
          isOpen={isWidgetPanelOpen && permissions.canEdit}
          onClose={() => setIsWidgetPanelOpen(false)}
          onAddWidget={addWidget}
        />
        <SettingsPanel
          widget={settingsWidget}
          isOpen={!!settingsWidgetId && permissions.canEdit}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
        />
        <DashboardManager
          isOpen={isManagerPanelOpen}
          onClose={() => setIsManagerPanelOpen(false)}
          pages={pages}
          currentPageId={currentPageId}
          onImport={(state) => {
            handleImportDashboard(state)
            setIsManagerPanelOpen(false)
          }}
          canEdit={permissions.canEdit}
        />
        {notices.length > 0 && (
          <div className="dashboard-notice-stack">
            {notices.map((notice) => (
              <div key={notice.id} className={`dashboard-access-toast ${notice.tone}`}>
                <p>{notice.message}</p>
                <button
                  className="dashboard-access-toast-close"
                  onClick={() => setDismissedNotices((current) => [...current, notice.id])}
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </RobotAccessProvider>
  )
}

export default function DashboardApp() {
  const { getRobot } = useFleet()
  const { robotId } = useParams()
  const selectedRobot = getRobot(robotId)

  // Get the bridge URL from the selected robot
  const bridgeUrl = selectedRobot?.bridgeUrl || 'ws://localhost:8765'

  return (
    <WebSocketProvider wsUrl={bridgeUrl}>
      <DashboardContent />
    </WebSocketProvider>
  )
}
