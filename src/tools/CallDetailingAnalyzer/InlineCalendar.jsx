import React, { useState, useMemo } from 'react';
import { X, Search, ChevronLeft, ChevronRight, GraduationCap, Hospital, Pill, UserRound } from 'lucide-react';
import { safeFormatDate, safeGetDayName } from '../../utils/dateHelpers';

export default function InlineCalendar({ mr, targets, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const lastDate = mr.allDates[mr.allDates.length - 1];
    return lastDate ? new Date(lastDate + "T00:00:00") : new Date();
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailSearch, setDetailSearch] = useState("");

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Week starts Saturday (0=Sun, 1=Mon, ..., 6=Sat)
    // Target order: Sat(6), Sun(0), Mon(1), Tue(2), Wed(3), Thu(4), Fri(5)
    const startOffset = (firstDay.getDay() + 1) % 7; // Map Sun(0)->1, Sat(6)->0
    
    // Actually, simple way: 
    // Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6
    const getSaturdayIndex = (date) => (date.getDay() + 1) % 7;
    const startIdx = getSaturdayIndex(firstDay);

    const days = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startIdx - 1; i >= 0; i--) {
      days.push({ 
        day: prevMonthLastDay - i, 
        month: 'prev', 
        fullDate: "" 
      });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ 
        day: i, 
        month: 'current', 
        fullDate: dateStr,
        stats: mr.dateMap[dateStr] || null
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: 'next', fullDate: "" });
    }

    return days;
  }, [currentMonth, mr.dateMap]);

  const changeMonth = (offset) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDate(null);
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const data = mr.dateMap[selectedDate];
    if (!data) return null;

    let hco = data.customers.filter(c => c.type === "HCO");
    let ph = data.customers.filter(c => c.type === "Pharmacy");
    let hcp = data.customers.filter(c => c.type === "HCP");

    if (detailSearch.trim()) {
      const q = detailSearch.toLowerCase();
      const filterFn = (c) => 
        c.name.toLowerCase().includes(q) || 
        c.customerId.toLowerCase().includes(q) || 
        c.grade.toLowerCase().includes(q) || 
        c.specialty.toLowerCase().includes(q) || 
        c.coachingType.toLowerCase().includes(q);
      
      hco = hco.filter(filterFn);
      ph = ph.filter(filterFn);
      hcp = hcp.filter(filterFn);
    }

    return { ...data, hco, ph, hcp };
  }, [selectedDate, mr.dateMap, detailSearch]);

  const isFri = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr + "T00:00:00").getDay() === 5;
  };
  const isThu = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr + "T00:00:00").getDay() === 4;
  };

  return (
    <div id="inline-calendar-section" className="bg-white border-2 border-accent/20 rounded-3xl shadow-2xl overflow-hidden mt-8 mb-12 scroll-mt-24">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black font-black">
            {mr.mrName.substring(0,2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-black text-lg leading-tight uppercase tracking-tight">{mr.mrName} — Activity Calendar</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{mr.lineName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
              <button onClick={() => changeMonth(-1)} className="hover:text-accent transition-colors"><ChevronLeft size={18}/></button>
              <span className="font-black text-sm uppercase tracking-widest min-w-[120px] text-center">
                {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="hover:text-accent transition-colors"><ChevronRight size={18}/></button>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
             <X size={20}/>
           </button>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ${selectedDate ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Calendar Grid */}
        <div className={`p-4 ${selectedDate ? 'lg:col-span-2 border-r border-gray-100' : ''}`}>
          <div className="grid grid-cols-7 gap-1">
            {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
              <div key={d} className="text-center py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {d}
              </div>
            ))}
            {daysInMonth.map((day, idx) => {
              const hasVisits = day.stats && (day.stats.hco > 0 || day.stats.ph > 0 || day.stats.hcp > 0);
              const isCoaching = day.stats && day.stats.coached >= 4;
              const isToday = day.fullDate === new Date().toISOString().split("T")[0];
              const isFriday = isFri(day.fullDate);
              const isThursday = isThu(day.fullDate);
              const isSelected = selectedDate === day.fullDate;
              
              let bgClass = "bg-white";
              let borderClass = "border-gray-100";
              if (day.month !== 'current') {
                bgClass = "bg-gray-50/50";
                borderClass = "border-transparent opacity-30";
              } else if (isFriday) {
                bgClass = "bg-red-50";
                borderClass = "border-red-100";
              } else if (isThursday) {
                 bgClass = "bg-orange-50";
                 borderClass = "border-orange-100 font-bold";
              } else if (!hasVisits) {
                bgClass = "bg-gray-50/50";
              }

              return (
                <button
                  key={idx}
                  disabled={day.month !== 'current'}
                  onClick={() => setSelectedDate(day.fullDate)}
                  className={`relative min-h-[90px] p-2 border-2 transition-all rounded-xl text-left flex flex-col gap-1 group
                    ${bgClass} ${borderClass}
                    ${day.month === 'current' ? 'hover:border-accent hover:shadow-md cursor-pointer' : 'cursor-default'}
                    ${isSelected ? 'border-accent ring-2 ring-accent/20 bg-accent/5' : ''}
                    ${isCoaching ? 'ring-2 ring-yellow-400' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-black ${day.month === 'current' ? 'text-gray-900' : 'text-gray-300'}`}>
                      {day.day}
                    </span>
                    {isCoaching && <GraduationCap size={14} className="text-yellow-600" />}
                  </div>

                  {day.month === 'current' && hasVisits && (
                    <div className="space-y-0.5 mt-auto">
                      {day.stats.hco > 0 && (
                        <div className="text-[9px] font-black text-green-700 bg-green-100 px-1 rounded flex justify-between">
                          <span>HCO</span>
                          <span>{day.stats.hco}</span>
                        </div>
                      )}
                      {day.stats.ph > 0 && (
                        <div className="text-[9px] font-black text-purple-700 bg-purple-100 px-1 rounded flex justify-between">
                          <span>PH</span>
                          <span>{day.stats.ph}</span>
                        </div>
                      )}
                      {day.stats.hcp > 0 && (
                        <div className="text-[9px] font-black text-blue-700 bg-blue-100 px-1 rounded flex justify-between">
                          <span>HCP</span>
                          <span>{day.stats.hcp}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isFriday && day.month === 'current' && (
                    <div className="mt-auto text-[10px] font-black text-red-400 uppercase tracking-tighter text-center">OFF</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Monthly Summary */}
          <div className="mt-6 flex flex-wrap gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-black">🏥</div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">HCO Total</p>
                   <p className="text-sm font-black text-gray-900">{mr.totalHCO} <span className="text-[10px] text-gray-400 font-bold">({mr.hcoRate}/d)</span></p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black">💊</div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">PH Total</p>
                   <p className="text-sm font-black text-gray-900">{mr.totalPH} <span className="text-[10px] text-gray-400 font-bold">({mr.phRate}/d)</span></p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black">👨‍⚕️</div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">HCP Total</p>
                   <p className="text-sm font-black text-gray-900">{mr.totalHCP} <span className="text-[10px] text-gray-400 font-bold">({mr.hcpRate}/d)</span></p>
                </div>
             </div>
             <div className="flex items-center gap-2 ml-auto">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-black">🎓</div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Coaching</p>
                   <p className="text-sm font-black text-gray-900">{mr.coachingDays} <span className="text-[10px] text-gray-400 font-bold">days</span></p>
                </div>
             </div>
          </div>
        </div>

        {/* Day Detail Panel */}
        {selectedDate && (
          <div className="bg-gray-50 p-4 border-l border-gray-100 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-black text-gray-900 uppercase tracking-tight">{safeFormatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                <div className="flex gap-1 mt-1">
                   {isThu(selectedDate) && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded uppercase">AM ONLY</span>}
                   {isFri(selectedDate) && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded uppercase">FULL OFF</span>}
                   {selectedDayData?.coached >= 4 && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-black rounded uppercase">🎓 Coaching Day</span>}
                </div>
              </div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"
              >
                <X size={16}/>
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search visits this day..."
                value={detailSearch}
                onChange={e => setDetailSearch(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-accent bg-white shadow-sm"
              />
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
               {/* HCO Section */}
               <DetailSection 
                  title="HCO — AM" 
                  count={selectedDayData?.hco.length || 0}
                  icon={<Hospital size={14} />} 
                  color="green" 
                  visits={selectedDayData?.hco}
                  disabled={isFri(selectedDate)}
               />
               
               {/* Pharmacy Section */}
               <DetailSection 
                  title="Pharmacy — AM" 
                  count={selectedDayData?.ph.length || 0}
                  icon={<Pill size={14} />} 
                  color="purple" 
                  visits={selectedDayData?.ph}
                  disabled={isFri(selectedDate)}
               />

               {/* HCP Section */}
               <DetailSection 
                  title="HCP — PM" 
                  count={selectedDayData?.hcp.length || 0}
                  icon={<UserRound size={14} />} 
                  color="blue" 
                  visits={selectedDayData?.hcp}
                  disabled={isFri(selectedDate) || isThu(selectedDate)}
                  disabledLabel={isThu(selectedDate) ? "🚫 Thursday PM — HCP Off" : "🔴 Friday — Full Off Day"}
               />

               {/* Coaching Summary */}
               {selectedDayData?.coached > 0 && (
                 <div className="bg-yellow-400/10 rounded-2xl p-4 border border-yellow-400/20 shadow-sm">
                    <h5 className="text-[10px] font-black text-yellow-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <GraduationCap size={14}/> COACHING SUMMARY
                    </h5>
                    <p className="text-xs font-bold text-yellow-700 mb-2">Total coached: {selectedDayData.coached}</p>
                    <div className="space-y-1">
                       {selectedDayData.customers.filter(c => c.coached).map((c, i) => (
                         <div key={i} className="text-[10px] text-yellow-800 flex items-start gap-1">
                           <span className="shrink-0">•</span>
                           <span><span className="font-bold">{c.name}</span> ({c.type}) {c.coachingType}</span>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, count, icon, color, visits, disabled, disabledLabel }) {
  const colors = {
    green: "text-green-700 bg-green-50 border-green-100",
    purple: "text-purple-700 bg-purple-50 border-purple-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    gray: "text-gray-400 bg-gray-50 border-gray-100"
  };

  if (disabled) {
    return (
      <div className="opacity-50 grayscale">
        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</h5>
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 text-center text-[10px] font-bold text-gray-500 italic">
           {disabledLabel || "Section Disabled"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          {icon} {title}
        </h5>
        <span className="text-[10px] font-black text-gray-400">({count} visits)</span>
      </div>
      
      {visits && visits.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
           <table className="w-full text-left text-[10px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                 <tr>
                    <th className="px-3 py-2 font-black text-gray-400 uppercase tracking-tight">Name</th>
                    {title.includes("HCP") && <th className="px-3 py-2 font-black text-gray-400 uppercase tracking-tight">Specialty</th>}
                    <th className="px-3 py-2 font-black text-gray-400 uppercase tracking-tight w-12 text-center">Grade</th>
                    <th className="px-3 py-2 font-black text-gray-400 uppercase tracking-tight w-8 text-center">🎓</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {visits.map((v, i) => (
                    <tr key={i} className={`hover:bg-gray-50 transition-colors ${v.coached ? 'bg-yellow-50/50' : ''}`}>
                       <td className="px-3 py-2 font-bold text-gray-800 leading-tight">{v.name}</td>
                       {title.includes("HCP") && <td className="px-3 py-2 font-medium text-gray-500">{v.specialty || '—'}</td>}
                       <td className="px-3 py-2 font-black text-gray-400 text-center">{v.grade || '—'}</td>
                       <td className="px-3 py-2 text-center">
                          {v.coached && <span className="text-yellow-600">🎓</span>}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="p-3 bg-white border border-gray-100 rounded-2xl text-center text-[10px] font-bold text-gray-300 italic">
           No visits recorded
        </div>
      )}
    </div>
  );
}
