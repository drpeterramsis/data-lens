import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend, Cell } from 'recharts';
import { Download } from 'lucide-react';

const OverviewTab = ({ data }) => {
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const totalSalesUnits = data.reduce((sum, r) => sum + r.salesUnit, 0);
    const totalSalesValue = data.reduce((sum, r) => sum + r.salesValue, 0);
    const totalTargetUnits = data.reduce((sum, r) => sum + r.targetUnit, 0);
    const totalTargetValue = data.reduce((sum, r) => sum + r.targetValue, 0);
    const totalPoints = data.reduce((sum, r) => sum + r.salesPoints, 0);
    const overallAchievement = totalTargetUnits > 0 ? (totalSalesUnits / totalTargetUnits) * 100 : 0;

    return {
      totalSalesUnits,
      totalSalesValue,
      totalTargetUnits,
      totalTargetValue,
      overallAchievement,
      totalPoints
    };
  }, [data]);

  const chartData = useMemo(() => {
    // Group achievement by MR
    const mrMap = {};
    data.forEach(r => {
      if (!mrMap[r.mrName]) mrMap[r.mrName] = { name: r.mrName, sales: 0, target: 0 };
      mrMap[r.mrName].sales += r.salesUnit;
      mrMap[r.mrName].target += r.targetUnit;
    });

    return Object.values(mrMap)
      .map(mr => ({
        ...mr,
        achievement: mr.target > 0 ? (mr.sales / mr.target) * 100 : 0
      }))
      .sort((a, b) => b.achievement - a.achievement);
  }, [data]);

  const mrTableData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const key = `${r.mrName}-${r.areaName}`;
      if (!map[key]) {
        map[key] = {
          mrName: r.mrName,
          area: r.areaName,
          line: r.lineName,
          salesUnits: 0,
          targetUnits: 0,
          salesValue: 0,
          targetValue: 0,
          points: 0,
          targetPoints: 0
        };
      }
      map[key].salesUnits += r.salesUnit;
      map[key].targetUnits += r.targetUnit;
      map[key].salesValue += r.salesValue;
      map[key].targetValue += r.targetValue;
      map[key].points += r.salesPoints;
      map[key].targetPoints += r.targetPoints;
    });
    return Object.values(map);
  }, [data]);

  if (!stats) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard label="Total Sales Units" value={stats.totalSalesUnits.toLocaleString()} />
        <SummaryCard label="Total Sales Value" value={`$${stats.totalSalesValue.toLocaleString()}`} />
        <SummaryCard label="Total Target Units" value={stats.totalTargetUnits.toLocaleString()} />
        <SummaryCard label="Total Target Value" value={`$${stats.totalTargetValue.toLocaleString()}`} />
        <SummaryCard 
          label="Overall Achievement" 
          value={`${stats.overallAchievement.toFixed(1)}%`} 
          badge={`${stats.overallAchievement.toFixed(0)}%`}
          badgeColor={stats.overallAchievement >= 100 ? 'bg-emerald-100 text-emerald-600' : stats.overallAchievement >= 75 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}
        />
        <SummaryCard label="Total Points" value={stats.totalPoints.toLocaleString()} icon="🎯" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART */}
        <div className="lg:col-span-12 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">MR Achievement Distribution</h3>
          <div className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F3F5" />
                 <XAxis type="number" domain={[0, 120]} hide />
                 <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fontWeight: 700, fill: '#6C757D' }} axisLine={false} tickLine={false} />
                 <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                   formatter={(val) => [`${val.toFixed(1)}%`, 'Achievement']}
                 />
                 <ReferenceLine x={100} stroke="#6B7280" strokeDasharray="5 5" label={{ position: 'top', value: 'Target', fontSize: 10, fontWeight: 900, fill: '#6B7280' }} />
                 <Bar dataKey="achievement" radius={[0, 4, 4, 0]} barSize={20}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.achievement >= 100 ? '#10B981' : entry.achievement >= 75 ? '#F59E0B' : '#EF4444'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* TABLE */}
        <div className="lg:col-span-12 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest text-[16px]">Performance Breakdown</h3>
            <button className="w-full sm:w-auto px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold transition-all hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center gap-2">
              <Download size={16} />
              Export CSV
            </button>
          </div>
          <div className="w-full overflow-x-auto rounded-xl">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <TH label="MR Name" />
                  <TH label="Area" className="hidden sm:table-cell" />
                  <TH label="Line" className="hidden lg:table-cell" />
                  <TH label="Sales Units" align="right" />
                  <TH label="Target Units" align="right" />
                  <TH label="Ach %" align="right" />
                  <TH label="Sales Value" align="right" />
                  <TH label="Points" align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mrTableData.map((mr, idx) => {
                  const ach = mr.targetUnits > 0 ? (mr.salesUnits / mr.targetUnits) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-gray-900">{mr.mrName}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">{mr.area}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">{mr.line}</td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-900 text-right">{mr.salesUnits.toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400 text-right">{mr.targetUnits.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${ach >= 100 ? 'bg-emerald-100 text-emerald-600' : ach >= 75 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                          {ach.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-900 text-right">${mr.salesValue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs font-bold text-blue-600 text-right">{mr.points.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, badge, badgeColor, icon }) => (
  <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      {icon && <span className="text-lg">{icon}</span>}
      {badge && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badgeColor}`}>{badge}</span>}
    </div>
    <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
  </div>
);

const TH = ({ label, align = 'left' }) => (
  <th className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-${align} border-b border-gray-100`}>
    {label}
  </th>
);

export default OverviewTab;
