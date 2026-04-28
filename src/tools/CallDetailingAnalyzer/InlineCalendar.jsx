import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, ChevronLeft, ChevronRight, GraduationCap, Hospital, Pill, UserRound } from 'lucide-react';

export default function InlineCalendar({ mr, targets, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const lastDate = mr.allDates[mr.allDates.length - 1];
    return lastDate ? new Date(lastDate + "T00:00:00") : new Date();
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const getSaturdayIndex = (date) => (date.getDay() + 1) % 7;
    const startIdx = getSaturdayIndex(firstDay);

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startIdx - 1; i >= 0; i--) {
      days.push({ 
        day: prevMonthLastDay - i, 
        month: 'prev', 
        fullDate: "" 
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ 
        day: i, 
        month: 'current', 
        fullDate: dateStr,
        stats: mr.dateMap[dateStr] || null
      });
    }

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

    // We can compute filtered arrays in DayDetailPanel or here. 
    // We let DayDetailPanel handle it since it doesn't need to filter unless searching is implemented inside the panel.
    return { ...data };
  }, [selectedDate, mr.dateMap]);

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
            {daysInMonth.map((dayObj, idx) => (
               <div key={idx} onClick={() => dayObj.month === 'current' ? setSelectedDate(dayObj.fullDate) : null}>
                 <DayCell 
                   day={dayObj.day} 
                   dateStr={dayObj.fullDate} 
                   dayData={dayObj.stats} 
                   targets={targets} 
                   inMonth={dayObj.month === 'current'} 
                 />
               </div>
            ))}
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
        {selectedDate && selectedDayData && (
          <div className="bg-gray-50 p-4 border-l border-gray-100 animate-in slide-in-from-right-4 duration-300 overflow-y-auto max-h-[800px] custom-scrollbar">
             <DayDetailPanel 
               date={selectedDate} 
               dayData={selectedDayData} 
               targets={targets} 
               mrName={mr.mrName} 
               onClose={() => setSelectedDate(null)} 
             />
          </div>
        )}
      </div>
    </div>
  );
}

