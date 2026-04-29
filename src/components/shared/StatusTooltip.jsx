import React, { useState, useRef, useEffect } from 'react';

const StatusTooltip = ({
  children,      // the badge/label element
  title,         // bold header line
  lines = [],    // array of explanation strings
  color = "gray" // matches badge color family
}) => {

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click (mobile)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const colorMap = {
    green:  "border-green-300  bg-green-50",
    yellow: "border-yellow-300 bg-yellow-50",
    orange: "border-orange-300 bg-orange-50",
    red:    "border-red-300    bg-red-50",
    gray:   "border-gray-300   bg-gray-50",
  };

  const headerColorMap = {
    green:  "text-green-800",
    yellow: "text-yellow-800",
    orange: "text-orange-800",
    red:    "text-red-800",
    gray:   "text-gray-800",
  };

  return (
    <div ref={ref} className="relative inline-block">
      {/* The badge itself */}
      <div
        onClick={() => setOpen(o => !o)}
        className="cursor-help"
        // Desktop hover
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}>
        {children}
      </div>

      {/* Tooltip box */}
      {open && (
        <div className={`
          absolute z-[999]
          bottom-full left-1/2
          -translate-x-1/2
          mb-2
          w-64 sm:w-72
          rounded-xl border shadow-xl
          p-3 text-left
          pointer-events-none
          ${colorMap[color] ?? colorMap.gray}
        `}>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 overflow-hidden">
            <div className={`
              w-3 h-3 rotate-45
              border-r border-b
              -mt-1.5
              ${colorMap[color] ?? colorMap.gray}
            `}/>
          </div>

          {/* Header */}
          <div className={`font-black text-sm mb-2 flex items-center gap-1.5 ${headerColorMap[color]}`}>
            <span>ℹ️</span>
            <span>{title}</span>
          </div>

          {/* Explanation lines */}
          <div className="space-y-1">
            {lines.map((line, i) => (
              <div key={i} className="text-xs text-gray-700 flex items-start gap-1.5 leading-relaxed">
                <span className="mt-0.5 flex-shrink-0 text-gray-400">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-400">
            Based on recorded visit data
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusTooltip;
