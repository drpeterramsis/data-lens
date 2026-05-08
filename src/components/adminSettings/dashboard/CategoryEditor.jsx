import React, { useState, useEffect } from 'react';
import { X, Save, Layout, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { resolveIcon } from '../../../utils/iconResolver';

const CategoryEditor = ({
  isOpen,
  onClose,
  onSave,
  category,
  existingModules = []
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📊');
  const [color, setColor] = useState('#3B82F6');
  const [visible, setVisible] = useState(true);
  const [adminOnly, setAdminOnly] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setIcon(category.icon || '📊');
      setColor(category.color || '#3B82F6');
      setVisible(category.visible !== false);
      setAdminOnly(category.adminOnly || false);
      setSelectedModules(category.modules || []);
    } else {
      setName('');
      setIcon('📊');
      setColor('#3B82F6');
      setVisible(true);
      setAdminOnly(false);
      setSelectedModules([]);
    }
  }, [category, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      icon,
      color,
      visible,
      adminOnly,
      modules: selectedModules
    });
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            <Layout size={20} className="text-amber-500" />
            {category ? 'Edit Category' : 'Add New Category'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 rounded bg-white border border-slate-200 shadow-sm"
          >
            <X size={18}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category Name *</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                placeholder="e.g. Analytics"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Icon (Emoji)</label>
              <input 
                type="text" 
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none text-center text-xl"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Theme Color</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color" 
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer p-1"
                />
                <input 
                  type="text" 
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none font-mono uppercase text-xs"
                />
              </div>
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <ToggleOption 
              label="Visible" 
              active={visible} 
              onToggle={() => setVisible(!visible)} 
              icon={<Layout size={14} />}
            />
            <ToggleOption 
              label="Admin Only" 
              active={adminOnly} 
              onToggle={() => setAdminOnly(!adminOnly)} 
              icon={<Shield size={14} />}
            />
          </div>

          {/* Module Assignment */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Modules in this Category</label>
            <div className="grid grid-cols-1 gap-2">
              {existingModules.map(mod => (
                <div 
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedModules.includes(mod.id) 
                      ? 'border-amber-500 bg-amber-50' 
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400">
                      {resolveIcon(mod.icon, 18)}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{mod.name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedModules.includes(mod.id)
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-slate-200 bg-white'
                  }`}>
                    {selectedModules.includes(mod.id) && <Save size={10} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
            >
              {category ? 'Update Category' : 'Create Category'}
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
    className={`flex items-center justify-between px-4 py-3 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${
      active 
        ? 'bg-amber-50 border-amber-200 text-amber-700' 
        : 'bg-slate-50 border-slate-200 text-slate-400'
    }`}
  >
    <div className="flex items-center gap-2">
      {icon}
      {label}
    </div>
    <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-amber-500' : 'bg-slate-300'}`}>
      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </div>
  </button>
);

export default CategoryEditor;
