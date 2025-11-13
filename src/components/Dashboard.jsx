import React, { useMemo } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import Widget from './Widget'
import './Dashboard.css'

// Minimum sizes in pixels
export const MIN_SIZES_PX = {
  joystick: { width: 240, height: 240 },
  camera: { width: 320, height: 240 },
  lidar: { width: 320, height: 240 },
  button: { width: 200, height: 100 },
  terminal: { width: 300, height: 200 },
  chart: { width: 300, height: 200 },
  topicReader: { width: 300, height: 200 }
}

const ROW_HEIGHT = 60
const COLS = 12

// Convert pixel size to grid units
const pxToGrid = (px, isHeight = false, dashboardWidth) => {
  if (isHeight) {
    return Math.ceil(px / ROW_HEIGHT)
  }
  // For width, calculate based on actual dashboard width
  const colWidth = dashboardWidth / COLS
  return Math.ceil(px / colWidth)
}

const Dashboard = ({ widgets, onRemoveWidget, onLayoutChange, onOpenSettings }) => {
  const dashboardWidth = window.innerWidth - 200 // Account for page panel

  const layout = useMemo(() => {
    return widgets.map(widget => {
      const minSize = MIN_SIZES_PX[widget.type] || { width: 200, height: 150 }
      const minW = pxToGrid(minSize.width, false, dashboardWidth)
      const minH = pxToGrid(minSize.height, true, dashboardWidth)
      
      return {
        i: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        minW: Math.max(2, minW),
        minH: Math.max(2, minH)
      }
    })
  }, [widgets, dashboardWidth])

  const handleLayoutChange = (newLayout) => {
    onLayoutChange(newLayout)
  }

  return (
    <div className="dashboard">
      {widgets.length === 0 ? (
        <div className="dashboard-empty">
          <p>Your dashboard is empty</p>
          <p className="dashboard-empty-hint">Add widgets using the + button</p>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={dashboardWidth}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-header"
        >
          {widgets.map(widget => (
            <div key={widget.id} className="widget-container">
              <Widget
                widget={widget}
                onRemove={onRemoveWidget}
                onOpenSettings={onOpenSettings}
              />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  )
}

export default Dashboard
