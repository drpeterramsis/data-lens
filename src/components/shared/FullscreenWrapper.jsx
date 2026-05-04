
import { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

const FullscreenWrapper = ({
  children,
  className = '',
  showButton = true,
  buttonPosition = 'top-right',
  title = '',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  return (
    <>
      {/* ── FULLSCREEN OVERLAY ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          {/* Header bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between
                          px-6 py-3 bg-white border-b border-gray-100 shadow-sm">
            {title && (
              <h3 className="text-sm font-black text-gray-900 uppercase 
                             tracking-widest">
                {title}
              </h3>
            )}
            <button
              onClick={() => setIsFullscreen(false)}
              className="ml-auto flex items-center gap-2 px-4 py-2
                         text-[10px] font-black uppercase tracking-widest
                         bg-gray-900 text-white rounded-xl
                         hover:bg-red-600 transition-all shadow-md
                         active:scale-95">
              <Minimize2 size={14} />
              Exit Fullscreen
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      )}

      {/* ── NORMAL VIEW ── */}
      <div className={`relative ${className}`}>
        {/* Fullscreen button */}
        {showButton && !isFullscreen && (
          <div className={`flex mb-3 ${
            buttonPosition === 'top-left' 
              ? 'justify-start' 
              : 'justify-end'
          }`}>
            <button
              onClick={() => setIsFullscreen(true)}
              title="Enter Fullscreen"
              className="flex items-center gap-2 px-3 py-1.5
                         text-[10px] font-bold text-gray-700
                         bg-white border border-gray-200 shadow-sm
                         hover:bg-gray-50 rounded-lg transition-colors">
              <Maximize2 size={13} />
              Fullscreen
            </button>
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </>
  );
};

export default FullscreenWrapper;