const DayCell = ({ day, dateStr, dayData, targets, inMonth }) => {
  if (!inMonth && !dateStr) {
    return (
      <div className="border rounded-lg p-1 min-h-[90px] bg-gray-50 border-gray-200 opacity-30">
        <span className="text-xs font-semibold text-gray-500">{day}</span>
      </div>
    );
  }

  const dow = new Date(dateStr + "T00:00:00").getDay();
  const isFriday    = dow === 5;
  const isThursday  = dow === 4;

  if (!dayData && !isFriday) return (
    <div className={`border rounded-lg p-1 min-h-[90px] bg-gray-50 border-gray-200 ${!inMonth ? "opacity-30" : ""}`}>
      <span className="text-xs font-semibold text-gray-500">
        {day}
      </span>
      {isFriday && (
        <div className="text-[9px] text-red-400 mt-1">OFF</div>
      )}
    </div>
  );

  const hcoAch = targets?.hcoPerDay && dayData?.hco ? Math.round((dayData.hco / targets.hcoPerDay) * 100) : null;
  const phAch = targets?.phPerDay && dayData?.ph ? Math.round((dayData.ph / targets.phPerDay) * 100) : null;
  const hcpAch = targets?.hcpPerDay && dayData?.hcp && !isThursday && !isFriday ? Math.round((dayData.hcp / targets.hcpPerDay) * 100) : null;

  const dayHCOTarget = isFriday ? 0 : (targets?.hcoPerDay || 0);
  const dayPHTarget  = isFriday ? 0 : (targets?.phPerDay  || 0);
  const dayHCPTarget = (isFriday || isThursday) ? 0 : (targets?.hcpPerDay || 0);

  const totalTarget = dayHCOTarget + dayPHTarget + dayHCPTarget;
  const totalDone = (dayData?.hco || 0) + (dayData?.ph  || 0) + (dayData?.hcp || 0);
  const overallAch = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : null;

  const achColor = (pct) => {
    if (pct === null) return "text-gray-400";
    if (pct >= 100) return "text-green-600";
    if (pct >= 90)  return "text-yellow-600";
    return "text-red-500";
  };

  const achBg = (pct) => {
    if (pct === null) return "";
    if (pct >= 100) return "bg-green-100";
    if (pct >= 90)  return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className={`
      border rounded-lg p-1 min-h-[90px]
      text-xs transition-all cursor-pointer
      hover:border-yellow-400
      ${isFriday ? "bg-red-50 border-red-100" : ""}
      ${isThursday ? "bg-orange-50 border-orange-100" : ""}
      ${dayData?.coached >= 4 ? "ring-1 ring-yellow-400" : ""}
      ${!inMonth ? "opacity-30" : ""}
      ${!isFriday && !isThursday && dayData ? "bg-white border-gray-200" : ""}
    `}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-bold text-gray-800">{day}</span>
        <div className="flex items-center gap-0.5">
          {dayData?.coached >= 4 && (
            <span className="text-[9px]">🎓</span>
          )}
          {overallAch !== null && (
            <span className={`text-[9px] font-bold px-1 rounded ${achBg(overallAch)} ${achColor(overallAch)}`}>
              {overallAch}%
            </span>
          )}
        </div>
      </div>

      {dayData && (
        <div className="space-y-0.5">
          {(dayData.hco > 0 || hcoAch !== null) && !isFriday && (
            <div className="flex items-center justify-between">
              <span className="text-green-700 font-medium">🏥 {dayData.hco}</span>
              {hcoAch !== null && (
                <span className={`text-[9px] font-semibold ${achColor(hcoAch)}`}>{hcoAch}%</span>
              )}
            </div>
          )}

          {(dayData.ph > 0 || phAch !== null) && !isFriday && (
            <div className="flex items-center justify-between">
              <span className="text-purple-700 font-medium">💊 {dayData.ph}</span>
              {phAch !== null && (
                <span className={`text-[9px] font-semibold ${achColor(phAch)}`}>{phAch}%</span>
              )}
            </div>
          )}

          {!isFriday && !isThursday && (dayData.hcp > 0 || hcpAch !== null) && (
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">👤 {dayData.hcp}</span>
              {hcpAch !== null && (
                <span className={`text-[9px] font-semibold ${achColor(hcpAch)}`}>{hcpAch}%</span>
              )}
            </div>
          )}

          {isThursday && dayData.hcp === 0 && (
            <div className="text-[9px] text-orange-400">PM off</div>
          )}

          <div className="text-[9px] text-gray-400 pt-0.5 border-t border-gray-100">
            {totalDone} visits
          </div>
        </div>
      )}

      {isFriday && (
        <div className="text-[9px] text-red-400 mt-1">🔴 OFF</div>
      )}
    </div>
  );
};

