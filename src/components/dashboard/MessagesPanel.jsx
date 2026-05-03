import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone, ChevronLeft, ChevronRight,
  X, Eye, ExternalLink, Clock
} from 'lucide-react'
import { loadMessages } from '../../utils/messagesApi'
import { useAuth } from '../../context/AuthContext'
import MessagePopup from './MessagePopup'

const TYPE_CONFIG = {
  info:    {
    color: '#3B82F6', bg: '#EFF6FF',
    border: '#BFDBFE', label: 'INFO',
    tabColor: '#3B82F6'
  },
  warning: {
    color: '#F59E0B', bg: '#FFFBEB',
    border: '#FDE68A', label: 'NOTICE',
    tabColor: '#F59E0B'
  },
  success: {
    color: '#10B981', bg: '#ECFDF5',
    border: '#A7F3D0', label: 'UPDATE',
    tabColor: '#10B981'
  },
  urgent:  {
    color: '#EF4444', bg: '#FEF2F2',
    border: '#FECACA', label: 'URGENT',
    tabColor: '#EF4444'
  },
}

// Read status via localStorage
const getReadKey = (userId) =>
  `datalens_read_msgs_${userId || 'guest'}`

const MessagesPanel = ({ isOpen, onToggle }) => {
  const { user } = useAuth()
  const [messages, setMessages]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [readIds, setReadIds]         = useState(() => {
    try {
      const s = localStorage.getItem(
        getReadKey(user?.id || user?.name)
      )
      return s ? JSON.parse(s) : []
    } catch { return [] }
  })
  const [filter, setFilter]           = useState('new')
  const [selectedMsg, setSelectedMsg] = useState(null)

  // Load messages
  useEffect(() => {
    const fetch = async () => {
      try {
        const { messages: all } = await loadMessages()
        const visible = all.filter(msg => {
          if (!msg.visible) return false
          if (msg.targetRoles?.includes('all')) return true
          return msg.targetRoles?.includes(user?.role)
        })
        visible.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        setMessages(visible)
      } catch (err) {
        console.error('Messages error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user])

  // Mark as read
  const markAsRead = useCallback((msgId) => {
    if (readIds.includes(msgId)) return
    const updated = [...readIds, msgId]
    setReadIds(updated)
    try {
      localStorage.setItem(
        getReadKey(user?.id || user?.name),
        JSON.stringify(updated)
      )
    } catch {}
  }, [readIds, user])

  const markAllRead = () => {
    const allIds = messages.map(m => m.id)
    setReadIds(allIds)
    try {
      localStorage.setItem(
        getReadKey(user?.id || user?.name),
        JSON.stringify(allIds)
      )
    } catch {}
  }

  // Open message popup
  const openMessage = (msg) => {
    markAsRead(msg.id)
    setSelectedMsg(msg)
  }

  const unreadCount = messages.filter(
    m => !readIds.includes(m.id)
  ).length

  const displayMessages = filter === 'new'
    ? messages.filter(m => !readIds.includes(m.id))
    : messages

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  // Strip HTML to get plain text preview
  const stripHtml = (html = '') => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
  }

  return (
    <>
      {/* ── PANEL CONTAINER ── */}
      <div className={`msg-panel-container
        ${isOpen ? 'is-open' : 'is-closed'}`}>

        {/* ── TOGGLE TAB ── */}
        <div
          className="msg-panel-tab"
          onClick={onToggle}
          title={isOpen
            ? 'Hide messages'
            : 'Show messages'}
        >
          {/* Tab content — vertical */}
          <div className="tab-inner">
            <Megaphone size={15} />

            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="tab-badge">
                {unreadCount}
              </span>
            )}

            {/* Vertical label */}
            <span className="tab-label">
              MESSAGES
            </span>

            {/* Arrow */}
            <div className="tab-arrow">
              {isOpen
                ? <ChevronRight size={12} />
                : <ChevronLeft size={12} />}
            </div>
          </div>
        </div>

        {/* ── PANEL BODY ── */}
        <div className="msg-panel-body">

          {/* Panel header */}
          <div className="msg-panel-header">
            <div className="panel-header-left">
              <Megaphone size={14} />
              <span>Messages</span>
              {unreadCount > 0 && (
                <span className="header-unread-badge">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="panel-header-right">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={markAllRead}
                  title="Mark all as read"
                >
                  <Eye size={12} />
                </button>
              )}
              <button
                className="panel-close-btn"
                onClick={onToggle}
                title="Hide panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="msg-filter-row">
            <button
              className={`msg-filter-btn
                ${filter === 'new' ? 'active' : ''}`}
              onClick={() => setFilter('new')}
            >
              New
              {unreadCount > 0 && (
                <span className="filter-count unread">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              className={`msg-filter-btn
                ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
              <span className="filter-count">
                {messages.length}
              </span>
            </button>
          </div>

          {/* Messages list */}
          <div className="msg-panel-list">
            {loading ? (
              <div className="panel-state-loading">
                <div className="spin" />
                <span>Loading...</span>
              </div>

            ) : displayMessages.length === 0 ? (
              <div className="panel-state-empty">
                <Eye size={24} />
                <p>All caught up!</p>
                {filter === 'new' && (
                  <button
                    className="show-all-btn"
                    onClick={() => setFilter('all')}
                  >
                    Show all messages
                  </button>
                )}
              </div>

            ) : (
              displayMessages.map(msg => {
                const tc = TYPE_CONFIG[msg.type]
                  || TYPE_CONFIG.info
                const isRead = readIds.includes(msg.id)
                const preview = stripHtml(msg.body)

                return (
                  <div
                    key={msg.id}
                    className={`msg-panel-item
                      ${isRead ? 'is-read' : 'is-unread'}`}
                    onClick={() => openMessage(msg)}
                    style={{
                      '--type-color': tc.color,
                      '--type-bg': tc.bg,
                      '--type-border': tc.border,
                    }}
                  >
                    {/* Unread dot */}
                    {!isRead && (
                      <span
                        className="msg-unread-dot"
                        style={{ background: tc.color }}
                      />
                    )}

                    {/* Type badge */}
                    <div className="msg-item-top">
                      <span
                        className="msg-type-badge"
                        style={{
                          color: tc.color,
                          background: tc.bg,
                        }}
                      >
                        {msg.pinned && '📌 '}
                        {tc.label}
                      </span>
                      <ExternalLink
                        size={11}
                        className="msg-open-icon"
                      />
                    </div>

                    {/* Title */}
                    <div className="msg-item-title">
                      {msg.title}
                    </div>

                    {/* ONE LINE preview */}
                    {preview && (
                      <div className="msg-item-preview">
                        {preview}
                        {preview.length >= 80 && '...'}
                      </div>
                    )}

                    {/* Date */}
                    {msg.showDate && (
                      <div className="msg-item-date">
                        <Clock size={10} />
                        {formatDate(msg.createdAt)}
                        {' · '}{msg.author}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>

      {/* ── POPUP MODAL for full message ── */}
      {selectedMsg && (
        <MessagePopup
          message={selectedMsg}
          onClose={() => setSelectedMsg(null)}
          typeConfig={
            TYPE_CONFIG[selectedMsg.type] || TYPE_CONFIG.info
          }
        />
      )}
    </>
  )
}

export default MessagesPanel
