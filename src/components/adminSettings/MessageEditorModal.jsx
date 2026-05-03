import { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['blockquote', 'code-block'],
    ['clean']
  ]
}

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

const MessageEditorModal = ({ message, onSave, onClose }) => {
  const [title, setTitle] = useState(message?.title || '')
  const [body, setBody] = useState(message?.body || '')
  const [type, setType] = useState(message?.type || 'info')
  const [targetRoles, setTargetRoles] = useState(
    message?.targetRoles || ['all']
  )
  const [showDate, setShowDate] = useState(
    message?.showDate ?? true
  )
  const [visible, setVisible] = useState(
    message?.visible ?? true
  )
  const [pinned, setPinned] = useState(
    message?.pinned ?? false
  )

  const ROLE_OPTIONS = [
    { value: 'all',            label: 'All Users' },
    { value: 'admin',          label: 'Admin Only' },
    { value: 'supervisor',     label: 'Supervisors' },
    { value: 'representative', label: 'Representatives' },
  ]

  const handleRoleToggle = (role) => {
    if (role === 'all') {
      setTargetRoles(['all'])
      return
    }
    const withoutAll = targetRoles.filter(r => r !== 'all')
    if (withoutAll.includes(role)) {
      const removed = withoutAll.filter(r => r !== role)
      setTargetRoles(removed.length ? removed : ['all'])
    } else {
      setTargetRoles([...withoutAll, role])
    }
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    if (!body.trim() || body === '<p><br></p>') return

    onSave({
      title: title.trim(),
      body,
      type,
      targetRoles,
      showDate,
      visible,
      pinned,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="message-editor-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3>
            {message ? '✏️ Edit Message' : '📢 New Message'}
          </h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">

          {/* Title */}
          <div className="field-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Message title..."
              className="title-input"
            />
          </div>

          {/* Body — Rich Text */}
          <div className="field-group">
            <label>Body *</label>
            <ReactQuill
              value={body}
              onChange={setBody}
              modules={QUILL_MODULES}
              placeholder="Write your message here..."
              className="rich-text-editor"
            />
          </div>

          {/* Type selector */}
          <div className="field-group">
            <label>Type</label>
            <div className="type-selector">
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <button
                  key={key}
                  className={`type-btn ${type === key ? 'active' : ''}`}
                  style={type === key ? {
                    background: conf.bg,
                    borderColor: conf.color,
                    color: conf.color,
                  } : {}}
                  onClick={() => setType(key)}
                >
                  {conf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Roles */}
          <div className="field-group">
            <label>Show to</label>
            <div className="roles-selector">
              {ROLE_OPTIONS.map(role => (
                <button
                  key={role.value}
                  className={`role-btn
                    ${targetRoles.includes(role.value)
                      ? 'active' : ''}`}
                  onClick={() => handleRoleToggle(role.value)}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options row */}
          <div className="options-row">
            <label className="toggle-label">
              <span>Show Date</span>
              <input
                type="checkbox"
                checked={showDate}
                onChange={e => setShowDate(e.target.checked)}
              />
            </label>
            <label className="toggle-label">
              <span>Visible on Dashboard</span>
              <input
                type="checkbox"
                checked={visible}
                onChange={e => setVisible(e.target.checked)}
              />
            </label>
            <label className="toggle-label">
              <span>📌 Pin to Top</span>
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
              />
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-save"
            disabled={!title.trim() || !body.trim()}
          >
            {message ? 'Save Changes' : 'Publish Message'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MessageEditorModal;
