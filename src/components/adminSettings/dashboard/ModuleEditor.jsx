import React, { useState, useEffect } from 'react';
import { X, Save, Box, Shield, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { SidebarIcon } from '../../sidebar/SidebarIcon';

const ModuleEditor = ({
  isOpen,
  onClose,
  onSave,
  moduleItem
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('dashboard');
  const [color, setColor] = useState('#6366f1');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (moduleItem) {
      setName(moduleItem.name || '');
      setDescription(moduleItem.description || '');
      setIcon(moduleItem.icon || 'dashboard');
      setColor(moduleItem.color || '#6366f1');
      setVisible(moduleItem.visible !== false);
    } else {
      setName('');
      setDescription('');
      setIcon('dashboard');
      setColor('#6366f1');
      setVisible(true);
    }
  }, [moduleItem, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...moduleItem,
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      visible
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
            <Box size={20} className="text-amber-500" />
            Edit Tool Card
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 rounded bg-white border border-slate-200 shadow-sm"
          >
            <X size={18}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tool Title *</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Icon Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <SidebarIcon name={icon} size={18} />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">lucide-react identifier</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Theme Color</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer p-1 shrink-0"
                  />
                  <input 
                    type="text" 
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none font-mono uppercase text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <ToggleOption 
            label="Visible on Dashboard" 
            active={visible} 
            onToggle={() => setVisible(!visible)} 
            icon={visible ? <Eye size={14} /> : <EyeOff size={14} />}
          />

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
            >
              Update Tool Settings
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ToggleOption = ({ label, active, onToggle, icon }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex w-full items-center justify-between px-4 py-3 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${
      active 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
        : 'bg-slate-50 border-slate-200 text-slate-400'
    }`}
  >
    <div className="flex items-center gap-2">
      {icon}
      {label}
    </div>
    <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </div>
  </button>
);

export default ModuleEditor;
