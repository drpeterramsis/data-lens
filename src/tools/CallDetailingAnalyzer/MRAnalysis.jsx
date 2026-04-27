import React, { useMemo } from 'react';
import { Trophy, TrendingDown, Users } from 'lucide-react';

const MRAnalysis = ({ data }) => {
  const mrStats = useMemo(() => {
    const stats = data.reduce((acc, d) => {
      const name = d.MrName || 'Unknown';
      if (!acc[name]) {
        acc[name] = {
          name,
          line: d.LineName || 'N/A',
          total: 0,
          hcp: 0,
          hco: 0,
          pharmacy: 0,
          coached: 0,
          uniqueCustomers: new Set()
        };
      }
      acc[name].total++;
      if (d.InteractionType === 'HCP') acc[name].hcp++;
      else if (d.InteractionType === 'HCO') acc[name].hco++;
      else if (d.InteractionType === 'Pharmacy') acc[name].pharmacy++;
      
      if (d.IsMRCoachingSubmitted === 'True') acc[name].coached++;
      acc[name].uniqueCustomers.add(d.CustomerId);
      
      return acc;
    }, {});

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [data]);

  if (mrStats.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-soft overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
           <Users size={18} className="text-accent" />
           <h3 className="font-bold text-gray-900 border-b-2 border-accent/20">Medical Rep Performance</h3>
        </div>
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Sorted by Call Volume</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              <th className="px-6 py-3">Rank</th>
              <th className="px-6 py-3">Representative</th>
              <th className="px-6 py-3">Line</th>
              <th className="px-6 py-3 text-center">Total</th>
              <th className="px-6 py-3 text-center">HCP</th>
              <th className="px-6 py-3 text-center">Pharm</th>
              <th className="px-6 py-3 text-center">Coached</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {mrStats.slice(0, 10).map((mr, idx) => (
              <tr key={mr.name} className={`hover:bg-accent/5 transition-colors ${idx === 0 ? 'bg-accent-[0.02] border-l-4 border-l-accent' : ''}`}>
                <td className="px-6 py-4 font-black text-gray-300">{idx + 1}</td>
                <td className="px-6 py-4 font-bold text-gray-900">{mr.name}</td>
                <td className="px-6 py-4 text-gray-500 font-medium">{mr.line}</td>
                <td className="px-6 py-4 text-center font-black">{mr.total}</td>
                <td className="px-6 py-4 text-center text-gray-500">{mr.hcp}</td>
                <td className="px-6 py-4 text-center text-gray-500">{mr.pharmacy}</td>
                <td className="px-6 py-4 text-center">
                   <span className="px-2 py-0.5 rounded bg-success/10 text-success font-bold">{mr.coached}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {mrStats.length > 10 && (
        <div className="p-3 text-center bg-gray-50 border-t border-gray-100 italic text-[10px] text-gray-400 font-bold uppercase tracking-widest">
           Showing Top 10 Performances of {mrStats.length} total nodes
        </div>
      )}
    </div>
  );
};

export default MRAnalysis;
