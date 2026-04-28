import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Trash2 } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';
import { getDatesInRange } from '../../utils/periodRules';
import { calculateForecast } from '../../utils/forecastEngine';

const ForecastTool = ({ data, targets, mrStats }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Base period state
  const [lastReportDate, setLastReportDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Collections for overrides
  const [dmMeetings, setDmMeetings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [mrVacations, setMrVacations] = useState([]);
  
  // Set default last report date from data
  useEffect(() => {
    if (data && data.length > 0 && !lastReportDate) {
      let maxDate = '';
      data.forEach(d => {
        const dt = safeStr(d.ReportDate);
        if (dt && dt > maxDate) maxDate = dt;
      });
      if (maxDate) {
         const tDate = maxDate.split('T')[0];
         setLastReportDate(tDate);
         const endDm = new Date(tDate);
         endDm.setMonth(endDm.getMonth() + 1, 0); // End of month
         setEndDate(endDm.toISOString().split('T')[0]);
      }
    }
  }, [data, lastReportDate]);

  const uniqueMrNames = useMemo(() => mrStats?.map(m => m.mrName) || [], [mrStats]);

  const addDmMeeting = () => setDmMeetings([...dmMeetings, { date: '', phOff: false }]);
  const updateDmMeeting = (index, field, val) => {
    const newDm = [...dmMeetings];
    newDm[index][field] = val;
    setDmMeetings(newDm);
  };
  const removeDmMeeting = (index) => setDmMeetings(dmMeetings.filter((_, i) => i !== index));

  const addHoliday = () => setHolidays([...holidays, { date: '', name: '', type: 'full' }]);
  const updateHoliday = (index, field, val) => {
    const newHol = [...holidays];
    newHol[index][field] = val;
    setHolidays(newHol);
  };
  const removeHoliday = (index) => setHolidays(holidays.filter((_, i) => i !== index));

  const addMrVacation = () => setMrVacations([...mrVacations, { mrName: uniqueMrNames[0] || '', from: '', to: '', type: 'full' }]);
  const updateMrVacation = (index, field, val) => {
    const newVac = [...mrVacations];
    newVac[index][field] = val;
    setMrVacations(newVac);
  };
  const removeMrVacation = (index) => setMrVacations(mrVacations.filter((_, i) => i !== index));

  const dataFromDate = useMemo(() => {
     let minDate = '9999-99-99';
      data.forEach(d => {
         const dt = safeStr(d.ReportDate);
         if (dt && dt < minDate) minDate = dt;
      });
      if (minDate === '9999-99-99') return null;
      return minDate.split('T')[0];
  }, [data]);

  const forecastData = useMemo(() => {
    return calculateForecast({
       mrStats, targets, lastReportDate, endDate, dmMeetings, holidays, mrVacations, dataFromDate
    });
  }, [mrStats, targets, lastReportDate, endDate, dmMeetings, holidays, mrVacations, dataFromDate]);

  const renderStatus = (status) => {
     if (status === 'achieved') return <span className="bg-green-100 text-green-800 border-green-200 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest border">✅ Achieved</span>;
     if (status === 'ontrack') return <span className="bg-emerald-100 text-emerald-800 border-emerald-200 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest border">🟢 On Track</span>;
     if (status === 'atrisk') return <span className="bg-yellow-100 text-yellow-800 border-yellow-200 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest border">🟡 At Risk</span>;
     if (status === 'critical') return <span className="bg-red-100 text-red-800 border-red-200 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest border">🔴 Critical</span>;
     if (status === 'impossible') return <span className="bg-gray-100 text-gray-800 border-gray-200 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest border">❌ Impossible</span>;
     return null;
  };

  const renderCellRate = (achieved, impossible, reqRate, targetRate) => {
     if (achieved) return <span className="text-green-600 font-black text-xs">✅ Achieved</span>;
     if (impossible) return <span className="text-red-600 font-black text-[10px]">No Days Left</span>;
     
     let bg = 'bg-gray-50'; let txt = 'text-gray-900';
     if (targetRate > 0 && reqRate !== null) {
        if (reqRate <= targetRate) { bg = 'bg-emerald-100'; txt = 'text-emerald-900'; }
        else if (reqRate <= targetRate * 1.5) { bg = 'bg-yellow-100'; txt = 'text-yellow-900'; }
        else { bg = 'bg-red-100'; txt = 'text-red-900'; }
     }
     
     return (
       <div className={`px-2 py-1 rounded font-black border border-black/5 ${bg} ${txt} text-xs`}>
          {reqRate?.toFixed(2) || '0.00'} <span className="text-[9px] font-bold opacity-60">/d</span>
       </div>
     );
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
        <div className="p-6 border-t border-gray-100 space-y-6 bg-gray-50/30">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
               <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Last Report Date</label>
               <input type="date" className="w-full border border-gray-200 shadow-sm rounded-lg p-2 text-sm focus:ring-accent outline-none" value={lastReportDate} onChange={e=>setLastReportDate(e.target.value)} />
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
               <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Period End Date</label>
               <input type="date" className="w-full border border-gray-200 shadow-sm rounded-lg p-2 text-sm focus:ring-accent outline-none" value={endDate} onChange={e=>setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             {/* DM Meetings */}
             <div className="bg-white p-4 border border-blue-100 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black uppercase text-blue-900 tracking-widest flex items-center gap-2">📋 DM Meeting Day(s)</label>
                  <button onClick={addDmMeeting} className="text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">+ Add</button>
                </div>
                <div className="space-y-2">
                   {dmMeetings.map((m, i) => (
                     <div key={i} className="flex flex-wrap items-center gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                        <input type="date" className="border-gray-200 rounded px-2 py-1 text-xs" value={m.date} onChange={e=>updateDmMeeting(i, 'date', e.target.value)} />
                        <label className="text-[10px] uppercase font-bold text-gray-600 flex items-center gap-1">
                          <input type="checkbox" checked={m.phOff} onChange={e=>updateDmMeeting(i, 'phOff', e.target.checked)} /> 
                          PH OFF (AM)
                        </label>
                        <span className="text-[9px] text-gray-400 italic flex-1">(HCO off always)</span>
                        <button onClick={()=>removeDmMeeting(i)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                     </div>
                   ))}
                </div>
             </div>

             {/* Public Holidays */}
             <div className="bg-white p-4 border border-purple-100 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black uppercase text-purple-900 tracking-widest flex items-center gap-2">🗓 Public Holidays</label>
                  <button onClick={addHoliday} className="text-[10px] font-black uppercase text-purple-600 hover:bg-purple-50 px-2 py-1 rounded transition-colors">+ Add</button>
                </div>
                <div className="space-y-2">
                   {holidays.map((h, i) => (
                     <div key={i} className="flex flex-wrap lg:flex-nowrap gap-2 bg-purple-50/50 p-2 rounded-lg border border-purple-100 items-center">
                        <input type="date" className="border-gray-200 rounded px-2 py-1 text-xs w-full lg:w-32" value={h.date} onChange={e=>updateHoliday(i, 'date', e.target.value)} />
                        <select className="border-gray-200 rounded px-2 py-1 text-xs flex-1 min-w-[130px]" value={h.type} onChange={e=>updateHoliday(i, 'type', e.target.value)}>
                           <option value="full">Full Day</option>
                           <option value="am">Half Day AM (HCO+PH)</option>
                           <option value="pm">Half Day PM (HCP)</option>
                        </select>
                        <button onClick={()=>removeHoliday(i)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
          
          {/* Vacations */}
          <div className="bg-white p-4 border border-yellow-100 rounded-xl shadow-sm">
             <div className="flex justify-between items-center mb-3">
               <label className="text-xs font-black uppercase text-yellow-900 tracking-widest flex items-center gap-2">🏖 MR Personal Vacations</label>
               <button onClick={addMrVacation} className="text-[10px] font-black uppercase text-yellow-700 hover:bg-yellow-50 px-2 py-1 rounded transition-colors">+ Add</button>
             </div>
             <div className="space-y-2">
                {mrVacations.map((v, i) => (
                  <div key={i} className="flex flex-wrap lg:flex-nowrap gap-2 bg-yellow-50/50 p-2 rounded-lg border border-yellow-200 items-center">
                     <select className="border-gray-200 rounded px-2 py-1 text-xs font-bold w-full lg:w-48" value={v.mrName} onChange={e=>updateMrVacation(i,'mrName',e.target.value)}>
                       {uniqueMrNames.map(n => <option key={n} value={n}>{n}</option>)}
                     </select>
                     <input type="date" title="From Date" className="border-gray-200 rounded px-2 py-1 text-xs flex-1 min-w-[110px]" value={v.from} onChange={e=>updateMrVacation(i, 'from', e.target.value)} />
                     <span className="text-gray-400 text-xs">to</span>
                     <input type="date" title="To Date" className="border-gray-200 rounded px-2 py-1 text-xs flex-1 min-w-[110px]" value={v.to} onChange={e=>updateMrVacation(i, 'to', e.target.value)} />
                     <select className="border-gray-200 rounded px-2 py-1 text-xs flex-1 min-w-[130px]" value={v.type} onChange={e=>updateMrVacation(i, 'type', e.target.value)}>
                        <option value="full">Full Day(s)</option>
                        <option value="am">AM Only (HCO+PH)</option>
                        <option value="pm">PM Only (HCP)</option>
                     </select>
                     <button onClick={()=>removeMrVacation(i)} className="p-1 text-red-500 hover:bg-red-50 rounded bg-white"><Trash2 size={14}/></button>
                  </div>
                ))}
             </div>
          </div>

          {/* Targets Bar */}
          <div className="bg-gray-900 text-white p-4 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.2)] flex items-center justify-between">
             <div className="flex gap-6 items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Rates/Day:</span>
                <span className="font-mono font-bold text-green-400">HCO: {targets?.hcoPerDay || 0}</span>
                <span className="font-mono font-bold text-teal-400">PH: {targets?.phPerDay || 0}</span>
                <span className="font-mono font-bold text-blue-400">HCP: {targets?.hcpPerDay || 0}</span>
             </div>
             <div className="text-[9px] uppercase tracking-widest font-black text-gray-500">Edit in Target Settings</div>
          </div>

          {forecastData?.length > 0 && (
             <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h4 className="font-black text-gray-900 tracking-tight flex gap-2 items-center">🎯 Required Call Rate per MR</h4>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    Hover for formula tooltip
                  </div>
                </div>
                <div className="overflow-x-auto p-4 bg-blue-50/50 border-b border-blue-100 flex items-start text-xs text-blue-800">
                  <span className="mr-2">ℹ️</span>
                  <div>
                     <b>Forecast Formula:</b> <code>Required Rate = (Deficit ÷ Remaining Days) + Target Rate</code>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[800px]">
                   <table className="w-full text-left text-[11px] whitespace-nowrap">
                     <thead className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                       <tr className="text-[9px] uppercase font-black text-gray-400 bg-gray-50 tracking-widest">
                          <th className="px-3 py-2 border-r border-gray-200">MR Name</th>
                          <th className="px-2 py-2 text-center border-r border-gray-200 bg-green-50/80 text-green-700" colSpan="3">HCO (AM)</th>
                          <th className="px-2 py-2 text-center border-r border-gray-200 bg-teal-50/80 text-teal-700" colSpan="3">PH (AM)</th>
                          <th className="px-2 py-2 text-center border-r border-gray-200 bg-blue-50/80 text-blue-700" colSpan="3">HCP (PM)</th>
                          <th className="px-3 py-2 text-center bg-gray-50">Status</th>
                       </tr>
                       <tr className="text-[9px] uppercase font-bold text-gray-500 border-b border-gray-200 bg-gray-50/80">
                          <th className="px-3 py-1.5 border-r border-gray-200"></th>
                          
                          {/* HCO */}
                          <th className="px-1 py-1.5 text-center" title="Done / Full Target">D/Tar</th>
                          <th className="px-1 py-1.5 text-center" title="Remaining Net Days for this MR">Days Left</th>
                          <th className="px-1 py-1.5 text-center border-r border-gray-200" title="Required = (Deficit ÷ Remaining Days) + Target">Req/d</th>
                          
                          {/* PH */}
                          <th className="px-1 py-1.5 text-center" title="Done / Full Target">D/Tar</th>
                          <th className="px-1 py-1.5 text-center" title="Remaining Net Days for this MR">Days Left</th>
                          <th className="px-1 py-1.5 text-center border-r border-gray-200" title="Required = (Deficit ÷ Remaining Days) + Target">Req/d</th>
                          
                          {/* HCP */}
                          <th className="px-1 py-1.5 text-center" title="Done / Full Target">D/Tar</th>
                          <th className="px-1 py-1.5 text-center" title="Remaining Net Days for this MR">Days Left</th>
                          <th className="px-1 py-1.5 text-center border-r border-gray-200" title="Required = (Deficit ÷ Remaining Days) + Target">Req/d</th>
                          <th className="px-3 py-1.5"></th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {forecastData.map(mr => (
                          <tr key={mr.mrName} className="hover:bg-gray-50 outline-none hover:shadow-inner transition-shadow group">
                             <td className="px-3 py-2 border-r border-gray-200 group-hover:bg-gray-100">
                               <div className="font-black text-gray-800 text-xs">{mr.mrName}</div>
                               <div className="text-[9px] uppercase tracking-widest text-gray-400 mt-0.5">{mr.lineName}</div>
                             </td>
                             
                             {/* HCO */}
                             <td className="px-2 py-2 text-center font-mono">
                               <span className="text-gray-900 font-bold">{mr.hcoDone}</span><span className="text-gray-400">/</span><span className="text-gray-500 opacity-60 text-[10px]">{mr.hcoFullTarget}</span>
                             </td>
                             <td className="px-2 py-2 text-center text-gray-500 font-bold">{mr.hcoRemDays}</td>
                             <td className="px-2 py-2 text-center border-r border-gray-200 relative group/cell">
                                {renderCellRate(mr.hcoAchieved, mr.hcoRemDays === 0 && mr.hcoDeficit > 0, mr.hcoRequired, targets.hcoPerDay)}
                                <div className="absolute opacity-0 group-hover/cell:opacity-100 bg-gray-900 text-white text-[9px] rounded p-1.5 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap z-10 transition-opacity whitespace-pre">
                                  Deficit: {mr.hcoDeficit > 0 ? mr.hcoDeficit : 0} calls
                                </div>
                             </td>
                             
                             {/* PH */}
                             <td className="px-2 py-2 text-center font-mono">
                               <span className="text-gray-900 font-bold">{mr.phDone}</span><span className="text-gray-400">/</span><span className="text-gray-500 opacity-60 text-[10px]">{mr.phFullTarget}</span>
                             </td>
                             <td className="px-2 py-2 text-center text-gray-500 font-bold">{mr.phRemDays}</td>
                             <td className="px-2 py-2 text-center border-r border-gray-200 relative group/cell">
                               {renderCellRate(mr.phAchieved, mr.phRemDays === 0 && mr.phDeficit > 0, mr.phRequired, targets.phPerDay)}
                               <div className="absolute opacity-0 group-hover/cell:opacity-100 bg-gray-900 text-white text-[9px] rounded p-1.5 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap z-10 transition-opacity whitespace-pre">
                                  Deficit: {mr.phDeficit > 0 ? mr.phDeficit : 0} calls
                                </div>
                             </td>
                             
                             {/* HCP */}
                             <td className="px-2 py-2 text-center font-mono">
                               <span className="text-gray-900 font-bold">{mr.hcpDone}</span><span className="text-gray-400">/</span><span className="text-gray-500 opacity-60 text-[10px]">{mr.hcpFullTarget}</span>
                             </td>
                             <td className="px-2 py-2 text-center text-gray-500 font-bold">{mr.hcpRemDays}</td>
                             <td className="px-2 py-2 text-center border-r border-gray-200 relative group/cell">
                               {renderCellRate(mr.hcpAchieved, mr.hcpRemDays === 0 && mr.hcpDeficit > 0, mr.hcpRequired, targets.hcpPerDay)}
                               <div className="absolute opacity-0 group-hover/cell:opacity-100 bg-gray-900 text-white text-[9px] rounded p-1.5 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap z-10 transition-opacity whitespace-pre">
                                  Deficit: {mr.hcpDeficit > 0 ? mr.hcpDeficit : 0} calls
                                </div>
                             </td>
                             
                             <td className="px-3 py-2 text-center bg-gray-50 group-hover:bg-gray-100">
                                {renderStatus(mr.overallStatus)}
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForecastTool;