const DayDetailPanel = ({ date, dayData, targets, mrName, onClose }) => {
  const [openSections, setOpenSections] = useState({
    hco: false,
    ph:  false,
    hcp: false,
    coaching: false,
  });

  useEffect(() => {
    setOpenSections({ hco: false, ph: false, hcp: false, coaching: false, });
  }, [date]);

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const dow = new Date(date + "T00:00:00").getDay();
  const isThursday = dow === 4;
  const isFriday   = dow === 5;
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const calcAch = (done, target) => target ? Math.round((done/target)*100) : null;
  const hcoAch = calcAch(dayData.hco, targets?.hcoPerDay);
  const phAch  = calcAch(dayData.ph,  targets?.phPerDay);
  const hcpAch = (!isThursday && !isFriday) ? calcAch(dayData.hcp, targets?.hcpPerDay) : null;

  const totalDone = dayData.hco + dayData.ph + dayData.hcp;
  const totalTarget = (targets?.hcoPerDay || 0) + (targets?.phPerDay  || 0) + (!isThursday && !isFriday ? (targets?.hcpPerDay || 0) : 0);
  const overallAch = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : null;

  const achColor = (pct) => pct === null ? "text-gray-500" : pct >= 100 ? "text-green-700" : pct >= 90 ? "text-yellow-600" : "text-red-600";
  const achIcon = (pct) => pct === null ? "" : pct >= 100 ? "✅" : pct >= 90 ? "🟡" : "🔴";

  const hcoCustomers = dayData.customers.filter(c => c.type === "HCO");
  const phCustomers  = dayData.customers.filter(c => c.type === "Pharmacy");
  const hcpCustomers = dayData.customers.filter(c => c.type === "HCP");
  const coachedList  = dayData.customers.filter(c => c.coached);

  return (
    <div className="mt-4 border border-yellow-200 rounded-2xl bg-white shadow-sm overflow-hidden mb-8">
      <div className="flex items-center justify-between px-4 py-3 bg-yellow-50 border-b border-yellow-100">
        <div>
          <h3 className="font-bold text-gray-900">
            📅 {dayNames[dow]}, {new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", })}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mrName} · {totalDone} visits
            {overallAch !== null && (
              <span className={`ml-2 font-bold ${achColor(overallAch)}`}>
                Overall: {overallAch}% {achIcon(overallAch)}
              </span>
            )}
            {dayData.coached >= 4 && " · 🎓 Coaching Day"}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
      </div>

      <div className="p-4 space-y-2">
        {!isFriday && (
          <CollapsibleTypeSection
            isOpen={openSections.hco}
            onToggle={() => toggleSection("hco")}
            icon="🏥" label="HCO" session="AM — Sat to Thu"
            count={dayData.hco} target={targets?.hcoPerDay} ach={hcoAch} customers={hcoCustomers} isOff={false} showSpecialty={false}
          />
        )}
        {!isFriday && (
          <CollapsibleTypeSection
            isOpen={openSections.ph}
            onToggle={() => toggleSection("ph")}
            icon="💊" label="Pharmacy" session="AM — Sat to Thu"
            count={dayData.ph} target={targets?.phPerDay} ach={phAch} customers={phCustomers} isOff={false} showSpecialty={false}
          />
        )}
        {isFriday ? null : isThursday ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span>👤</span><span className="font-semibold text-sm text-orange-700">HCP</span>
              <span className="text-xs text-orange-500">PM — Thursday PM is OFF</span>
            </div>
          </div>
        ) : (
          <CollapsibleTypeSection
            isOpen={openSections.hcp}
            onToggle={() => toggleSection("hcp")}
            icon="👤" label="HCP" session="PM — Sat to Wed"
            count={dayData.hcp} target={targets?.hcpPerDay} ach={hcpAch} customers={hcpCustomers} isOff={false} showSpecialty={true}
          />
        )}
        {isFriday && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center">
            <span className="text-red-500 font-semibold">🔴 Friday — Full Off Day</span>
          </div>
        )}
        {coachedList.length > 0 && (
          <CollapsibleCoachingSection isOpen={openSections.coaching} onToggle={() => toggleSection("coaching")} coachedList={coachedList} dayData={dayData} />
        )}
      </div>
    </div>
  );
};

