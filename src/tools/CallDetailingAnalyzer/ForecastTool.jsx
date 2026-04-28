import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Trash2, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { calculateForecast, STATUS_CONFIG } from '../../utils/forecastEngine';

const ForecastTool = ({ data, targets, mrStats }) => {
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

  // Set default end date to last day of current month
  useEffect(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setPeriodEndDate(end.toISOString().split('T')[0]);
  }, []);

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
                            <tr className="bg-gray-100/50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                               <th className="px-6 py-4 border-r border-gray-100">MR Identity</th>
                               <th colSpan="3" className="px-4 py-4 text-center border-r border-gray-100 bg-green-50/50 text-green-700">🏥 HCO Coverage</th>
                               <th colSpan="3" className="px-4 py-4 text-center border-r border-gray-100 bg-purple-50/50 text-purple-700">💊 Pharmacy (PH)</th>
                               <th colSpan="3" className="px-4 py-4 text-center border-r border-gray-100 bg-blue-50/50 text-blue-700">👨‍⚕️ HCP Visits</th>
                               <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                            <tr className="bg-white text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                               <th className="px-6 py-2 border-r border-gray-100"></th>
                               {/* HCO */}
                               <th className="px-2 py-2 text-center border-r border-gray-50">Done</th>
                               <th className="px-2 py-2 text-center border-r border-gray-50">Left</th>
                               <th className="px-2 py-2 text-center border-r border-gray-100">Req/d</th>
                               {/* PH */}
                               <th className="px-2 py-2 text-center border-r border-gray-50">Done</th>
                               <th className="px-2 py-2 text-center border-r border-gray-50">Left</th>
                               <th className="px-2 py-2 text-center border-r border-gray-100">Req/d</th>
                               {/* HCP */}
                               <th className="px-2 py-2 text-center border-r border-gray-50">Done</th>
                               <th className="px-2 py-2 text-center border-r border-gray-50">Left</th>
                               <th className="px-2 py-2 text-center border-r border-gray-100">Req/d</th>
                               <th></th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {forecastResults.map((r, i) => {
                               if (r.skipped) return null;
                               const overall = getStatusDisplay(r.overallStatus);
                               
                               return (
                                 <tr key={i} className="hover:bg-gray-50 border-l-4 border-transparent hover:border-yellow-400 transition-all">
                                    <td className="px-6 py-4 border-r border-gray-100">
                                       <div className="font-black text-gray-900 text-sm tracking-tight">{r.mrName}</div>
                                       <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{r.lineName}</div>
                                    </td>
                                    
                                    {/* HCO */}
                                    <td className="px-2 py-4 text-center font-bold text-gray-600 bg-green-50/10 border-r border-gray-50">{r.hcoDone} <span className="opacity-30">/ {r.hcoTotalTarget}</span></td>
                                    <td className="px-2 py-4 text-center font-black text-green-700 bg-green-50/10 border-r border-gray-50">{r.hcoRemDays}</td>
                                    <td className="px-4 py-4 text-center border-r border-gray-100 bg-white group/cell relative">
                                       {r.hcoStatus === 'achieved' ? (
                                         <div className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-lg">✅ DONE</div>
                                       ) : r.hcoRemDays === 0 ? (
                                         <div className="text-red-500 font-bold text-[10px]">❌ N/A</div>
                                       ) : (
                                         <div className={`px-2 py-1 rounded-xl text-sm font-black border-2 border-transparent ${r.hcoRequired > (targets?.hcoPerDay || 2) * 1.5 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-900 group-hover/cell:bg-white transition-colors'}`}>
                                            {r.hcoRequired?.toFixed(1)}<span className="text-[10px] opacity-40 ml-1">v/d</span>
                                         </div>
                                       )}
                                       <div className="absolute opacity-0 group-hover/cell:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[9px] p-2 rounded-xl z-50 pointer-events-none transition-opacity">
                                          Deficit: {r.hcoDeficit} calls
                                       </div>
                                    </td>

                                    {/* PH */}
                                    <td className="px-2 py-4 text-center font-bold text-gray-600 bg-purple-50/10 border-r border-gray-50">{r.phDone} <span className="opacity-30">/ {r.phTotalTarget}</span></td>
                                    <td className="px-2 py-4 text-center font-black text-purple-700 bg-purple-50/10 border-r border-gray-50">{r.phRemDays}</td>
                                    <td className="px-4 py-4 text-center border-r border-gray-100 bg-white group/cell relative">
                                       {r.phStatus === 'achieved' ? (
                                         <div className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-lg">✅ DONE</div>
                                       ) : r.phRemDays === 0 ? (
                                         <div className="text-red-500 font-bold text-[10px]">❌ N/A</div>
                                       ) : (
                                         <div className={`px-2 py-1 rounded-xl text-sm font-black border-2 border-transparent ${r.phRequired > (targets?.phPerDay || 10) * 1.5 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-900 group-hover/cell:bg-white transition-colors'}`}>
                                            {r.phRequired?.toFixed(1)}<span className="text-[10px] opacity-40 ml-1">v/d</span>
                                         </div>
                                       )}
                                       <div className="absolute opacity-0 group-hover/cell:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[9px] p-2 rounded-xl z-50 pointer-events-none transition-opacity">
                                          Deficit: {r.phDeficit} calls
                                       </div>
                                    </td>

                                    {/* HCP */}
                                    <td className="px-2 py-4 text-center font-bold text-gray-600 bg-blue-50/10 border-r border-gray-50">{r.hcpDone} <span className="opacity-30">/ {r.hcpTotalTarget}</span></td>
                                    <td className="px-2 py-4 text-center font-black text-blue-700 bg-blue-50/10 border-r border-gray-50">{r.hcpRemDays}</td>
                                    <td className="px-4 py-4 text-center border-r border-gray-100 bg-white group/cell relative">
                                       {r.hcpStatus === 'achieved' ? (
                                         <div className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-lg">✅ DONE</div>
                                       ) : r.hcpRemDays === 0 ? (
                                         <div className="text-red-500 font-bold text-[10px]">❌ N/A</div>
                                       ) : (
                                         <div className={`px-2 py-1 rounded-xl text-sm font-black border-2 border-transparent ${r.hcpRequired > (targets?.hcpPerDay || 9) * 1.5 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-900 group-hover/cell:bg-white transition-colors'}`}>
                                            {r.hcpRequired?.toFixed(1)}<span className="text-[10px] opacity-40 ml-1">v/d</span>
                                         </div>
                                       )}
                                       <div className="absolute opacity-0 group-hover/cell:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[9px] p-2 rounded-xl z-50 pointer-events-none transition-opacity">
                                          Deficit: {r.hcpDeficit} calls
                                       </div>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                       <span 
                                         className="px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest whitespace-nowrap"
                                         style={{ backgroundColor: overall.bg, color: overall.text, borderColor: `${overall.text}33` }}
                                       >
                                          {overall.label}
                                       </span>
                                    </td>
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
