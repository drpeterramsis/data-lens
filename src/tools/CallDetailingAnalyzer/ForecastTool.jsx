import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Trash2, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatKpi, formatKpiGrouped, formatKpiPercent } from '../../utils/formatNumber';
import { calculateForecast, STATUS_CONFIG } from '../../utils/forecastEngine';
import StatusTooltip from '../../components/shared/StatusTooltip';
import { buildRequiredTooltip } from '../../utils/mrCalculations';

const ForecastTool = ({ data, targets, mrStats }) => {
  const getRequiredColor = (required, target, status) => {
    if (status === "achieved") return {
      bg:     "bg-green-50",
      border: "border-green-200",
      text:   "text-green-700",
      badge:  "bg-green-100 text-green-800",
    };

    if (status === "impossible" || required === null) return {
      bg:     "bg-gray-50",
      border: "border-gray-200",
      text:   "text-gray-500",
      badge:  "bg-gray-100 text-gray-600",
    };

    if (required <= target) return {
      bg:     "bg-green-50",
      border: "border-green-200",
      text:   "text-green-700",
      badge:  "bg-green-100 text-green-800",
    };

    return {
      bg:     "bg-red-50",
      border: "border-red-200",
      text:   "text-red-700",
      badge:  "bg-red-100 text-red-800",
    };
  };

  const RequiredCell = ({ required, target, status, done, totalTarget, remDays, label }) => {
    const colors = getRequiredColor(required, target, status);
    const tipInfo = buildRequiredTooltip(
      required, target, status,
      done, totalTarget, remDays,
      label // "HCO" | "PH" | "HCP"
    );

    return (
      <td className={`p-3 text-center border-b border-t ${colors.border} ${colors.bg}`}>
        <StatusTooltip
          title={tipInfo.title}
          lines={tipInfo.lines}
          color={tipInfo.color}>
          <div className="cursor-help">
            <div className={`text-lg font-black ${colors.text}`}>
              {status === "achieved"
                ? "✅"
                : status === "impossible"
                  ? "❌"
                  : formatKpi(required)
              }
            </div>
            <div className={`text-[10px] mt-0.5 ${colors.text} opacity-80`}>
              {status === "achieved"
                ? "Target achieved"
                : status === "impossible"
                  ? "No days left"
                  : required <= target
                    ? `≤ ${target} ✓`
                    : `> ${target} target`
              }
            </div>
          </div>
        </StatusTooltip>
        {status !== "achieved" && status !== "impossible" && remDays > 0 && (
          <div className={`mt-1 text-[9px] px-1.5 py-0.5 rounded-full inline-block ${colors.badge}`}>
            {remDays} days left
          </div>
        )}
      </td>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr + "T00:00:00")
        .toLocaleDateString("en-GB", {
          day:   "numeric",
          month: "short",
          year:  "numeric",
        });
    } catch {
      return dateStr;
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  
  // Base period state
  const [periodEndDate, setPeriodEndDate] = useState('');
  
  // Collections for overrides
  const [dmMeetings, setDmMeetings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [mrVacations, setMrVacations] = useState([]);
  
  // Results
  const [forecastResults, setForecastResults] = useState([]);
  const [isCalculated, setIsCalculated] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key:       null,   // column key string
    direction: "asc",  // "asc" | "desc"
  });

  const toggleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key)
        return { key, direction: "asc" };
      if (prev.direction === "asc")
        return { key, direction: "desc" };
      return { key: null, direction: "asc" };
    });
  };

  const getSortValue = (row, key) => {
    const v = row[key];

    // null / undefined → push to bottom
    if (v === null || v === undefined || v === "")
      return null;

    // Date string "YYYY-MM-DD"
    if (
      typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(v)
    ) return v;

    // Number
    if (typeof v === "number") return v;

    // Numeric string
    const n = Number(v);
    if (!Number.isNaN(n)) return n;

    // Fallback string
    return String(v).toLowerCase();
  };

  const sortedForecastRows = useMemo(() => {
    if (!forecastResults?.length)
      return forecastResults ?? [];

    const { key, direction } = sortConfig;
    if (!key) return forecastResults;

    const dir = direction === "asc" ? 1 : -1;

    return [...forecastResults].sort((a, b) => {
      const va = getSortValue(a, key);
      const vb = getSortValue(b, key);

      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [forecastResults, sortConfig]);

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey)
      return (
        <span className="text-gray-400 text-[9px] ml-0.5 inline-block">
          ↕
        </span>
      );
    return sortConfig.direction === "asc"
      ? (
        <span className="text-gray-900 text-[9px] ml-0.5 inline-block">
          ▲
        </span>
      ) : (
        <span className="text-gray-900 text-[9px] ml-0.5 inline-block">
          ▼
        </span>
      );
  };

  const SortableTH = ({
    colKey, children,
    className = ""
  }) => (
    <th
      onClick={() => toggleSort(colKey)}
      className={`
        p-2 text-center cursor-pointer select-none whitespace-nowrap
        hover:bg-gray-200 transition-colors active:bg-gray-300
        ${sortConfig.key === colKey
          ? "bg-yellow-50 text-gray-900"
          : "text-gray-600"
        }
        ${className}
      `}>
      {children}
      <SortIcon colKey={colKey} />
    </th>
  );


  // Set default end date to last day of the month based on the latest report date
  useEffect(() => {
    let maxDateStr = "";
    if (mrStats && mrStats.length > 0) {
      maxDateStr = mrStats.reduce((max, mr) => {
        if (!mr.lastDate) return max;
        return mr.lastDate > max ? mr.lastDate : max;
      }, "");
    }

    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;

    if (maxDateStr && maxDateStr.includes('-')) {
      const parts = maxDateStr.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }

    const end = new Date(year, month, 0); // 0th day of next month is last day of current month
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    setPeriodEndDate(endStr);
  }, [mrStats]);

  const uniqueMrNames = useMemo(() => mrStats?.map(m => m.mrName) || [], [mrStats]);

  const handleCalculate = () => {
    const results = calculateForecast({
      mrStats,
      periodEndDate,
      dmMeetings,
      holidays,
      mrVacations,
      targets: {
        hcoPerDay: targets?.hcoPerDay || 2,
        phPerDay: targets?.phPerDay || 10,
        hcpPerDay: targets?.hcpPerDay || 9,
      }
    });
    setForecastResults(results);
    setIsCalculated(true);
  };

  const addDmMeeting = () => setDmMeetings([...dmMeetings, { date: '', hcoOff: true, phOff: false, hcpOff: false }]);
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

  const getStatusDisplay = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.impossible;

  // Mini Calendar Logic for remaining period
  const miniCalendarData = useMemo(() => {
    if (!forecastResults.length) return null;
    const firstMr = forecastResults.find(r => !r.skipped);
    if (!firstMr) return null;

    const dates = firstMr.remainingDates;
    if (!dates || !dates.length) return null;

    const summary = {
      total: dates.length,
      fridays: 0,
      thursdays: 0,
      dm: 0,
      hol: 0,
      hcoRem: firstMr.hcoRemDays,
      phRem: firstMr.phRemDays,
      hcpRem: firstMr.hcpRemDays,
    };

    const coloredDates = dates.map(d => {
      const dt = new Date(d + "T00:00:00");
      const dow = dt.getDay();
      let color = "bg-green-100"; // Default working
      let label = "";

      if (dow === 5) {
        color = "bg-red-100"; 
        summary.fridays++;
        label = "FRI";
      } else if (dow === 4) {
        color = "bg-orange-100";
        summary.thursdays++;
        label = "THU (HCP OFF)";
      }

      const isDm = dmMeetings.find(m => m.date === d);
      if (isDm) {
        color = "bg-blue-200";
        summary.dm++;
        label = "DM";
      } else {
        const isHol = holidays.find(h => h.date === d);
        if (isHol) {
            color = "bg-purple-200";
            summary.hol++;
            label = "HOL";
        }
      }

      return { date: d, color, label };
    });

    return { coloredDates, summary };
  }, [forecastResults, dmMeetings, holidays]);

  return (
    <div className="bg-white text-sm border border-gray-200 rounded-[2.5rem] shadow-sm mb-12 overflow-hidden animate-in fade-in duration-700">
      <div 
        className="p-6 bg-gray-50/50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 border border-gray-200 rounded-2xl shadow-sm">
             <TrendingUp size={24} className="text-yellow-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
              📈 Forecast Calculator
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Required call rate to hit target</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {isCalculated && <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest animate-pulse">Live Calculations</span>}
           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest bg-white px-3 py-1 rounded-full border border-gray-200">{isOpen ? 'Collapse ▼' : 'Expand ▶'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="p-8 border-t border-gray-100 space-y-8 bg-gray-50/20">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex flex-col justify-center">
               <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Period End Date</label>
               <input 
                 type="date" 
                 className="w-full border-2 border-gray-50 bg-gray-50/30 rounded-2xl p-4 text-base font-black outline-none focus:border-yellow-400 focus:bg-white transition-all shadow-inner" 
                 value={periodEndDate} 
                 onChange={e=>setPeriodEndDate(e.target.value)} 
               />
               <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase">Usually last day of the month</p>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
               {[
                 { label: "HCO Target", val: targets?.hcoPerDay || 2, color: "text-green-600" },
                 { label: "PH Target",  val: targets?.phPerDay || 10, color: "text-purple-600" },
                 { label: "HCP Target", val: targets?.hcpPerDay || 9, color: "text-blue-600" },
               ].map(t => (
                 <div key={t.label} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.label}</span>
                    <span className={`text-2xl font-black ${t.color}`}>{t.val} <span className="text-[10px] opacity-40">/d</span></span>
                 </div>
               ))}
            </div>
          </div>

          <div className="space-y-6">
             {/* DM Meetings */}
             <div className="bg-white p-6 border border-blue-100 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-blue-900 tracking-widest flex items-center gap-2">📋 DM Meeting Days</h4>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">Meetings reduce working capacity</p>
                  </div>
                  <button onClick={addDmMeeting} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">+ Add Meeting</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                   {dmMeetings.map((m, i) => (
                     <div key={i} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 relative group">
                        <input type="date" className="w-full border-2 border-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-400 mb-3" value={m.date} onChange={e=>updateDmMeeting(i, 'date', e.target.value)} />
                        <div className="space-y-2">
                           <label className="flex items-center gap-3 cursor-pointer group/check">
                             <div className="w-4 h-4 rounded-md border-2 border-blue-200 bg-white flex items-center justify-center transition-all group-hover/check:border-blue-400">
                                {m.hcoOff && <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>}
                             </div>
                             <input type="checkbox" className="hidden" checked={m.hcoOff} onChange={e=>updateDmMeeting(i, 'hcoOff', e.target.checked)} /> 
                             <span className="text-[10px] font-black text-blue-800 uppercase tracking-tight">HCO OFF (AM)</span>
                           </label>
                           <label className="flex items-center gap-3 cursor-pointer group/check">
                             <div className="w-4 h-4 rounded-md border-2 border-blue-200 bg-white flex items-center justify-center transition-all group-hover/check:border-blue-400">
                                {m.phOff && <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>}
                             </div>
                             <input type="checkbox" className="hidden" checked={m.phOff} onChange={e=>updateDmMeeting(i, 'phOff', e.target.checked)} /> 
                             <span className="text-[10px] font-black text-blue-800 uppercase tracking-tight">PH OFF (AM)</span>
                           </label>
                           <label className="flex items-center gap-3 cursor-pointer group/check">
                             <div className="w-4 h-4 rounded-md border-2 border-blue-200 bg-white flex items-center justify-center transition-all group-hover/check:border-blue-400">
                                {m.hcpOff && <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>}
                             </div>
                             <input type="checkbox" className="hidden" checked={m.hcpOff} onChange={e=>updateDmMeeting(i, 'hcpOff', e.target.checked)} /> 
                             <span className="text-[10px] font-black text-blue-800 uppercase tracking-tight">HCP OFF (PM)</span>
                           </label>
                        </div>
                        <button onClick={()=>removeDmMeeting(i)} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                     </div>
                   ))}
                </div>
                {dmMeetings.length === 0 && <div className="py-8 text-center text-xs font-bold text-gray-300 italic border-2 border-dashed border-gray-50 rounded-2xl">No meetings added</div>}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Public Holidays */}
                <div className="bg-white p-6 border border-purple-100 rounded-3xl shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="text-xs font-black uppercase text-purple-900 tracking-widest flex items-center gap-2">🗓 Public Holidays</h4>
                     <button onClick={addHoliday} className="text-[10px] font-black uppercase text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 transition-colors">+ Add</button>
                   </div>
                   <div className="space-y-3">
                      {holidays.map((h, i) => (
                        <div key={i} className="flex gap-2 bg-purple-50/30 p-3 rounded-2xl border border-purple-50 items-center">
                           <input type="date" className="border-2 border-white rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:border-purple-300 w-32" value={h.date} onChange={e=>updateHoliday(i, 'date', e.target.value)} />
                           <select className="flex-1 border-2 border-white rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:border-purple-300 bg-white" value={h.type} onChange={e=>updateHoliday(i, 'type', e.target.value)}>
                              <option value="full">🌴 Full Day OFF</option>
                              <option value="am">🌅 Half Day AM (HCO+PH OFF)</option>
                              <option value="pm">🌇 Half Day PM (HCP OFF)</option>
                           </select>
                           <button onClick={()=>removeHoliday(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                        </div>
                      ))}
                   </div>
                   {holidays.length === 0 && <div className="py-6 text-center text-[11px] font-bold text-gray-300 italic">No holidays configured</div>}
                </div>

                {/* Vacations */}
                <div className="bg-white p-6 border border-yellow-100 rounded-3xl shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="text-xs font-black uppercase text-yellow-900 tracking-widest flex items-center gap-2">🏖 MR Vacations</h4>
                     <button onClick={addMrVacation} className="text-[10px] font-black uppercase text-yellow-700 hover:bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100 transition-colors">+ Add</button>
                   </div>
                   <div className="space-y-3">
                      {mrVacations.map((v, i) => (
                        <div key={i} className="bg-yellow-50/20 p-4 rounded-2xl border border-yellow-50 relative group">
                           <div className="flex gap-2 mb-3">
                              <select className="flex-1 border-2 border-white rounded-xl px-3 py-2 text-[11px] font-black bg-white outline-none focus:border-yellow-300 uppercase tracking-tight" value={v.mrName} onChange={e=>updateMrVacation(i,'mrName',e.target.value)}>
                                {uniqueMrNames.map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                              <select className="w-32 border-2 border-white rounded-xl px-3 py-2 text-[11px] font-bold bg-white outline-none focus:border-yellow-300" value={v.type} onChange={e=>updateMrVacation(i, 'type', e.target.value)}>
                                 <option value="full">Full Day</option>
                                 <option value="am">AM Off</option>
                                 <option value="pm">PM Off</option>
                              </select>
                           </div>
                           <div className="flex items-center gap-2">
                              <input type="date" className="flex-1 border-2 border-white rounded-xl px-3 py-2 text-[11px] font-bold bg-white outline-none focus:border-yellow-300" value={v.from} onChange={e=>updateMrVacation(i, 'from', e.target.value)} />
                              <span className="text-[10px] font-black text-gray-300">→</span>
                              <input type="date" className="flex-1 border-2 border-white rounded-xl px-3 py-2 text-[11px] font-bold bg-white outline-none focus:border-yellow-300" value={v.to} onChange={e=>updateMrVacation(i, 'to', e.target.value)} />
                           </div>
                           <button onClick={()=>removeMrVacation(i)} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md border border-red-50 flex items-center justify-center text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                        </div>
                      ))}
                   </div>
                   {mrVacations.length === 0 && <div className="py-6 text-center text-[11px] font-bold text-gray-300 italic">No vacations added</div>}
                </div>
             </div>
          </div>

          <div className="flex justify-center pt-4">
             <button 
               onClick={handleCalculate}
               className="px-12 py-5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-yellow-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
             >
                <TrendingUp size={20} /> Calculate Final Forecast
             </button>
          </div>

          {isCalculated && (
             <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Mini Calendar Summary */}
                {miniCalendarData && (
                   <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                      <div className="flex flex-col lg:flex-row gap-8">
                         <div className="lg:w-1/3 space-y-4">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-xl inline-block">📅 Remaining Period Summary</h5>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="bg-gray-50/50 p-4 rounded-2xl">
                                  <p className="text-[8px] font-black text-gray-400 uppercase">Total Days</p>
                                  <p className="text-2xl font-black text-gray-900">{miniCalendarData.summary.total}</p>
                               </div>
                               <div className="bg-red-50/50 p-4 rounded-2xl">
                                  <p className="text-[8px] font-black text-red-400 uppercase">Fridays Off</p>
                                  <p className="text-2xl font-black text-red-600">{miniCalendarData.summary.fridays}</p>
                               </div>
                               <div className="bg-orange-50/50 p-4 rounded-2xl">
                                  <p className="text-[8px] font-black text-orange-400 uppercase">Thu PM Off</p>
                                  <p className="text-2xl font-black text-orange-600">{miniCalendarData.summary.thursdays}</p>
                               </div>
                               <div className="bg-blue-50/50 p-4 rounded-2xl">
                                  <p className="text-[8px] font-black text-blue-400 uppercase">DM Meetings</p>
                                  <p className="text-2xl font-black text-blue-600">{miniCalendarData.summary.dm}</p>
                               </div>
                            </div>
                            <div className="pt-2">
                               <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 border-b border-gray-50 py-2">
                                  <span>HCO Days Left:</span>
                                  <span className="text-green-700 font-black">{miniCalendarData.summary.hcoRem}</span>
                               </div>
                               <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 border-b border-gray-50 py-2">
                                  <span>PH Days Left:</span>
                                  <span className="text-purple-700 font-black">{miniCalendarData.summary.phRem}</span>
                               </div>
                               <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 border-b border-gray-50 py-2">
                                  <span>HCP Days Left:</span>
                                  <span className="text-blue-700 font-black">{miniCalendarData.summary.hcpRem}</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex-1 overflow-x-auto pb-4">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Availability Timeline</h5>
                            <div className="flex gap-2 min-w-max">
                               {miniCalendarData.coloredDates.map((item, idx) => (
                                 <div key={idx} className={`w-14 h-20 rounded-2xl ${item.color} border border-white shadow-sm flex flex-col items-center justify-center gap-1 group relative transition-transform hover:scale-110`}>
                                    <span className="text-[10px] font-black text-gray-400 opacity-60">{item.date.split('-')[2]}</span>
                                    <span className="text-[8px] font-black uppercase text-center leading-tight">{item.label}</span>
                                    
                                    <div className="absolute opacity-0 group-hover:opacity-100 -bottom-10 bg-gray-900 text-white text-[8px] px-2 py-1 rounded-md whitespace-nowrap z-50">
                                       {item.date}
                                    </div>
                                 </div>
                               ))}
                            </div>
                            <div className="mt-8 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-tighter">
                               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 rounded-sm"></div> Friday</div>
                               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-100 rounded-sm"></div> Thursday</div>
                               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-200 rounded-sm"></div> DM Meeting</div>
                               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-200 rounded-sm"></div> Holiday</div>
                               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 rounded-sm"></div> Working Day</div>
                            </div>
                         </div>
                      </div>
                   </div>
                )}

                {/* Forecast Results Table */}
                <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
                   <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                      <div>
                         <h4 className="text-xl font-black uppercase tracking-tight">Required Daily Call Rates</h4>
                         <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Calculated based on net remaining working days</p>
                      </div>
                      <ShieldCheck className="text-green-400" size={32} />
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] whitespace-nowrap border-collapse">
                         <thead>
                            <tr className="bg-gray-800 text-white text-xs">
                               <th className="p-2 text-left sticky left-0 bg-gray-800 min-w-[160px] z-10">MR</th>
                               <th colSpan="4" className="p-2 text-center border-l border-gray-600">🏥 HCO (Target: {targets?.hcoPerDay || 2}/day)</th>
                               <th colSpan="4" className="p-2 text-center border-l-2 border-gray-500">💊 Pharmacy (Target: {targets?.phPerDay || 10}/day)</th>
                               <th colSpan="4" className="p-2 text-center border-l-2 border-gray-500">👤 HCP (Target: {targets?.hcpPerDay || 9}/day)</th>
                            </tr>
                            <tr className="bg-gray-100 text-xs text-gray-600 font-semibold">
                               <SortableTH
                                 colKey="mrName"
                                 className="text-left sticky left-0 bg-gray-100 border-b border-r border-gray-200 z-10">
                                 Name
                               </SortableTH>

                               {/* HCO */}
                               <SortableTH colKey="hcoDone" className="border-l border-gray-300 border-b border-gray-200">Done</SortableTH>
                               <SortableTH colKey="hcoWorkedDays" className="border-b border-gray-200">Days</SortableTH>
                               <SortableTH colKey="hcoActualRate" className="border-b border-gray-200">Rate/d</SortableTH>
                               <SortableTH colKey="hcoRequired" className="border-b border-gray-200">Required/d</SortableTH>

                               {/* PH */}
                               <SortableTH colKey="phDone" className="border-l-2 border-gray-300 border-b border-gray-200">Done</SortableTH>
                               <SortableTH colKey="phWorkedDays" className="border-b border-gray-200">Days</SortableTH>
                               <SortableTH colKey="phActualRate" className="border-b border-gray-200">Rate/d</SortableTH>
                               <SortableTH colKey="phRequired" className="border-b border-gray-200">Required/d</SortableTH>

                               {/* HCP */}
                               <SortableTH colKey="hcpDone" className="border-l-2 border-gray-300 border-b border-gray-200">Done</SortableTH>
                               <SortableTH colKey="hcpWorkedDays" className="border-b border-gray-200">Days</SortableTH>
                               <SortableTH colKey="hcpActualRate" className="border-b border-gray-200">Rate/d</SortableTH>
                               <SortableTH colKey="hcpRequired" className="border-b border-gray-200">Required/d</SortableTH>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {sortedForecastRows.map((row, i) => {
                               if (row.skipped) return null;
                               
                               const hcoTarget = targets?.hcoPerDay || 2;
                               const phTarget = targets?.phPerDay || 10;
                               const hcpTarget = targets?.hcpPerDay || 9;

                               return (
                                 <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 align-top min-w-[160px] sticky left-0 bg-white border-r border-b border-gray-200 group-hover:bg-gray-50">
                                       <div className="font-bold text-sm text-gray-900">{row.mrName}</div>
                                       <div className="text-[11px] text-gray-500 mt-0.5">📅 Last: {formatDate(row.lastDate)}</div>
                                       <div className="text-[11px] text-blue-500 mt-0.5">Rem. from: {formatDate(row.fromDate)}</div>
                                       <div className="text-[10px] text-gray-400 mt-1">HCO: {row.hcoRemDays}d · PH: {row.phRemDays}d · HCP: {row.hcpRemDays}d left</div>
                                    </td>
                                    
                                    {/* HCO */}
                                    <td className="p-3 text-center text-sm text-gray-700 border-r border-b border-gray-200">{formatKpiGrouped(row.hcoDone)}</td>
                                    <td className="p-3 text-center text-sm text-gray-700 border-r border-b border-gray-200">{row.hcoWorkedDays}d</td>
                                    <td className={`p-3 text-center text-sm font-bold border-r border-b border-gray-200 ${
                                      row.hcoActualRate >= hcoTarget ? "text-green-700" : row.hcoActualRate >= hcoTarget * 0.9 ? "text-yellow-600" : "text-red-600"
                                    }`}>
                                      <StatusTooltip
                                        title="🏥 HCO Daily Rate"
                                        color={row.hcoActualRate >= hcoTarget ? "green" : row.hcoActualRate >= hcoTarget * 0.9 ? "yellow" : "red"}
                                        lines={[
                                          `Reported HCO Rate: ${formatKpi(row.hcoActualRate)}/day`,
                                          `Target HCO Rate: ${formatKpi(hcoTarget)}/day`,
                                          `Achievement: ${formatKpiPercent((row.hcoActualRate / hcoTarget) * 100)}`,
                                          `Total HCO visits: ${formatKpiGrouped(row.hcoDone)}`,
                                          `Worked days: ${row.hcoWorkedDays}`
                                        ]}>
                                        <div className="cursor-help">{formatKpi(row.hcoActualRate)}</div>
                                      </StatusTooltip>
                                    </td>
                                    <RequiredCell
                                      required={row.hcoRequired}
                                      target={hcoTarget}
                                      status={row.hcoStatus}
                                      done={row.hcoDone}
                                      totalTarget={row.hcoTotalTarget}
                                      remDays={row.hcoRemDays}
                                      label="HCO"
                                    />

                                    {/* PH */}
                                    <td className="p-3 text-center text-sm text-gray-700 border-r border-b border-gray-200 border-l-2 border-l-gray-300">{formatKpiGrouped(row.phDone)}</td>
                                    <td className="p-3 text-center text-sm text-gray-700 border-r border-b border-gray-200">{row.phWorkedDays}d</td>
                                    <td className={`p-3 text-center text-sm font-bold border-r border-b border-gray-200 ${
                                      row.phActualRate >= phTarget ? "text-green-700" : row.phActualRate >= phTarget * 0.9 ? "text-yellow-600" : "text-red-600"
                                    }`}>
                                      <StatusTooltip
                                        title="💊 PH Daily Rate"
                                        color={row.phActualRate >= phTarget ? "green" : row.phActualRate >= phTarget * 0.9 ? "yellow" : "red"}
                                        lines={[
                                          `Reported PH Rate: ${formatKpi(row.phActualRate)}/day`,
                                          `Target PH Rate: ${formatKpi(phTarget)}/day`,
                                          `Achievement: ${formatKpiPercent((row.phActualRate / phTarget) * 100)}`,
                                          `Total PH visits: ${formatKpiGrouped(row.phDone)}`,
                                          `Worked days: ${row.phWorkedDays}`
                                        ]}>
                                        <div className="cursor-help">{formatKpi(row.phActualRate)}</div>
                                      </StatusTooltip>
                                    </td>
                                    <RequiredCell
                                      required={row.phRequired}
                                      target={phTarget}
                                      status={row.phStatus}
                                      done={row.phDone}
                                      totalTarget={row.phTotalTarget}
                                      remDays={row.phRemDays}
                                      label="PH"
                                    />

                                    {/* HCP */}
                                    <td className="p-3 text-center text-sm text-gray-700 border-r border-b border-gray-200 border-l-2 border-l-gray-300">{formatKpiGrouped(row.hcpDone)}</td>
                                    <td className="p-3 text-center text-sm text-gray-700 border-r border-b border-gray-200">{row.hcpWorkedDays}d</td>
                                    <td className={`p-3 text-center text-sm font-bold border-r border-b border-gray-200 ${
                                      row.hcpActualRate >= hcpTarget ? "text-green-700" : row.hcpActualRate >= hcpTarget * 0.9 ? "text-yellow-600" : "text-red-600"
                                    }`}>
                                      <StatusTooltip
                                        title="👤 HCP Daily Rate"
                                        color={row.hcpActualRate >= hcpTarget ? "green" : row.hcpActualRate >= hcpTarget * 0.9 ? "yellow" : "red"}
                                        lines={[
                                          `Reported HCP Rate: ${formatKpi(row.hcpActualRate)}/day`,
                                          `Target HCP Rate: ${formatKpi(hcpTarget)}/day`,
                                          `Achievement: ${formatKpiPercent((row.hcpActualRate / hcpTarget) * 100)}`,
                                          `Total HCP visits: ${formatKpiGrouped(row.hcpDone)}`,
                                          `Worked days: ${row.hcpWorkedDays}`
                                        ]}>
                                        <div className="cursor-help">{formatKpi(row.hcpActualRate)}</div>
                                      </StatusTooltip>
                                    </td>
                                    <RequiredCell
                                      required={row.hcpRequired}
                                      target={hcpTarget}
                                      status={row.hcpStatus}
                                      done={row.hcpDone}
                                      totalTarget={row.hcpTotalTarget}
                                      remDays={row.hcpRemDays}
                                      label="HCP"
                                    />
                                 </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                   <div className="bg-blue-900 p-4 text-[9px] text-blue-200 font-bold uppercase tracking-widest text-center">
                      🛡️ Formula: Required Rate = (Target/day × Total Working Days − Visits Done) ÷ Remaining Working Days
                   </div>
                </div>
             </div>
          )}

          {!isCalculated && (
            <div className="py-12 bg-gray-50/50 border-4 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-gray-100">
                  <TrendingUp className="text-gray-300" size={32} />
               </div>
               <h5 className="text-lg font-black text-gray-400 uppercase tracking-tight">System Ready to Forecast</h5>
               <p className="text-xs text-gray-400 max-w-xs mt-2 font-medium">Configure DM meetings, holidays and MR vacations above, then click calculate to see performance projections.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ForecastTool;
