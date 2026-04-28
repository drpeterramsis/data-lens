import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

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
          (c.customerId || "").toLowerCase().includes(query) ||
          (c.type || "").toLowerCase().includes(query) ||
          (c.grade || "").toLowerCase().includes(query) ||
          (c.specialty || "").toLowerCase().includes(query) ||
          (c.site || "").toLowerCase().includes(query) ||
          (c.coachingType || "").toLowerCase().includes(query)
        ) {
          matches.push({ ...c, date });
        }
      });
    });

    return matches.sort((a, b) => a.date.localeCompare(b.date));
  }, [q, mr.dateMap]);

  return (
    <div className="mt-3" onClick={e => e.stopPropagation()}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          type="text"
          placeholder="🔍 Search customer, ID, grade..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full text-[11px] font-medium border-2 border-gray-100 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-yellow-400 transition-all bg-white shadow-inner"
          autoFocus={false}
        />
      </div>

      {q && (
        <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between px-1">
          <span>{results.length} results found</span>
          {results.length > 0 && <button onClick={() => setQ("")} className="hover:text-red-500 transition-colors">Clear</button>}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-inner">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter">Date</th>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter">Name</th>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter">Type</th>
                <th className="p-2 border-b font-black text-gray-400 uppercase tracking-tighter text-center">🎓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.slice(0, 50).map((r, i) => (
                <tr key={i} className={`hover:bg-gray-50/50 transition-colors ${r.coached ? "bg-yellow-50" : ""}`}>
                  <td className="p-2 font-bold text-gray-500 whitespace-nowrap">{r.date.split('-').reverse().join('/')}</td>
                  <td className="p-2 font-black text-gray-800 leading-tight">{r.name}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded-full font-black text-[9px] ${
                      r.type === "HCO" ? "bg-green-100 text-green-700" :
                      r.type === "Pharmacy" ? "bg-purple-100 text-purple-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {r.coached ? "🎓" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 50 && (
            <div className="p-2 text-[8px] font-black text-gray-300 uppercase tracking-widest text-center">
              Showing top 50 matches
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MRCard = ({ mr, isExpanded, onToggle, targets, onOpenCalendar }) => {
  const rateIcon = (rate, target) => {
    if (!target) return "";
    const pct = (rate / target) * 100;
    if (pct >= 90) return "✅";
    if (pct >= 70) return "🟡";
    return "🔴";
  };

  const formatDateLabel = (d) => {
    if (!d) return "—";
    const date = new Date(d + "T00:00:00");
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className={`bg-white rounded-3xl border transition-all duration-300 ${isExpanded ? 'border-accent ring-4 ring-accent/5 shadow-xl scale-[1.02] z-10' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-accent/40'}`}>
      {/* ── COLLAPSED / HEADER ── */}
      <button
        type="button"
        onClick={() => onToggle(mr.mrName)}
        className="w-full text-left p-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
             <div className="flex items-center gap-2">
                <span className="text-xl">🧑‍⚕️</span>
                <div className="font-black text-lg text-gray-900 truncate uppercase tracking-tight">
                   {mr.mrName}
                </div>
             </div>
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5 ml-8">
                {mr.lineName || "—"}
             </div>
          </div>
          <div className={`text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
             ▼
          </div>
        </div>

        {!isExpanded && (
          <div className="mt-4 space-y-2">
             <div className="flex justify-between items-end">
                <div className="flex gap-2 text-[11px] font-black">
                   <div className="flex items-center gap-1">
                      <span className="text-gray-400 uppercase">HCO:</span>
                      <span className="text-green-600">{mr.totalHCO}</span>
                      <span className="text-gray-900">{mr.hcoRate}/d {rateIcon(mr.hcoRate, targets?.hcoPerDay)}</span>
                   </div>
                   <div className="flex items-center gap-1 border-l border-gray-100 pl-2">
                      <span className="text-gray-400 uppercase">PH:</span>
                      <span className="text-purple-600">{mr.totalPH}</span>
                      <span className="text-gray-900">{mr.phRate}/d {rateIcon(mr.phRate, targets?.phPerDay)}</span>
                   </div>
                </div>
             </div>
             <div className="flex justify-between items-center bg-blue-50/50 rounded-xl p-2 border border-blue-50">
                <div className="text-[11px] font-black flex items-center gap-1">
                   <span className="text-gray-400 uppercase">HCP:</span>
                   <span className="text-blue-600 font-black">{mr.totalHCP}</span>
                   <span className="text-gray-900">{mr.hcpRate}/d {rateIcon(mr.hcpRate, targets?.hcpPerDay)}</span>
                </div>
             </div>
             <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                   🎓 {mr.coachingDays} coaching days
                </span>
                <span className="font-bold text-gray-400">
                   Last: <span className="text-gray-700">{formatDateLabel(mr.lastDate)}</span>
                </span>
             </div>
          </div>
        )}
      </button>

      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-5 animate-in fade-in duration-300">
           <div className="grid grid-cols-3 gap-2">
              {[
                { label: "🏥 HCO", period: "AM (Sat–Thu)", days: mr.hcoDays, calls: mr.totalHCO, rate: mr.hcoRate, t: targets?.hcoPerDay },
                { label: "💊 PH",  period: "AM (Sat–Thu)", days: mr.phDays,  calls: mr.totalPH,  rate: mr.phRate,  t: targets?.phPerDay },
                { label: "👨‍⚕️ HCP", period: "PM (Sat–Wed)", days: mr.hcpDays, calls: mr.totalHCP, rate: mr.hcpRate, t: targets?.hcpPerDay },
              ].map(({ label, period, days, calls, rate, t }) => (
                <div key={label} className="bg-gray-50 border border-gray-100 rounded-2xl p-2 text-center">
                   <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{label}</p>
                   <p className="text-[8px] font-black text-gray-400 uppercase -mt-0.5">{period}</p>
                   <p className="text-lg font-black text-gray-900 mt-1">{calls} <span className="text-[10px] text-gray-400">calls</span></p>
                   <p className="text-[10px] font-black text-gray-500">{days} days</p>
                   <p className="text-xs font-black text-gray-900 mt-0.5">{rate}/d {rateIcon(rate, t)}</p>
                </div>
              ))}
           </div>

           <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                 <h5 className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">🎓 Coaching Performance</h5>
                 <span className="text-[10px] font-black text-yellow-700 bg-yellow-400/10 px-2 py-0.5 rounded-full">{mr.coachingDays} Days</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2">
                 <div className="text-xs font-bold text-yellow-800">Total Coached: <span className="font-black underline">{mr.totalCoached}</span></div>
                 <div className="flex gap-2 text-[10px] font-black text-yellow-700/60 uppercase">
                    <span>HCO:{mr.hcoCoached}</span>
                    <span>PH:{mr.phCoached}</span>
                    <span>HCP:{mr.hcpCoached}</span>
                 </div>
              </div>
           </div>

           <MRCardSearch mr={mr} />

           <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onOpenCalendar();
                }}
                className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg"
              >
                 📅 View Calendar
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  document.getElementById('section-forecast')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center justify-center gap-2 py-3 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-accent transition-colors"
              >
                 📈 Forecast
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

const MRCardsGrid = ({ data, targets, mrStats, onSelectMRForCalendar }) => {
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
         overallAch = mr.totalCalls; 
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
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4 flex-wrap gap-4">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'performance', label: 'Performance ▼' },
            { id: 'asc', label: 'A→Z' },
            { id: 'hcp', label: 'HCP' },
            { id: 'hco', label: 'HCO' },
            { id: 'ph', label: 'Pharmacy' },
            { id: 'coaching', label: 'Coaching' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${
                sortBy === opt.id
                  ? "bg-yellow-400 border-yellow-400 text-gray-900 shadow-md scale-105"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={collapseAll}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
          >
            Expand All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedStats.map(mr => (
          <MRCard
            key={mr.mrName}
            mr={mr}
            isExpanded={!!expandedMRs[mr.mrName]}
            onToggle={toggleMR}
            targets={targets}
            onOpenCalendar={() => onSelectMRForCalendar(mr)}
          />
        ))}
      </div>
    </div>
  );
};

export default MRCardsGrid;
