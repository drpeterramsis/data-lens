import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';

const TargetSettingsPanel = ({ onTargetsChange, data, dateFrom, dateTo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targets, setTargets] = useState({
    hcpPerDay: 0,
    hcoPerDay: 0,
    phPerDay: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem("datalens_targets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTargets(parsed);
        // Call initially if needed
        if (onTargetsChange) onTargetsChange(parsed);
      } catch (e) {}
    }
  }, []);

  // auto calc working days
  const workingDays = React.useMemo(() => {
    let start = new Date(dateFrom || data.reduce((min, d) => d.ReportDate < min ? d.ReportDate : min, data[0]?.ReportDate));
    let end = new Date(dateTo || data.reduce((max, d) => d.ReportDate > max ? d.ReportDate : max, data[0]?.ReportDate));
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    let days = 0;
    let current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 4 && day !== 5) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [data, dateFrom, dateTo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTargets(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSave = () => {
    localStorage.setItem("datalens_targets", JSON.stringify(targets));
    if (onTargetsChange) onTargetsChange(targets);
    setIsOpen(false);
  };

  return (
    <div className="bg-white border text-sm border-gray-200 rounded-2xl shadow-sm mb-8 overflow-hidden">
      <div 
        className="p-4 bg-gray-50/50 flex justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-600" />
          <h3 className="font-bold text-gray-900 border-b-2 border-transparent hover:border-gray-200">
            ⚙️ Target Call Rate Configuration
          </h3>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      
      {isOpen && (
        <div className="p-6 border-t border-gray-100 bg-white">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <h4 className="font-bold text-gray-800 text-xs uppercase tracking-widest mb-4">Target Calls Per Day (Per MR)</h4>
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <label className="text-gray-600 font-medium">HCP calls/day:</label>
                   <input type="number" name="hcpPerDay" value={targets.hcpPerDay} onChange={handleChange} className="w-24 border rounded p-1 text-center" min="0" step="0.1" />
                 </div>
                 <div className="flex items-center justify-between">
                   <label className="text-gray-600 font-medium">HCO calls/day:</label>
                   <input type="number" name="hcoPerDay" value={targets.hcoPerDay} onChange={handleChange} className="w-24 border rounded p-1 text-center" min="0" step="0.1" />
                 </div>
                 <div className="flex items-center justify-between">
                   <label className="text-gray-600 font-medium">PH calls/day:</label>
                   <input type="number" name="phPerDay" value={targets.phPerDay} onChange={handleChange} className="w-24 border rounded p-1 text-center" min="0" step="0.1" />
                 </div>
               </div>
             </div>
             
             <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-between">
               <div>
                 <p className="text-gray-500 font-medium mb-1">Working Days in Period:</p>
                 <p className="text-3xl font-black text-gray-900">{workingDays}</p>
                 <p className="text-[10px] text-gray-400 mt-2">(Excludes Thursdays & Fridays from date range)</p>
               </div>
               
               <button onClick={handleSave} className="mt-4 w-full bg-gray-900 text-white font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors">
                 Save Targets
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TargetSettingsPanel;
