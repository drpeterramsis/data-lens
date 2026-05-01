import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Filter } from 'lucide-react';

/**
 * ResponsivePanel: Reusable pattern for Filter Sidebars
 * Desktop (lg+): Fixed sidebar column
 * Mobile (<lg): Off-canvas drawer
 */
const ResponsivePanel = ({ 
  isOpen, 
  onClose, 
  children, 
  title = "Filters",
  icon: Icon = Filter,
  count = 0
}) => {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Desktop View: Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-200 shrink-0 overflow-hidden shadow-sm z-10">
        {children}
      </aside>

      {/* Mobile View: Animated Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-full max-w-xs bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-900 font-black uppercase tracking-widest text-xs">
                  <Icon size={14} className="text-blue-600" />
                  {title} {count > 0 && `(${count})`}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ResponsivePanel;
