import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, 
  RotateCcw, Download, Settings, Loader2, AlertCircle 
} from 'lucide-react';

const VideoPlayer = ({ 
  url, 
  title, 
  allowDownload = true, 
  defaultSpeed = 1,
  className = "" 
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(defaultSpeed);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
    setIsLoading(false);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    videoRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    videoRef.current.muted = newMute;
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowRight') {
      videoRef.current.currentTime += 5;
    } else if (e.key === 'ArrowLeft') {
      videoRef.current.currentTime -= 5;
    }
  };

  const handleError = () => {
    // Check if the URL is a direct playable source
    setError("This video link is not a direct playable source or the format is unsupported.");
    setIsLoading(false);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group bg-black rounded-xl overflow-hidden aspect-video shadow-2xl flex items-center justify-center ${className}`}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      tabIndex="0"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onError={handleError}
        onClick={togglePlay}
        controlsList={allowDownload ? "" : "nodownload"}
        playsInline
      />

      {/* Loading Indicator */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-lg font-bold mb-2">Video Error</p>
          <p className="text-sm text-slate-400 max-w-xs">{error}</p>
          <button 
            onClick={() => window.open(url, '_blank')}
            className="mt-4 px-4 py-2 bg-violet-600 rounded-lg text-sm hover:bg-violet-500 flex items-center gap-2"
          >
            Open in Browser
          </button>
        </div>
      )}

      {/* Custom Controls */}
      {!error && (
        <div className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-mono text-white w-10">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-violet-500 h-1 rounded-lg cursor-pointer appearance-none bg-white/20"
            />
            <span className="text-[10px] font-mono text-white w-10">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePlay}
                className="text-white hover:text-violet-400 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>

              <div className="flex items-center gap-2 group/volume">
                <button onClick={toggleMute} className="text-white hover:text-violet-400 transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-violet-500 h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {title && (
                <span className="text-white text-xs font-medium truncate max-w-[200px] hidden sm:block">
                  {title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Playback Speed */}
              <div className="relative group/speed">
                <button className="text-white text-xs font-bold hover:text-violet-400 transition-colors flex items-center gap-1">
                  {playbackSpeed}x
                </button>
                <div className="absolute bottom-full right-0 mb-2 bg-slate-900 rounded-lg border border-slate-700 shadow-xl py-1 hidden group-hover/speed:block">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full px-4 py-1.5 text-xs text-left hover:bg-violet-600/20 transition-colors ${playbackSpeed === speed ? 'text-violet-400 font-bold' : 'text-slate-300'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {allowDownload && (
                <a 
                  href={url} 
                  download 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-white hover:text-violet-400 transition-colors"
                  title="Download Video"
                >
                  <Download className="w-5 h-5" />
                </a>
              )}

              <button 
                onClick={toggleFullscreen}
                className="text-white hover:text-violet-400 transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
