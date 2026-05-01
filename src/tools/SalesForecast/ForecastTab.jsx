import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle2, Trophy, Clock } from 'lucide-react';
import { projectValue, getStatusDetails } from '../../utils/salesForecastLogic';

const ForecastTab = ({ data, periodProgress, setPeriodProgress }) => {
  const currentDay = periodProgress.currentDay;
  const totalDays = periodProgress.totalDays;
  const progressPercent = (currentDay / totalDays) * 100;
  const remainingDays = totalDays - currentDay;

  const forecastData = useMemo(() => {
    // Aggregate by MR
    const mrMap = {};
    data.forEach(r => {
      if (!mrMap[r.mrName]) {
        mrMap[r.mrName] = { 
          name: r.mrName, 
          sales: 0, 
          target: 0, 
          salesValue: 0,
          targetValue: 0
        };
      }
      mrMap[r.mrName].sales += r.salesUnit;
      mrMap[r.mrName].target += r.targetUnit;
      mrMap[r.mrName].salesValue += r.salesValue;
      mrMap[r.mrName].targetValue += r.targetValue;
    });

    return Object.values(mrMap).map(mr => {
      const projUnits = projectValue(mr.sales, progressPercent);
      const projValue = projectValue(mr.salesValue, progressPercent);
      const projAch = mr.target > 0 ? (projUnits / mr.target) * 100 : 0;
      const status = getStatusDetails(projAch);
      const gap = mr.target - projUnits;
      const dailyRateNeeded = remainingDays > 0 ? Math.max(0, gap / remainingDays) : 0;

      return {
        ...mr,
        currentAch: mr.target > 0 ? (mr.sales / mr.target) * 100 : 0,
        projectedUnits: projUnits,
        projectedValue: projValue,
        projectedAch: projAch,
        status,
        gap,
        dailyRateNeeded
      };
    });
  }, [data, progressPercent, remainingDays]);

  const summary = useMemo(() => {
    const totalProjUnits = forecastData.reduce((sum, d) => sum + d.projectedUnits, 0);
    const totalTargetUnits = forecastData.reduce((sum, d) => sum + d.target, 0);
    const totalProjValue = forecastData.reduce((sum, d) => sum + d.projectedValue, 0);
    const overallProjAch = totalTargetUnits > 0 ? (totalProjUnits / totalTargetUnits) * 100 : 0;
    
    const onTrack = forecastData.filter(d => d.projectedAch >= 100).length;
    const atRisk = forecastData.filter(d => d.projectedAch < 95).length;
    const totalGap = forecastData.reduce((sum, d) => sum + Math.max(0, d.target - d.projectedUnits), 0);

    return {
      totalProjUnits,
      totalProjValue,
      overallProjAch,
      onTrack,
      atRisk,
      totalGap
    };
  }, [forecastData]);

  return (
    <div className="space-y-6 pb-20">
      {/* PERIOD SETTINGS */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-widest">Period Progress</h3>
            <p className="text-[10px] text-gray-500 font-medium mt-1">Configure current timeline</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
          <div className="flex flex-col items-center w-full sm:w-auto">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Day</span>
            <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-full sm:w-auto justify-center">
              <button 
                onClick={() => setPeriodProgress(prev => ({ ...prev, currentDay: Math.max(1, prev.currentDay - 1) }))}
                className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-gray-100 font-bold"
              >-</button>
              <span className="w-8 text-center font-black text-gray-900">{currentDay}</span>
              <button 
                onClick={() => setPeriodProgress(prev => ({ ...prev, currentDay: Math.min(totalDays, prev.currentDay + 1) }))}
                className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-gray-100 font-bold"
              >+</button>
            </div>
          </div>

          <div className="flex flex-col items-center w-full sm:w-auto">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Days</span>
            <select 
              value={totalDays}
              onChange={(e) => setPeriodProgress(prev => ({ ...prev, totalDays: parseInt(e.target.value) }))}
              className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-auto"
            >
              {[28, 29, 30, 31].map(d => <option key={d} value={d}>{d} Days</option>)}
            </select>
          </div>

          <div className="hidden sm:block h-12 w-[1px] bg-gray-100" />

          <div className="text-center sm:text-right w-full sm:w-auto">
            <div className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight">{progressPercent.toFixed(1)}%</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Month Complete</div>
          </div>
        </div>
      </div>

      {/* FORECAST SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <FStat label="Projected Total Units" value={summary.totalProjUnits.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
        <FStat label="Projected Total Value" value={`$${summary.totalProjValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <FStat 
          label="Proj. Achievement" 
          value={`${summary.overallProjAch.toFixed(1)}%`} 
          highlight={summary.overallProjAch >= 100 ? 'text-emerald-500' : 'text-amber-500'}
        />
        <FStat label="MRs on Track" value={summary.onTrack} icon={<CheckCircle2 size={16} className="text-emerald-500" />} />
        <FStat label="MRs At Risk" value={summary.atRisk} icon={<AlertCircle size={16} className="text-red-500" />} />
        <FStat label="Total Units Gap" value={summary.totalGap.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={<Trophy size={16} className="text-purple-500" />} />
      </div>

      {/* CHART */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Current vs Projected vs Target</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecastData.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Bar dataKey="sales" name="Current Units" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={25} />
              <Bar dataKey="projectedUnits" name="Projected Units" fill="#93C5FD" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="target" name="Target Units" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORECAST TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Projection Analysis Table</h3>
        </div>
        <div className="w-full overflow-x-auto rounded-xl">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/50">
                <TH label="MR" />
                <TH label="Current Units" align="right" />
                <TH label="Current %" align="right" />
                <TH label="Projected Units" align="right" />
                <TH label="Projected %" align="right" />
                <TH label="Gap" align="right" />
                <TH label="Daily Rate Needed" align="right" />
                <TH label="Status" align="center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forecastData.map((d, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-gray-900">{d.name}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600 text-right">{d.sales.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-400 text-right">{d.currentAch.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-xs font-black text-gray-900 text-right">{d.projectedUnits.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-xs font-black ${d.status.color}`}>{d.projectedAch.toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500 text-right">{d.gap > 0 ? d.gap.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'Surplus'}</td>
                  <td className="px-6 py-4 text-xs font-bold text-blue-600 text-right">{d.dailyRateNeeded.toFixed(1)}/day</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${d.status.bg} ${d.status.color}`}>
                      {d.status.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FStat = ({ label, value, highlight = 'text-gray-900', icon }) => (
  <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
      {label}
      {icon}
    </div>
    <div className={`text-xl font-black tracking-tight ${highlight}`}>{value}</div>
  </div>
);

const TH = ({ label, align = 'left' }) => (
  <th className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-${align} border-b border-gray-100`}>
    {label}
  </th>
);

export default ForecastTab;
