import React, { useMemo, useState } from 'react';
import { Search, MapPin, Calendar, TrendingUp, GraduationCap, Maximize2 } from 'lucide-react';
import { getRateStatus, getStatusInfo, buildStatusTooltip } from '../../utils/mrCalculations';
import StatusTooltip from '../../components/shared/StatusTooltip';
import { formatKpi, formatKpiGrouped } from '../../utils/formatNumber';

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

const COACHING_PALETTE = [
  { border: "border-slate-400", ring: "ring-slate-200", bgLight: "bg-slate-50", hoverBorder: "hover:border-slate-500", hoverShadow: "hover:shadow-slate-100", bannerBg: "bg-slate-100", bannerText: "text-slate-900", badgeBg: "bg-slate-200", badgeText: "text-slate-900", legendBg: "bg-slate-100" },
  { border: "border-red-400", ring: "ring-red-200", bgLight: "bg-red-50", hoverBorder: "hover:border-red-500", hoverShadow: "hover:shadow-red-100", bannerBg: "bg-red-100", bannerText: "text-red-900", badgeBg: "bg-red-200", badgeText: "text-red-900", legendBg: "bg-red-100" },
  { border: "border-amber-400", ring: "ring-amber-200", bgLight: "bg-amber-50", hoverBorder: "hover:border-amber-500", hoverShadow: "hover:shadow-amber-100", bannerBg: "bg-amber-100", bannerText: "text-amber-900", badgeBg: "bg-amber-200", badgeText: "text-amber-900", legendBg: "bg-amber-100" },
  { border: "border-lime-400", ring: "ring-lime-200", bgLight: "bg-lime-50", hoverBorder: "hover:border-lime-500", hoverShadow: "hover:shadow-lime-100", bannerBg: "bg-lime-100", bannerText: "text-lime-900", badgeBg: "bg-lime-200", badgeText: "text-lime-900", legendBg: "bg-lime-100" },
  { border: "border-green-400", ring: "ring-green-200", bgLight: "bg-green-50", hoverBorder: "hover:border-green-500", hoverShadow: "hover:shadow-green-100", bannerBg: "bg-green-100", bannerText: "text-green-900", badgeBg: "bg-green-200", badgeText: "text-green-900", legendBg: "bg-green-100" },
  { border: "border-emerald-400", ring: "ring-emerald-200", bgLight: "bg-emerald-50", hoverBorder: "hover:border-emerald-500", hoverShadow: "hover:shadow-emerald-100", bannerBg: "bg-emerald-100", bannerText: "text-emerald-900", badgeBg: "bg-emerald-200", badgeText: "text-emerald-900", legendBg: "bg-emerald-100" },
  { border: "border-teal-400", ring: "ring-teal-200", bgLight: "bg-teal-50", hoverBorder: "hover:border-teal-500", hoverShadow: "hover:shadow-teal-100", bannerBg: "bg-teal-100", bannerText: "text-teal-900", badgeBg: "bg-teal-200", badgeText: "text-teal-900", legendBg: "bg-teal-100" },
  { border: "border-cyan-400", ring: "ring-cyan-200", bgLight: "bg-cyan-50", hoverBorder: "hover:border-cyan-500", hoverShadow: "hover:shadow-cyan-100", bannerBg: "bg-cyan-100", bannerText: "text-cyan-900", badgeBg: "bg-cyan-200", badgeText: "text-cyan-900", legendBg: "bg-cyan-100" },
  { border: "border-sky-400", ring: "ring-sky-200", bgLight: "bg-sky-50", hoverBorder: "hover:border-sky-500", hoverShadow: "hover:shadow-sky-100", bannerBg: "bg-sky-100", bannerText: "text-sky-900", badgeBg: "bg-sky-200", badgeText: "text-sky-900", legendBg: "bg-sky-100" },
  { border: "border-blue-400", ring: "ring-blue-200", bgLight: "bg-blue-50", hoverBorder: "hover:border-blue-500", hoverShadow: "hover:shadow-blue-100", bannerBg: "bg-blue-100", bannerText: "text-blue-900", badgeBg: "bg-blue-200", badgeText: "text-blue-900", legendBg: "bg-blue-100" },
  { border: "border-indigo-400", ring: "ring-indigo-200", bgLight: "bg-indigo-50", hoverBorder: "hover:border-indigo-500", hoverShadow: "hover:shadow-indigo-100", bannerBg: "bg-indigo-100", bannerText: "text-indigo-900", badgeBg: "bg-indigo-200", badgeText: "text-indigo-900", legendBg: "bg-indigo-100" },
  { border: "border-violet-400", ring: "ring-violet-200", bgLight: "bg-violet-50", hoverBorder: "hover:border-violet-500", hoverShadow: "hover:shadow-violet-100", bannerBg: "bg-violet-100", bannerText: "text-violet-900", badgeBg: "bg-violet-200", badgeText: "text-violet-900", legendBg: "bg-violet-100" },
  { border: "border-purple-400", ring: "ring-purple-200", bgLight: "bg-purple-50", hoverBorder: "hover:border-purple-500", hoverShadow: "hover:shadow-purple-100", bannerBg: "bg-purple-100", bannerText: "text-purple-900", badgeBg: "bg-purple-200", badgeText: "text-purple-900", legendBg: "bg-purple-100" },
  { border: "border-fuchsia-400", ring: "ring-fuchsia-200", bgLight: "bg-fuchsia-50", hoverBorder: "hover:border-fuchsia-500", hoverShadow: "hover:shadow-fuchsia-100", bannerBg: "bg-fuchsia-100", bannerText: "text-fuchsia-900", badgeBg: "bg-fuchsia-200", badgeText: "text-fuchsia-900", legendBg: "bg-fuchsia-100" },
  { border: "border-pink-400", ring: "ring-pink-200", bgLight: "bg-pink-50", hoverBorder: "hover:border-pink-500", hoverShadow: "hover:shadow-pink-100", bannerBg: "bg-pink-100", bannerText: "text-pink-900", badgeBg: "bg-pink-200", badgeText: "text-pink-900", legendBg: "bg-pink-100" },
  { border: "border-rose-400", ring: "ring-rose-200", bgLight: "bg-rose-50", hoverBorder: "hover:border-rose-500", hoverShadow: "hover:shadow-rose-100", bannerBg: "bg-rose-100", bannerText: "text-rose-900", badgeBg: "bg-rose-200", badgeText: "text-rose-900", legendBg: "bg-rose-100" }
];
const getPalette = day => COACHING_PALETTE[day % COACHING_PALETTE.length];

