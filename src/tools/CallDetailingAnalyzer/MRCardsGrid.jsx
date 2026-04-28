import React, { useMemo, useState } from 'react';
import { Search, MapPin, Calendar, TrendingUp, GraduationCap } from 'lucide-react';
import { getRateStatus } from '../../utils/mrCalculations';

const STATUS_VARIANTS = {
  green: "text-green-700 bg-green-50 border-green-100 shadow-green-100/20",
  yellow: "text-yellow-700 bg-yellow-50 border-yellow-200 shadow-yellow-100/20",
  red: "text-red-700 bg-red-50 border-red-200 shadow-red-100/20",
  gray: "text-gray-500 bg-gray-50 border-gray-100 shadow-gray-100/20"
};

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
          className="w-full text-[11px] font-bold border-2 border-gray-100 rounded-[1.25rem] pl-9 pr-3 py-3 focus:outline-none focus:border-yellow-400 transition-all bg-gray-50/50 shadow-inner"
          autoFocus={false}
        />
      </div>

      {q && (
        <div className="mt-2 text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between px-1">
          <span>{results.length} records match</span>
          {results.length > 0 && <button onClick={() => setQ("")} className="text-red-400 hover:text-red-500 transition-colors uppercase">Clear</button>}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-2 border border-gray-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-xl">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
               <tr className="uppercase font-black text-gray-400 tracking-tighter">
                <th className="p-3">Date</th>
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-center">Coached</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.slice(0, 50).map((r, i) => (
                <tr key={i} className={`hover:bg-yellow-50/30 transition-colors ${r.coached ? "bg-yellow-50/50" : ""}`}>
                  <td className="p-3 font-bold text-gray-500 whitespace-nowrap">{r.date.split('-').reverse().join('/')}</td>
                  <td className="p-3 font-black text-gray-900 leading-tight">
                    {r.name}
                    <div className="text-[9px] font-medium text-gray-400 mt-0.5 truncate max-w-[120px]">{r.site || 'Field Site'}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest ${
                      r.type === "HCO" ? "bg-green-100 text-green-700" :
                      r.type === "Pharmacy" ? "bg-purple-100 text-purple-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {r.coached ? <span className="text-yellow-600 text-sm">🎓</span> : <span className="text-gray-200">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 50 && (
            <div className="p-3 text-[9px] font-black text-gray-300 uppercase tracking-widest text-center border-t border-gray-50">
              Showing top 50 matches
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MRCard = ({ mr, isExpanded, onToggle, targets, onOpenCalendar }) => {
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

  const getMetricVariant = (rate, type) => {
    let target = type === "HCP" ? targets.hcpPerDay : type === "HCO" ? targets.hcoPerDay : targets.phPerDay;
    const status = getRateStatus(rate, target);
    return {
      status: status.status,
      variant: STATUS_VARIANTS[status.color] || STATUS_VARIANTS.gray,
      icon: status.icon
    };
  };

  return (
    <div className={`bg-white rounded-[2.5rem] border-2 transition-all duration-300 ${isExpanded ? 'border-yellow-400 shadow-2xl scale-[1.03] z-10' : 'border-gray-50 shadow-sm hover:shadow-xl hover:border-yellow-200'}`}>
      {/* ── COLLAPSED / HEADER ── */}
      <button
        type="button"
        onClick={() => onToggle(mr.mrName)}
        className="w-full text-left p-6 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 flex items-center gap-4">
             <div 
               className="w-14 h-14 rounded-3xl flex items-center justify-center text-lg font-black text-white shadow-lg shrink-0 uppercase"
               style={{ backgroundColor: `hsl(${mr.mrName.length * 40}, 60%, 40%)` }}
             >
                {mr.mrName.charAt(0)}
             </div>
             <div className="min-w-0">
                <div className="font-black text-xl text-gray-900 truncate uppercase tracking-tight leading-none group-hover:text-yellow-600 transition-colors">
                   {mr.mrName}
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] truncate mt-2 opacity-60 italic">
                   {mr.lineName || "Core Workforce"}
                </div>
             </div>
          </div>
          <div className={`mt-3 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 transition-all duration-300 ${isExpanded ? 'rotate-180 bg-yellow-400 text-black shadow-lg scale-110' : ''}`}>
             ▼
          </div>
        </div>

        {!isExpanded && (
          <div className="mt-8 space-y-4">
             <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "HCO", rate: mr.hcoRate, type: "HCO" },
                  { label: "PH",  rate: mr.phRate,  type: "PH" },
                  { label: "HCP", rate: mr.hcpRate, type: "HCP" },
                ].map(({ label, rate, type }) => {
                  const { variant, icon } = getMetricVariant(rate, type);
                  
                  return (
                    <div key={label} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 shadow-sm transition-transform hover:scale-105 ${variant}`}>
                       <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 mb-1">{label}</span>
                       <span className="text-lg font-black leading-none">{rate}</span>
                       <span className="mt-1">{icon}</span>
                    </div>
                  );
                })}
             </div>
             
             <div className="flex items-center justify-between text-[10px] pt-4 border-t-2 border-gray-50 mt-4 px-2">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                   <span className="font-black text-gray-900 uppercase tracking-widest leading-none">
                      {mr.coachingDays} Coaching
                   </span>
                </div>
                <span className="font-bold text-gray-400 uppercase tracking-tighter">
                   Latest: <span className="text-gray-900 font-black">{formatDateLabel(mr.lastDate)}</span>
                </span>
             </div>
          </div>
        )}
      </button>

      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && (
        <div className="px-6 pb-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
           <div className="bg-gray-50/50 rounded-[2rem] p-6 space-y-6 border-2 border-gray-50">
              <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp size={14}/> Period Volume Breakdown
              </h6>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 {[
                   { label: "🏥 HCO", period: "Sat–Thu", days: mr.hcoDays, calls: mr.totalHCO, rate: mr.hcoRate, type: "HCO" },
                   { label: "💊 PH",  period: "Sat–Thu", days: mr.phDays,  calls: mr.totalPH,  rate: mr.phRate,  type: "PH" },
                   { label: "👨‍⚕️ HCP", period: "Sat–Wed", days: mr.hcpDays, calls: mr.totalHCP, rate: mr.hcpRate, type: "HCP" },
                 ].map(({ label, period, days, calls, rate, type }) => {
                   const { variant, icon } = getMetricVariant(rate, type);
                   return (
                     <div key={label} className={`rounded-3xl border-2 p-4 text-center shadow-lg transition-all hover:translate-y-[-4px] ${variant}`}>
                        <p className="text-[11px] font-black uppercase tracking-tight">{label}</p>
                        <p className="text-[9px] font-bold opacity-60 uppercase mb-2">{period}</p>
                        <p className="text-2xl font-black">{calls}</p>
                        <p className="text-[10px] font-black uppercase opacity-60 mb-2">Total Visits</p>
                        <div className="h-px w-8 bg-current mx-auto opacity-20 mb-3"></div>
                        <p className="text-sm font-black italic">{rate}<span className="text-[9px] uppercase opacity-60 ml-1">v/d</span> {icon}</p>
                        <p className="text-[9px] font-black uppercase opacity-40 mt-1">{days} Active Days</p>
                     </div>
                   );
                 })}
              </div>

              <div className="bg-yellow-400 rounded-3xl p-6 shadow-xl shadow-yellow-100 flex items-center justify-between group/coach">
                 <div>
                    <h5 className="text-[11px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                       <GraduationCap size={16}/> Coaching Insight
                    </h5>
                    <p className="text-[10px] font-bold text-black/60 mt-1 uppercase">Field Supervision Intensity</p>
                    <div className="flex gap-4 mt-6">
                       <div className="text-center">
                          <p className="text-2xl font-black text-black">{mr.totalCoached}</p>
                          <p className="text-[8px] font-black uppercase text-black/40">Total Coached</p>
                       </div>
                       <div className="w-px h-10 bg-black/10"></div>
                       <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                             <p className="text-sm font-black text-black">{mr.hcoCoached}</p>
                             <p className="text-[8px] font-black uppercase text-black/40">HCO</p>
                          </div>
                          <div className="text-center">
                             <p className="text-sm font-black text-black">{mr.phCoached}</p>
                             <p className="text-[8px] font-black uppercase text-black/40">PH</p>
                          </div>
                          <div className="text-center">
                             <p className="text-sm font-black text-black">{mr.hcpCoached}</p>
                             <p className="text-[8px] font-black uppercase text-black/40">HCP</p>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center text-white shadow-2xl rotate-3 group-hover/coach:rotate-0 transition-transform">
                    <span className="text-3xl font-black leading-none">{mr.coachingDays}</span>
                    <span className="text-[8px] font-black absolute bottom-2 opacity-50 uppercase">Days</span>
                 </div>
              </div>
           </div>

           <MRCardSearch mr={mr} />

           <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onOpenCalendar();
                }}
                className="flex-1 flex items-center justify-center gap-3 py-5 bg-gray-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
              >
                 <Calendar size={18}/> Access Calendar
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  document.getElementById('section-forecast')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-1 flex items-center justify-center gap-3 py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:border-yellow-400 hover:shadow-lg transition-all active:scale-95"
              >
                 Analysis & Forecast
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
      <div className="flex items-center justify-between mb-10 border-b-2 border-gray-50 pb-6 flex-wrap gap-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'performance', label: 'By Performance' },
            { id: 'asc', label: 'A→Z' },
            { id: 'hcp', label: 'HCP Focus' },
            { id: 'hco', label: 'HCO Focus' },
            { id: 'ph', label: 'PH Flow' },
            { id: 'coaching', label: 'Coaching' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl border-2 transition-all ${
                sortBy === opt.id
                  ? "bg-yellow-400 border-yellow-400 text-gray-900 shadow-xl shadow-yellow-100 scale-105"
                  : "bg-white border-gray-50 text-gray-400 hover:border-yellow-200 hover:text-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={collapseAll}
            className="text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl border-2 border-gray-50 bg-white hover:bg-gray-900 hover:text-white transition-all text-gray-400 shadow-sm"
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl border-2 border-gray-50 bg-white hover:bg-gray-900 hover:text-white transition-all text-gray-400 shadow-sm"
          >
            Expand All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
