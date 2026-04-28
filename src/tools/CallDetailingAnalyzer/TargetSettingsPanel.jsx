import React, { useState, useEffect } from 'react';
import { Settings, Save, Trash2 } from 'lucide-react';

const TargetSettingsPanel = ({ onTargetsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasTargets, setHasTargets] = useState(false);
  const [targets, setTargets] = useState({
    hcpPerDay: 2,
    hcoPerDay: 1,
    phPerDay: 2,
  });
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("datalens_targets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTargets(parsed);
        setHasTargets(true);
        if (onTargetsChange) onTargetsChange(parsed);
      } catch (e) {}
    } else {
       // if no saved targets, keep panel open initially
       setIsOpen(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTargets(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSave = () => {
    localStorage.setItem("datalens_targets", JSON.stringify(targets));
    setHasTargets(true);
    if (onTargetsChange) onTargetsChange(targets);
    setShowSavedMsg(true);
    setTimeout(() => {
       setShowSavedMsg(false);
       setIsOpen(false);
    }, 2000);
  };

  const handleClear = () => {
    localStorage.removeItem("datalens_targets");
    setHasTargets(false);
    const defaults = { hcpPerDay: 2, hcoPerDay: 1, phPerDay: 2 };
    setTargets(defaults);
    if (onTargetsChange) onTargetsChange(defaults);
  };

  return (
    <div className="bg-white border text-sm border-gray-200 rounded-[1.25rem] shadow-sm mb-8 overflow-hidden">
      <div 
        className="p-5 bg-gray-50/50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
             <Settings size={20} className="text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            ⚙️ Daily Call Rate Targets
            {hasTargets && !isOpen && <span className="text-[9px] bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded uppercase font-black tracking-widest ml-2 shadow-sm">Targets Active</span>}
          </h3>
        </div>
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{isOpen ? 'Collapse ▼' : 'Expand ▶'}</span>
      </div>
      
      {isOpen && (
        <div className="p-6 border-t border-gray-100 bg-white">
           {showSavedMsg && (
             <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-sm text-xs font-bold flex items-center gap-2">
                ✅ Targets saved and applied to performance grids.
             </div>
           )}
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl shadow-sm">
                <label className="block text-[10px] font-black uppercase text-blue-800 tracking-widest mb-1 shadow-sm">HCP calls per PM day</label>
                <div className="flex items-center gap-3 mt-2">
                   <input type="number" name="hcpPerDay" value={targets.hcpPerDay} onChange={handleChange} className="w-20 border border-blue-200 rounded-lg shadow-inner py-1.5 px-3 text-center font-black text-gray-900 focus:ring-2 focus:ring-blue-400 outline-none" min="0" step="0.5" />
                   <span className="text-[9px] text-blue-600/70 font-bold uppercase tracking-widest">Mon–Wed only<br/>(Thu PM off)</span>
                </div>
             </div>
             
             <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl shadow-sm">
                <label className="block text-[10px] font-black uppercase text-green-800 tracking-widest mb-1 shadow-sm">HCO calls per AM day</label>
                <div className="flex items-center gap-3 mt-2">
                   <input type="number" name="hcoPerDay" value={targets.hcoPerDay} onChange={handleChange} className="w-20 border border-green-200 rounded-lg shadow-inner py-1.5 px-3 text-center font-black text-gray-900 focus:ring-2 focus:ring-green-400 outline-none" min="0" step="0.5" />
                   <span className="text-[9px] text-green-600/70 font-bold uppercase tracking-widest">Mon–Thu AM</span>
                </div>
             </div>
             
             <div className="bg-teal-50/50 border border-teal-100 p-4 rounded-xl shadow-sm">
                <label className="block text-[10px] font-black uppercase text-teal-800 tracking-widest mb-1 shadow-sm">PH calls per AM day</label>
                <div className="flex items-center gap-3 mt-2">
                   <input type="number" name="phPerDay" value={targets.phPerDay} onChange={handleChange} className="w-20 border border-teal-200 rounded-lg shadow-inner py-1.5 px-3 text-center font-black text-gray-900 focus:ring-2 focus:ring-teal-400 outline-none" min="0" step="0.5" />
                   <span className="text-[9px] text-teal-600/70 font-bold uppercase tracking-widest">Mon–Thu AM</span>
                </div>
             </div>
           </div>
           
           <div className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-6">
             <button onClick={handleSave} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black uppercase tracking-widest text-[10px] py-2.5 px-6 rounded-lg transition-colors shadow-sm">
               <Save size={14} /> Save Targets
             </button>
             {hasTargets && (
               <button onClick={handleClear} className="flex items-center gap-2 text-gray-400 hover:text-red-500 hover:bg-red-50 font-black uppercase tracking-widest text-[10px] py-2.5 px-4 rounded-lg transition-colors">
                 <Trash2 size={14} /> Clear Targets
               </button>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default TargetSettingsPanel;
