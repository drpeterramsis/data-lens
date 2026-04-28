import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, X } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';

const ForecastTool = ({ data, targets }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastReportDate, setLastReportDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vacations, setVacations] = useState([]);

  const addVacation = () => setVacations([...vacations, { date: '', type: 'Full Day', name: '' }]);
  const updateVacation = (index, field, val) => {
    const newV = [...vacations];
    newV[index][field] = val;
    setVacations(newV);
  };
  const removeVacation = (index) => {
    setVacations(vacations.filter((_, i) => i !== index));
  };

  const periodAnalysis = useMemo(() => {
    if (!lastReportDate || !endDate) return null;
    
    let start = new Date(lastReportDate);
    // Add one day to start looking from the day AFTER the last report
    start.setDate(start.getDate() + 1);
    let end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    
    let totalDays = 0;
    let fridays = 0;
    let thursdays = 0;
    
    // Map vacations
    const vacMap = {};
    let fullHols = 0, halfAmHols = 0, halfPmHols = 0;
    
    vacations.forEach(v => {
       if (v.date) {
         vacMap[v.date] = v.type;
         if (v.type === 'Full Day') fullHols++;
         else if (v.type === 'Half Day AM') halfAmHols++;
         else if (v.type === 'Half Day PM') halfPmHols++;
       }
    });
    
    let hcpWorkingDays = 0;
    let hcoWorkingDays = 0;
    let phWorkingDays = 0;
    
    let current = new Date(start);
    const dayCells = [];
    
    while (current <= end) {
      totalDays++;
      const day = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      const holType = vacMap[dateStr];
      
      let isHcpOff = day === 5 || day === 4 || holType === 'Full Day' || holType === 'Half Day PM';
      let isHcoOff = day === 5 || holType === 'Full Day' || holType === 'Half Day AM';
      let isPhOff = isHcoOff;
      
      if (!isHcpOff) hcpWorkingDays++;
      if (!isHcoOff) hcoWorkingDays++;
      if (!isPhOff) phWorkingDays++;
      
      if (day === 5) fridays++;
      if (day === 4) thursdays++;
      
      // Color logic
      let bg = "bg-green-50 border-green-200 text-green-700";
      if (day === 5) bg = "bg-red-50 border-red-200 text-red-700";
      else if (holType === 'Full Day') bg = "bg-purple-50 border-purple-200 text-purple-700";
      else if (holType === 'Half Day AM' || holType === 'Half Day PM') bg = "bg-yellow-50 border-yellow-200 text-yellow-700";
      else if (day === 4) bg = "bg-orange-50 border-orange-200 text-orange-700";
      
      dayCells.push({ d: current.getDate(), bg, isHcpOff, isHcoOff, dateStr });
      current.setDate(current.getDate() + 1);
    }
    
    return {
      totalDays, fridays, thursdays, fullHols, halfAmHols, halfPmHols,
      hcpWorkingDays, hcoWorkingDays, phWorkingDays, start, end, dayCells
    };
  }, [lastReportDate, endDate, vacations]);

  const mrForecast = useMemo(() => {
    if (!periodAnalysis || !targets) return [];
    
    const rawMap = {};
    data.forEach(d => {
      const mr = safeStr(d.MrName);
      if (!mr) return;
      if (!rawMap[mr]) rawMap[mr] = { name: mr, hcp: 0, hco: 0, ph: 0 };
      
      const type = safeStr(d.InteractionType);
      if (type === 'HCP') rawMap[mr].hcp++;
      else if (type === 'HCO') rawMap[mr].hco++;
      else if (type === 'Pharmacy') rawMap[mr].ph++;
    });

    const parsed = Object.values(rawMap).map(mr => {
      
      const hcpTarget = (targets.hcpPerDay || 0) * periodAnalysis.hcpWorkingDays;
      const hcoTarget = (targets.hcoPerDay || 0) * periodAnalysis.hcoWorkingDays;
      const phTarget =  (targets.phPerDay || 0) * periodAnalysis.phWorkingDays;

      const remHcp = hcpTarget - mr.hcp;
      const remHco = hcoTarget - mr.hco;
      const remPh = phTarget - mr.ph;

      const reqHcp = (periodAnalysis.hcpWorkingDays > 0) ? (remHcp / periodAnalysis.hcpWorkingDays) : 0;
      const reqHco = (periodAnalysis.hcoWorkingDays > 0) ? (remHco / periodAnalysis.hcoWorkingDays) : 0;
      const reqPh = (periodAnalysis.phWorkingDays > 0) ? (remPh / periodAnalysis.phWorkingDays) : 0;

      // Status
      let status = '✅ On Track';
      let statClass = 'bg-green-100 text-green-800 border-green-200';
      
      const maxReqRatio = Math.max(
         targets.hcpPerDay > 0 ? reqHcp / targets.hcpPerDay : 0,
         targets.hcoPerDay > 0 ? reqHco / targets.hcoPerDay : 0,
         targets.phPerDay > 0 ? reqPh / targets.phPerDay : 0
      );

      if (maxReqRatio > 1.5) { status = '🔴 Critical'; statClass = 'bg-red-100 text-red-800 border-red-200'; }
      else if (maxReqRatio > 1.0) { status = '🟡 At Risk'; statClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'; }

      return {
         ...mr, hcpTarget, hcoTarget, phTarget, remHcp, remHco, remPh,
         reqHcp, reqHco, reqPh, status, statClass
      };
    });

    return parsed.sort((a,b) => b.reqHcp - a.reqHcp);
  }, [data, periodAnalysis, targets]);

  const CellColor = (req, target) => {
     if (req <= 0) return 'text-gray-400 bg-gray-50';
     if (!target || target === 0) return '';
     
     if (req <= target) return 'bg-green-50 text-green-800 font-bold';
     if (req <= target * 1.5) return 'bg-yellow-50 text-yellow-800 font-bold';
     return 'bg-red-50 text-red-800 font-black';
  };

  return (
    <div className="bg-white text-sm border border-gray-200 rounded-2xl shadow-sm mb-12 overflow-hidden">
      <div 
        className="p-5 bg-gray-50/50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
             <TrendingUp size={20} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">
            📈 Forecast Calculator
          </h3>
        </div>
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{isOpen ? 'Collapse ▼' : 'Expand ▶'}</span>
      </div>

      {isOpen && (
        <div className="p-6 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Last Report Date</label>
                   <input type="date" className="w-full border border-gray-200 shadow-sm rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow" value={lastReportDate} onChange={e => setLastReportDate(e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Period End Date</label>
                   <input type="date" className="w-full border border-gray-200 shadow-sm rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-shadow" value={endDate} onChange={e => setEndDate(e.target.value)} />
                 </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Public Holidays in remaining period</label>
                  <button onClick={addVacation} className="text-accent-dark hover:bg-accent/20 px-2 py-1 rounded transition-colors flex items-center gap-1 text-[10px] font-black uppercase"><Plus size={12}/> Add</button>
                </div>
                <div className="space-y-3">
                  {vacations.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No holidays added.</p>}
                  {vacations.map((v, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
                      <input type="date" className="border-gray-200 rounded px-2 py-1.5 text-xs flex-1 min-w-[120px]" value={v.date} onChange={e => updateVacation(idx, 'date', e.target.value)} />
                      <select className="border-gray-200 rounded px-2 py-1.5 text-xs bg-white flex-1 min-w-[120px]" value={v.type} onChange={e => updateVacation(idx, 'type', e.target.value)}>
                         <option>Full Day</option>
                         <option>Half Day AM</option>
                         <option>Half Day PM</option>
                      </select>
                      <input type="text" placeholder="Name" className="border-gray-200 rounded px-2 py-1.5 text-xs flex-1 min-w-[100px]" value={v.name} onChange={e => updateVacation(idx, 'name', e.target.value)} />
                      <button onClick={() => removeVacation(idx)} className="text-red-500 px-2.5 bg-red-50 hover:bg-red-100 rounded transition-colors flex items-center justify-center border border-red-100"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Note: Target editing is in the separate TargetPanel, we just show them here */}
              <div className="flex gap-4 items-center bg-blue-50/50 p-4 border border-blue-100 rounded-xl">
                 <p className="text-xs text-blue-900 flex-1">
                   <strong>Active Targets (per day):</strong><br/>
                   HCP: {targets?.hcpPerDay || 0} · HCO: {targets?.hcoPerDay || 0} · PH: {targets?.phPerDay || 0}
                 </p>
                 <button className="bg-yellow-400 text-yellow-900 font-black text-xs uppercase tracking-widest px-4 py-2 rounded-lg shadow-sm transition-colors hover:bg-yellow-300">
                    🔄 Calculate
                 </button>
              </div>
            </div>

            <div className="lg:col-span-7">
               {periodAnalysis ? (
                 <div className="bg-white border border-gray-200 rounded-2xl h-full shadow-sm overflow-hidden flex flex-col">
                   <div className="bg-gray-50 border-b border-gray-200 p-4">
                      <h4 className="font-black text-gray-900 flex items-center gap-2 tracking-tight">📅 Remaining Period Analysis</h4>
                   </div>
                   
                   <div className="p-5 flex-1 flex flex-col sm:flex-row gap-6">
                      <div className="flex-1 space-y-2">
                         <div className="flex justify-between text-xs py-1 border-b border-gray-100"><span className="text-gray-500 font-medium">Total Days:</span> <strong className="text-gray-900">{periodAnalysis.totalDays}</strong></div>
                         <div className="flex justify-between text-xs py-1 border-b border-gray-100"><span className="text-gray-500 font-medium">Fridays (Off):</span> <strong className="text-gray-900">{periodAnalysis.fridays}</strong></div>
                         <div className="flex justify-between text-xs py-1 border-b border-gray-100"><span className="text-gray-500 font-medium">Thursdays (PM Off):</span> <strong className="text-gray-900">{periodAnalysis.thursdays}</strong></div>
                         <div className="flex justify-between text-xs py-1 border-b border-gray-100"><span className="text-gray-500 font-medium">Public Holidays:</span> <strong className="text-gray-900">{periodAnalysis.fullHols + periodAnalysis.halfAmHols + periodAnalysis.halfPmHols}</strong></div>
                         <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest text-right">({periodAnalysis.fullHols} full, {periodAnalysis.halfAmHols} half AM, {periodAnalysis.halfPmHols} half PM)</p>
                         
                         <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 space-y-2">
                           <div className="flex justify-between text-xs font-bold text-blue-800"><span className="uppercase tracking-widest text-[10px]">HCP Working Days</span> <span>{periodAnalysis.hcpWorkingDays}</span></div>
                           <div className="flex justify-between text-xs font-bold text-green-700"><span className="uppercase tracking-widest text-[10px]">HCO Working Days</span> <span>{periodAnalysis.hcoWorkingDays}</span></div>
                           <div className="flex justify-between text-xs font-bold text-teal-700"><span className="uppercase tracking-widest text-[10px]">PH Working Days</span> <span>{periodAnalysis.phWorkingDays}</span></div>
                         </div>
                      </div>
                      
                      <div className="w-[180px] shrink-0">
                         <div className="grid grid-cols-7 gap-1">
                           <div className="text-[9px] text-center text-gray-400 font-black uppercase">S</div>
                           <div className="text-[9px] text-center text-gray-400 font-black uppercase">M</div>
                           <div className="text-[9px] text-center text-gray-400 font-black uppercase">T</div>
                           <div className="text-[9px] text-center text-gray-400 font-black uppercase">W</div>
                           <div className="text-[9px] text-center text-gray-400 font-black uppercase">T</div>
                           <div className="text-[9px] text-center text-gray-400 font-black uppercase">F</div>
                           <div className="text-[9px] text-center text-gray-400 font-black uppercase">S</div>
                           {periodAnalysis.dayCells.map((c, i) => (
                             <div key={i} title={c.dateStr} className={`text-[10px] w-6 h-6 flex items-center justify-center border rounded font-black ${c.bg}`}>
                                {c.d}
                             </div>
                           ))}
                         </div>
                         <div className="mt-4 space-y-1 text-[9px] uppercase tracking-widest font-black">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-200"></div> <span className="text-gray-500">Working Day</span></div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-orange-200"></div> <span className="text-gray-500">PM Off (Thu)</span></div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-200"></div> <span className="text-gray-500">Half Holiday</span></div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-200"></div> <span className="text-gray-500">Full Off (Fri)</span></div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-purple-200"></div> <span className="text-gray-500">Full Holiday</span></div>
                         </div>
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-2xl p-6 text-gray-400 text-xs text-center font-bold uppercase tracking-widest">
                   Select Last Report Date and <br/> Period End Date to view analysis.
                 </div>
               )}
            </div>
          </div>

          {mrForecast.length > 0 && (
             <div className="mt-8 border border-gray-200 rounded-[1.25rem] shadow-sm overflow-hidden bg-white">
               <div className="bg-gray-50 border-b border-gray-200 p-4">
                  <h4 className="font-black text-gray-900 flex items-center gap-2 tracking-tight">🎯 Required Call Rate per MR</h4>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs whitespace-nowrap">
                   <thead className="bg-white border-b border-gray-200">
                     <tr className="text-[10px] uppercase tracking-widest font-black text-gray-400 bg-gray-50/50">
                       <th className="px-4 py-3 border-r border-gray-200 align-bottom" rowSpan={2}>MR Name</th>
                       <th className="px-4 py-2 text-center border-r border-b border-gray-200" colSpan="4">HCP</th>
                       <th className="px-4 py-2 text-center border-r border-b border-gray-200" colSpan="4">HCO</th>
                       <th className="px-4 py-2 text-center border-r border-b border-gray-200" colSpan="4">PH</th>
                       <th className="px-4 py-3 text-center align-bottom" rowSpan={2}>Overall Status</th>
                     </tr>
                     <tr className="text-[9px] uppercase tracking-widest font-bold text-gray-500 bg-white">
                       <th className="px-2 py-2 text-center border-r border-gray-100">Done</th>
                       <th className="px-2 py-2 text-center border-r border-gray-100">Tar</th>
                       <th className="px-2 py-2 text-center border-r border-gray-100">Gap</th>
                       <th className="px-2 py-2 text-center border-r border-gray-200 text-blue-700 bg-blue-50/30">Need/d</th>
                       
                       <th className="px-2 py-2 text-center border-r border-gray-100">Done</th>
                       <th className="px-2 py-2 text-center border-r border-gray-100">Tar</th>
                       <th className="px-2 py-2 text-center border-r border-gray-100">Gap</th>
                       <th className="px-2 py-2 text-center border-r border-gray-200 text-green-700 bg-green-50/30">Need/d</th>
                       
                       <th className="px-2 py-2 text-center border-r border-gray-100">Done</th>
                       <th className="px-2 py-2 text-center border-r border-gray-100">Tar</th>
                       <th className="px-2 py-2 text-center border-r border-gray-100">Gap</th>
                       <th className="px-2 py-2 text-center border-r border-gray-200 text-teal-700 bg-teal-50/30">Need/d</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {mrForecast.map(mr => (
                       <tr key={mr.name} className="hover:bg-gray-50 transition-colors">
                         <td className="px-4 py-3 font-black text-gray-900 border-r border-gray-100">{mr.name}</td>
                         
                         <td className="px-2 py-3 text-center border-r border-gray-50">{mr.hcp}</td>
                         <td className="px-2 py-3 text-center border-r border-gray-50 text-gray-400">{mr.hcpTarget.toFixed(0)}</td>
                         <td className="px-2 py-3 text-center font-bold text-blue-600 border-r border-gray-50">{Math.max(0, mr.remHcp).toFixed(0)}</td>
                         <td className={`px-2 py-3 text-center border-r border-gray-200 ${CellColor(mr.reqHcp, targets.hcpPerDay)}`}>
                            {mr.reqHcp <= 0 ? '✅ Achieved' : mr.reqHcp.toFixed(1)}
                         </td>
                         
                         <td className="px-2 py-3 text-center border-r border-gray-50">{mr.hco}</td>
                         <td className="px-2 py-3 text-center border-r border-gray-50 text-gray-400">{mr.hcoTarget.toFixed(0)}</td>
                         <td className="px-2 py-3 text-center font-bold text-green-600 border-r border-gray-50">{Math.max(0, mr.remHco).toFixed(0)}</td>
                         <td className={`px-2 py-3 text-center border-r border-gray-200 ${CellColor(mr.reqHco, targets.hcoPerDay)}`}>
                            {mr.reqHco <= 0 ? '✅ Achieved' : mr.reqHco.toFixed(1)}
                         </td>
                         
                         <td className="px-2 py-3 text-center border-r border-gray-50">{mr.ph}</td>
                         <td className="px-2 py-3 text-center border-r border-gray-50 text-gray-400">{mr.phTarget.toFixed(0)}</td>
                         <td className="px-2 py-3 text-center font-bold text-teal-600 border-r border-gray-50">{Math.max(0, mr.remPh).toFixed(0)}</td>
                         <td className={`px-2 py-3 text-center border-r border-gray-200 ${CellColor(mr.reqPh, targets.phPerDay)}`}>
                            {mr.reqPh <= 0 ? '✅ Achieved' : mr.reqPh.toFixed(1)}
                         </td>
                         
                         <td className="px-4 py-3 text-center">
                           <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-black tracking-widest border border-transparent shadow-sm ${mr.statClass}`}>
                             {mr.status}
                           </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               <div className="bg-gray-50 border-t border-gray-200 p-3 text-center">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                   ⚠️ Forecast based on current data period. Update regularly.
                 </p>
               </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForecastTool;
