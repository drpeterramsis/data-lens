import { useFullscreen } from '../../hooks/useFullscreen'
import { Maximize2, Minimize2 } from 'lucide-react'

const FullscreenWrapper = ({
  children,
  className = '',
  showButton = true,
  buttonPosition = 'top-right',  // 'top-right' | 'top-left'
  title = '',
}) => {
  const {
    containerRef,
    isFullscreen,
    toggleFullscreen,
  } = useFullscreen()

  return (
    <div
      ref={containerRef}
      className={[
        'fullscreen-wrapper',
        isFullscreen ? 'is-fullscreen' : '',
        className,
      ].join(' ')}
    >

      {/* Fullscreen button */}
      {showButton && (
        <button
          className={[
            'fullscreen-btn',
            `pos-${buttonPosition}`,
            isFullscreen ? 'is-active' : '',
          ].join(' ')}
          onClick={toggleFullscreen}
          title={isFullscreen
            ? 'Exit fullscreen (ESC)'
            : 'View fullscreen'}
        >
          {isFullscreen
            ? <Minimize2 size={14} />
            : <Maximize2 size={14} />}
          <span className="fs-btn-label">
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </span>
        </button>
      )}

      {/* Content */}
      <div className="fullscreen-content">
        {children}
      </div>

    </div>
  )
}

export default FullscreenWrapper
