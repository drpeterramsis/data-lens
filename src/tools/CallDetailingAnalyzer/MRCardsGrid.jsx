import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, X, ArrowDownWideNarrow, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';
import ActivityCalendar from '../../components/shared/ActivityCalendar';

const MRCardsGrid = ({ data, targets, mrStats }) => {
  const [selectedMRForCalendar, setSelectedMRForCalendar] = useState(null);
  const [sortBy, setSortBy] = useState('performance');
  const [expandedMRs, setExpandedMRs] = useState({});

  const sortedStats = useMemo(() => {
    if (!mrStats) return [];
    let parsed = [...mrStats].map(mr => {
      let overallAch = 0;
      let hcpAch = targets?.hcpPerDay ? (mr.hcpRate / targets.hcpPerDay) * 100 : 0;
      let hcoAch = targets?.hcoPerDay ? (mr.hcoRate / targets.hcoPerDay) * 100 : 0;
      let phAch =  targets?.phPerDay  ? (mr.phRate / targets.phPerDay) * 100 : 0;
      
      let numTargets = (targets?.hcpPerDay>0?1:0) + (targets?.hcoPerDay>0?1:0) + (targets?.phPerDay>0?1:0);
      if (numTargets > 0) {
         overallAch = (hcpAch + hcoAch + phAch) / numTargets;
      } else {
         overallAch = mr.totalCalls; // fallback
      }

      return {
        ...mr,
        overallAch, hcpAch, hcoAch, phAch
      };
    });

    if (sortBy === 'performance') parsed.sort((a,b) => b.overallAch - a.overallAch);
    else if (sortBy === 'asc') parsed.sort((a,b) => a.mrName.localeCompare(b.mrName));
    else if (sortBy === 'desc') parsed.sort((a,b) => b.mrName.localeCompare(a.mrName));
    else if (sortBy === 'hcp') parsed.sort((a,b) => b.hcpRate - a.hcpRate);
    else if (sortBy === 'hco') parsed.sort((a,b) => b.hcoRate - a.hcoRate);
    else if (sortBy === 'ph') parsed.sort((a,b) => b.phRate - a.phRate);
    else if (sortBy === 'coaching') parsed.sort((a,b) => b.coachingDays - a.coachingDays);

    if (parsed.length > 0 && sortBy === 'performance') {
      parsed[0].isTop = true;
    }

    return parsed;
  }, [mrStats, targets, sortBy]);

  const toggleExpand = (mrName) => {
    setExpandedMRs(prev => ({ ...prev, [mrName]: !prev[mrName] }));
  };

  const collapseAll = () => setExpandedMRs({});
  const expandAll = () => {
    const all = {};
    sortedStats.forEach(mr => all[mr.mrName] = true);
    setExpandedMRs(all);
  };

  const getStatusIcon = (ach) => {
    if (!ach || ach === 0) return '—';
    if (ach >= 90) return '✅';
    if (ach >= 70) return '🟡';
    return '🔴';
  };

  if (!sortedStats.length) return null;

  return (
    <div className="mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-gray-100 pb-4 gap-4">
         <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ArrowDownWideNarrow size={20} className="text-gray-400" />
            MR Dashboards
         </h3>
         
         <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mr-2">Sort:</span>
              {[
                { id: 'performance', label: 'Perf ▼' },
                { id: 'asc', label: 'A→Z' },
                { id: 'hcp', label: 'HCP' },
                { id: 'hco', label: 'HCO' },
                { id: 'ph', label: 'PH' },
                { id: 'coaching', label: 'Coach' }
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
            <div className="flex gap-2">
              <button onClick={collapseAll} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors border bg-white border-gray-200 text-gray-600 hover:bg-gray-50">
                Collapse All
              </button>
              <button onClick={expandAll} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors border bg-white border-gray-200 text-gray-600 hover:bg-gray-50">
                Expand All
              </button>
            </div>
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedStats.map(mr => (
           <MRCard 
              key={mr.mrName} 
              mr={mr} 
              isExpanded={!!expandedMRs[mr.mrName]} 
              onToggle={() => toggleExpand(mr.mrName)}
              data={data}
              onOpenCalendar={() => setSelectedMRForCalendar(mr)}
           />
        ))}
      </div>

      {selectedMRForCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-gray-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-auto max-h-[95vh] flex flex-col overflow-hidden relative">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                 <div>
                   <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">📅 {selectedMRForCalendar.mrName}</h2>
                   <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mt-1">Calendar & Daily Activity</p>
                 </div>
                 <button onClick={() => setSelectedMRForCalendar(null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors flex items-center shadow-sm bg-white"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50/30">
                 <ActivityCalendar 
                    data={data.filter(d => safeStr(d.MrName) === selectedMRForCalendar.mrName)} 
                    mrName={selectedMRForCalendar.mrName}
                    targets={targets}
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const MRCard = ({ mr, isExpanded, onToggle, data, onOpenCalendar }) => {
   const { hcoAch, phAch, hcpAch } = mr;
   const getStatusIcon = (ach) => {
     if (!ach || ach === 0) return '—';
     if (ach >= 90) return '✅';
     if (ach >= 70) return '🟡';
     return '🔴';
   };

   // Search inside MR card
   const [searchQuery, setSearchQuery] = useState('');
   const [typeFilter, setTypeFilter] = useState('All');

   const mrDataRows = useMemo(() => {
      let rows = data.filter(d => safeStr(d.MrName) === mr.mrName);
      if (typeFilter !== 'All') {
         if (typeFilter === 'Coached') rows = rows.filter(d => safeStr(d.IsMRCoachingSubmitted).toLowerCase() === 'true');
         else rows = rows.filter(d => safeStr(d.InteractionType) === typeFilter);
      }
      if (searchQuery) {
         const q = searchQuery.toLowerCase();
         rows = rows.filter(d => safeStr(d.CustomerName).toLowerCase().includes(q) || safeStr(d.CustomerGrade).toLowerCase().includes(q));
      }
      return rows;
   }, [data, mr.mrName, searchQuery, typeFilter]);

   return (
      <div className={`bg-white border rounded-[1.25rem] shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col ${mr.isTop ? "border-l-[6px] border-l-yellow-400" : "border-l-[6px] border-l-gray-200"}`}>
         {mr.isTop && <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm">Top Performer</div>}
         
         <div className="p-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
              <div>
                <h4 className="font-black text-gray-900 text-lg flex items-center gap-2">
                  <span>🧑‍⚕️</span> {mr.mrName}
                </h4>
                <p className="text-xs font-bold text-gray-400 mt-1 ml-8 uppercase tracking-widest">{mr.lineName}</p>
              </div>
              <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest border border-gray-200">
                 {isExpanded ? <><ChevronUp size={14}/> Collapse</> : <><ChevronDown size={14}/> Expand</>}
              </button>
            </div>

            {/* COMPACT VIEW */}
            {!isExpanded && (
               <div className="flex items-start gap-4 text-xs mt-4">
                  <div className="space-y-1.5 flex-1 border-r border-gray-50 pr-4">
                    <div className="flex justify-between text-gray-600"><span className="font-bold text-gray-500">HCO:</span> <span className="font-mono">{mr.totalHCO} calls</span> <span className="font-mono">{mr.hcoRate.toFixed(1)}/d {getStatusIcon(hcoAch)}</span></div>
                    <div className="flex justify-between text-gray-600"><span className="font-bold text-gray-500">PH:</span> <span className="font-mono">{mr.totalPH} calls</span> <span className="font-mono">{mr.phRate.toFixed(1)}/d {getStatusIcon(phAch)}</span></div>
                    <div className="flex justify-between text-gray-600"><span className="font-bold text-gray-500">HCP:</span> <span className="font-mono">{mr.totalHCP} calls</span> <span className="font-mono">{mr.hcpRate.toFixed(1)}/d {getStatusIcon(hcpAch)}</span></div>
                  </div>
                  <div className="w-[120px] text-right space-y-2">
                     <p className="text-gray-600">Coaching: <span className="font-black bg-yellow-50 text-yellow-800 px-1.5 rounded">{mr.coachingDays} days</span></p>
                     <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Last: {mr.lastDate}</p>
                  </div>
               </div>
            )}

            {/* EXPANDED VIEW */}
            {isExpanded && (
               <div className="mt-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                     {/* HCO */}
                     <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                       <p className="text-[10px] font-black text-gray-500 tracking-wider mb-2">🏥 HCO (AM)</p>
                       <p className="text-xs text-gray-600 mb-1"><span className="font-bold text-gray-900">{mr.hcoDays}</span> days</p>
                       <p className="text-xs text-gray-600 mb-2"><span className="font-bold text-gray-900">{mr.totalHCO}</span> calls</p>
                       <div className="mt-auto text-xs py-1 px-1 rounded font-black border bg-white border-gray-200 flex flex-col items-center gap-1">
                         <span>{mr.hcoRate.toFixed(1)}/d</span>
                         <span>{getStatusIcon(hcoAch)}</span>
                       </div>
                     </div>
                     {/* PH */}
                     <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                       <p className="text-[10px] font-black text-gray-500 tracking-wider mb-2">💊 PH (AM)</p>
                       <p className="text-xs text-gray-600 mb-1"><span className="font-bold text-gray-900">{mr.phDays}</span> days</p>
                       <p className="text-xs text-gray-600 mb-2"><span className="font-bold text-gray-900">{mr.totalPH}</span> calls</p>
                       <div className="mt-auto text-xs py-1 px-1 rounded font-black border bg-white border-gray-200 flex flex-col items-center gap-1">
                         <span>{mr.phRate.toFixed(1)}/d</span>
                         <span>{getStatusIcon(phAch)}</span>
                       </div>
                     </div>
                     {/* HCP */}
                     <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                       <p className="text-[10px] font-black text-blue-800 tracking-wider mb-2">👨‍⚕️ HCP (PM)</p>
                       <p className="text-xs text-gray-600 mb-1"><span className="font-bold text-gray-900">{mr.hcpDays}</span> days</p>
                       <p className="text-xs text-gray-600 mb-2"><span className="font-bold text-gray-900">{mr.totalHCP}</span> calls</p>
                       <div className="mt-auto text-xs py-1 px-1 rounded font-black border bg-white border-gray-200 flex flex-col items-center gap-1">
                         <span>{mr.hcpRate.toFixed(1)}/d</span>
                         <span>{getStatusIcon(hcpAch)}</span>
                       </div>
                     </div>
                  </div>

                  <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-4 mb-4">
                     <p className="text-sm font-bold text-gray-800 mb-1">🎓 Coaching Days: <span className="font-black text-yellow-700 bg-yellow-100 px-2 rounded">{mr.coachingDays}</span></p>
                     <p className="text-xs text-gray-600">Total Coached Visits: <span className="font-bold">{mr.totalCoached}</span></p>
                     <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">(HCO:{mr.hcoCoached} · PH:{mr.phCoached} · HCP:{mr.hcpCoached})</p>
                  </div>

                  <div className="mb-4">
                     <div className="flex gap-2 items-center mb-2">
                        <div className="relative flex-1">
                           <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                           <input type="text" placeholder="Search this MR's visits..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-xs pl-8 pr-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-accent" />
                        </div>
                     </div>
                     <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                        {['All','HCP','HCO','Pharmacy','Coached'].map(f => (
                           <button key={f} onClick={() => setTypeFilter(f)} className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-colors whitespace-nowrap border ${typeFilter === f ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200'}`}>
                             {f}
                           </button>
                        ))}
                     </div>
                     
                     {mrDataRows.length > 0 && (
                        <div className="max-h-[160px] overflow-y-auto border border-gray-200 rounded-lg shadow-inner bg-gray-50 text-xs">
                           <table className="w-full text-left bg-white">
                             <thead className="bg-gray-100 sticky top-0 text-[9px] uppercase tracking-widest font-black text-gray-500">
                               <tr><th className="px-2 py-1.5 border-b border-gray-200">Date</th><th className="px-2 py-1.5 border-b border-gray-200">Customer</th><th className="px-2 py-1.5 border-b border-gray-200">Type</th><th className="px-2 py-1.5 border-b border-gray-200">Coached</th></tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50">
                               {mrDataRows.slice(0, 100).map((r, i) => (
                                 <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{r.ReportDate?.split('T')[0]}</td>
                                    <td className="px-2 py-1.5 font-bold text-gray-800 truncate max-w-[100px]" title={r.CustomerName}>{r.CustomerName}</td>
                                    <td className="px-2 py-1.5 text-gray-500">{r.InteractionType}</td>
                                    <td className="px-2 py-1.5">{safeStr(r.IsMRCoachingSubmitted).toLowerCase() === 'true' ? '🎓' : ''}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                           {mrDataRows.length > 100 && <p className="text-center text-[10px] py-1 text-gray-400 bg-gray-50 font-bold">Showing 100 of {mrDataRows.length}</p>}
                        </div>
                     )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                     <button onClick={onOpenCalendar} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white font-black tracking-widest uppercase text-[10px] rounded-xl hover:bg-gray-800 transition-colors shadow-sm">
                        <CalendarIcon size={14} /> View Calendar
                     </button>
                     <button onClick={() => document.getElementById('section-forecast')?.scrollIntoView({ behavior: 'smooth' })} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 font-black tracking-widest uppercase text-[10px] rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm">
                        📈 Forecast
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};

export default MRCardsGrid;
