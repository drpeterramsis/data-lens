import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, UserRound, Hospital, Pill, GraduationCap, MapPin, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import InlineCalendar, { DayDetailPanel } from './InlineCalendar';

/**
 * MRFullscreenModal Component
 * 
 * ID: mr-fullscreen-modal
 * ROLE: Displays a full-screen analytical view of a single MR (Rep) performance.
 */
export default function MRFullscreenModal({ mr, targets, onClose }) {
  const [q, setQ] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Lifted Month State
  const [currentMonth, setCurrentMonth] = useState(() => {
    const dates = mr?.allDates || [];
    const lastDate = dates.length > 0 ? dates[dates.length - 1] : null;
    return lastDate ? new Date(lastDate + "T00:00:00") : new Date();
  });

  const changeMonth = (offset) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDate(null);
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (selectedDate) setSelectedDate(null);
        else if (isSearchOpen) setIsSearchOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isSearchOpen, selectedDate]);

  // Selected Day Data
  const selectedDayData = useMemo(() => {
    if (!selectedDate || !mr?.dateMap) return null;
    return mr.dateMap[selectedDate] || null;
  }, [selectedDate, mr.dateMap]);

  // ── Correct Total Visits Calculation ──
  const totalCalculatedVisits = useMemo(() => {
    let total = 0;
    if (mr?.dateMap) {
      Object.values(mr.dateMap).forEach(day => {
        total += (day.customers?.length || 0);
      });
    }
    return total;
  }, [mr?.dateMap]);

  // ── Improved Search Logic ──
  const { results, highlightedDates } = useMemo(() => {
    if (!q.trim()) return { results: [], highlightedDates: new Set() };
    
    // Tokenize search query for multi-word matching (e.g. "imad khalil")
    const tokens = q.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
    const matches = [];
    const dates = new Set();

    Object.entries(mr.dateMap).forEach(([date, day]) => {
      day.customers.forEach(c => {
        const name = (c.name || "").toLowerCase();
        const cid  = (c.customerId || "").toLowerCase();
        const spec = (c.specialty || "").toLowerCase();
        const site = (c.site || "").toLowerCase();
        const grade = (c.grade || "").toLowerCase();
        const type = (c.type || "").toLowerCase();
        
        // Add "coached" keyword if doctor was coached
        const coachedTag = c.coached ? "coached" : "";
        
        const combined = `${name} ${cid} ${spec} ${site} ${grade} ${type} ${coachedTag}`;

        // Every token in query must be found in the combined string
        const isMatch = tokens.every(token => combined.includes(token));

        if (isMatch) {
          matches.push({ ...c, date });
          dates.add(date);
        }
      });
    });

    return { 
      results: matches.sort((a, b) => b.date.localeCompare(a.date)), 
      highlightedDates: dates 
    };
  }, [q, mr.dateMap]);

  // Jump to specific interaction in calendar
  const handleJumpToDate = (date) => {
    const targetDate = new Date(date + "T00:00:00");
    if (targetDate.getMonth() !== currentMonth.getMonth() || targetDate.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
    }
    setSelectedDate(date);
    setIsSearchOpen(false);
  };

  return (
    <div 
      id="mr-fullscreen-modal"
      className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300"
    >
      {/* ── HEADER ── */}
      <div className="bg-gray-900 text-white px-4 h-16 flex items-center justify-between border-b border-gray-800 shadow-lg shrink-0 z-[110]">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-black shadow-lg transform rotate-3 flex-shrink-0">
            <UserRound size={20} strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black uppercase tracking-tight leading-none truncate">{mr.mrName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">{mr.lineName}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0"></span>
              <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest flex-shrink-0">{totalCalculatedVisits} Visits</span>
            </div>
          </div>
        </div>

        {/* ── SEARCH & CALENDAR CONTROLS ── */}
        <div className="flex items-center gap-2 sm:gap-6 bg-white/5 px-4 h-full">
           {/* Search Toggle */}
           <div className="flex items-center gap-2">
              {q && (
                <button 
                  onClick={() => setQ("")}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-200 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  <X size={10} strokeWidth={3}/>
                  <span className="text-[9px] font-black uppercase tracking-widest">Clear</span>
                </button>
              )}
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                  isSearchOpen ? 'bg-white text-black' : 'bg-yellow-400 text-black hover:bg-yellow-300'
                }`}
              >
                <Search size={14} strokeWidth={3} /> 
                <span className="hidden sm:inline">Search Interaction</span>
                <span className="sm:hidden">Search</span>
              </button>
           </div>

           {/* Month Navigation */}
           <div className="flex items-center gap-2 bg-black/40 rounded-xl px-2 py-1.5 border border-white/5">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:text-yellow-400 transition-colors text-white/60"><ChevronLeft size={16} strokeWidth={3}/></button>
              <span className="font-black text-[10px] uppercase tracking-widest min-w-[80px] sm:min-w-[120px] text-center text-white">
                {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:text-yellow-400 transition-colors text-white/60"><ChevronRight size={16} strokeWidth={3}/></button>
           </div>
        </div>

        <button 
          onClick={onClose}
          className="ml-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:rotate-90 active:scale-95 text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* DOCTOR INSPECTION DRAWER (Left-side Slide) */}
        <div 
          className={`
            absolute inset-y-0 left-0 w-full sm:w-[400px] bg-white shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] z-50 transform transition-transform duration-500 ease-out flex flex-col
            ${isSearchOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Search Header */}
          <div className="p-5 bg-white border-b border-gray-100 flex-none z-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-yellow-400 rounded-lg text-black">
                    <Search size={14} strokeWidth={3}/>
                 </div>
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-900">
                    Doctor Inspection
                 </h3>
              </div>
              {q && (
                <span className="text-[9px] font-black px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-md animate-pulse">
                  {results.length} matches
                </span>
              )}
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-yellow-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Name, ID or Specialty..."
                value={q}
                onChange={e => setQ(e.target.value)}
                className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl pl-12 pr-10 py-3 text-xs font-bold focus:outline-none focus:border-yellow-400 focus:bg-white transition-all"
                autoFocus
              />
              {q && (
                <button 
                  onClick={() => setQ("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full transition-colors group/clear"
                >
                  <X size={14} className="text-gray-400 group-hover/clear:text-black"/>
                </button>
              )}
            </div>
          </div>

          {/* Results Table Area */}
          <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar bg-gray-50/20">
            {q && results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                 <div className="text-3xl mb-4">🕵️‍♂️</div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching interactions</p>
              </div>
            ) : q ? (
              <div className="p-1">
                <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                  <thead className="bg-gray-50/50 sticky top-0 backdrop-blur-md z-10">
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Date</th>
                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r, i) => (
                      <tr 
                        key={i} 
                        onClick={() => handleJumpToDate(r.date)}
                        className="hover:bg-yellow-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gray-100 text-gray-400 flex items-center justify-center text-[9px] font-bold group-hover:bg-yellow-400 group-hover:text-black transition-all">
                              {r.date.split('-')[2]}
                            </div>
                            <div className="text-[10px] font-black text-gray-900">
                                {r.date.split('-').reverse().join('/')}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className={`text-[10px] font-black leading-tight truncate max-w-[150px] flex items-center gap-1.5 ${r.coached ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {r.coached && <GraduationCap size={10} className="text-yellow-600 fill-yellow-600/20" />}
                            {r.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[9px] font-bold text-gray-400">{r.specialty || 'General'}</div>
                            {r.grade && (
                               <span className="text-[8px] font-black px-1 rounded bg-gray-100 text-gray-500 uppercase">
                                 {r.grade}
                               </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                              r.type === "HCO" ? "bg-green-100 text-green-700" :
                              r.type === "Pharmacy" ? "bg-purple-100 text-purple-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {r.type}
                            </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-6 space-y-6">
                 <div className="p-6 bg-yellow-50 rounded-[32px] border border-yellow-100 relative overflow-hidden">
                    <div className="relative z-10">
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-yellow-800 mb-4 flex items-center gap-2">
                        <Clock size={14} strokeWidth={3}/> Stats
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-white p-3 rounded-2xl shadow-sm border border-yellow-200/50">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Worked</p>
                            <p className="text-xl font-black text-gray-900">{mr.workedDays}d</p>
                         </div>
                         <div className="bg-white p-3 rounded-2xl shadow-sm border border-yellow-200/50">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg</p>
                            <p className="text-xl font-black text-gray-900">{(totalCalculatedVisits / (mr.workedDays || 1)).toFixed(1)}</p>
                         </div>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                       <MapPin size={12}/> Segments
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                       {['A+', 'A', 'B', 'Coached', 'HCO', 'Pharmacy', 'Private'].map(tag => (
                         <button 
                           key={tag}
                           onClick={() => setQ(tag)}
                           className="px-3 py-1.5 rounded-xl border border-gray-100 bg-white text-[9px] font-black text-gray-600 hover:bg-gray-900 hover:border-gray-900 hover:text-white transition-all shadow-sm active:scale-95"
                         >
                           {tag}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* OVERLAY FOR DRAWER */}
        {isSearchOpen && (
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[4px] z-40 animate-in fade-in duration-500"
            onClick={() => setIsSearchOpen(false)}
          />
        )}
          
        {/* MAIN PANEL: Calendar */}
        <div className="w-full h-full overflow-y-auto bg-gray-50/30 p-2 lg:p-4 custom-scrollbar">
           <div className="max-w-7xl mx-auto">
              {/* Reuse InlineCalendar with highlight prop */}
              <div className={`transition-all duration-700 ${isSearchOpen ? "scale-[0.98] blur-[2px] opacity-40 grayscale-[0.5]" : "scale-100"}`}>
                <InlineCalendar 
                  mr={mr} 
                  targets={targets} 
                  highlightedDates={highlightedDates}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                />
              </div>
           </div>
        </div>
      </div>

      {/* ── DAY DETAIL SIDE DRAWER ── */}
      {/* Moved to root to open over everything */}
      {selectedDate && selectedDayData && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-300 z-[150]"
            onClick={() => setSelectedDate(null)}
          />
          <div 
            className="fixed top-0 right-0 h-full w-[90%] sm:w-[450px] bg-white z-[160] shadow-[-20px_0_60px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-500 flex flex-col border-l-4 border-yellow-400"
          >
             <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <DayDetailPanel 
                  date={selectedDate} 
                  dayData={selectedDayData} 
                  targets={targets} 
                  mrName={mr.mrName} 
                  onClose={() => setSelectedDate(null)} 
                />
             </div>
          </div>
        </>
      )}
    </div>
  );
}
