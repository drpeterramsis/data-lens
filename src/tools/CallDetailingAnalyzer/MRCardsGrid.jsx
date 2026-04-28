import React, { useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import MRCalendarModal from './MRCalendarModal';
import { safeFormatDate } from '../../utils/dateHelpers';

const MRCardSearch = ({ mr }) => {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const query = q.toLowerCase();

    const matches = [];
    Object.entries(mr.dateMap).forEach(([date, day]) => {
      day.customers.forEach(c => {
        if (
          c.name.toLowerCase().includes(query) ||
          c.customerId.includes(query) ||
          c.type.toLowerCase().includes(query) ||
          c.grade.toLowerCase().includes(query) ||
          c.specialty.toLowerCase().includes(query) ||
          c.coachingType.toLowerCase().includes(query) ||
          c.site.toLowerCase().includes(query)
        ) {
          matches.push({ ...c, date });
        }
      });
    });

    return matches.sort((a, b) => a.date.localeCompare(b.date));
  }, [q, mr.dateMap]);

  return (
    <div className="mt-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          type="text"
          placeholder="🔍 Search visits for this MR..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full text-[11px] font-medium border-2 border-gray-100 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-yellow-400 transition-all bg-gray-50/50"
        />
      </div>

      {q && (
        <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between px-1">
          <span>{results.length} results found</span>
          {results.length > 0 && <button onClick={() => setQ("")} className="hover:text-red-500">Clear</button>}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-inner">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter">Date</th>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter">Name</th>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter">Type</th>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter">Coach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((r, i) => (
                <tr key={i} className={`hover:bg-gray-50/50 ${r.coached ? "bg-yellow-50" : ""}`}>
                  <td className="p-2 font-bold text-gray-500 whitespace-nowrap">{r.date}</td>
                  <td className="p-2 font-black text-gray-800">{r.name}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded-full font-black text-[9px] ${
                      r.type === "HCO" ? "bg-green-100 text-green-700" :
                      r.type === "Pharmacy" ? "bg-purple-100 text-purple-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="p-2 font-bold text-yellow-700">
                    {r.coached ? "🎓 Yes" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

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

      return { ...mr, overallAch };
    });

    if (sortBy === 'performance') parsed.sort((a,b) => b.overallAch - a.overallAch);
    else if (sortBy === 'asc') parsed.sort((a,b) => a.mrName.localeCompare(b.mrName));
    else if (sortBy === 'hcp') parsed.sort((a,b) => b.hcpRate - a.hcpRate);
    else if (sortBy === 'hco') parsed.sort((a,b) => b.hcoRate - a.hcoRate);
    else if (sortBy === 'ph') parsed.sort((a,b) => b.phRate - a.phRate);
    else if (sortBy === 'coaching') parsed.sort((a,b) => b.coachingDays - a.coachingDays);

    return parsed;
  }, [mrStats, targets, sortBy]);

  const toggleMR = (mrName) => {
    setExpandedMRs(prev => ({
      ...prev,
      [mrName]: !prev[mrName],
    }));
  };

  const collapseAll = () => setExpandedMRs({});
  const expandAll = () => {
    const all = {};
    sortedStats.forEach(mr => { all[mr.mrName] = true; });
    setExpandedMRs(all);
  };

  if (!sortedStats.length) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'performance', label: 'Perf ▼' },
            { id: 'asc', label: 'A→Z' },
            { id: 'hcp', label: 'HCP' },
            { id: 'hco', label: 'HCO' },
            { id: 'ph', label: 'PH' },
            { id: 'coaching', label: 'Coach' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                sortBy === opt.id
                  ? "bg-yellow-400 border-yellow-400 font-bold text-gray-900 shadow-sm"
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={collapseAll}
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
          >
            Expand All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedStats.map(mr => (
          <MRCard
            key={mr.mrName}
            mr={mr}
            isExpanded={!!expandedMRs[mr.mrName]}
            onToggle={toggleMR}
            targets={targets}
            onOpenCalendar={() => setSelectedMRForCalendar(mr)}
          />
        ))}
      </div>

      {selectedMRForCalendar && (
        <MRCalendarModal
          mr={selectedMRForCalendar}
          targets={targets}
          onClose={() => setSelectedMRForCalendar(null)}
        />
      )}
    </div>
  );
};

