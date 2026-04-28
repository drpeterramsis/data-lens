import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';
import { getDayOfWeek } from '../../utils/periodRules';
import { calculateKPICards, calculateMRStats } from '../../utils/csvAnalyzer'; // or similar if we needed to calculate ach

const CALENDAR_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const ActivityCalendar = ({ data, mrName, targets = { hcoPerDay: 2, phPerDay: 1, hcpPerDay: 5 } }) => {
  const focalDate = useMemo(() => {
    if (!data || data.length === 0) return new Date();
    let maxDate = '';
    data.forEach(d => {
       const dt = safeStr(d.ReportDate);
       if (dt && dt > maxDate) maxDate = dt;
    });
    if (maxDate) return new Date(maxDate.split('T')[0] + "T00:00:00");
    return new Date();
  }, [data]);

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(focalDate));
  const [selectedDay, setSelectedDay] = useState(null);

  const daysInMonth = useMemo(() => {
    const dates = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    return dates.map(d => {
       const strDate = format(d, 'yyyy-MM-dd');
       return { dateObj: d, dateStr: strDate, dayOfWeek: getDayOfWeek(strDate) };
    });
  }, [currentMonth]);

  const statsByDay = useMemo(() => {
    const acc = {};
    data.forEach(d => {
       const dateStr = safeStr(d.ReportDate);
       if (!dateStr) return;
       const pureDate = dateStr.split('T')[0];
       if (!acc[pureDate]) acc[pureDate] = { hco: 0, ph: 0, hcp: 0, coached: 0, total: 0, interactions: [] };
       
       const t = safeStr(d.InteractionType);
       if (t === 'HCO') acc[pureDate].hco++;
       if (t === 'Pharmacy') acc[pureDate].ph++;
       if (t === 'HCP') acc[pureDate].hcp++;
       
       if (safeStr(d.IsMRCoachingSubmitted).toLowerCase() === 'true') acc[pureDate].coached++;
       
       acc[pureDate].total++;
       acc[pureDate].interactions.push(d);
    });
    return acc;
  }, [data]);

  // Adjust padding for Sat -> Fri calendar
  // getDayOfWeek: Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
  // We want: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
  const toGridIndex = (dow) => (dow === 6 ? 0 : dow + 1);

  const startGridIndex = daysInMonth.length > 0 ? toGridIndex(daysInMonth[0].dayOfWeek) : 0;
  const paddingCells = Array.from({ length: startGridIndex });

  const getDayHeaderBg = (dayIndex) => {
     if (dayIndex === 5) return 'bg-orange-100/50 text-orange-800'; // Thu
     if (dayIndex === 6) return 'bg-red-100/50 text-red-800'; // Fri
     return 'bg-white text-gray-500'; // Sat-Wed
  };

  const calculateAch = (stat, dow) => {
     let hcoT = targets?.hcoPerDay || 0;
     let phT = targets?.phPerDay || 0;
     let hcpT = targets?.hcpPerDay || 0;
     
     // Adjusted target capacity depending on day of week
     if (dow === 5) hcpT = 0; // friday off
     if (dow === 4) hcpT = 0; // thursday pm off
     
     let achHco = hcoT > 0 ? (stat.hco / hcoT) * 100 : 0;
     let achPh = phT > 0 ? (stat.ph / phT) * 100 : 0;
     let achHcp = hcpT > 0 ? (stat.hcp / hcpT) * 100 : 0;
     
     let totalAchs = 0; let n = 0;
     if (hcoT > 0) { totalAchs += achHco; n++; }
     if (phT > 0) { totalAchs += achPh; n++; }
     if (hcpT > 0) { totalAchs += achHcp; n++; }

     let overall = n > 0 ? totalAchs / n : 0;
     return { achHco, achPh, achHcp, overall };
  };

  const renderAchValue = (val) => {
     if (val >= 100) return <span className="text-green-600 font-black">({val.toFixed(0)}%)</span>;
     if (val >= 75) return <span className="text-yellow-600 font-black">({val.toFixed(0)}%)</span>;
     return <span className="text-red-500 font-bold">({val.toFixed(0)}%)</span>;
  };

  const totalSummary = useMemo(() => {
     let activeHcoDays = 0, activePhDays = 0, activeHcpDays = 0, coachingDaysCount = 0;
     let totalHco=0, totalPh=0, totalHcp=0, totalCoachedV = 0;
     
     Object.entries(statsByDay).forEach(([k, st]) => {
        const dow = getDayOfWeek(k);
        if (st.hco > 0) activeHcoDays++;
        if (st.ph > 0) activePhDays++;
        if (st.hcp > 0 && dow !== 4 && dow !== 5) activeHcpDays++;
        if (st.coached >= 4) coachingDaysCount++;
        
        totalHco += st.hco;
        totalPh += st.ph;
        totalHcp += st.hcp;
        totalCoachedV += st.coached;
     });
     
     return { activeHcoDays, activePhDays, activeHcpDays, coachingDaysCount, totalHco, totalPh, totalHcp, totalCoachedV };
  }, [statsByDay]);

  const activeDaysCount = Object.keys(statsByDay).length;

  return (
    <div className="bg-white p-4 lg:p-6" id={`calendar-${mrName}`}>
       <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 border border-gray-200 rounded hover:bg-gray-50"><ChevronLeft size={16} /></button>
             <h3 className="text-xl font-black text-gray-900 min-w-[160px] text-center uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</h3>
             <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 border border-gray-200 rounded hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
       </div>

       <div className="grid grid-cols-7 gap-2 mb-6">
          {CALENDAR_DAYS.map((d, i) => (
             <div key={d} className={`text-center py-2 text-xs font-black uppercase tracking-widest rounded border border-gray-100 ${getDayHeaderBg(i)}`}>{d}</div>
          ))}

          {paddingCells.map((_, i) => <div key={`p-${i}`} className="min-h-[140px] bg-gray-50/30 rounded-lg border border-gray-100" />)}

          {daysInMonth.map(({ dateObj, dateStr, dayOfWeek }) => {
             const st = statsByDay[dateStr];
             let isFri = dayOfWeek === 5;
             let isThu = dayOfWeek === 4;
             
             let bgClass = "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer";
             if (isFri) bgClass = "bg-red-50/50 border-red-100 opacity-60";
             else if (isThu && (!st || st.total === 0)) bgClass = "bg-orange-50/50 border-orange-100";
             else if (!st || st.total === 0) bgClass = "bg-gray-50/50 border-gray-100 opacity-80 cursor-default hover:bg-gray-50";
             
             if (st && st.coached >= 4) bgClass = "bg-yellow-50 border-yellow-300 cursor-pointer hover:shadow-md";

             const isSelected = selectedDay === dateStr;

             return (
               <div key={dateStr} onClick={() => { if(st && st.total > 0) setSelectedDay(isSelected ? null : dateStr); }} className={`min-h-[140px] border rounded-lg p-3 transition-all flex flex-col ${bgClass} ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-sm font-black text-gray-900">{format(dateObj, 'd')} <span className="text-gray-400 text-[10px] uppercase">{format(dateObj, 'eee')}</span></span>
                     {isFri && <span className="text-[9px] font-black uppercase text-red-600 bg-red-100 px-1 py-0.5 rounded tracking-widest">🔴 OFF</span>}
                     {isThu && <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-100 px-1 py-0.5 rounded tracking-widest">🟠 AM</span>}
                  </div>
                  
                  {st && st.total > 0 && (() => {
                     const ach = calculateAch(st, dayOfWeek);
                     return (
                        <div className="flex-1 flex flex-col space-y-1.5 text-[10px]">
                           <div className="flex justify-between items-center text-green-800">
                             <div className="font-bold">HCO: {st.hco}</div>
                             <div className="flex items-center gap-1">{renderAchValue(ach.achHco)} <span>🏥</span></div>
                           </div>
                           <div className="flex justify-between items-center text-teal-800">
                             <div className="font-bold">PH: {st.ph}</div>
                             <div className="flex items-center gap-1">{renderAchValue(ach.achPh)} <span>💊</span></div>
                           </div>
                           <div className="flex justify-between items-center text-blue-800">
                             <div className="font-bold">HCP: {st.hcp}</div>
                             <div className="flex items-center gap-1">{renderAchValue(ach.achHcp)} <span>👨‍⚕️</span></div>
                           </div>
                           
                           <div className="mt-auto pt-2 border-t border-gray-200/50 font-black text-gray-800 flex justify-between">
                             <span>Total: {st.total}</span> <span>Ach: {ach.overall.toFixed(0)}%</span>
                           </div>

                           {st.coached >= 4 && (
                             <div className="bg-yellow-200/50 text-yellow-900 px-2 py-1 rounded text-center font-black mt-2 tracking-widest uppercase">
                               🎓 Coached: {st.coached}
                             </div>
                           )}
                        </div>
                     );
                  })()}
               </div>
             );
          })}
       </div>

       {/* INLINE DAY DETAIL */}
       {selectedDay && statsByDay[selectedDay] && (() => {
          const st = statsByDay[selectedDay];
          const interactions = st.interactions;
          const hcoRows = interactions.filter(d => safeStr(d.InteractionType) === 'HCO');
          const phRows = interactions.filter(d => safeStr(d.InteractionType) === 'Pharmacy');
          const hcpRows = interactions.filter(d => safeStr(d.InteractionType) === 'HCP');
          const isThu = getDayOfWeek(selectedDay) === 4;

          return (
             <div className="bg-white border border-gray-200 rounded-xl shadow-lg mb-8 p-6 animate-in slide-in-from-top-6 fade-in duration-200">
               <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                 <h3 className="text-xl font-black text-gray-900 tracking-tight">📅 {format(new Date(selectedDay + "T00:00:00"), 'EEEE, MMMM d, yyyy')}</h3>
                 <button onClick={() => setSelectedDay(null)} className="px-3 py-1.5 border border-gray-200 font-black uppercase text-[10px] tracking-widest text-gray-500 rounded hover:bg-gray-50 hover:text-gray-900">Close ✕</button>
               </div>

               <div className="flex gap-2 mb-6">
                 <span className="bg-gray-100 text-gray-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">AM - HCO/PH</span>
                 <span className={`${isThu ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-600'} px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full`}>PM - HCP</span>
               </div>

               {st.coached >= 4 && (() => {
                  const coachRows = interactions.filter(x => safeStr(x.IsMRCoachingSubmitted).toLowerCase() === 'true');
                  return (
                     <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-8">
                       <span className="bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full mb-3 inline-block shadow-sm">🎓 Coaching Day — {st.coached} coached visits</span>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white rounded-lg border border-yellow-100 overflow-hidden text-xs">
                             <table className="w-full text-left">
                               <thead className="bg-yellow-50 text-[9px] font-black uppercase text-yellow-800 tracking-widest border-b border-yellow-100">
                                 <tr><th className="p-2">Customer Name</th><th className="p-2">Type</th><th className="p-2">Grade</th><th className="p-2">Coaching Type</th></tr>
                               </thead>
                               <tbody className="divide-y divide-yellow-50">
                                 {coachRows.map((r, i) => (
                                   <tr key={i} className="hover:bg-yellow-50/50">
                                     <td className="p-2 font-bold text-gray-800">{r.CustomerName}</td>
                                     <td className="p-2 text-gray-500">{r.InteractionType}</td>
                                     <td className="p-2 text-gray-500">{r.CustomerGrade || '—'}</td>
                                     <td className="p-2 text-gray-500">{r.CoachingType || '—'}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                          </div>
                          <div>
                             <h4 className="text-[10px] uppercase font-black text-yellow-800 tracking-widest mb-2">Summary</h4>
                             <p className="text-xs text-gray-600 mb-1">Total Coached Today: <b>{st.coached}</b></p>
                             <p className="text-xs text-gray-500">HCO coached: <b>{coachRows.filter(r=>r.InteractionType==='HCO').length}</b> · PH coached: <b>{coachRows.filter(r=>r.InteractionType==='Pharmacy').length}</b> · HCP coached: <b>{coachRows.filter(r=>r.InteractionType==='HCP').length}</b></p>
                          </div>
                       </div>
                     </div>
                  );
               })()}

               <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-1">
                     <h4 className="font-black text-green-900 mb-3 border-b border-green-100 pb-2 flex items-center justify-between tracking-tight">🏥 HCO VISITS — AM <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">{hcoRows.length} visits</span></h4>
                     <table className="w-full text-left text-xs">
                       <thead className="text-[9px] uppercase font-black tracking-widest text-gray-400 border-b border-gray-100">
                         <tr><th className="pb-2">Customer</th><th className="pb-2">Grade</th><th className="pb-2">Site</th><th className="pb-2">Coached</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                         {hcoRows.map((r,i) => (
                           <tr key={i}>
                              <td className="py-2 font-bold text-gray-800">{r.CustomerName}</td>
                              <td className="py-2 text-gray-500">{r.CustomerGrade || '—'}</td>
                              <td className="py-2 text-gray-500 truncate max-w-[80px]" title={r.InteractionVisitedSite}>{r.InteractionVisitedSite || '—'}</td>
                              <td className="py-2">{safeStr(r.IsMRCoachingSubmitted).toLowerCase() === 'true' ? '🎓 Yes' : '—'}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                     {hcoRows.length===0 && <p className="text-xs text-gray-400 py-3 italic">No HCO visits.</p>}
                  </div>

                  <div className="xl:col-span-1">
                     <h4 className="font-black text-teal-900 mb-3 border-b border-teal-100 pb-2 flex items-center justify-between tracking-tight">💊 PH VISITS — AM <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{phRows.length} visits</span></h4>
                     <table className="w-full text-left text-xs">
                       <thead className="text-[9px] uppercase font-black tracking-widest text-gray-400 border-b border-gray-100">
                         <tr><th className="pb-2">Customer</th><th className="pb-2">Grade</th><th className="pb-2">Coached</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                         {phRows.map((r,i) => (
                           <tr key={i}>
                              <td className="py-2 font-bold text-gray-800">{r.CustomerName}</td>
                              <td className="py-2 text-gray-500">{r.CustomerGrade || '—'}</td>
                              <td className="py-2">{safeStr(r.IsMRCoachingSubmitted).toLowerCase() === 'true' ? '🎓 Yes' : '—'}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                     {phRows.length===0 && <p className="text-xs text-gray-400 py-3 italic">No Pharmacy visits.</p>}
                  </div>

                  {!isThu && (
                     <div className="xl:col-span-1">
                        <h4 className="font-black text-blue-900 mb-3 border-b border-blue-100 pb-2 flex items-center justify-between tracking-tight">👨‍⚕️ HCP VISITS — PM <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{hcpRows.length} visits</span></h4>
                        <table className="w-full text-left text-xs">
                          <thead className="text-[9px] uppercase font-black tracking-widest text-gray-400 border-b border-gray-100">
                            <tr><th className="pb-2">Customer</th><th className="pb-2">Specialty</th><th className="pb-2">Grade</th><th className="pb-2">Coached</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {hcpRows.map((r,i) => (
                              <tr key={i}>
                                 <td className="py-2 font-bold text-gray-800">{r.CustomerName}</td>
                                 <td className="py-2 text-gray-500 truncate max-w-[80px]" title={r.Specialty}>{r.Specialty || '—'}</td>
                                 <td className="py-2 text-gray-500">{r.CustomerGrade || '—'}</td>
                                 <td className="py-2">{safeStr(r.IsMRCoachingSubmitted).toLowerCase() === 'true' ? '🎓 Yes' : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {hcpRows.length===0 && <p className="text-xs text-gray-400 py-3 italic">No HCP visits.</p>}
                     </div>
                  )}
               </div>
             </div>
          );
       })()}

       <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50 flex flex-wrap lg:flex-nowrap justify-between gap-6">
          <div className="flex-1">
             <h4 className="font-black text-gray-900 tracking-tight flex items-center gap-2 mb-4">📊 Activity Summary</h4>
             <p className="text-sm font-bold text-gray-600 mb-1">Active Days: <span className="text-gray-900 text-lg font-black">{activeDaysCount}</span></p>
             <p className="text-xs text-gray-500">Working Days Covered</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-[3]">
             <div className="text-center bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">HCO Total</p>
                <p className="text-lg font-black text-green-700 mb-0.5">{totalSummary.totalHco}</p>
                <p className="text-[10px] text-gray-500 font-bold">{totalSummary.activeHcoDays > 0 ? (totalSummary.totalHco/totalSummary.activeHcoDays).toFixed(1) : 0}/d ({totalSummary.activeHcoDays} active days)</p>
             </div>
             <div className="text-center bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">PH Total</p>
                <p className="text-lg font-black text-teal-700 mb-0.5">{totalSummary.totalPh}</p>
                <p className="text-[10px] text-gray-500 font-bold">{totalSummary.activePhDays > 0 ? (totalSummary.totalPh/totalSummary.activePhDays).toFixed(1) : 0}/d ({totalSummary.activePhDays} active days)</p>
             </div>
             <div className="text-center bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">HCP Total</p>
                <p className="text-lg font-black text-blue-700 mb-0.5">{totalSummary.totalHcp}</p>
                <p className="text-[10px] text-gray-500 font-bold">{totalSummary.activeHcpDays > 0 ? (totalSummary.totalHcp/totalSummary.activeHcpDays).toFixed(1) : 0}/d ({totalSummary.activeHcpDays} active days)</p>
             </div>
             <div className="text-center bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Coaching</p>
                <p className="text-lg font-black text-yellow-700 mb-0.5">{totalSummary.coachingDaysCount} <span className="text-xs">days</span></p>
                <p className="text-[10px] text-gray-500 font-bold">{totalSummary.totalCoachedV} total coached visits</p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default ActivityCalendar;
