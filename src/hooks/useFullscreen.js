import { useState, useEffect, useCallback, useRef } from 'react'

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  // Listen for ESC key or browser fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      )
      setIsFullscreen(isFull)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    document.addEventListener('mozfullscreenchange', handleFsChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
      document.removeEventListener('mozfullscreenchange', handleFsChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen()
      } else {
        // Fallback: CSS fullscreen (no browser API)
        setIsFullscreen(true)
      }
    } catch (err) {
      // Fallback to CSS if browser API fails
      console.warn('Fullscreen API failed, using CSS fallback')
      setIsFullscreen(true)
    }
  }, [])

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (document.webkitFullscreenElement) {
        await document.webkitExitFullscreen()
      } else if (document.mozFullScreenElement) {
        await document.mozCancelFullScreen()
      } else {
        // CSS fallback exit
        setIsFullscreen(false)
      }
    } catch (err) {
      setIsFullscreen(false)
    }
  }, [])

  // Toggle
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  return {
    containerRef,
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  }
}