const MRCard = ({ mr, isExpanded, onToggle, targets, onOpenCalendar }) => {
  const rateColor = (rate, target) => {
    if (!target) return "text-gray-600";
    const pct = (rate / target) * 100;
    if (pct >= 90) return "text-green-600";
    if (pct >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const rateIcon = (rate, target) => {
    if (!target) return "";
    const pct = (rate / target) * 100;
    if (pct >= 90) return "✅";
    if (pct >= 70) return "🟡";
    return "🔴";
  };

  return (
    <div className="bg-white rounded-[1.25rem] border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* ── CLICKABLE HEADER ── */}
      <button
        type="button"
        onClick={() => onToggle(mr.mrName)}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: name + meta */}
          <div className="min-w-0 flex-1">
            <div className="font-black text-base text-gray-900 truncate uppercase tracking-tight">
              {mr.mrName}
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
              {mr.lineName || "—"}
            </div>
            {/* LAST REPORTED DATE */}
            <div className="text-[11px] text-gray-400 mt-2 font-medium">
              Last visit: 
              <span className="font-bold text-gray-700 ml-1">
                {safeFormatDate(mr.lastDate, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          {/* Right: chevron */}
          <div className="text-gray-300 text-xs shrink-0 mt-1">
            {isExpanded ? "▲" : "▼"}
          </div>
        </div>

        {/* ── COLLAPSED SUMMARY (always visible) ── */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "HCO", calls: mr.totalHCO, rate: mr.hcoRate, t: targets?.hcoPerDay },
            { label: "PH",  calls: mr.totalPH,  rate: mr.phRate,  t: targets?.phPerDay  },
            { label: "HCP", calls: mr.totalHCP, rate: mr.hcpRate, t: targets?.hcpPerDay },
          ].map(({ label, calls, rate, t }) => (
            <div key={label} className="bg-gray-50 rounded-xl py-2 px-1 border border-gray-100">
              <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
                {label}
              </div>
              <div className={`text-xs font-black ${rateColor(rate, t)}`}>
                {rate.toFixed(1)}/d {rateIcon(rate, t)}
              </div>
              <div className="text-[10px] font-bold text-gray-400">
                {calls} calls
              </div>
            </div>
          ))}
        </div>

        {/* Coaching pill */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-700 rounded-full px-3 py-1 border border-purple-100">
            🎓 {mr.coachingDays} coaching day{mr.coachingDays !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {mr.totalCalls} total
          </span>
        </div>
      </button>

      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/30 animate-in slide-in-from-top-2 duration-200">
          {/* Period breakdown table */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "🏥 HCO", period: "AM", days: mr.hcoDays, calls: mr.totalHCO, rate: mr.hcoRate, t: targets?.hcoPerDay, coached: mr.hcoCoached },
              { label: "💊 PH",  period: "AM", days: mr.phDays,  calls: mr.totalPH,  rate: mr.phRate,  t: targets?.phPerDay,  coached: mr.phCoached },
              { label: "👨‍⚕️ HCP", period: "PM", days: mr.hcpDays, calls: mr.totalHCP, rate: mr.hcpRate, t: targets?.hcpPerDay, coached: mr.hcpCoached },
            ].map(({ label, period, days, calls, rate, t, coached }) => (
              <div key={label} className="border border-gray-200 rounded-xl p-2 bg-white text-center shadow-sm">
                <div className="text-[10px] font-black text-gray-700 uppercase tracking-tight">
                  {label}
                </div>
                <div className="text-[9px] font-bold text-gray-400 uppercase">
                  {period} session
                </div>
                <div className="text-xl font-black text-gray-900 mt-1">
                  {calls}
                </div>
                <div className={`text-xs font-black ${rateColor(rate, t)}`}>
                  {rate.toFixed(1)}/d {rateIcon(rate, t)}
                </div>
                <div className="text-[10px] font-bold text-gray-500 mt-1">
                  {days} days
                </div>
                {coached > 0 && (
                  <div className="text-[10px] font-black text-yellow-600 mt-1 bg-yellow-50 rounded-md py-0.5">
                    🎓 {coached} coached
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Coaching summary */}
          <div className="bg-yellow-400/10 rounded-xl p-3 border border-yellow-400/20 shadow-sm">
            <div className="text-[10px] font-black text-yellow-800 uppercase tracking-widest mb-2">
              🎓 Coaching Detail
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-[11px] font-bold text-yellow-700">
              <span>Days: {mr.coachingDays}</span>
              <span>Total: {mr.totalCoached}</span>
              <span>HCO: {mr.hcoCoached}</span>
              <span>PH: {mr.phCoached}</span>
              <span className="col-span-2">HCP: {mr.hcpCoached}</span>
            </div>
          </div>

          {/* PER-MR SEARCH */}
          <MRCardSearch mr={mr} />

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={e => {
                e.stopPropagation();
                onOpenCalendar();
              }}
              className="text-[10px] font-black uppercase tracking-widest py-2.5 px-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              📅 Calendar
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                document.getElementById('section-forecast')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-[10px] font-black uppercase tracking-widest py-2.5 px-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              📈 Forecast
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MRCardsGrid;

