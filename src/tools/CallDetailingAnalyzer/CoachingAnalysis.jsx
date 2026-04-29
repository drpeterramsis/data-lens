import React, { useMemo } from 'react';
import { GraduationCap, UserCheck } from 'lucide-react';

const CoachingAnalysis = ({ data = [] }) => {
  const stats = useMemo(() => {
    if (!data) return { total: 0, mrCoaching: 0, mgrCoaching: 0, mrBreakdown: {}, types: {} };
    const total = data.length;
    const mrCoaching = data.filter(d => d.IsMRCoachingSubmitted === 'True').length;
    const mgrCoaching = data.filter(d => d.IsManagerCoachingSubmitted === 'True').length;

    const mrBreakdown = data.reduce((acc, d) => {
      const name = d.MrName;
      if (!acc[name]) acc[name] = { total: 0, coached: 0, lastDate: '' };
      acc[name].total++;
      if (d.IsMRCoachingSubmitted === 'True') {
        acc[name].coached++;
        if (d.ReportDate > acc[name].lastDate) acc[name].lastDate = d.ReportDate;
      }
      return acc;
    }, {});

    const types = data.reduce((acc, d) => {
      if (d.CoachingType && d.CoachingType !== 'None') {
        acc[d.CoachingType] = (acc[d.CoachingType] || 0) + 1;
      }
      return acc;
    }, {});

    return { total, mrCoaching, mgrCoaching, mrBreakdown, types };
  }, [data]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-soft mt-8 p-6">
      <div className="flex items-center gap-3 mb-8">
        <GraduationCap size={18} className="text-accent" />
        <h3 className="font-bold text-gray-900 border-b-2 border-accent/20">Supervision & Coaching Analysis</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         {[
           { label: 'Total Coached MRs', val: Object.values(stats.mrBreakdown).filter(m => m.coached >= 4).length, color: 'text-success', bg: 'bg-green-50' },
           { label: 'MRs with 0 Coaching', val: Object.values(stats.mrBreakdown).filter(m => m.coached === 0).length, color: 'text-danger', bg: 'bg-red-50' },
           { label: 'Total Coaching Sessions', val: stats.mrCoaching, color: 'text-blue-500', bg: 'bg-blue-50' },
           { label: 'Coaching Coverage %', val: ((Object.values(stats.mrBreakdown).filter(m => m.coached >= 4).length / Math.max(Object.values(stats.mrBreakdown).length, 1)) * 100).toFixed(1), color: 'text-purple-500', bg: 'bg-purple-50', isPct: true }
         ].map((card, i) => (
           <div key={i} className={`p-4 rounded-xl border border-gray-100 ${card.bg}`}>
              <p className="text-[10px] font-black uppercase text-gray-400 mb-1 leading-none">{card.label}</p>
              <p className={`text-xl font-black ${card.color}`}>{card.val}{card.isPct && '%'}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">
              Representative Level Status
            </div>
            <div className="max-h-64 overflow-y-auto">
               <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(stats.mrBreakdown).sort((a,b) => b[1].total - a[1].total).map(([name, data]) => (
                      <tr key={name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-900">{name}</td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${data.coached > 0 ? 'bg-success' : 'bg-gray-200'}`} style={{ width: `${(data.coached/data.total)*100}%` }} />
                             </div>
                             <span className="font-black text-gray-700 w-8 text-right">{data.coached}</span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
         </div>

         <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
           <div className="p-3 bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">
              Coaching Type Segmentation
            </div>
            <div className="p-4 space-y-3">
               {Object.entries(stats.types).length > 0 ? Object.entries(stats.types).map(([type, count]) => (
                 <div key={type} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                       <span className="truncate pr-4">{type}</span>
                       <span>{count} interactions</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-accent" style={{ width: `${(count/stats.mrCoaching)*100}%` }} />
                    </div>
                 </div>
               )) : (
                 <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                    <UserCheck size={32} strokeWidth={1} />
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2">No Specific Schema Data</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default CoachingAnalysis;
