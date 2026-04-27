import React, { useMemo } from 'react';
import { PieChart, List } from 'lucide-react';

const InteractionAnalysis = ({ data }) => {
  const stats = useMemo(() => {
    const total = data.length;
    const types = data.reduce((acc, d) => {
      acc[d.InteractionType] = (acc[d.InteractionType] || 0) + 1;
      return acc;
    }, {});

    const specialties = data.filter(d => d.InteractionType === 'HCP').reduce((acc, d) => {
      const s = d.Specialty || 'Not Specified';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const grades = data.reduce((acc, d) => {
      const g = d.CustomerGrade || 'Blank';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});

    return { total, types, specialties, grades };
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Type Breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <PieChart size={18} className="text-accent" />
          <h3 className="font-bold text-gray-900 border-b-2 border-accent/20">Interaction Segmentation</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-1 mb-8">
          {['HCP', 'HCO', 'Pharmacy'].map(type => {
            const count = stats.types[type] || 0;
            const pct = ((count / stats.total) * 100).toFixed(1);
            return (
              <div key={type} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-accent/40 transition-all">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{type}</p>
                <p className="text-xl font-black text-gray-900">{count}</p>
                <p className="text-[10px] font-bold text-accent">{pct}%</p>
              </div>
            );
          })}
        </div>

        <div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <List size={10} /> Specialty Focus (HCP Only)
           </p>
           <div className="space-y-2">
              {Object.entries(stats.specialties).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                   <span className="font-medium text-gray-600">{name}</span>
                   <div className="flex items-center gap-3 flex-1 px-4">
                      <div className="h-1.5 bg-gray-100 flex-1 rounded-full overflow-hidden">
                         <div className="h-full bg-accent" style={{ width: `${(count/stats.total)*100}%` }} />
                      </div>
                   </div>
                   <span className="font-bold text-gray-900">{count}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <PieChart size={18} className="text-accent" />
          <h3 className="font-bold text-gray-900 border-b-2 border-accent/20">Customer Grade Mix</h3>
        </div>

        <div className="space-y-4">
           {['A+', 'A', 'B', 'C', 'Blank'].map(grade => {
             const count = stats.grades[grade] || 0;
             const pct = ((count / stats.total) * 100).toFixed(1);
             const colors = {
               'A+': 'bg-amber-400',
               'A': 'bg-success',
               'B': 'bg-blue-400',
               'C': 'bg-gray-400',
               'Blank': 'bg-gray-200'
             };
             return (
               <div key={grade} className="flex items-center gap-4">
                  <div className={`w-8 text-center font-black text-xs ${grade === 'A+' ? 'text-amber-500' : 'text-gray-400'}`}>{grade}</div>
                  <div className="flex-1 h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                     <div className={`h-full ${colors[grade] || 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-16 text-right">
                     <span className="text-xs font-black text-gray-800">{count}</span>
                     <span className="text-[9px] text-gray-400 ml-1">({pct}%)</span>
                  </div>
               </div>
             );
           })}
        </div>
        
        <div className="mt-8 p-4 bg-accent/5 rounded-xl border border-accent/10">
           <p className="text-[10px] text-accent-dark font-medium leading-relaxed italic">
             Targeting efficiency: <span className="font-black">{( (( (stats.grades['A+']||0) + (stats.grades['A']||0) ) / stats.total) * 100 ).toFixed(1)}%</span> of calls were directed to core priority segments (A+ & A).
           </p>
        </div>
      </div>
    </div>
  );
};

export default InteractionAnalysis;
