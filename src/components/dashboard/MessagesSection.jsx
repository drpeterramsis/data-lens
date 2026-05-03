import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { loadMessages } from '../../utils/messagesApi'

const TYPE_CONFIG = {
  info:    { color: '#3B82F6', bg: '#EFF6FF',
             border: '#BFDBFE', icon: 'ℹ️',
             label: 'INFO' },
  warning: { color: '#F59E0B', bg: '#FFFBEB',
             border: '#FDE68A', icon: '⚠️',
             label: 'NOTICE' },
  success: { color: '#10B981', bg: '#ECFDF5',
             border: '#A7F3D0', icon: '✅',
             label: 'UPDATE' },
  urgent:  { color: '#EF4444', bg: '#FEF2F2',
             border: '#FECACA', icon: '🔴',
             label: 'URGENT' },
}

const MessagesSection = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    const fetch = async () => {
      try {
        const { messages: all } = await loadMessages()

        // Filter: visible + targeted to this user's role
        const filtered = all.filter(msg => {
          if (!msg.visible) return false
          if (msg.targetRoles.includes('all')) return true
          return msg.targetRoles.includes(user?.role)
        })

        // Sort: pinned first, then by date desc
        filtered.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return new Date(b.createdAt) - new Date(a.createdAt)
        })

        setMessages(filtered)
      } catch (err) {
        console.error('Messages load error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user])

  if (loading || messages.length === 0) return null

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  return (
    <div className="messages-section">

      {/* Section header */}
      <div className="messages-header">
        <span className="messages-header-icon">📢</span>
        <span className="messages-header-title">
          MESSAGES & ANNOUNCEMENTS
        </span>
        <span className="messages-count">
          {messages.length}
        </span>
      </div>

      {/* Messages list */}
      <div className="messages-list">
        {messages.map(msg => {
          const typeConf = TYPE_CONFIG[msg.type] || TYPE_CONFIG.info
          const isExpanded = expanded[msg.id]

          return (
            <div
              key={msg.id}
              className={`message-card
                ${msg.pinned ? 'is-pinned' : ''}
                ${msg.type}`}
              style={{
                background: typeConf.bg,
                borderColor: typeConf.border,
              }}
            >
              {/* Message top row */}
              <div className="message-top">

                {/* Left: type badge + title */}
                <div className="message-left">
                  <div className="message-badges">
                    {msg.pinned && (
                      <span className="pinned-badge">
                        📌 Pinned
                      </span>
                    )}
                    <span
                      className="type-badge"
                      style={{
                        color: typeConf.color,
                        background: `${typeConf.color}18`
                      }}
                    >
                      {typeConf.label}
                    </span>
                  </div>

                  <h4
                    className="message-title"
                    style={{ color: typeConf.color }}
                  >
                    {msg.title}
                  </h4>

                  {msg.showDate && (
                    <span className="message-date">
                      {formatDate(msg.createdAt)}
                      {' · by '}{msg.author}
                    </span>
                  )}
                </div>

                {/* Right: expand toggle */}
                <button
                  className="expand-btn"
                  onClick={() => toggleExpand(msg.id)}
                  style={{ color: typeConf.color }}
                >
                  {isExpanded ? '▲' : '▼'}
                </button>

              </div>

              {/* Message body — collapsible */}
              {isExpanded && (
                <div
                  className="message-body"
                  dangerouslySetInnerHTML={{ __html: msg.body }}
                />
              )}

            </div>
          )
        })}
      </div>

    </div>
  )
}

export default MessagesSection;
