import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet,
         X, CheckCircle } from 'lucide-react'

const FileUploadZone = ({
  onFileSelect,
  accept = '.xlsx,.xls,.csv',
  label = 'Upload File',
  hint = 'Excel or CSV files supported',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragError, setDragError]   = useState(null)
  const inputRef = useRef(null)

  // ── Validate file type ──
  const isValidFile = (file) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument' +
        '.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ]
    const validExts = ['.xlsx', '.xls', '.csv']
    const ext = '.' + file.name.split('.').pop()
      .toLowerCase()

    return validTypes.includes(file.type) ||
           validExts.includes(ext)
  }

  // ── Handle drag enter ──
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()      // ← CRITICAL
    e.stopPropagation()
    if (disabled) return
    setIsDragging(true)
    setDragError(null)
  }, [disabled])

  // ── Handle drag over — MUST preventDefault ──
  const handleDragOver = useCallback((e) => {
    e.preventDefault()      // ← CRITICAL — allows drop
    e.stopPropagation()
    if (disabled) return
    e.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }, [disabled])

  // ── Handle drag leave ──
  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if leaving the zone entirely
    // (not just moving to a child element)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (
      x < rect.left || x > rect.right ||
      y < rect.top  || y > rect.bottom
    ) {
      setIsDragging(false)
    }
  }, [])

  // ── Handle drop ──
  const handleDrop = useCallback((e) => {
    e.preventDefault()      // ← CRITICAL
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(
      e.dataTransfer.files || []
    )

    if (files.length === 0) return

    const file = files[0]   // take first file only

    if (!isValidFile(file)) {
      setDragError(
        `Invalid file type: ${file.name}. ` +
        `Please use .xlsx, .xls, or .csv`
      )
      return
    }

    setDragError(null)
    onFileSelect(file)
  }, [disabled, onFileSelect])

  // ── Handle click upload ──
  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      // Reset input so same file can be re-selected
      e.target.value = ''
    }
  }

  return (
    <div
      className={[
        'file-drop-zone',
        isDragging  ? 'is-dragging'  : '',
        disabled    ? 'is-disabled'  : '',
        dragError   ? 'has-error'    : '',
      ].join(' ')}

      // ── ALL 4 drag events required ──
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}    // ← most important
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}

      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
      aria-label="File upload drop zone"
    >

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        tabIndex={-1}
      />

      {/* ── Drag overlay indicator ── */}
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-inner">
            <Upload size={32} />
            <span>Drop file here</span>
          </div>
        </div>
      )}

      {/* ── Normal state ── */}
      <div className="drop-zone-content">

        <div className="drop-icon-wrap">
          <FileSpreadsheet size={28} />
        </div>

        <div className="drop-text">
          <span className="drop-main-text">
            {label}
          </span>
          <span className="drop-sub-text">
            Drag & drop or{' '}
            <span className="drop-browse">
              browse
            </span>
          </span>
          <span className="drop-hint">{hint}</span>
        </div>

      </div>

      {/* ── Error message ── */}
      {dragError && (
        <div
          className="drop-error"
          onClick={e => {
            e.stopPropagation()
            setDragError(null)
          }}
        >
          <X size={12} />
          <span>{dragError}</span>
        </div>
      )}

    </div>
  )
}

export default FileUploadZone
