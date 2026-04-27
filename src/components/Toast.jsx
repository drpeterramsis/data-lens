import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

let toastTimeout;

export const useToast = () => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    if (toastTimeout) clearTimeout(toastTimeout);
    setToast({ message, type });
    toastTimeout = setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast, hideToast: () => setToast(null) };
};

const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  const themes = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    info: 'bg-accent text-bg',
  };

  const Icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const Icon = Icons[toast.type] || Icons.info;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl min-w-[300px] border border-white/10 ${themes[toast.type]}`}
      >
        <Icon size={20} />
        <span className="flex-1 font-medium">{toast.message}</span>
        <button 
          onClick={onClose}
          className="hover:opacity-70 transition-opacity"
        >
          <X size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast;
