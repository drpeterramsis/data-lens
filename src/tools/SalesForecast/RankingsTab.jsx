import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import { formatKpi, formatKpiGrouped, formatKpiPercent } from '../../utils/formatNumber';

const RankingsTab = ({ data }) => {
  const [mrRankMetric, setMrRankMetric] = useState('achUnits'); // achUnits, achValue, achPoints, absUnits, absValue

  const mrRankings = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const key = r.mrName;
      if (!map[key]) {
        map[key] = { 
          name: r.mrName, area: r.areaName, line: r.lineName,
          salesUnits: 0, targetUnits: 0, salesValue: 0, targetValue: 0, 
          points: 0, targetPoints: 0 
        };
      }
      map[key].salesUnits += r.salesUnit;
      map[key].targetUnits += r.targetUnit;
      map[key].salesValue += r.salesValue;
      map[key].targetValue += r.targetValue;
      map[key].points += r.salesPoints;
      map[key].targetPoints += r.targetPoints;
    });

    const list = Object.values(map).map(mr => ({
      ...mr,
      achUnits: mr.targetUnits > 0 ? (mr.salesUnits / mr.targetUnits) * 100 : 0,
      achValue: mr.targetValue > 0 ? (mr.salesValue / mr.targetValue) * 100 : 0,
      achPoints: mr.targetPoints > 0 ? (mr.points / mr.targetPoints) * 100 : 0
    }));

    const sortedByMetric = [...list].sort((a, b) => {
      if (mrRankMetric === 'achUnits') return b.achUnits - a.achUnits;
      if (mrRankMetric === 'achValue') return b.achValue - a.achValue;
      if (mrRankMetric === 'achPoints') return b.achPoints - a.achPoints;
      if (mrRankMetric === 'absUnits') return b.salesUnits - a.salesUnits;
      if (mrRankMetric === 'absValue') return b.salesValue - a.salesValue;
      return 0;
    });

    const average = sortedByMetric.reduce((sum, item) => {
      const val = mrRankMetric.startsWith('ach') ? item[mrRankMetric] : item[mrRankMetric === 'absUnits' ? 'salesUnits' : 'salesValue'];
      return sum + val;
    }, 0) / (sortedByMetric.length || 1);

    const best = sortedByMetric[0] ? (mrRankMetric.startsWith('ach') ? sortedByMetric[0][mrRankMetric] : sortedByMetric[0][mrRankMetric === 'absUnits' ? 'salesUnits' : 'salesValue']) : 1;

    return sortedByMetric.map((mr, idx) => ({
      ...mr,
      rank: idx + 1,
      metricVal: mrRankMetric.startsWith('ach') ? mr[mrRankMetric] : mr[mrRankMetric === 'absUnits' ? 'salesUnits' : 'salesValue'],
      vsAverage: ((mrRankMetric.startsWith('ach') ? mr[mrRankMetric] : mr[mrRankMetric === 'absUnits' ? 'salesUnits' : 'salesValue']) / average * 100) - 100,
      vsBest: ((mrRankMetric.startsWith('ach') ? mr[mrRankMetric] : mr[mrRankMetric === 'absUnits' ? 'salesUnits' : 'salesValue']) / best * 100)
    }));
  }, [data, mrRankMetric]);

  const productRankings = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const key = r.productName;
      if (!map[key]) {
        map[key] = { name: r.productName, code: r.productCode, units: 0, value: 0, targetUnits: 0, mrs: new Set() };
      }
      map[key].units += r.salesUnit;
      map[key].value += r.salesValue;
      map[key].targetUnits += r.targetUnit;
      if (r.salesUnit > 0) map[key].mrs.add(r.mrName);
    });

    return Object.values(map)
      .map(p => ({
        ...p,
        achievement: p.targetUnits > 0 ? (p.units / p.targetUnits) * 100 : 0,
        mrCount: p.mrs.size
      }))
      .sort((a, b) => b.units - a.units);
  }, [data]);

  const lineRankings = useMemo(() => {
    const map = {};
    data.forEach(r => {
      if (!map[r.lineName]) map[r.lineName] = { name: r.lineName, units: 0, target: 0 };
      map[r.lineName].units += r.salesUnit;
      map[r.lineName].target += r.targetUnit;
    });
    return Object.values(map)
      .map(l => ({
        ...l,
        achievement: l.target > 0 ? (l.units / l.target) * 100 : 0
      }))
      .sort((a, b) => b.achievement - a.achievement);
  }, [data]);

  return (
    <div className="space-y-10 pb-20">
      {/* MR RANKINGS SECTION */}
      <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">MR Performance Rankings</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Top performers across the organization</p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-2xl">
            {[
              { id: 'achUnits', label: 'Units Ach.' },
              { id: 'achValue', label: 'Value Ach.' },
              { id: 'absUnits', label: 'Abs. Units' },
              { id: 'absValue', label: 'Abs. Value' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMrRankMetric(m.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  mrRankMetric === m.id ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <TH label="Rank" align="center" />
                <TH label="MR Name" />
                <TH label="Line" />
                <TH label={mrRankMetric.startsWith('ach') ? 'Achievement %' : 'Total Units/Value'} align="right" />
                <TH label="vs Average" align="right" />
                <TH label="Perf Score" align="center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mrRankings.map((mr) => (
                <tr key={mr.name} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-5 text-center">
                    <RankBadge rank={mr.rank} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-black text-gray-900 text-sm leading-tight">{mr.name}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{mr.area}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{mr.line}</span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-gray-900">
                    {mrRankMetric.startsWith('ach') ? formatKpiPercent(mr.metricVal) : formatKpiGrouped(mr.metricVal)}
                  </td>
                  <td className={`px-6 py-5 text-right font-bold text-xs ${mr.vsAverage >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {mr.vsAverage >= 0 ? '+' : ''}{formatKpiPercent(mr.vsAverage)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden min-w-[80px]">
                      <div 
                        className={`h-full transition-all duration-1000 ${mr.metricVal >= 100 ? 'bg-emerald-500' : mr.metricVal >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, mr.vsBest)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PRODUCT RANKINGS */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
             <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Top Products by Volume</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-gray-50/50">
                    <TH label="#" align="center" />
                    <TH label="Product" />
                    <TH label="Volume" align="right" />
                    <TH label="Ach%" align="right" />
                    <TH label="MRs" align="center" />
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 text-xs">
                 {productRankings.slice(0, 10).map((p, i) => (
                   <tr key={i} className="hover:bg-gray-50">
                     <td className="px-6 py-4 text-center font-black text-gray-400">{i + 1}</td>
                     <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                     <td className="px-6 py-4 text-right font-black">{formatKpiGrouped(p.units)}</td>
                     <td className={`px-6 py-4 text-right font-black ${p.achievement >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                       {formatKpiPercent(p.achievement)}
                     </td>
                     <td className="px-6 py-4 text-center">
                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black">{formatKpiGrouped(p.mrCount)}</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </section>

        {/* LINE RANKINGS */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
             <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Line Achievement Rankings</h3>
          </div>
          <div className="p-6 space-y-6">
            {lineRankings.map((l, i) => (
              <div key={i} className="space-y-2">
                 <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{l.name}</span>
                  <span className={`text-xs font-black ${l.achievement >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatKpiPercent(l.achievement)}</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-xl overflow-hidden relative">
                   <div 
                     className={`h-full absolute top-0 left-0 transition-all ${l.achievement >= 100 ? 'bg-emerald-500' : l.achievement >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                     style={{ width: `${Math.min(100, l.achievement)}%` }}
                   />
                   <div className="absolute inset-0 flex items-center justify-end px-3">
                     <span className="text-[9px] font-black text-gray-400 uppercase">{formatKpiGrouped(l.units)} / {formatKpiGrouped(l.target)} Units</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const RankBadge = ({ rank }) => {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner"><Crown size={18} /></div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-inner"><Medal size={18} /></div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mx-auto shadow-inner"><Medal size={18} /></div>;
  return <span className="text-xs font-black text-gray-300">{rank}</span>;
};

const TH = ({ label, align = 'left' }) => (
  <th className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-${align} border-b border-gray-100`}>
    {label}
  </th>
);

export default RankingsTab;
