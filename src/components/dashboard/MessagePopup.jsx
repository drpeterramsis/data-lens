import { useEffect } from 'react'
import { X, Calendar, User, Pin } from 'lucide-react'

const MessagePopup = ({ message, onClose, typeConfig: tc }) => {

  // Close on ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    /* Overlay */
    <div
      className="msg-popup-overlay"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="msg-popup-modal"
        onClick={e => e.stopPropagation()}
        style={{ '--type-color': tc.color }}
      >

        {/* Top accent bar */}
        <div
          className="msg-popup-accent-bar"
          style={{ background: tc.color }}
        />

        {/* Header */}
        <div className="msg-popup-header">
          <div className="msg-popup-header-left">

            {/* Type badge */}
            <span
              className="msg-popup-type-badge"
              style={{
                color: tc.color,
                background: tc.bg,
                border: `1.5px solid ${tc.border}`,
              }}
            >
              {tc.label}
            </span>

            {/* Pinned */}
            {message.pinned && (
              <span className="msg-popup-pinned">
                <Pin size={12} />
                Pinned
              </span>
            )}

          </div>

          {/* Close button */}
          <button
            className="msg-popup-close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Title */}
        <h2
          className="msg-popup-title"
          style={{ color: tc.color }}
        >
          {message.title}
        </h2>

        {/* Meta: date + author */}
        <div className="msg-popup-meta">
          {message.showDate && message.createdAt && (
            <div className="meta-item">
              <Calendar size={12} />
              <span>{formatDate(message.createdAt)}</span>
            </div>
          )}
          {message.author && (
            <div className="meta-item">
              <User size={12} />
              <span>by {message.author}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="msg-popup-divider"
          style={{ background: tc.border }}
        />

        {/* Body — full rich text */}
        <div
          className="msg-popup-body"
          dangerouslySetInnerHTML={{ __html: message.body }}
        />

        {/* Footer */}
        <div className="msg-popup-footer">
          <button
            className="msg-popup-done-btn"
            onClick={onClose}
            style={{
              background: tc.color,
              borderColor: tc.color,
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  )
}

export default MessagePopup