const getCoachingColorClasses = (days, isExpanded) => {
  const p = getPalette(days);
  return isExpanded ? `${p.border} ring-2 ${p.ring} ${p.bgLight}` : `${p.border} ${p.hoverBorder} ${p.hoverShadow}`;
};

const getCoachingHeaderBanner = (days) => {
  const p = getPalette(days);
  return `${p.bannerBg} ${p.bannerText}`;
};

const getCoachingHeaderBadge = (days) => {
  const p = getPalette(days);
  return `${p.badgeBg} ${p.badgeText}`;
};

const MRCard = ({ mr, isExpanded, onToggle, targets, onOpenCalendar }) => {
  const coachingDays = mr.coachingDays ?? 0;
  const isCoached = coachingDays >= 1;
  const colorClasses = getCoachingColorClasses(coachingDays, isExpanded);

  const formatDate = (d) => {
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

  const tooltipInfo = buildStatusTooltip(mr, targets, mr.overallStatus);

  return (
    <div className={`
      rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden
      ${isExpanded ? 'scale-[1.03] shadow-2xl z-10' : 'hover:shadow-xl'}
      ${colorClasses}
    `}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(mr.mrName)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(mr.mrName);
          }
        }}
        className="w-full text-left focus:outline-none cursor-pointer"
      >
        {/* ── COACHING BANNER (top strip) ── */}
        {isCoached && (
          <StatusTooltip
            title="🎓 Coaching Activity"
            color="yellow"
            lines={[
              `Coached on ${coachingDays} unique day(s)`,
              `Total coached interactions: ${mr.coachedVisits}`,
              `An MR is marked "Coached" when`,
              `IsMRCoachingSubmitted = true OR`,
              `IsManagerCoachingSubmitted = true`,
              `on that visit record`,
            ]}>
            <div className={`flex items-center justify-between px-4 py-1.5 ${getCoachingHeaderBanner(coachingDays)}`}>
              {/* Emoji collage */}
              <div className="flex items-center gap-1">
                <span className="text-base">🎓</span>
                <span className="text-base">📋</span>
                <span className="text-base">👥</span>
                <span className="text-sm font-black ml-1">
                  COACHED
                </span>
              </div>
              {/* Days + visits count */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCoachingHeaderBadge(coachingDays)}`}>
                  {coachingDays}
                  {coachingDays === 1 ? " day" : " days"}
                </span>
                <span className="text-[10px] opacity-90">
                  {mr.coachedVisits} visits
                </span>
              </div>
            </div>
          </StatusTooltip>
        )}

        {/* ── CARD BODY (HEADER) ── */}
        <div className={`p-4 sm:p-5 relative ${isCoached ? "bg-white/50" : "bg-white"}`}>
          {/* MR Name + last date */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 pr-8">
              <div className="font-black text-base text-gray-900 truncate">
                {mr.mrName}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                <span>📅</span>
                <span>Last visit:</span>
                <span className="font-semibold text-gray-700">
                  {formatDate(mr.lastDate)}
                </span>
              </div>
            </div>

            {/* Open Fullscreen Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCalendar();
              }}
              className="absolute right-4 top-4 p-2 rounded-xl bg-gray-900 text-white hover:bg-black transition-all hover:scale-110 active:scale-95 shadow-lg group-hover:block z-20"
              title="Open Fullscreen Detail"
            >
              <Maximize2 size={16} />
            </button>

            {/* Status badge — top right */}
            {/* Status badge removed as requested */}
          </div>

          <div className={`absolute right-4 top-14 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 transition-all duration-300 ${isExpanded ? 'rotate-180 text-yellow-600 bg-yellow-100' : 'bg-gray-50'}`}>
             ▼
          </div>

          {/* Rate chips: HCO · PH · HCP */}
          <div className="flex gap-2 flex-wrap mb-3 w-[85%]">
            {[
              {
                icon: "🏥",
                label: "HCO",
                rate: mr.hcoActualRate,
                target: targets?.hcoPerDay,
                color: "text-green-700",
              },
              {
                icon: "💊",
                label: "PH",
                rate: mr.phActualRate,
                target: targets?.phPerDay,
                color: "text-purple-700",
              },
              {
                icon: "👤",
                label: "HCP",
                rate: mr.hcpActualRate,
                target: targets?.hcpPerDay,
                color: "text-blue-700",
              },
            ].map(chip => {
              const pct = chip.target
                ? Math.round((chip.rate / chip.target) * 100)
                : null;
              return (
                <div key={chip.label}
                  className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 flex-1 min-w-[75px] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.03)]">
                  <span className="text-sm">{chip.icon}</span>
                  <span className="text-[10px] text-gray-500">{chip.label}:</span>
                  <span className={`text-xs font-bold
                    ${pct === null
                      ? "text-gray-400"
                      : pct >= 100
                        ? "text-green-700"
                        : pct >= 90
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}>
                    {formatKpi(chip.rate)}/d
                  </span>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
            <span>
              📊 {mr.totalVisits} visits · {mr.workedDays} days
            </span>
            {/* Coaching mini tag */}
            {isCoached && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                🎓 {mr.coachingDays}d coached
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && (
        <div className={`px-5 pb-6 pt-2 space-y-6 animate-in slide-in-from-top-4 duration-300 ${isCoached ? "bg-yellow-50/20" : "bg-white"}`}>
           <div className="bg-gray-50/50 rounded-2xl p-5 space-y-5 border border-gray-100">
              <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp size={14}/> Period Volume Breakdown
              </h6>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 {[
                   { label: "🏥 HCO", period: "Sat–Thu", days: mr.hcoDays, calls: mr.totalHCO, rate: mr.hcoRate, type: "HCO" },
                   { label: "💊 PH",  period: "Sat–Thu", days: mr.phDays,  calls: mr.totalPH,  rate: mr.phRate,  type: "PH" },
                   { label: "👨‍⚕️ HCP", period: "Sat–Wed", days: mr.hcpDays, calls: mr.totalHCP, rate: mr.hcpRate, type: "HCP" },
                 ].map(({ label, period, days, calls, rate, type }) => {
                   const { variant, icon } = getMetricVariant(rate, type);
                   return (
                     <div key={label} className={`rounded-xl border p-3 text-center transition-all hover:translate-y-[-2px] ${variant}`}>
                        <p className="text-[11px] font-black uppercase tracking-tight">{label}</p>
                        <p className="text-2xl font-black mt-1 mb-1">{calls}</p>
                        <div className="h-px w-8 bg-current mx-auto opacity-20 mb-2"></div>
                        <p className="text-[11px] font-black italic">{formatKpi(rate)}<span className="text-[9px] uppercase opacity-60 ml-0.5">v/d</span> {icon}</p>
                        <p className="text-[9px] font-black uppercase opacity-40 mt-1">{days} Act. Days</p>
                     </div>
                   );
                 })}
              </div>

              <div className="bg-yellow-400 rounded-2xl p-5 shadow-sm shadow-yellow-100 flex items-center justify-between group/coach">
                 <div>
                    <h5 className="text-[11px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                       <GraduationCap size={16}/> Coaching Insight
                    </h5>
                    <div className="flex gap-4 mt-4">
                       <div className="text-center">
                          <p className="text-xl font-black text-black">{mr.totalCoached}</p>
                          <p className="text-[8px] font-black uppercase text-black/50">Total Coached</p>
                       </div>
                       <div className="w-px h-8 bg-black/10 mt-1"></div>
                       <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                             <p className="text-sm font-black text-black">{mr.hcoCoached}</p>
                             <p className="text-[8px] font-black uppercase text-black/50">HCO</p>
                          </div>
                          <div className="text-center">
                             <p className="text-sm font-black text-black">{mr.phCoached}</p>
                             <p className="text-[8px] font-black uppercase text-black/50">PH</p>
                          </div>
                          <div className="text-center">
                             <p className="text-sm font-black text-black">{mr.hcpCoached}</p>
                             <p className="text-[8px] font-black uppercase text-black/50">HCP</p>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-white shadow-md rotate-3 group-hover/coach:rotate-0 transition-transform relative">
                    <span className="text-2xl font-black leading-none">{mr.coachingDays}</span>
                    <span className="text-[7px] font-black absolute bottom-1.5 opacity-60 uppercase tracking-widest">Days</span>
                 </div>
              </div>
           </div>

           {/* Removing the embedded search as it moves to full screen */}
           {/* <MRCardSearch mr={mr} /> */}

           <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onOpenCalendar();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-sm active:scale-95"
              >
                 <Maximize2 size={14}/> Fullscreen Detail
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  document.getElementById('section-forecast')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-gray-900 border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-yellow-400 hover:shadow-sm transition-all active:scale-95"
              >
                 Forecast
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
    let parsed = mrStats.map(mr => {
      const overallStatus = getStatusInfo(mr, targets || { hcpPerDay: 0, hcoPerDay: 0, phPerDay: 0 });
      
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

      return { ...mr, overallAch, overallStatus };
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
      <div className="flex flex-col xl:flex-row items-center justify-between mb-10 border-b-2 border-gray-50 pb-6 gap-6">
        <div className="flex flex-col lg:flex-row items-center gap-6 w-full xl:w-auto">
          {/* Sorting Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
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

          {/* Coaching Legend */}
          <div className="flex items-center gap-3 bg-gray-50/80 px-4 py-2.5 rounded-2xl border border-gray-200/50 hidden md:flex flex-wrap">
             <div className="flex items-center gap-1.5 border-r border-gray-200 pr-3">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coaching Days:</span>
             </div>
             <div className="flex items-center gap-3 flex-wrap">
               {[...new Set(mrStats.map(mr => mr.coachingDays || 0))].sort((a,b)=>a-b).map(day => {
                 const p = getPalette(day);
                 return (
                   <div key={day} className="flex items-center gap-1.5">
                     <div className={`w-2.5 h-2.5 rounded-full ${p.bannerBg} shadow-sm border border-black/5`}></div>
                     <span className="text-[10px] font-bold text-gray-600">{day}</span>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={collapseAll}
            className="text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl border-2 border-gray-50 bg-white hover:bg-gray-900 hover:text-white transition-all text-gray-400 shadow-sm whitespace-nowrap"
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl border-2 border-gray-50 bg-white hover:bg-gray-900 hover:text-white transition-all text-gray-400 shadow-sm whitespace-nowrap"
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
