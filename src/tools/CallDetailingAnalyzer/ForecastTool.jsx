import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Plus, X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';
import { isHCPWorkingDay, isHCOWorkingDay, isPHWorkingDay, getDayName, countWorkingDays, getDatesInRange } from '../../utils/periodRules';

const ForecastTool = ({ data, targets }) => {
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
         setLastReportDate(maxDate);
         const endDm = new Date(maxDate);
         endDm.setMonth(endDm.getMonth() + 1, 0); // End of month
         setEndDate(endDm.toISOString().split('T')[0]);
      }
    }
  }, [data, lastReportDate]);

  const uniqueMrNames = useMemo(() => {
    const s = new Set();
    data.forEach(d => {
       const m = safeStr(d.MrName);
       if (m) s.add(m);
    });
    return Array.from(s).sort();
  }, [data]);

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

  // Determine full past period dates
  const pastDates = useMemo(() => {
      let minDate = '9999-99-99';
      data.forEach(d => {
         const dt = safeStr(d.ReportDate);
         if (dt && dt < minDate) minDate = dt;
      });
      if (!lastReportDate || minDate === '9999-99-99') return [];
      return getDatesInRange(minDate, lastReportDate);
  }, [data, lastReportDate]);

  const remainingDates = useMemo(() => {
      if (!lastReportDate || !endDate) return [];
      const start = new Date(lastReportDate);
      start.setDate(start.getDate() + 1);
      const startStr = start.toISOString().split('T')[0];
      if (startStr > endDate) return [];
      return getDatesInRange(startStr, endDate);
  }, [lastReportDate, endDate]);

  const allDates = [...pastDates, ...remainingDates];

  const periodAnalysis = useMemo(() => {
    if (remainingDates.length === 0) return null;
    
    const hcoWorking = countWorkingDays(remainingDates, 'HCO', dmMeetings, holidays);
    const phWorking = countWorkingDays(remainingDates, 'PH', dmMeetings, holidays);
    const hcpWorking = countWorkingDays(remainingDates, 'HCP', dmMeetings, holidays);
    
    let fridays = 0; let thursdays = 0;
    remainingDates.forEach(d => {
       const cd = new Date(d);
       const day = cd.getDay();
       if (day === 5) fridays++;
       if (day === 4) thursdays++;
    });

    const dayCells = remainingDates.map(dStr => {
      let bg = 'bg-green-50 border-green-200 text-green-700';
      const d = new Date(dStr);
      const day = d.getDay();
      
      const hol = holidays.find(h => h.date === dStr);
      const dm = dmMeetings.find(m => m.date === dStr);
      
      if (day === 5) bg = 'bg-red-100 border-red-200 text-red-800';
      else if (hol && hol.type === 'full') bg = 'bg-purple-100 border-purple-200 text-purple-800';
      else if (hol) bg = 'bg-yellow-100 border-yellow-200 text-yellow-800'; // half day
      else if (dm) bg = 'bg-blue-100 border-blue-200 text-blue-800';
      else if (day === 4) bg = 'bg-orange-100 border-orange-200 text-orange-800';

      return { str: dStr, d: d.getDate(), bg };
    });

    return { 
      total: remainingDates.length, hcoWorking, phWorking, hcpWorking, 
      fridays, thursdays, dmCount: dmMeetings.length, holCount: holidays.length,
      dayCells
    };
  }, [remainingDates, dmMeetings, holidays]);

  const forecastData = useMemo(() => {
    if (remainingDates.length === 0 || !targets) return [];
    
    const mrMap = {};
    uniqueMrNames.forEach(name => {
       mrMap[name] = { name, doneHco: 0, donePh: 0, doneHcp: 0, vacDaysLost: { hco: 0, ph: 0, hcp: 0 } };
    });

    data.forEach(d => {
       const mr = safeStr(d.MrName);
       if (!mr || !mrMap[mr]) return;
       const t = safeStr(d.InteractionType);
       if (t === 'HCO') mrMap[mr].doneHco++;
       if (t === 'Pharmacy') mrMap[mr].donePh++;
       if (t === 'HCP') mrMap[mr].doneHcp++;
    });

    // Calculate MR specific past+future days considering their vacations
    const baseHcoAll = countWorkingDays(allDates, 'HCO', dmMeetings, holidays);
    const basePhAll  = countWorkingDays(allDates, 'PH', dmMeetings, holidays);
    const baseHcpAll = countWorkingDays(allDates, 'HCP', dmMeetings, holidays);

    Object.values(mrMap).forEach(mr => {
       let mrHcoVacLost = 0; let mrPhVacLost = 0; let mrHcpVacLost = 0;
       
       const myVacs = mrVacations.filter(v => v.mrName === mr.name && v.from && v.to);
       myVacs.forEach(vac => {
          const vacDays = getDatesInRange(vac.from, vac.to);
          mrHcoVacLost += vacDays.filter(d => allDates.includes(d)).filter(d => {
             // check if it was a working day before vacation
             return countWorkingDays([d], 'HCO', dmMeetings, holidays) === 1 && 
                    (vac.type === 'full' || vac.type === 'am');
          }).length;
          
          mrPhVacLost += vacDays.filter(d => allDates.includes(d)).filter(d => {
             return countWorkingDays([d], 'PH', dmMeetings, holidays) === 1 && 
                    (vac.type === 'full' || vac.type === 'am');
          }).length;
          
          mrHcpVacLost += vacDays.filter(d => allDates.includes(d)).filter(d => {
             return countWorkingDays([d], 'HCP', dmMeetings, holidays) === 1 && 
                    (vac.type === 'full' || vac.type === 'pm');
          }).length;
       });

       mr.fullTargetHco = Math.max(0, baseHcoAll - mrHcoVacLost) * (targets.hcoPerDay || 0);
       mr.fullTargetPh  = Math.max(0, basePhAll - mrPhVacLost) * (targets.phPerDay || 0);
       mr.fullTargetHcp = Math.max(0, baseHcpAll - mrHcpVacLost) * (targets.hcpPerDay || 0);

       mr.neededHco = mr.fullTargetHco - mr.doneHco;
       mr.neededPh  = mr.fullTargetPh - mr.donePh;
       mr.neededHcp = mr.fullTargetHcp - mr.doneHcp;

       // Remaining days for this MR
       const remBaseHco = countWorkingDays(remainingDates, 'HCO', dmMeetings, holidays);
       const remBasePh  = countWorkingDays(remainingDates, 'PH', dmMeetings, holidays);
       const remBaseHcp = countWorkingDays(remainingDates, 'HCP', dmMeetings, holidays);

       // Vacations in remaining period
       let remHcoVacLost = 0; let remPhVacLost = 0; let remHcpVacLost = 0;
       myVacs.forEach(vac => {
          const vacDays = getDatesInRange(vac.from, vac.to);
          remHcoVacLost += vacDays.filter(d => remainingDates.includes(d)).filter(d => countWorkingDays([d], 'HCO', dmMeetings, holidays) === 1 && (vac.type === 'full' || vac.type === 'am')).length;
          remPhVacLost += vacDays.filter(d => remainingDates.includes(d)).filter(d => countWorkingDays([d], 'PH', dmMeetings, holidays) === 1 && (vac.type === 'full' || vac.type === 'am')).length;
          remHcpVacLost += vacDays.filter(d => remainingDates.includes(d)).filter(d => countWorkingDays([d], 'HCP', dmMeetings, holidays) === 1 && (vac.type === 'full' || vac.type === 'pm')).length;
       });

       mr.remHcoDays = Math.max(0, remBaseHco - remHcoVacLost);
       mr.remPhDays  = Math.max(0, remBasePh - remPhVacLost);
       mr.remHcpDays = Math.max(0, remBaseHcp - remHcpVacLost);

       mr.reqRateHco = mr.remHcoDays > 0 ? (mr.neededHco / mr.remHcoDays) : 0;
       mr.reqRatePh  = mr.remPhDays > 0  ? (mr.neededPh / mr.remPhDays) : 0;
       mr.reqRateHcp = mr.remHcpDays > 0 ? (mr.neededHcp / mr.remHcpDays) : 0;

       mr.vacDaysLost = { hco: mrHcoVacLost, ph: mrPhVacLost, hcp: mrHcpVacLost };

       // Status determination
       let statStr = '✅ Achieved';
       let statClass = 'bg-green-100 text-green-800 border-green-200';
       
       const hcoTgtDay = targets.hcoPerDay || 0;
       const phTgtDay = targets.phPerDay || 0;
       const hcpTgtDay = targets.hcpPerDay || 0;

       if (mr.neededHco > 0 || mr.neededPh > 0 || mr.neededHcp > 0) {
          const maxRatio = Math.max(
            hcoTgtDay > 0 ? mr.reqRateHco / hcoTgtDay : 0,
            phTgtDay > 0 ? mr.reqRatePh / phTgtDay : 0,
            hcpTgtDay > 0 ? mr.reqRateHcp / hcpTgtDay : 0
          );
          if (maxRatio <= 1.0) { statStr = '🟢 On Track'; statClass = 'bg-emerald-100 text-emerald-800 border-emerald-200'; }
          else if (maxRatio <= 1.5) { statStr = '🟡 At Risk'; statClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'; }
          else { statStr = '🔴 Critical'; statClass = 'bg-red-100 text-red-800 border-red-200'; }
       }
       mr.status = statStr;
       mr.statClass = statClass;
    });

    return Object.values(mrMap).sort((a,b) => b.reqRateHco - a.reqRateHco);
  }, [allDates, remainingDates, dmMeetings, holidays, mrVacations, data, targets, uniqueMrNames]);

  const renderCellRate = (needed, reqRate, targetRate) => {
     if (needed <= 0) return <span className="text-green-600 font-black">✅ Done</span>;
     
     let bg = 'bg-gray-50'; let txt = 'text-gray-900';
     if (targetRate > 0) {
        if (reqRate <= targetRate) { bg = 'bg-emerald-100'; txt = 'text-emerald-900'; }
        else if (reqRate <= targetRate * 1.5) { bg = 'bg-yellow-100'; txt = 'text-yellow-900'; }
        else { bg = 'bg-red-100'; txt = 'text-red-900'; }
     }
     
     return (
       <div className={`px-2 py-1 rounded font-black border border-black/5 ${bg} ${txt}`}>
          {reqRate.toFixed(1)} <span className="text-[9px] font-bold opacity-60">/d</span>
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
                     <div key={i} className="flex gap-2 bg-purple-50/50 p-2 rounded-lg border border-purple-100 items-center">
                        <input type="date" className="border-gray-200 rounded px-2 py-1 text-xs w-28" value={h.date} onChange={e=>updateHoliday(i, 'date', e.target.value)} />
                        <select className="border-gray-200 rounded px-2 py-1 text-xs flex-1" value={h.type} onChange={e=>updateHoliday(i, 'type', e.target.value)}>
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

          {periodAnalysis && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
               {/* Calendar display */}
               <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                  <h4 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-4">Remaining Calendar</h4>
                  <div className="grid grid-cols-7 gap-1.5 mb-4">
                    {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-[9px] text-center font-black text-gray-400">{d}</div>)}
                    {periodAnalysis.dayCells.map((c, i) => (
                      <div key={i} title={c.str} className={`h-8 rounded-md flex items-center justify-center text-[10px] font-black shadow-sm ${c.bg}`}>
                        {c.d}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500">
                     <div className="flex items-center justify-between"><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-100"></div> Work</div> <span>{periodAnalysis.total}d</span></div>
                     <div className="flex items-center justify-between"><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-100"></div> Friday</div> <span>{periodAnalysis.fridays}d</span></div>
                     <div className="flex items-center justify-between"><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-orange-100"></div> Thu PM Off</div> <span>{periodAnalysis.thursdays}d</span></div>
                     <div className="flex items-center justify-between"><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-100"></div> DM Meet</div> <span>{periodAnalysis.dmCount}d</span></div>
                     <div className="flex items-center justify-between"><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-purple-100"></div> Holiday</div> <span>{periodAnalysis.holCount}d</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-xs">
                     <div className="flex justify-between font-bold"><span className="text-gray-500">HCO Net:</span> <span className="text-gray-900">{periodAnalysis.hcoWorking}d</span></div>
                     <div className="flex justify-between font-bold"><span className="text-gray-500">PH Net:</span> <span className="text-gray-900">{periodAnalysis.phWorking}d</span></div>
                     <div className="flex justify-between font-bold"><span className="text-gray-500">HCP Net:</span> <span className="text-gray-900">{periodAnalysis.hcpWorking}d</span></div>
                  </div>
               </div>
               
               {/* Table display */}
               <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h4 className="font-black text-gray-900 tracking-tight">🎯 Required Call Rate per MR</h4>
                  </div>
                  <div className="overflow-x-auto flex-1">
                     <table className="w-full text-left text-xs whitespace-nowrap">
                       <thead className="bg-white border-b border-gray-200">
                         <tr className="text-[9px] uppercase font-black text-gray-400 bg-gray-50 tracking-widest">
                            <th className="px-4 py-2 border-r border-gray-200">MR Name</th>
                            <th className="px-2 py-2 text-center border-r border-gray-200 bg-green-50/30 text-green-700" colSpan="3">HCO (AM)</th>
                            <th className="px-2 py-2 text-center border-r border-gray-200 bg-teal-50/30 text-teal-700" colSpan="3">PH (AM)</th>
                            <th className="px-2 py-2 text-center border-r border-gray-200 bg-blue-50/30 text-blue-700" colSpan="3">HCP (PM)</th>
                            <th className="px-4 py-2 text-center bg-gray-50">Status</th>
                         </tr>
                         <tr className="text-[9px] uppercase font-bold text-gray-500 border-b border-gray-200">
                            <th className="px-4 py-1.5 border-r border-gray-200"></th>
                            <th className="px-1 py-1.5 text-center text-[8px]" title="Done / Full Target">D/Tar</th>
                            <th className="px-1 py-1.5 text-center text-[8px]" title="Remaining Net Days">Rem Days</th>
                            <th className="px-1 py-1.5 text-center border-r border-gray-200">Req/d</th>
                            
                            <th className="px-1 py-1.5 text-center text-[8px]" title="Done / Full Target">D/Tar</th>
                            <th className="px-1 py-1.5 text-center text-[8px]" title="Remaining Net Days">Rem Days</th>
                            <th className="px-1 py-1.5 text-center border-r border-gray-200">Req/d</th>
                            
                            <th className="px-1 py-1.5 text-center text-[8px]" title="Done / Full Target">D/Tar</th>
                            <th className="px-1 py-1.5 text-center text-[8px]" title="Remaining Net Days">Rem Days</th>
                            <th className="px-1 py-1.5 text-center border-r border-gray-200">Req/d</th>
                            <th className="px-4 py-1.5 bg-gray-50"></th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {forecastData.map(mr => (
                            <tr key={mr.name} className="hover:bg-gray-50 outline-none hover:shadow-inner transition-shadow group">
                               <td className="px-4 py-2 font-black text-gray-700 border-r border-gray-200 group-hover:bg-gray-100">{mr.name}</td>
                               {/* HCO */}
                               <td className="px-2 py-2 text-center font-mono">
                                 <span className="text-gray-900 font-bold">{mr.doneHco}</span><span className="text-gray-400">/</span><span className="text-gray-500 opacity-60">{mr.fullTargetHco.toFixed(0)}</span>
                               </td>
                               <td className="px-2 py-2 text-center text-gray-400 font-bold">{mr.remHcoDays}</td>
                               <td className="px-2 py-2 text-center border-r border-gray-200">{renderCellRate(mr.neededHco, mr.reqRateHco, targets.hcoPerDay)}</td>
                               {/* PH */}
                               <td className="px-2 py-2 text-center font-mono">
                                 <span className="text-gray-900 font-bold">{mr.donePh}</span><span className="text-gray-400">/</span><span className="text-gray-500 opacity-60">{mr.fullTargetPh.toFixed(0)}</span>
                               </td>
                               <td className="px-2 py-2 text-center text-gray-400 font-bold">{mr.remPhDays}</td>
                               <td className="px-2 py-2 text-center border-r border-gray-200">{renderCellRate(mr.neededPh, mr.reqRatePh, targets.phPerDay)}</td>
                               {/* HCP */}
                               <td className="px-2 py-2 text-center font-mono">
                                 <span className="text-gray-900 font-bold">{mr.doneHcp}</span><span className="text-gray-400">/</span><span className="text-gray-500 opacity-60">{mr.fullTargetHcp.toFixed(0)}</span>
                               </td>
                               <td className="px-2 py-2 text-center text-gray-400 font-bold">{mr.remHcpDays}</td>
                               <td className="px-2 py-2 text-center border-r border-gray-200">{renderCellRate(mr.neededHcp, mr.reqRateHcp, targets.hcpPerDay)}</td>
                               
                               <td className="px-4 py-2 text-center bg-gray-50 group-hover:bg-gray-100">
                                  <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest border transition-shadow ${mr.statClass}`}>
                                    {mr.status}
                                  </span>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                     </table>
                  </div>
                  <div className="bg-blue-50/50 p-3 text-center border-t border-blue-100">
                     <p className="text-[10px] font-medium text-blue-800">
                       ℹ️ Required rate = (Full Period Target − Done) ÷ Remaining Working Days.
                     </p>
                  </div>
               </div>
            </div>
          )}

          {mrVacations.length > 0 && periodAnalysis && (
            <div className="mt-8 border border-gray-200 rounded-2xl shadow-sm overflow-hidden bg-white">
               <div className="p-4 border-b border-gray-200 bg-yellow-50">
                  <h4 className="font-black text-yellow-900 tracking-tight flex items-center gap-2">🏖 MR Vacation Impact</h4>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs whitespace-nowrap">
                   <thead className="bg-white border-b border-gray-100 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                     <tr>
                        <th className="px-4 py-3 border-r border-gray-100">MR Name</th>
                        <th className="px-4 py-3">Total HCO Lost</th>
                        <th className="px-4 py-3">Total PH Lost</th>
                        <th className="px-4 py-3">Total HCP Lost</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {forecastData.filter(m => m.vacDaysLost.hco > 0 || m.vacDaysLost.ph > 0 || m.vacDaysLost.hcp > 0).map(mr => (
                        <tr key={mr.name}>
                          <td className="px-4 py-3 font-bold text-gray-800 border-r border-gray-100">{mr.name}</td>
                          <td className="px-4 py-3 text-red-600 font-bold">{mr.vacDaysLost.hco} days</td>
                          <td className="px-4 py-3 text-red-600 font-bold">{mr.vacDaysLost.ph} days</td>
                          <td className="px-4 py-3 text-red-600 font-bold">{mr.vacDaysLost.hcp} days</td>
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
