import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getRateStatus } from '../../utils/mrCalculations';

const DAY_HEADERS = [
  { key: 6, label: "Sat" },
  { key: 0, label: "Sun" },
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu", note: "AM only" },
  { key: 5, label: "Fri", note: "OFF" },
];

const MRCalendarModal = ({ mr, targets, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const last = mr.lastDate || todayStr;
    return last.substring(0, 7); // YYYY-MM
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const calendarWeeks = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Start from the nearest Saturday before or on the 1st
    const startDate = new Date(firstDay);
    while (startDate.getDay() !== 6) {
      startDate.setDate(startDate.getDate() - 1);
    }

    const weeks = [];
    let curr = new Date(startDate);

    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        week.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
      weeks.push(week);
      // Stop if the whole week is in the next month
      if (week[6] > lastDay && i >= 3) break;
    }
    return weeks;
  }, [currentMonth]);

  const changeMonth = (dir) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const nextY = m - 1 + dir > 11 ? y + 1 : m - 1 + dir < 0 ? y - 1 : y;
    const nextM = (m - 1 + dir + 12) % 12;
    const moStr = String(nextM + 1).padStart(2, '0');
    setCurrentMonth(`${nextY}-${moStr}`);
    setSelectedDate(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">📅 {mr.mrName}</h2>
            <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mt-1">Activity Intelligence Calendar</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><ChevronLeft size={18} /></button>
              <span className="px-4 text-sm font-black uppercase tracking-widest">
                {safeFormatDate(currentMonth + "-01", { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded transition-colors"><ChevronRight size={18} /></button>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors flex items-center shadow-sm bg-white"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAY_HEADERS.map(h => (
              <div key={h.key} className="text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h.label}</div>
                {h.note && <div className="text-[8px] font-bold text-gray-300 uppercase">{h.note}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarWeeks.map((week, wi) => (
              <React.Fragment key={wi}>
                {week.map((date, di) => {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const d = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;

                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                  const isCurrentMonth = dateStr.startsWith(currentMonth);
                  const dayData = mr.dateMap[dateStr];
                  const isFriday = date.getDay() === 5;
                  const isThursday = date.getDay() === 4;
                  const isCoachingDay = dayData?.coached >= 4;

                  const hcoAch = targets?.hcoPerDay && dayData?.hco ? Math.round(dayData.hco / targets.hcoPerDay * 100) : null;
                  const phAch = targets?.phPerDay && dayData?.ph ? Math.round(dayData.ph / targets.phPerDay * 100) : null;
                  const hcpAch = targets?.hcpPerDay && dayData?.hcp ? Math.round(dayData.hcp / targets.hcpPerDay * 100) : null;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                      className={`
                        border rounded-xl p-2 cursor-pointer min-h-[100px] text-xs transition-all flex flex-col relative
                        hover:border-yellow-400 hover:shadow-sm
                        ${isFriday ? "bg-red-50/30" : ""}
                        ${isThursday ? "bg-orange-50/30" : ""}
                        ${isCoachingDay ? "ring-2 ring-yellow-400 ring-offset-1" : ""}
                        ${selectedDate === dateStr ? "border-yellow-500 bg-yellow-50 shadow-inner" : "border-gray-200 bg-white"}
                        ${!isCurrentMonth ? "opacity-20 pointer-events-none" : ""}
                        ${!dayData && isCurrentMonth ? "grayscale-[0.5]" : ""}
                      `}
                    >
                      <div className="font-black text-gray-400 flex justify-between items-start">
                        <span className={dateStr === todayStr ? "text-accent" : ""}>{date.getDate()}</span>
                        {isCoachingDay && <span className="text-yellow-600" title="Coaching Day">🎓</span>}
                      </div>

                      {dayData && (
                        <div className="mt-2 space-y-1">
                          {dayData.hco > 0 && (
                            <div className="flex justify-between items-center bg-green-50 px-1 rounded">
                              <span className="text-green-700 font-bold">🏥 {dayData.hco}</span>
                              {hcoAch !== null && <span className={`text-[8px] font-black ${hcoAch >= 100 ? "text-green-600" : hcoAch >= 75 ? "text-yellow-600" : "text-red-500"}`}>{hcoAch}%</span>}
                            </div>
                          )}
                          {dayData.ph > 0 && (
                            <div className="flex justify-between items-center bg-purple-50 px-1 rounded">
                              <span className="text-purple-700 font-bold">💊 {dayData.ph}</span>
                              {phAch !== null && <span className={`text-[8px] font-black ${phAch >= 100 ? "text-green-600" : phAch >= 75 ? "text-yellow-600" : "text-red-500"}`}>{phAch}%</span>}
                            </div>
                          )}
                          {dayData.hcp > 0 && (
                            <div className="flex justify-between items-center bg-blue-50 px-1 rounded">
                              <span className="text-blue-700 font-bold">👨‍⚕️ {dayData.hcp}</span>
                              {hcpAch !== null && <span className={`text-[8px] font-black ${hcpAch >= 100 ? "text-green-600" : hcpAch >= 75 ? "text-yellow-600" : "text-red-500"}`}>{hcpAch}%</span>}
                            </div>
                          )}
                          <div className="mt-1 pt-1 border-t border-gray-100 text-[9px] font-bold text-gray-400 uppercase text-center">
                            {dayData.hco + dayData.ph + dayData.hcp} Visits
                          </div>
                        </div>
                      )}
                      {isFriday && isCurrentMonth && !dayData && (
                        <div className="flex-1 flex items-center justify-center text-red-300 font-black text-[10px] uppercase tracking-widest opacity-40">OFF</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {selectedDate && mr.dateMap[selectedDate] && (
            <DayDetailPanel
              date={selectedDate}
              dayData={mr.dateMap[selectedDate]}
              targets={targets}
              mrName={mr.mrName}
              onClose={() => setSelectedDate(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const DayDetailPanel = ({ date, dayData, targets, mrName, onClose }) => {
  const [search, setSearch] = useState("");
  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const filteredCustomers = (type) => {
    return (dayData.customers || []).filter(c => {
      if (c.type !== type) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.customerId || "").toLowerCase().includes(q) ||
        (c.specialty || "").toLowerCase().includes(q) ||
        (c.site || "").toLowerCase().includes(q)
      );
    });
  };

  const TypeSection = ({ icon, label, session, count, target, customers, isOff = false }) => {
    const [open, setOpen] = useState(false);

    if (isOff) return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-2 text-xs text-gray-400 opacity-60">
        {icon} <span className="font-bold">{label}</span> — {session} OFF
      </div>
    );

    const pct = target ? Math.round((count / target) * 100) : null;
    const { color, icon: statusIcon, bg, status } = getRateStatus(count, target);

    return (
      <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between px-4 py-4 text-xs transition-colors ${status === 'green' ? 'bg-green-50/50 hover:bg-green-100/50' : status === 'yellow' ? 'bg-yellow-50/50 hover:bg-yellow-100/50' : 'bg-red-50/50 hover:bg-red-100/50'}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <div className="text-left">
              <span className="font-black text-gray-900 block">{label}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{session}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className={`font-black block text-sm ${color}`}>{count} Visits</span>
              {target && (
                <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>
                  {statusIcon} {pct}% of {target}
                </span>
              )}
            </div>
            <span className="text-gray-400 font-bold w-4 h-4 flex items-center justify-center bg-white rounded-full border border-gray-100">
              {open ? "▲" : "▼"}
            </span>
          </div>
        </button>

        {open && (
          <div className="border-t border-gray-100 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-gray-50/50">
                  <tr className="uppercase font-black text-gray-400 tracking-tighter border-b border-gray-100">
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">ID</th>
                    {label === "HCP" && <th className="px-4 py-2">Specialty</th>}
                    <th className="px-4 py-2">Grade</th>
                    <th className="px-4 py-2">Site</th>
                    <th className="px-4 py-2">Coached</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map((c, i) => (
                    <tr key={i} className={c.coached ? "bg-yellow-50/70" : ""}>
                      <td className="px-4 py-3 font-black text-gray-800">{c.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-400 font-bold">{c.customerId}</td>
                      {label === "HCP" && <td className="px-4 py-3 text-gray-500 font-medium">{c.specialty || "—"}</td>}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          c.grade === "A+" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                          c.grade === "A" ? "bg-green-100 text-green-800 border border-green-200" :
                          c.grade === "B" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                          "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}>
                          {c.grade || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate" title={c.site}>{c.site || "—"}</td>
                      <td className="px-4 py-3">
                        {c.coached ? <span className="text-yellow-700 font-black flex items-center gap-1">🎓 <span className="uppercase tracking-tighter">YES</span></span> : <span className="text-gray-200 opacity-30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8 border-2 border-yellow-400/30 rounded-[2rem] bg-white p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <span className="bg-yellow-400 text-gray-900 px-4 py-1.5 rounded-xl text-lg">
              {dayNames[dayOfWeek]}
            </span>
            {safeFormatDate(date, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {mrName} · {dayData.hco + dayData.ph + dayData.hcp} total visits
            </p>
            {dayData.coached >= 4 && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-yellow-200">
                🎓 Coaching Day
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center shadow-sm border border-gray-100"><X size={20} /></button>
      </div>

      <div className="relative mb-8">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
         <input
           type="text"
           placeholder="Search visits, specialties, or customers..."
           value={search}
           onChange={e => setSearch(e.target.value)}
           className="w-full text-sm border-2 border-gray-100 bg-gray-50/50 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-yellow-400 transition-all font-bold placeholder:text-gray-300 shadow-inner"
         />
      </div>

      <div className="space-y-4">
        <TypeSection 
          icon="🏥" 
          label="HCO" 
          session="AM" 
          count={dayData.hco} 
          target={targets?.hcoPerDay} 
          customers={filteredCustomers("HCO")} 
        />
        <TypeSection 
          icon="💊" 
          label="Pharmacy" 
          session="AM" 
          count={dayData.ph} 
          target={targets?.phPerDay} 
          customers={filteredCustomers("Pharmacy")} 
        />
        <TypeSection 
          icon="👨‍⚕️" 
          label="HCP" 
          session="PM" 
          count={dayData.hcp} 
          target={targets?.hcpPerDay} 
          customers={filteredCustomers("HCP")}
          isOff={dayOfWeek === 4} 
        />
      </div>

      {dayData.coached >= 4 && (
        <div className="bg-yellow-400/5 mt-10 rounded-3xl p-8 border-2 border-dashed border-yellow-400/20">
           <h4 className="font-black text-xs text-yellow-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
             <span className="text-xl">🎓</span> Feedback Summary
           </h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-2xl border border-yellow-400/10 shadow-sm flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center font-black text-lg">{dayData.coached}</div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observations</p>
                  <p className="text-xs font-bold text-gray-700">Total Coached</p>
               </div>
             </div>
             <div className="bg-white p-4 rounded-2xl border border-yellow-400/10 shadow-sm flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-green-400 flex items-center justify-center font-black text-lg text-white">{dayData.hcoCoached + dayData.phCoached}</div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Morning</p>
                  <p className="text-xs font-bold text-gray-700">HCO/PH Focus</p>
               </div>
             </div>
             <div className="bg-white p-4 rounded-2xl border border-yellow-400/10 shadow-sm flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center font-black text-lg text-white">{dayData.hcpCoached}</div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Evening</p>
                  <p className="text-xs font-bold text-gray-700">HCP Field Focus</p>
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SectionTable = ({ title, color, list, columns }) => {
  const colorMap = {
    green: "text-green-700 bg-green-50",
    purple: "text-purple-700 bg-purple-50",
    blue: "text-blue-700 bg-blue-50"
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className={`text-[10px] font-black uppercase tracking-widest ${colorMap[color]} px-3 py-1 rounded-md inline-block mb-3 border border-current/10`}>
        {title} ({list.length})
      </div>
      <div className="bg-white rounded-2xl border-2 border-gray-50 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter">Customer</th>
              <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter">ID</th>
              {columns.includes("Specialty") && <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter">Specialty</th>}
              <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter">Grade</th>
              {columns.includes("Site") && <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter">Site</th>}
              <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter">Coached</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map((c, i) => (
              <tr key={i} className={c.coached ? "bg-yellow-400/5" : "hover:bg-gray-50/50 transition-colors"}>
                <td className="px-4 py-3 font-black text-gray-800">{c.name || "—"}</td>
                <td className="px-4 py-3 text-gray-500 font-bold">{c.customerId}</td>
                {columns.includes("Specialty") && <td className="px-4 py-3 text-gray-500">{c.specialty || "—"}</td>}
                <td className="px-4 py-3">
                   <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                     c.grade === "A+" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                     c.grade === "A" ? "bg-green-100 text-green-800 border border-green-200" :
                     c.grade === "B" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                     "bg-gray-100 text-gray-600 border border-gray-200"
                   }`}>
                     {c.grade || "—"}
                   </span>
                </td>
                {columns.includes("Site") && <td className="px-4 py-3 text-gray-500 truncate max-w-[150px] font-medium" title={c.site}>{c.site || "—"}</td>}
                <td className="px-4 py-3">
                  {c.coached ? (
                    <div className="flex flex-col">
                      <span className="text-yellow-700 font-black text-[10px] uppercase">🎓 Coached</span>
                      <span className="text-[9px] text-yellow-600 font-bold italic uppercase tracking-tighter">{c.coachingType}</span>
                    </div>
                  ) : <span className="text-gray-300 font-black opacity-20">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatsBadge = ({ label, value }) => (
  <div className="bg-white rounded-xl p-3 border-2 border-yellow-400/10 text-center">
    <div className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</div>
    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
  </div>
);

export default MRCalendarModal;
