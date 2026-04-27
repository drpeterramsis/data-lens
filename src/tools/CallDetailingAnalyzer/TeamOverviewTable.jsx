import React, { useState, useMemo } from 'react';
import { Users, ChevronUp, ChevronDown } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';

const TeamOverviewTable = ({ data, targets }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });

  const mrStats = useMemo(() => {
    const rawMap = {};
    data.forEach(d => {
      const mr = safeStr(d.MrName);
      if (!mr) return;
      if (!rawMap[mr]) {
        rawMap[mr] = {
           name: mr, line: safeStr(d.LineName),
           totalHcp: 0, totalHco: 0, totalPh: 0, total: 0,
           days: {}
        };
      }
      
      const type = safeStr(d.InteractionType);
      const date = safeStr(d.ReportDate);
      if (!date) return;
      
      if (!rawMap[mr].days[date]) {
         rawMap[mr].days[date] = { hcp: 0, hco: 0, ph: 0, coached: 0 };
      }
      
      if (type === 'HCP') { rawMap[mr].totalHcp++; rawMap[mr].days[date].hcp++; }
      else if (type === 'HCO') { rawMap[mr].totalHco++; rawMap[mr].days[date].hco++; }
      else if (type === 'Pharmacy') { rawMap[mr].totalPh++; rawMap[mr].days[date].ph++; }
      
      rawMap[mr].total++;
      if (safeStr(d.IsMRCoachingSubmitted) === 'True') rawMap[mr].days[date].coached++;
    });

    const parsed = Object.values(rawMap).map(mrInfo => {
      let hcpDays = 0, hcoDays = 0, phDays = 0, coachingDays = 0;
      
      Object.values(mrInfo.days).forEach(day => {
         if (day.hcp > 0) hcpDays++;
         if (day.hco > 0) hcoDays++;
         if (day.ph > 0) phDays++;
         if (day.coached >= 4) coachingDays++;
      });

      const hcpRate = hcpDays > 0 ? (mrInfo.totalHcp / hcpDays) : 0;
      const hcoRate = hcoDays > 0 ? (mrInfo.totalHco / hcoDays) : 0;
      const phRate = phDays > 0 ? (mrInfo.totalPh / phDays) : 0;

      // Simplistic overall status: based on average achievement across types
      let status = 'No Targets';
      let statusColor = 'text-gray-500 bg-gray-100';
      if (targets && targets.hcpPerDay > 0) {
         const avgAch = ( 
           ((targets.hcpPerDay ? hcpRate/targets.hcpPerDay : 1) + 
            (targets.hcoPerDay ? hcoRate/targets.hcoPerDay : 1) + 
            (targets.phPerDay ? phRate/targets.phPerDay : 1)) / 3 
         ) * 100;
         
         if (avgAch >= 90) { status = 'On Target'; statusColor = 'text-green-700 bg-green-50'; }
         else if (avgAch >= 70) { status = 'At Risk'; statusColor = 'text-yellow-700 bg-yellow-50'; }
         else { status = 'Below Target'; statusColor = 'text-red-700 bg-red-50'; }
      }

      return {
        ...mrInfo,
        hcpRate, hcoRate, phRate, coachingDays,
        status, statusColor
      };
    });

    // sorting
    return parsed.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, targets, sortConfig]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="inline ml-1"/> : <ChevronDown size={12} className="inline ml-1"/>;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
           <Users size={18} className="text-gray-600" />
           <h3 className="font-bold text-gray-900 border-b-2 border-transparent">👥 Team Performance Overview</h3>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest [&>th]:px-4 [&>th]:py-3 [&>th]:cursor-pointer [&>th]:hover:bg-gray-100">
              <th onClick={() => requestSort('name')}>MR Name {getSortIcon('name')}</th>
              <th onClick={() => requestSort('line')}>Line {getSortIcon('line')}</th>
              <th className="text-center" onClick={() => requestSort('totalHcp')}>HCP {getSortIcon('totalHcp')}</th>
              <th className="text-center" onClick={() => requestSort('totalHco')}>HCO {getSortIcon('totalHco')}</th>
              <th className="text-center" onClick={() => requestSort('totalPh')}>PH {getSortIcon('totalPh')}</th>
              <th className="text-center bg-gray-100/50" onClick={() => requestSort('total')}>Total {getSortIcon('total')}</th>
              <th className="text-center border-l" onClick={() => requestSort('hcpRate')}>HCP Rate {getSortIcon('hcpRate')}</th>
              <th className="text-center" onClick={() => requestSort('hcoRate')}>HCO Rate {getSortIcon('hcoRate')}</th>
              <th className="text-center border-r" onClick={() => requestSort('phRate')}>PH Rate {getSortIcon('phRate')}</th>
              <th className="text-center" onClick={() => requestSort('coachingDays')}>Coach Days {getSortIcon('coachingDays')}</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mrStats.map((mr) => (
              <tr key={mr.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-bold text-gray-900">{mr.name}</td>
                <td className="px-4 py-3 text-gray-500">{mr.line}</td>
                <td className="px-4 py-3 text-center text-blue-600">{mr.totalHcp}</td>
                <td className="px-4 py-3 text-center text-green-600">{mr.totalHco}</td>
                <td className="px-4 py-3 text-center text-purple-600">{mr.totalPh}</td>
                <td className="px-4 py-3 text-center font-black bg-gray-50/50">{mr.total}</td>
                <td className="px-4 py-3 text-center border-l font-medium">{mr.hcpRate.toFixed(1)}</td>
                <td className="px-4 py-3 text-center font-medium">{mr.hcoRate.toFixed(1)}</td>
                <td className="px-4 py-3 text-center border-r font-medium">{mr.phRate.toFixed(1)}</td>
                <td className="px-4 py-3 text-center font-bold text-gray-700">{mr.coachingDays}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest ${mr.statusColor}`}>
                    {mr.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamOverviewTable;
