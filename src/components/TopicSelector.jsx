import React, { useState, useRef, useEffect } from 'react'
import './TopicSelector.css'

/**
 * Topic Selector Component
 * Shows available topics with autocomplete suggestions
 */
const TopicSelector = ({
  value = '',
  onChange,
  availableTopics = []
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Filter suggestions based on input
  useEffect(() => {
    if (!value) {
      setSuggestions(availableTopics)
      return
    }

    const filtered = availableTopics.filter(topic =>
      topic.toLowerCase().includes(value.toLowerCase())
    )
    setSuggestions(filtered)
  }, [value, availableTopics])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (topic) => {
    onChange(topic)
    setIsOpen(false)
  }

  return (
    <div className="topic-selector" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className="topic-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Select or type topic..."
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="topic-suggestions">
          {suggestions.map(topic => (
            <div
              key={topic}
              className={`topic-suggestion ${
                value === topic ? 'active' : ''
              }`}
              onClick={() => handleSelect(topic)}
            >
              <span className="topic-name">{topic}</span>
              {value && value.toLowerCase() === topic.toLowerCase() && (
                <span className="topic-checkmark">✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && availableTopics.length === 0 && (
        <div className="topic-empty">
          No topics available. Note: Topics appear after connecting to bridge.
        </div>
      )}
    </div>
  )
}

export default TopicSelector