const CollapsibleTypeSection = ({ isOpen, onToggle, icon, label, session, count, target, ach, customers, isOff, showSpecialty }) => {
  const achColor = (pct) => pct === null ? "text-gray-500" : pct >= 100 ? "text-green-700" : pct >= 90 ? "text-yellow-600" : "text-red-600";
  const sectionBg = (pct) => pct === null ? "bg-gray-50 border-gray-200" : pct >= 100 ? "bg-green-50 border-green-200" : pct >= 90 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  if (isOff) return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
      {icon} {label} — {session} OFF
    </div>
  );

  return (
    <div className={`rounded-xl border overflow-hidden ${sectionBg(ach)}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-sm hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="font-bold text-gray-800">{label}</span>
          <span className="text-xs text-gray-500">{session}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-800">{count} visits</span>
          {ach !== null && target && <span className={`text-xs font-bold ${achColor(ach)}`}>{ach}% of {target} target</span>}
          <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 bg-white">
          {customers.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 text-center">No visits recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 font-semibold text-gray-600">Customer</th>
                    <th className="p-2 font-semibold text-gray-600">ID</th>
                    {showSpecialty && <th className="p-2 font-semibold text-gray-600">Specialty</th>}
                    <th className="p-2 font-semibold text-gray-600 text-center">Grade</th>
                    <th className="p-2 font-semibold text-gray-600">Site</th>
                    <th className="p-2 font-semibold text-gray-600 text-center">Coached</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={i} className={`border-t ${c.coached ? "bg-yellow-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="p-2 font-medium text-gray-800">{c.name || "—"}</td>
                      <td className="p-2 text-gray-500">{c.customerId || "—"}</td>
                      {showSpecialty && <td className="p-2 text-gray-500">{c.specialty || "—"}</td>}
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.grade === "A+" ? "bg-yellow-100 text-yellow-800" : c.grade === "A" ? "bg-green-100 text-green-800" : c.grade === "B" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                          {c.grade || "—"}
                        </span>
                      </td>
                      <td className="p-2 text-gray-500 text-[10px] max-w-[80px] truncate">{c.site || "—"}</td>
                      <td className="p-2 text-center">
                        {c.coached ? <span className="text-yellow-700 font-semibold text-[10px]">🎓 Yes</span> : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CollapsibleCoachingSection = ({ isOpen, onToggle, coachedList, dayData }) => {
  const [typeFilter, setTypeFilter] = useState("All");
  const types = ["All", "HCO", "Pharmacy", "HCP"];
  const filtered = typeFilter === "All" ? coachedList : coachedList.filter(c => c.type === typeFilter);

  // Filter resets to "All" when new day selected handled by DayDetailPanel remounting or effect? 
  // Wait, it is inside DayDetailPanel which mounts per day if day changes? No, SelectedDate might just change state. Use effect to reset.
  useEffect(() => { setTypeFilter("All"); }, [dayData]);

  return (
    <div className="rounded-xl border border-yellow-300 overflow-hidden bg-yellow-50">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-yellow-100 transition-colors">
        <div className="flex items-center gap-2">
          <span>🎓</span>
          <span className="font-bold text-yellow-800">Coaching Sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">{coachedList.length} coached</span>
          <span className="text-yellow-700 text-xs">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-yellow-200 bg-white">
          <div className="flex gap-1.5 flex-wrap p-3 border-b border-gray-100">
            {types.map(t => {
              const cnt = t === "All" ? coachedList.length : coachedList.filter(c => c.type === t).length;
              return (
                <button key={t} onClick={() => setTypeFilter(t)} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${typeFilter === t ? "bg-yellow-400 border-yellow-400 font-bold text-gray-900" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  {t === "HCO" ? "🏥 HCO" : t === "Pharmacy" ? "💊 Pharmacy" : t === "HCP" ? "👤 HCP" : "All"} <span className="opacity-70">({cnt})</span>
                </button>
              );
            })}
          </div>
          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 p-4 text-center">No {typeFilter} coached visits</p>
            ) : (
              filtered.map((c, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-yellow-50 transition-colors">
                  <div className="text-base mt-0.5">{c.type === "HCO" ? "🏥" : c.type === "Pharmacy" ? "💊" : "👤"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800 truncate">{c.name || "—"}</div>
                    <div className="text-xs text-gray-500 flex gap-2 flex-wrap mt-0.5 items-center">
                      <span>{c.type}</span>
                      {c.grade && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.grade === "A+" ? "bg-yellow-100 text-yellow-800" : c.grade === "A" ? "bg-green-100 text-green-800" : c.grade === "B" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>{c.grade}</span>}
                      {c.specialty && <span className="truncate max-w-[100px]">{c.specialty}</span>}
                    </div>
                    {c.coachingType && <div className="text-[10px] text-yellow-700 mt-0.5">Coach: {c.coachingType}</div>}
                    {c.site && <div className="text-[10px] text-gray-400 mt-0.5 truncate">📍 {c.site}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
            <div className="flex gap-4 text-xs text-yellow-800 font-medium">
              <span>🏥 HCO: {coachedList.filter(c => c.type === "HCO").length}</span>
              <span>💊 PH: {coachedList.filter(c => c.type === "Pharmacy").length}</span>
              <span>👤 HCP: {coachedList.filter(c => c.type === "HCP").length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
