import React, { useState, useEffect } from 'react';
import { loadMessages, saveMessages } from '../../../utils/messagesApi';
import MessageEditorModal from '../MessageEditorModal';

const TYPE_CONFIG = {
  info:    { color: '#3B82F6', label: 'INFO' },
  warning: { color: '#F59E0B', label: 'NOTICE' },
  success: { color: '#10B981', label: 'UPDATE' },
  urgent:  { color: '#EF4444', label: 'URGENT' },
}

const MessagesManagerTab = ({ currentUser, showToast, showError }) => {
  const [messages, setMessages] = useState([])
  const [messagesSha, setMessagesSha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)

  // Load messages on mount
  useEffect(() => {
    const fetch = async () => {
      try {
        const { messages: msgs, sha } = await loadMessages()
        setMessages(msgs)
        setMessagesSha(sha)
      } catch (err) {
        showError('Failed to load messages')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  // Toggle visibility
  const handleToggleVisible = async (msgId) => {
    const updated = messages.map(m =>
      m.id === msgId ? { ...m, visible: !m.visible } : m
    )
    await persistMessages(updated, 'Toggle message visibility')
  }

  // Delete
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const handleDelete = async (msgId) => {
    // First click: show inline confirm
    if (deleteConfirmId !== msgId) {
      setDeleteConfirmId(msgId)
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000)
      return
    }

    // Second click (confirmed): do delete
    setDeleteConfirmId(null)
    const updated = messages.filter(m => m.id !== msgId)
    await persistMessages(updated, 'Delete message: ' + msgId)
  }

  // Save new/edited
  const handleSaveMessage = async (msgData) => {
    let updated
    if (editingMessage) {
      updated = messages.map(m =>
        m.id === editingMessage.id
          ? {
              ...m,
              ...msgData,
              updatedAt: new Date().toISOString()
            }
          : m
      )
    } else {
      const newMsg = {
        id: 'msg_' + Date.now(),
        ...msgData,
        author: currentUser?.fullName || 'Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updated = [newMsg, ...messages]
    }
    await persistMessages(
      updated,
      editingMessage ? 'Edit message' : 'Add new message'
    )
    setEditorOpen(false)
    setEditingMessage(null)
  }

  // Persist to GitHub
  const persistMessages = async (updated, commitMsg) => {
    setSaving(true)
    try {
      console.log('💾 Saving messages...', updated.length)
      await saveMessages(updated, messagesSha, commitMsg)
      setMessages(updated)
      showToast('✅ Messages saved!')
    } catch (err) {
      console.error('❌ persistMessages failed:', err)
      showError('Failed to save: ' + err.message)
      // Reload to sync
      const { messages: reloaded, sha } = await loadMessages()
      setMessages(reloaded)
      setMessagesSha(sha)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="messages-manager-tab p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black text-xl text-slate-800">📢 Messages Manager</h3>
          <p className="text-slate-500 font-medium text-sm">Create announcements for dashboard</p>
        </div>
        <button
          className="px-4 py-2 bg-[#FFC300] hover:bg-[#FFD700] text-[#7B0000] font-black rounded-xl transition-all"
          onClick={() => {
            setEditingMessage(null)
            setEditorOpen(true)
          }}
        >
          + New Message
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-400 font-bold">Loading...</div>
      ) : messages.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-bold">
          No messages yet. Click "+ New Message" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => {
            const typeConf = TYPE_CONFIG[msg.type] || TYPE_CONFIG.info
            return (
              <div
                key={msg.id}
                className={`flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm
                  ${!msg.visible ? 'opacity-60 bg-slate-50' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {msg.pinned && <span>📌</span>}
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: typeConf.color, background: `${typeConf.color}15` }}
                    >
                      {typeConf.label}
                    </span>
                    <span className="font-bold text-slate-800">{msg.title}</span>
                    {!msg.visible && (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Hidden</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    {new Date(msg.createdAt)
                      .toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    {' · '}
                    {msg.targetRoles.includes('all')
                      ? 'All Users'
                      : msg.targetRoles.join(', ')}
                    {' · by '}{msg.author}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg hover:text-slate-600"
                    title="Edit"
                    onClick={() => {
                      setEditingMessage(msg)
                      setEditorOpen(true)
                    }}
                  >✏️</button>
                  <button
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg hover:text-slate-600"
                    title={msg.visible ? 'Hide' : 'Show'}
                    onClick={() => handleToggleVisible(msg.id)}
                  >
                    {msg.visible ? '👁️' : '🚫'}
                  </button>
                  
                  {deleteConfirmId === msg.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-150">
                      <button className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded" onClick={() => handleDelete(msg.id)}>Yes</button>
                      <button className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded" onClick={() => setDeleteConfirmId(null)}>No</button>
                    </div>
                  ) : (
                    <button
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete"
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(msg.id)
                      }}
                    >🗑️</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editorOpen && (
        <MessageEditorModal
          message={editingMessage}
          onSave={handleSaveMessage}
          onClose={() => {
            setEditorOpen(false)
            setEditingMessage(null)
          }}
        />
      )}
    </div>
  )
}

export default MessagesManagerTab;
