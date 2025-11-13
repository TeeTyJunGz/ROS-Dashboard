import React, { useState, useCallback, useEffect } from 'react'
import Dashboard, { MIN_SIZES_PX } from './components/Dashboard'
import WidgetPanel from './components/WidgetPanel'
import PageTabs from './components/PageTabs'
import SettingsPanel from './components/SettingsPanel'
import DashboardManager from './components/DashboardManager'
import ConnectionStatus from './components/ConnectionStatus'
import { Plus, Settings as SettingsIcon } from 'lucide-react'
import { WebSocketProvider } from './context/WebSocketContext'
import './App.css'

const DEFAULT_STATE = {
  pages: [
    { id: 'page-1', name: 'Page 1', widgets: [] }
  ],
  currentPageId: 'page-1'
}

const DASHBOARD_COLS = 12
const ROW_HEIGHT = 60
const PAGE_PANEL_WIDTH = 200

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  try {
    const stored = window.localStorage.getItem('rosDashboardState')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        const currentPageId = parsed.currentPageId && parsed.pages.some(p => p.id === parsed.currentPageId)
          ? parsed.currentPageId
          : parsed.pages[0].id
        return {
          pages: parsed.pages,
          currentPageId
        }
      }
    }
  } catch (error) {
    console.error('Failed to load stored dashboard state:', error)
  }

  return DEFAULT_STATE
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

function App() {
  const initialState = getInitialState()
  const [pages, setPages] = useState(initialState.pages)
  const [currentPageId, setCurrentPageId] = useState(initialState.currentPageId || initialState.pages[0].id)
  const [isWidgetPanelOpen, setIsWidgetPanelOpen] = useState(false)
  const [isManagerPanelOpen, setIsManagerPanelOpen] = useState(false)
  const [settingsWidgetId, setSettingsWidgetId] = useState(null)

  const currentPage = pages.find(p => p.id === currentPageId) || pages[0]
  const currentWidgets = currentPage?.widgets || []

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('rosDashboardState', JSON.stringify({ pages, currentPageId }))
    } catch (error) {
      console.error('Failed to persist dashboard state:', error)
    }
  }, [pages, currentPageId])

  const addWidget = useCallback((widgetType) => {
    const { w, h } = getDefaultSize(widgetType)
    const newWidget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      x: 0,
      y: 0,
      w,
      h,
      config: getDefaultConfig(widgetType)
    }
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, widgets: [...page.widgets, newWidget] }
        : page
    ))
  }, [currentPageId])

  const removeWidget = useCallback((widgetId) => {
    setPages(prev => prev.map(page => 
      page.id === currentPageId
        ? { ...page, widgets: page.widgets.filter(w => w.id !== widgetId) }
        : page
    ))
  }, [currentPageId])

  const updateWidgetLayout = useCallback((layout) => {
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
  }, [currentPageId])

  const updateWidgetConfig = useCallback((widgetId, config) => {
    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page
      return {
        ...page,
        widgets: page.widgets.map(w => 
          w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
        )
      }
    }))
  }, [currentPageId])

  const handlePageAdd = useCallback(() => {
    setPages(prev => {
      const newPage = {
        id: `page-${Date.now()}`,
        name: `Page ${prev.length + 1}`,
        widgets: []
      }
      setCurrentPageId(newPage.id)
      return [...prev, newPage]
    })
  }, [])

  const handlePageChange = useCallback((pageId) => {
    setCurrentPageId(pageId)
  }, [])

  const handlePageRename = useCallback((pageId, newName) => {
    setPages(prev => prev.map(page =>
      page.id === pageId ? { ...page, name: newName } : page
    ))
  }, [])

  const handlePageDelete = useCallback((pageId) => {
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
  }, [currentPageId])

  const handleOpenSettings = useCallback((widgetId) => {
    setSettingsWidgetId(widgetId)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setSettingsWidgetId(null)
  }, [])

  const handleSaveSettings = useCallback((config) => {
    if (settingsWidgetId) {
      updateWidgetConfig(settingsWidgetId, config)
    }
  }, [settingsWidgetId, updateWidgetConfig])

  const handleImportDashboard = useCallback((state) => {
    if (!state || !Array.isArray(state.pages) || state.pages.length === 0) {
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
              : getDefaultConfig(widget.type)
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
  }, [])

  const settingsWidget = currentWidgets.find(w => w.id === settingsWidgetId)

  return (
    <WebSocketProvider>
      <div className="app">
        <header className="app-header">
          <h1>ROS2 Dashboard</h1>
          <div className="app-header-right">
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
                setIsManagerPanelOpen(false)
                setIsWidgetPanelOpen(!isWidgetPanelOpen)
              }}
              title="Add widget"
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
          />
          <Dashboard
            widgets={currentWidgets}
            onRemoveWidget={removeWidget}
            onLayoutChange={updateWidgetLayout}
            onOpenSettings={handleOpenSettings}
          />
        </div>
        <WidgetPanel
          isOpen={isWidgetPanelOpen}
          onClose={() => setIsWidgetPanelOpen(false)}
          onAddWidget={addWidget}
        />
        <SettingsPanel
          widget={settingsWidget}
          isOpen={!!settingsWidgetId}
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
        />
      </div>
    </WebSocketProvider>
  )
}

function getDefaultConfig(widgetType) {
  const configs = {
    camera: {},
    lidar: { subscribeTopic: '/velodyne_points', pointSize: 2 },
    button: { publishTopic: '/cmd', dataOut: 'pressed', label: 'Button' },
    terminal: { subscribeTopic: '/rosout', maxData: '50' },
    joystick: { publishTopic: '/cmd_vel', maxData: '1.0, 1.0' },
    chart: { subscribeTopic: '/sensor_data', field: 'value', maxData: '100' },
    topicReader: { subscribeTopic: '/chatter', messageType: 'std_msgs/String' }
  }
  return configs[widgetType] || {}
}

export default App
