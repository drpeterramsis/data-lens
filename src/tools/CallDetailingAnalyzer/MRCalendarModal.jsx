import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { safeParseDate, safeFormatDate, safeGetDayName } from '../../utils/dateHelpers';

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
    const last = mr.lastDate || new Date().toISOString().split('T')[0];
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
    const next = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(next.toISOString().substring(0, 7));
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
                  const dateStr = date.toISOString().split('T')[0];
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
                        <span className={dateStr === new Date().toISOString().split('T')[0] ? "text-accent" : ""}>{date.getDate()}</span>
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
  const dayOfWeek = safeParseDate(date)?.getDay() ?? 0;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const filteredCustomers = (type) =>
    dayData.customers
      .filter(c => c.type === type)
      .filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.customerId.includes(q) ||
          c.grade.toLowerCase().includes(q) ||
          c.specialty.toLowerCase().includes(q) ||
          c.coachingType.toLowerCase().includes(q)
        );
      });

  const hcoList = filteredCustomers("HCO");
  const phList = filteredCustomers("Pharmacy");
  const hcpList = filteredCustomers("HCP");

  return (
    <div className="mt-8 border-2 border-yellow-400/30 rounded-[1.5rem] bg-white p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
            <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-lg">
              {dayNames[dayOfWeek]}
            </span>
            {safeFormatDate(date, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
            {mrName} · {dayData.hco + dayData.ph + dayData.hcp} total visits
            {dayData.coached >= 4 && " · 🎓 Coaching Session Active"}
          </p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center shadow-sm border border-gray-100"><X size={20} /></button>
      </div>

      <div className="relative mb-6">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
         <input
           type="text"
           placeholder="Search visits on this day (Name, ID, Grade, Specialty)..."
           value={search}
           onChange={e => setSearch(e.target.value)}
           className="w-full text-sm border-2 border-gray-100 bg-gray-50/50 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-yellow-400 transition-all font-medium"
         />
      </div>

      <div className="space-y-8">
        {hcoList.length > 0 && (
          <SectionTable title="🏥 HCO VISITS — AM" color="green" list={hcoList} columns={["Customer", "ID", "Grade", "Site", "Coached"]} />
        )}
        {phList.length > 0 && (
          <SectionTable title="💊 PHARMACY VISITS — AM" color="purple" list={phList} columns={["Customer", "ID", "Grade", "Coached"]} />
        )}
        {hcpList.length > 0 && (
          <SectionTable title="👨‍⚕️ HCP VISITS — PM" color="blue" list={hcpList} columns={["Customer", "ID", "Specialty", "Grade", "Coached"]} />
        )}
      </div>

      {dayData.coached >= 4 && (
        <div className="bg-yellow-400/10 border-2 border-yellow-400/20 rounded-2xl p-6 mt-8 shadow-sm">
          <div className="font-black text-xs text-yellow-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-xl">🎓</span> COACHING SESSION SUMMARY
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatsBadge label="Total Coached" value={dayData.coached} />
            <StatsBadge label="AM Coached" value={dayData.hcoCoached + dayData.phCoached} />
            <StatsBadge label="PM Coached" value={dayData.hcpCoached} />
          </div>
          <div className="text-[11px] font-black text-yellow-800 uppercase tracking-widest mb-2 opacity-60">Verified with:</div>
          <div className="flex flex-wrap gap-2">
            {dayData.customers.filter(c => c.coached).map((c, i) => (
              <span key={i} className="bg-white border border-yellow-400/30 px-3 py-1 rounded-lg text-[11px] font-bold text-yellow-700 flex items-center gap-2 shadow-sm">
                {c.type === "HCO" ? "🏥" : c.type === "Pharmacy" ? "💊" : "👨‍⚕️"} {c.name}
                <span className="opacity-40 font-black">|</span>
                <span className="text-[9px] uppercase tracking-tighter">{c.coachingType}</span>
              </span>
            ))}
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
