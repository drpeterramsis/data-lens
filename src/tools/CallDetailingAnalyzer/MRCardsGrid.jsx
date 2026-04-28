import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, X, ArrowDownWideNarrow } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';
import { getDayName, isWorkingDayHCP, isWorkingDayHCO, isWorkingDayPH } from '../../utils/periodRules';

// Calendar Modal Component
const CalendarModal = ({ mr, data, onClose, targets }) => {
  const [selectedDayObj, setSelectedDayObj] = useState(null);

  const dailyData = useMemo(() => {
    const days = {};
    const filteredData = data.filter(d => safeStr(d.MrName) === mr.name);
    
    filteredData.forEach(d => {
      const dateStr = safeStr(d.ReportDate);
      if (!dateStr) return;
      if (!days[dateStr]) days[dateStr] = { 
         date: dateStr, 
         dateObj: new Date(dateStr), 
         hcp: 0, hco: 0, ph: 0, total: 0, coached: 0,
         interactions: []
      };
      
      const type = safeStr(d.InteractionType);
      if (type === 'HCP') days[dateStr].hcp++;
      else if (type === 'HCO') days[dateStr].hco++;
      else if (type === 'Pharmacy') days[dateStr].ph++;
      
      days[dateStr].total++;
      if (safeStr(d.IsMRCoachingSubmitted) === 'True') days[dateStr].coached++;
      days[dateStr].interactions.push(d);
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, mr.name]);

  const getDayBg = (dayInfo) => {
    const day = dayInfo.dateObj.getDay();
    if (day === 5) return 'bg-red-50 border-red-100'; // Friday off
    if (day === 4) return 'bg-orange-50 border-orange-100'; // Thursday PM off
    if (dayInfo.coached >= 4) return 'bg-yellow-50 border-yellow-200 ring-1 ring-yellow-400/20'; // Coaching
    if (dayInfo.total === 0) return 'bg-gray-50 border-gray-100';
    return 'bg-white border-gray-200 hover:border-gray-300';
  };

  const calcDailyAch = (dayInfo) => {
    if (!targets || (targets.hcpPerDay === 0 && targets.hcoPerDay === 0 && targets.phPerDay === 0)) {
       return null;
    }
    const day = dayInfo.dateObj.getDay();
    let totalTarget = 0;
    
    if (isWorkingDayHCO(dayInfo.dateObj)) totalTarget += targets.hcoPerDay || 0;
    if (isWorkingDayPH(dayInfo.dateObj))  totalTarget += targets.phPerDay || 0;
    if (isWorkingDayHCP(dayInfo.dateObj)) totalTarget += targets.hcpPerDay || 0;
    
    if (totalTarget === 0) return null;
    return (dayInfo.total / totalTarget) * 100;
  };
  
  const getAchColor = (ach) => {
     if (ach === null) return '';
     if (ach >= 100) return 'text-green-600';
     if (ach >= 75) return 'text-yellow-600';
     return 'text-red-600';
  };

  const renderDailyCell = (dayInfo) => {
    const ach = calcDailyAch(dayInfo);
    
    const renderTypeAch = (count, targetKey, isWorking) => {
      if (!targets || targets[targetKey] === 0 || !isWorking) return '';
      const achTyp = (count / targets[targetKey]) * 100;
      return <span className={`ml-1 ${getAchColor(achTyp)}`}>({achTyp.toFixed(0)}%)</span>;
    };

    return (
      <div 
         key={dayInfo.date} 
         onClick={() => setSelectedDayObj(dayInfo)}
         className={`border rounded-xl p-3 shadow-sm cursor-pointer transition-shadow hover:shadow-md ${getDayBg(dayInfo)}`}
      >
        <p className="text-[11px] font-bold text-gray-700 mb-2 border-b border-gray-100 pb-1 flex justify-between">
           <span>{dayInfo.dateObj.getDate()} {getDayName(dayInfo.dateObj).slice(0,3)}</span>
           {dayInfo.coached >= 4 && <span title="Coaching Day">🎓</span>}
        </p>
        <div className="space-y-1 mb-2">
          <p className="text-[10px] font-bold text-green-700 flex justify-between">
             <span>HCO: {dayInfo.hco}</span> 
             {renderTypeAch(dayInfo.hco, 'hcoPerDay', isWorkingDayHCO(dayInfo.dateObj))}
          </p>
          <p className="text-[10px] font-bold text-teal-600 flex justify-between">
             <span>PH: {dayInfo.ph}</span>
             {renderTypeAch(dayInfo.ph, 'phPerDay', isWorkingDayPH(dayInfo.dateObj))}
          </p>
          <p className="text-[10px] font-bold text-blue-700 flex justify-between">
             <span>HCP: {dayInfo.hcp}</span>
             {renderTypeAch(dayInfo.hcp, 'hcpPerDay', isWorkingDayHCP(dayInfo.dateObj))}
          </p>
        </div>
        <div className="pt-2 border-t border-gray-100/50 mt-2">
           <p className="text-[10px] font-black text-gray-800 flex justify-between"><span>Total:</span> <span>{dayInfo.total}</span></p>
           {ach !== null && (
              <p className={`text-[10px] font-black flex justify-between mt-0.5 ${getAchColor(ach)}`}>
                 <span>Ach:</span> <span>{ach.toFixed(0)}%</span>
              </p>
           )}
        </div>
      </div>
    );
  };

  const renderDayDetail = () => {
    if (!selectedDayObj) return null;
    
    // Group interactions
    const hcoRows = selectedDayObj.interactions.filter(d => safeStr(d.InteractionType) === 'HCO');
    const phRows = selectedDayObj.interactions.filter(d => safeStr(d.InteractionType) === 'Pharmacy');
    const hcpRows = selectedDayObj.interactions.filter(d => safeStr(d.InteractionType) === 'HCP');
    
    const ach = calcDailyAch(selectedDayObj);

    return (
      <div className="absolute inset-0 bg-white z-10 flex flex-col overflow-hidden rounded-2xl animate-in slide-in-from-right-8 fade-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 sticky top-0">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            📅 {mr.name} <span className="text-gray-400 font-medium">— {selectedDayObj.date} ({getDayName(selectedDayObj.dateObj)})</span>
          </h2>
          <button onClick={() => setSelectedDayObj(null)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-colors flex items-center gap-2">
             <X size={14} /> Close Detail
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           
           {/* Achievement & Coaching Summary */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-4">
                 <h4 className="text-[10px] uppercase font-black tracking-widest text-yellow-800 mb-2">🎓 Coaching Summary</h4>
                 <p className="text-sm font-bold text-gray-800">Total coached visits: <span className="text-yellow-700">{selectedDayObj.coached}</span></p>
                 {selectedDayObj.coached >= 4 && <span className="inline-block mt-2 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">🎓 Coaching Day</span>}
              </div>
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                 <h4 className="text-[10px] uppercase font-black tracking-widest text-blue-800 mb-2">📈 Daily Achievement</h4>
                 {targets ? (
                   <div className="grid grid-cols-2 gap-2 text-xs">
                     <div className="flex justify-between border-b border-blue-100 pb-1"><span>HCO:</span> <span className="font-bold">{selectedDayObj.hco} / {targets.hcoPerDay}</span></div>
                     <div className="flex justify-between border-b border-blue-100 pb-1"><span>PH:</span> <span className="font-bold">{selectedDayObj.ph} / {targets.phPerDay}</span></div>
                     <div className="flex justify-between border-b border-blue-100 pb-1"><span>HCP:</span> <span className="font-bold">{selectedDayObj.hcp} / {targets.hcpPerDay}</span></div>
                     <div className="flex justify-between border-b border-blue-100 pb-1"><span>Overall:</span> <span className={`font-black ${getAchColor(ach)}`}>{ach?.toFixed(1)}%</span></div>
                   </div>
                 ) : (
                   <p className="text-xs text-gray-500 italic">No targets set.</p>
                 )}
              </div>
           </div>

           {/* HCO TABLE */}
           <div>
             <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">🏥 HCO VISITS (AM) <span className="text-xs font-medium text-gray-400 font-normal ml-2">Total: {hcoRows.length}</span></h3>
             {hcoRows.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                   <table className="w-full text-left text-xs bg-white">
                     <thead className="bg-gray-50 border-b border-gray-100 text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                       <tr><th className="px-4 py-2 text-gray-900 font-black">Customer Name</th><th className="px-4 py-2">Grade</th><th className="px-4 py-2">Coached?</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       {hcoRows.map((r,i) => (
                         <tr key={i} className="hover:bg-gray-50">
                           <td className="px-4 py-2 font-bold text-gray-700">{safeStr(r.CustomerName)}</td>
                           <td className="px-4 py-2">{safeStr(r.CustomerGrade) || '—'}</td>
                           <td className="px-4 py-2">{safeStr(r.IsMRCoachingSubmitted) === 'True' ? <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">🎓 Yes</span> : '—'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
             ) : <p className="text-xs text-gray-400 italic">No HCO visits on this day.</p>}
           </div>

           {/* PH TABLE */}
           <div>
             <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">💊 PHARMACY VISITS (AM) <span className="text-xs font-medium text-gray-400 font-normal ml-2">Total: {phRows.length}</span></h3>
             {phRows.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                   <table className="w-full text-left text-xs bg-white">
                     <thead className="bg-gray-50 border-b border-gray-100 text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                       <tr><th className="px-4 py-2 text-gray-900 font-black">Customer Name</th><th className="px-4 py-2">Grade</th><th className="px-4 py-2">Coached?</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       {phRows.map((r,i) => (
                         <tr key={i} className="hover:bg-gray-50">
                           <td className="px-4 py-2 font-bold text-gray-700">{safeStr(r.CustomerName)}</td>
                           <td className="px-4 py-2">{safeStr(r.CustomerGrade) || '—'}</td>
                           <td className="px-4 py-2">{safeStr(r.IsMRCoachingSubmitted) === 'True' ? <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">🎓 Yes</span> : '—'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
             ) : <p className="text-xs text-gray-400 italic">No Pharmacy visits on this day.</p>}
           </div>

           {/* HCP TABLE */}
           <div>
             <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">👨‍⚕️ HCP VISITS (PM) <span className="text-xs font-medium text-gray-400 font-normal ml-2">Total: {hcpRows.length}</span></h3>
             {hcpRows.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                   <table className="w-full text-left text-xs bg-white whitespace-nowrap">
                     <thead className="bg-gray-50 border-b border-gray-100 text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                       <tr><th className="px-4 py-2 text-gray-900 font-black">Customer Name</th><th className="px-4 py-2">Specialty</th><th className="px-4 py-2">Grade</th><th className="px-4 py-2">Coached?</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       {hcpRows.map((r,i) => (
                         <tr key={i} className="hover:bg-gray-50">
                           <td className="px-4 py-2 font-bold text-gray-700">{safeStr(r.CustomerName)}</td>
                           <td className="px-4 py-2 text-gray-500">{safeStr(r.Specialty) || '—'}</td>
                           <td className="px-4 py-2">{safeStr(r.CustomerGrade) || '—'}</td>
                           <td className="px-4 py-2">{safeStr(r.IsMRCoachingSubmitted) === 'True' ? <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">🎓 Yes</span> : '—'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
             ) : <p className="text-xs text-gray-400 italic">No HCP visits on this day.</p>}
           </div>

        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
           <div>
             <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">📅 {mr.name}</h2>
             <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mt-1">Calendar & Daily Activity</p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors flex items-center shadow-sm bg-white"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <p className="text-xs text-gray-500 mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-center gap-2">
            <span className="text-blue-500">ℹ️</span> Click any day card to view the exact customer visits, grades, and coaching details for that day.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 mb-8">
            {dailyData.map(day => renderDailyCell(day))}
          </div>
        </div>
        
        {selectedDayObj && renderDayDetail()}
      </div>
    </div>
  );
};

const MRCardsGrid = ({ data, targets }) => {
  const [selectedMR, setSelectedMR] = useState(null);
  const [sortBy, setSortBy] = useState('performance'); // performance, asc, desc, hcp, hco, ph, coaching

  const mrStats = useMemo(() => {
    const rawMap = {};
    data.forEach(d => {
      const mr = safeStr(d.MrName);
      if (!mr) return;
      if (!rawMap[mr]) {
        rawMap[mr] = {
           name: mr, line: safeStr(d.LineName),
           totalHcp: 0, totalHco: 0, totalPh: 0,
           days: {}
        };
      }
      
      const type = safeStr(d.InteractionType);
      const dateStr = safeStr(d.ReportDate);
      if (!dateStr) return;
      
      if (!rawMap[mr].days[dateStr]) {
         rawMap[mr].days[dateStr] = { hcp: 0, hco: 0, ph: 0, coached: 0, obj: new Date(dateStr) };
      }
      
      if (type === 'HCP') { rawMap[mr].totalHcp++; rawMap[mr].days[dateStr].hcp++; }
      else if (type === 'HCO') { rawMap[mr].totalHco++; rawMap[mr].days[dateStr].hco++; }
      else if (type === 'Pharmacy') { rawMap[mr].totalPh++; rawMap[mr].days[dateStr].ph++; }
      
      if (safeStr(d.IsMRCoachingSubmitted) === 'True') rawMap[mr].days[dateStr].coached++;
    });

    let maxPerformanceObj = null;

    let parsed = Object.values(rawMap).map(mrInfo => {
      let hcpDays = 0, hcoDays = 0, phDays = 0, coachingDays = 0;
      let totalCoached = 0;
      let coachedHcp = 0, coachedHco = 0, coachedPh = 0;
      
      Object.values(mrInfo.days).forEach(day => {
         if (day.hcp > 0 && isWorkingDayHCP(day.obj)) hcpDays++;
         if (day.hco > 0 && isWorkingDayHCO(day.obj)) hcoDays++;
         if (day.ph > 0 && isWorkingDayPH(day.obj)) phDays++;
         if (day.coached >= 4) coachingDays++;
         totalCoached += day.coached;
      });

      const hcpRate = hcpDays > 0 ? (mrInfo.totalHcp / hcpDays) : 0;
      const hcoRate = hcoDays > 0 ? (mrInfo.totalHco / hcoDays) : 0;
      const phRate = phDays > 0 ? (mrInfo.totalPh / phDays) : 0;

      let hcpAch = targets?.hcpPerDay ? (hcpRate / targets.hcpPerDay) * 100 : 0;
      let hcoAch = targets?.hcoPerDay ? (hcoRate / targets.hcoPerDay) * 100 : 0;
      let phAch =  targets?.phPerDay  ? (phRate / targets.phPerDay) * 100 : 0;
      
      let overallAch = 0;
      let numTargets = (targets?.hcpPerDay>0?1:0) + (targets?.hcoPerDay>0?1:0) + (targets?.phPerDay>0?1:0);
      if (numTargets > 0) {
         overallAch = (hcpAch + hcoAch + phAch) / numTargets;
      } else {
         overallAch = mrInfo.totalHcp + mrInfo.totalHco + mrInfo.totalPh; // fallback total calls
      }

      return {
        ...mrInfo,
        hcpDays, hcoDays, phDays, coachingDays, totalCoached,
        hcpRate, hcoRate, phRate,
        overallAch, hcpAch, hcoAch, phAch
      };
    });

    if (sortBy === 'performance') parsed.sort((a,b) => b.overallAch - a.overallAch);
    else if (sortBy === 'asc') parsed.sort((a,b) => a.name.localeCompare(b.name));
    else if (sortBy === 'desc') parsed.sort((a,b) => b.name.localeCompare(a.name));
    else if (sortBy === 'hcp') parsed.sort((a,b) => b.hcpRate - a.hcpRate);
    else if (sortBy === 'hco') parsed.sort((a,b) => b.hcoRate - a.hcoRate);
    else if (sortBy === 'ph') parsed.sort((a,b) => b.phRate - a.phRate);
    else if (sortBy === 'coaching') parsed.sort((a,b) => b.coachingDays - a.coachingDays);

    // mark top performer
    if (parsed.length > 0 && sortBy === 'performance') {
      parsed[0].isTop = true;
    }

    return parsed;
  }, [data, targets, sortBy]);

  const getStatusColor = (ach) => {
    if (!ach || ach === 0) return 'text-gray-600 bg-gray-50 border-gray-100'; // No target mode
    if (ach >= 90) return 'text-green-700 bg-green-50 border-green-200';
    if (ach >= 70) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getStatusIcon = (ach) => {
    if (!ach || ach === 0) return '';
    if (ach >= 90) return '✅';
    if (ach >= 70) return '🟡';
    return '🔴';
  };

  if (!mrStats.length) return null;

  const topColor = (mr) => {
    if (mr.isTop) return "border-l-[6px] border-l-yellow-400 border-t-yellow-400/20 shadow-md";
    let ach = mr.overallAch;
    let hasTargets = (targets?.hcpPerDay>0 || targets?.hcoPerDay>0 || targets?.phPerDay>0);
    if (hasTargets && ach < 70) return "border-l-[6px] border-l-red-500 border-red-200 bg-red-50/10";
    return "border-l-[6px] border-l-gray-200";
  };

  return (
    <div className="mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-gray-100 pb-4 gap-4">
         <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ArrowDownWideNarrow size={20} className="text-gray-400" />
            MR Dashboards
         </h3>
         
         <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mr-2">Sort by:</span>
            {[
              { id: 'performance', label: 'Performance ▼' },
              { id: 'asc', label: 'A→Z' },
              { id: 'desc', label: 'Z→A' },
              { id: 'hcp', label: 'HCP Rate' },
              { id: 'hco', label: 'HCO Rate' },
              { id: 'ph', label: 'PH Rate' },
              { id: 'coaching', label: 'Coaching Days' }
            ].map(s => (
               <button 
                 key={s.id}
                 onClick={() => setSortBy(s.id)}
                 className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors border ${sortBy === s.id ? 'bg-accent text-accent-dark border-accent/20 shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}
               >
                 {s.label}
               </button>
            ))}
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mrStats.map(mr => (
          <div key={mr.name} className={`bg-white border rounded-[1.25rem] shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col ${topColor(mr)}`}>
            
            {mr.isTop && <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm">Top Performer</div>}
            
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <div>
                <h4 className="font-black text-gray-900 text-lg flex items-center gap-2">
                  <span>🧑‍⚕️</span> {mr.name}
                </h4>
                <p className="text-xs font-bold text-gray-400 mt-1 ml-8 uppercase tracking-widest">{mr.line}</p>
              </div>
            </div>
            
            <div className="mb-6 flex-1">
               <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                 <CalendarIcon size={12} /> Period Breakdown
               </p>
               
               <div className="grid grid-cols-3 gap-2">
                  {/* HCO */}
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-[10px] font-black text-gray-500 tracking-wider mb-2">AM / HCO</p>
                    <p className="text-xs text-gray-600 mb-1"><span className="font-bold text-gray-900">{mr.hcoDays}</span> days</p>
                    <p className="text-xs text-gray-600 mb-2"><span className="font-bold text-gray-900">{mr.totalHco}</span> calls</p>
                    <div className={`mt-auto text-xs py-1 px-1 rounded font-black border ${getStatusColor(mr.hcoAch)} flex flex-col items-center gap-1`}>
                      <span>{mr.hcoRate.toFixed(1)}/d</span>
                      {getStatusIcon(mr.hcoAch) && <span className="text-[10px]">{getStatusIcon(mr.hcoAch)}</span>}
                    </div>
                  </div>
                  {/* PH */}
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-[10px] font-black text-gray-500 tracking-wider mb-2">AM / PH</p>
                    <p className="text-xs text-gray-600 mb-1"><span className="font-bold text-gray-900">{mr.phDays}</span> days</p>
                    <p className="text-xs text-gray-600 mb-2"><span className="font-bold text-gray-900">{mr.totalPh}</span> calls</p>
                    <div className={`mt-auto text-xs py-1 px-1 rounded font-black border ${getStatusColor(mr.phAch)} flex flex-col items-center gap-1`}>
                      <span>{mr.phRate.toFixed(1)}/d</span>
                      {getStatusIcon(mr.phAch) && <span className="text-[10px]">{getStatusIcon(mr.phAch)}</span>}
                    </div>
                  </div>
                  {/* HCP */}
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-[10px] font-black text-gray-500 tracking-wider mb-2 text-blue-800">PM / HCP</p>
                    <p className="text-xs text-gray-600 mb-1"><span className="font-bold text-gray-900">{mr.hcpDays}</span> days</p>
                    <p className="text-xs text-gray-600 mb-2"><span className="font-bold text-gray-900">{mr.totalHcp}</span> calls</p>
                    <div className={`mt-auto text-xs py-1 px-1 rounded font-black border ${getStatusColor(mr.hcpAch)} flex flex-col items-center gap-1`}>
                      <span>{mr.hcpRate.toFixed(1)}/d</span>
                      {getStatusIcon(mr.hcpAch) && <span className="text-[10px]">{getStatusIcon(mr.hcpAch)}</span>}
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-4 mb-6">
              <p className="text-[10px] uppercase font-black text-yellow-800 tracking-widest mb-2 flex items-center gap-1">
                <span>🎓</span> Coaching
              </p>
              <div className="flex justify-between items-end">
                <div>
                   <p className="text-xs text-gray-700 mb-1 font-medium">Coaching Days: <span className="font-black text-gray-900 bg-white px-2 py-0.5 rounded shadow-sm">{mr.coachingDays}</span></p>
                   <p className="text-xs text-gray-700 font-medium">Total Coached: <span className="font-black text-gray-900 bg-white px-2 py-0.5 rounded shadow-sm">{mr.totalCoached} visits</span></p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedMR(mr)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 font-black tracking-wide text-xs rounded-xl hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-colors bg-white mt-auto shadow-sm"
            >
              <CalendarIcon size={14} /> View Full Calendar
            </button>
          </div>
        ))}
      </div>

      {selectedMR && <CalendarModal mr={selectedMR} data={data} targets={targets} onClose={() => setSelectedMR(null)} />}
    </div>
  );
};

export default MRCardsGrid;
