import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine, CartesianGrid } from 'recharts';
import { AlertTriangle, AlertCircle, ShieldAlert, Target, TrendingDown } from 'lucide-react';
import { projectValue, getQuadrant } from '../../utils/salesForecastLogic';

const AtRiskAnalysisTab = ({ data, periodProgress }) => {
  const currentDay = periodProgress.currentDay;
  const totalDays = periodProgress.totalDays;
  const progressPercent = (currentDay / totalDays) * 100;

  const riskData = useMemo(() => {
    const mrMap = {};
    data.forEach(r => {
      if (!mrMap[r.mrName]) mrMap[r.mrName] = { name: r.mrName, area: r.areaName, sales: 0, target: 0, products: {} };
      mrMap[r.mrName].sales += r.salesUnit;
      mrMap[r.mrName].target += r.targetUnit;
      
      // Store product achievement for this MR
      if (!mrMap[r.mrName].products[r.productName]) {
        mrMap[r.mrName].products[r.productName] = { name: r.productName, sales: 0, target: 0 };
      }
      mrMap[r.mrName].products[r.productName].sales += r.salesUnit;
      mrMap[r.mrName].products[r.productName].target += r.targetUnit;
    });

    return Object.values(mrMap).map(mr => {
      const currentAch = mr.target > 0 ? (mr.sales / mr.target) * 100 : 0;
      const projectedAch = projectValue(currentAch, progressPercent);
      const gap = Math.max(0, mr.target - projectValue(mr.sales, progressPercent));
      const quadrant = getQuadrant(currentAch, projectedAch);

      // Identify bottom 3 products dragging performance
      const productPerformance = Object.values(mr.products)
        .map(p => ({
          name: p.name,
          ach: p.target > 0 ? (p.sales / p.target) * 100 : 0,
          gap: Math.max(0, p.target - p.sales)
        }))
        .filter(p => p.ach < 100)
        .sort((a, b) => a.ach - b.ach);

      return {
        ...mr,
        x: currentAch,
        y: projectedAch,
        gap,
        quadrant,
        bottomProducts: productPerformance.slice(0, 3)
      };
    });
  }, [data, progressPercent]);

  const atRiskMRs = useMemo(() => riskData.filter(d => d.y < 95).sort((a, b) => a.y - b.y), [riskData]);

  const riskSummary = useMemo(() => {
    return {
      totalAtRisk: atRiskMRs.length,
      criticalMRs: atRiskMRs.filter(d => d.y < 75).length,
      totalGap: atRiskMRs.reduce((sum, d) => sum + d.gap, 0)
    };
  }, [atRiskMRs]);

  return (
    <div className="space-y-6 pb-20">
      {/* RISK SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <RiskCard label="Total At Risk MRs" value={riskSummary.totalAtRisk} icon={<AlertTriangle className="text-amber-500" />} />
        <RiskCard label="Total At Risk Gap" value={riskSummary.totalGap.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={<TrendingDown className="text-red-500" />} />
        <RiskCard label="Critical MRs (<75%)" value={riskSummary.criticalMRs} icon={<AlertCircle className="text-red-600" />} />
        <RiskCard label="Avg Risk Score" value={(riskSummary.totalAtRisk / (riskData.length || 1) * 100).toFixed(1) + '%'} icon={<ShieldAlert className="text-purple-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RISK MATRIX (SCATTER) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Risk Matrix (Current vs Projected)</h3>
          <div className="h-[450px] relative">
             <div className="absolute top-0 right-0 p-2 text-[9px] font-black text-emerald-500 uppercase">Safe Zone</div>
             <div className="absolute top-0 left-[20%] p-2 text-[9px] font-black text-blue-500 uppercase">Recovering</div>
             <div className="absolute bottom-0 right-[20%] p-2 text-[9px] font-black text-amber-500 uppercase">At Risk</div>
             <div className="absolute bottom-0 left-[20%] p-2 text-[9px] font-black text-red-500 uppercase">Critical</div>
             
             <ResponsiveContainer width="100%" height="100%">
               <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                 <XAxis type="number" dataKey="x" name="Current Ach %" unit="%" domain={[0, 150]} tick={{ fontSize: 9 }} label={{ value: 'Current Achievement %', position: 'bottom', fontSize: 10, fontWeight: 900 }} />
                 <YAxis type="number" dataKey="y" name="Projected Ach %" unit="%" domain={[0, 150]} tick={{ fontSize: 9 }} label={{ value: 'Projected Achievement %', angle: -90, position: 'left', fontSize: 10, fontWeight: 900 }} />
                 <ZAxis range={[60, 400]} />
                 <ReferenceLine x={100} stroke="#E5E7EB" strokeWidth={2} />
                 <ReferenceLine y={100} stroke="#E5E7EB" strokeWidth={2} />
                 <ReferenceLine x={75} stroke="#F87171" strokeDasharray="5 5" />
                 <ReferenceLine y={75} stroke="#F87171" strokeDasharray="5 5" />
                 <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                 <Scatter data={riskData} fill="#8884d8">
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.y >= 100 ? '#10B981' : entry.y >= 95 ? '#3B82F6' : entry.y >= 75 ? '#F59E0B' : '#EF4444'} />
                    ))}
                 </Scatter>
               </ScatterChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* AT RISK MR LIST */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
           {atRiskMRs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white rounded-3xl border border-dashed border-gray-200">
               <ShieldAlert size={48} className="text-emerald-500 mb-4" />
               <h4 className="text-sm font-black text-gray-900 uppercase mb-2">Everything is Safe</h4>
               <p className="text-xs text-gray-400 font-medium italic">No MRs are currently at risk of missing their targets.</p>
             </div>
           ) : (
             atRiskMRs.map((mr, idx) => (
               <div key={idx} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-all">
                 <div className="flex-1">
                   <div className="flex items-center gap-3 mb-4">
                     <div className={`w-3 h-3 rounded-full ${mr.y < 75 ? 'bg-red-500' : 'bg-amber-500'}`} />
                     <div>
                       <h4 className="text-sm font-black text-gray-900 leading-tight">{mr.name}</h4>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{mr.area}</span>
                     </div>
                     <span className={`ml-auto px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${mr.y < 75 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                       {mr.y < 75 ? 'Critical' : 'At Risk'}
                     </span>
                   </div>
                   
                   <div className="space-y-3 mb-4">
                     <div className="flex justify-between text-[10px] font-normal text-gray-400">
                        <span>Current Achievement</span>
                        <span className="font-black text-gray-900">{mr.x.toFixed(1)}%</span>
                     </div>
                     <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-1000 ${mr.y < 75 ? 'bg-red-400' : 'bg-amber-400'}`}
                         style={{ width: `${Math.min(100, mr.x)}%` }}
                       />
                     </div>
                   </div>

                   <div className="flex flex-wrap gap-2">
                     {mr.bottomProducts.map((p, i) => (
                       <span key={i} className="px-2 py-1 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 border border-gray-100">
                         {p.name} <span className="text-red-400">-{p.gap.toLocaleString()}</span>
                       </span>
                     ))}
                   </div>
                 </div>

                 <div className="md:w-32 flex flex-col items-center justify-center border-l border-gray-50 pl-6 text-center">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Projected</div>
                    <div className={`text-xl font-black ${mr.y < 75 ? 'text-red-500' : 'text-amber-500'} mb-3`}>{mr.y.toFixed(1)}%</div>
                    <div className="text-[8px] font-black text-gray-300 uppercase leading-[1]">Needs approx.</div>
                    <div className="text-sm font-black text-blue-600">{(mr.gap / (30 - currentDay)).toFixed(0)} units/day</div>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

const RiskCard = ({ label, value, icon }) => (
  <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-center justify-between group hover:border-gray-900 transition-colors">
    <div>
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</div>
      <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
    </div>
    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center grayscale group-hover:grayscale-0 transition-all">
      {icon}
    </div>
  </div>
);

export default AtRiskAnalysisTab;
