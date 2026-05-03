import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend } from 'recharts';
import { Target, TrendingDown, Zap, ShieldAlert } from 'lucide-react';
import { formatKpi, formatKpiGrouped, formatKpiPercent } from '../../utils/formatNumber';
import { projectValue, getDifficultyDetails } from '../../utils/salesForecastLogic';

const GapAnalysisTab = ({ data, periodProgress }) => {
  const currentDay = periodProgress.currentDay;
  const totalDays = periodProgress.totalDays;
  const remainingDays = totalDays - currentDay;
  const progressPercent = (currentDay / totalDays) * 100;

  const gapSummary = useMemo(() => {
    const mrMap = {};
    data.forEach(r => {
      if (!mrMap[r.mrName]) mrMap[r.mrName] = { name: r.mrName, sales: 0, target: 0, value: 0, targetValue: 0 };
      mrMap[r.mrName].sales += r.salesUnit;
      mrMap[r.mrName].target += r.targetUnit;
      mrMap[r.mrName].value += r.salesValue;
      mrMap[r.mrName].targetValue += r.targetValue;
    });

    const mrs = Object.values(mrMap);
    const totalUnitsGap = mrs.reduce((sum, m) => sum + Math.max(0, m.target - m.sales), 0);
    const totalValueGap = mrs.reduce((sum, m) => sum + Math.max(0, m.targetValue - m.value), 0);
    const hitTargetCount = mrs.filter(m => m.sales >= m.target).length;

    return {
      totalUnitsGap,
      totalValueGap,
      percentHitTarget: mrs.length > 0 ? (hitTargetCount / mrs.length) * 100 : 0,
      mrGaps: mrs.map(m => {
        const gap = m.target - m.sales;
        const dailyRate = m.sales / (currentDay || 1);
        const dailyNeeded = remainingDays > 0 ? Math.max(0, gap / remainingDays) : 0;
        const difficulty = getDifficultyDetails(dailyNeeded, dailyRate);
        
        return {
          ...m,
          gap,
          gapValue: m.targetValue - m.value,
          gapPercent: m.target > 0 ? (gap / m.target) * 100 : 0,
          dailyNeeded,
          difficulty
        };
      }).sort((a, b) => b.gap - a.gap)
    };
  }, [data, currentDay, remainingDays]);

  const waterfallData = useMemo(() => {
    // Show top 10 gaps vs total
    return gapSummary.mrGaps.slice(0, 10).map(mr => ({
      name: mr.name,
      gap: mr.gap,
      isGap: mr.gap > 0
    }));
  }, [gapSummary]);

  return (
    <div className="space-y-6 pb-20">
      {/* GAP SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GapCard 
          label="Total Units Gap" 
          value={formatKpiGrouped(gapSummary.totalUnitsGap)} 
          sub="Remaining to hit 100% Target"
          icon={<Target className="text-red-500" />}
        />
        <GapCard 
          label="Total Value Gap" 
          value={`$${formatKpiGrouped(gapSummary.totalValueGap)}`} 
          sub="Potential Revenue Remaining"
          icon={<Zap className="text-amber-500" />}
        />
        <GapCard 
          label="MR Success Rate" 
          value={formatKpiPercent(gapSummary.percentHitTarget)} 
          sub="MRs who already achieved 100%"
          icon={<ShieldAlert className={`text-${gapSummary.percentHitTarget > 50 ? 'emerald' : 'red'}-500`} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waterfall Chart */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Top Gaps Contribution</h3>
          <div className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={waterfallData} layout="vertical">
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F3F5" />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                 <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                 <Bar dataKey="gap" radius={[0, 4, 4, 0]}>
                   {waterfallData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.gap > 0 ? '#EF4444' : '#10B981'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* GAP TABLE */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Bridging the Gap</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <TH label="MR" />
                  <TH label="Current" align="right" />
                  <TH label="Target" align="right" />
                  <TH label="Remaining Gap" align="right" />
                  <TH label="Daily Rate Req." align="right" />
                  <TH label="Difficulty" align="center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gapSummary.mrGaps.map((mr, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-900">{mr.name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-400 text-right">{formatKpiGrouped(mr.sales)}</td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-400 text-right">{formatKpiGrouped(mr.target)}</td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-xs font-black text-red-600">{mr.gap > 0 ? formatKpiGrouped(mr.gap) : 'Surplus'}</span>
                       <div className="text-[10px] font-bold text-gray-400">{formatKpiPercent(mr.gapPercent)} remaining</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-blue-600 text-right">{formatKpi(mr.dailyNeeded)}/day</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${mr.difficulty.bg} ${mr.difficulty.color}`}>
                         {mr.difficulty.label}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const GapCard = ({ label, value, sub, icon }) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      {React.cloneElement(icon, { size: 64 })}
    </div>
    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</div>
    <div className="text-3xl font-black text-gray-900 mb-2">{value}</div>
    <div className="text-[11px] font-bold text-gray-500 italic">{sub}</div>
  </div>
);

const TH = ({ label, align = 'left' }) => (
  <th className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-${align} border-b border-gray-100`}>
    {label}
  </th>
);

export default GapAnalysisTab;
