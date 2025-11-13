import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import './PageTabs.css'

const PageTabs = ({ pages, currentPageId, onPageChange, onPageAdd, onPageRename, onPageDelete }) => {
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, pageId: null })

  const handleRenameStart = (page) => {
    setRenamingId(page.id)
    setRenameValue(page.name)
  }

  const handleRenameSubmit = (pageId) => {
    if (renameValue.trim()) {
      onPageRename(pageId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleRenameCancel = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  useEffect(() => {
    if (!contextMenu.visible) return

    const handleClose = () => {
      setContextMenu({ visible: false, x: 0, y: 0, pageId: null })
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('click', handleClose)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu.visible])

  const handleContextMenu = (e, pageId) => {
    e.preventDefault()
    const menuWidth = 180
    const menuHeight = 60
    const x = Math.min(e.clientX, window.innerWidth - menuWidth)
    const y = Math.min(e.clientY, window.innerHeight - menuHeight)

    setContextMenu({
      visible: true,
      x,
      y,
      pageId
    })
  }

  const handleDeletePage = () => {
    if (contextMenu.pageId) {
      onPageDelete(contextMenu.pageId)
    }
    setContextMenu({ visible: false, x: 0, y: 0, pageId: null })
  }

  return (
    <div className="page-tabs">
      <div className="page-tabs-list">
        {pages.map(page => (
          <div
            key={page.id}
            className={`page-tab ${currentPageId === page.id ? 'active' : ''}`}
            onClick={() => onPageChange(page.id)}
            onContextMenu={(e) => handleContextMenu(e, page.id)}
            title="Right-click to delete"
          >
            {renamingId === page.id ? (
              <input
                className="page-tab-rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(page.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit(page.id)
                  } else if (e.key === 'Escape') {
                    handleRenameCancel()
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="page-tab-name"
                onDoubleClick={() => handleRenameStart(page)}
              >
                {page.name}
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        className="page-tab-add"
        onClick={onPageAdd}
        title="Add new page"
      >
        <Plus size={18} />
      </button>

      {contextMenu.visible && (
        <div
          className="page-context-menu-overlay"
          onClick={() => setContextMenu({ visible: false, x: 0, y: 0, pageId: null })}
        >
          <div
            className="page-context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="page-context-menu-item" onClick={handleDeletePage}>
              Delete Page
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PageTabs

