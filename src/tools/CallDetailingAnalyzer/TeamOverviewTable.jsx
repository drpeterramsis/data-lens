import React, { useState, useMemo } from 'react';
import { Users, ChevronUp, ChevronDown } from 'lucide-react';
import { safeStr, safeDate, safeBool } from '../../utils/safeCSV';
import { isHCPWorkingDay, isHCOWorkingDay, isPHWorkingDay } from '../../utils/periodRules';

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
      
      const type = safeStr(d.InteractionType).toUpperCase();
      const date = safeDate(d.ReportDate);
      if (!date) return;
      
      if (!rawMap[mr].days[date]) {
         rawMap[mr].days[date] = { hcp: 0, hco: 0, ph: 0, coached: 0 };
      }
      
      if (type === 'HCP') { rawMap[mr].totalHcp++; rawMap[mr].days[date].hcp++; }
      else if (type === 'HCO') { rawMap[mr].totalHco++; rawMap[mr].days[date].hco++; }
      else if (type === 'PHARMACY') { rawMap[mr].totalPh++; rawMap[mr].days[date].ph++; }
      
      rawMap[mr].total++;
      if (safeBool(d.IsMRCoachingSubmitted)) rawMap[mr].days[date].coached++;
    });

    const parsed = Object.values(rawMap).map(mrInfo => {
      let hcpWorkingDaysCount = 0;
      let hcoWorkingDaysCount = 0;
      let phWorkingDaysCount = 0;
      let coachingDays = 0;
      
      Object.entries(mrInfo.days).forEach(([dateStr, day]) => {
         if (day.hcp > 0 && isHCPWorkingDay(dateStr)) hcpWorkingDaysCount++;
         if (day.hco > 0 && isHCOWorkingDay(dateStr)) hcoWorkingDaysCount++;
         if (day.ph > 0 && isPHWorkingDay(dateStr)) phWorkingDaysCount++;
         if (day.coached >= 4) coachingDays++;
      });

      const hcpRate = hcpWorkingDaysCount > 0 ? (mrInfo.totalHcp / hcpWorkingDaysCount) : 0;
      const hcoRate = hcoWorkingDaysCount > 0 ? (mrInfo.totalHco / hcoWorkingDaysCount) : 0;
      const phRate = phWorkingDaysCount > 0 ? (mrInfo.totalPh / phWorkingDaysCount) : 0;

      // Status Calculation
      let status = 'TARGETS NOT SET';
      let statusColor = 'text-gray-500 bg-gray-100 border-gray-200';
      if (targets && (targets.hcpPerDay > 0 || targets.hcoPerDay > 0 || targets.phPerDay > 0)) {
         let totalAchieved = 0;
         let activeTargets = 0;
         
         if (targets.hcpPerDay > 0) { totalAchieved += (hcpRate / targets.hcpPerDay); activeTargets++; }
         if (targets.hcoPerDay > 0) { totalAchieved += (hcoRate / targets.hcoPerDay); activeTargets++; }
         if (targets.phPerDay > 0) { totalAchieved += (phRate / targets.phPerDay); activeTargets++; }
         
         const avgAch = activeTargets > 0 ? (totalAchieved / activeTargets) * 100 : 0;
         
         if (avgAch >= 100) { status = '✅ OUTSTANDING'; statusColor = 'text-green-800 bg-green-100 border-green-200'; }
         else if (avgAch >= 90) { status = '✅ ACHIEVED'; statusColor = 'text-blue-800 bg-blue-100 border-blue-200'; }
         else if (avgAch >= 70) { status = '🟡 AT RISK'; statusColor = 'text-yellow-800 bg-yellow-100 border-yellow-200'; }
         else { status = '🔴 CRITICAL'; statusColor = 'text-red-800 bg-red-100 border-red-200'; }
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
    if (sortConfig.key !== key) return <span className="text-gray-300 ml-1">↕</span>;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="inline ml-1 text-accent"/> : <ChevronDown size={12} className="inline ml-1 text-accent"/>;
  };

  return (
    <div className="bg-white border text-sm border-gray-200 rounded-[1.25rem] shadow-sm overflow-hidden mb-8">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
           <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
             <Users size={20} className="text-indigo-600" />
           </div>
           <div>
             <h3 className="text-xl font-bold text-gray-900 tracking-tight">👥 Team Overview</h3>
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Performance Table</p>
           </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-white border-b border-gray-200 shadow-sm">
            <tr className="text-[9px] font-black uppercase text-gray-500 tracking-widest [&>th]:px-4 [&>th]:py-3.5 [&>th]:cursor-pointer hover:[&>th]:bg-gray-50 transition-colors select-none">
              <th onClick={() => requestSort('name')} className="border-r border-gray-100">MR Name {getSortIcon('name')}</th>
              <th onClick={() => requestSort('line')} className="border-r border-gray-100">Line {getSortIcon('line')}</th>
              <th className="text-center bg-blue-50/30" onClick={() => requestSort('totalHcp')}>HCP {getSortIcon('totalHcp')}</th>
              <th className="text-center bg-green-50/30" onClick={() => requestSort('totalHco')}>HCO {getSortIcon('totalHco')}</th>
              <th className="text-center bg-teal-50/30" onClick={() => requestSort('totalPh')}>PH {getSortIcon('totalPh')}</th>
              <th className="text-center bg-gray-50 border-x border-gray-100" onClick={() => requestSort('total')}>Total {getSortIcon('total')}</th>
              <th className="text-center" onClick={() => requestSort('hcpRate')}>HCP Rate {getSortIcon('hcpRate')}</th>
              <th className="text-center" onClick={() => requestSort('hcoRate')}>HCO Rate {getSortIcon('hcoRate')}</th>
              <th className="text-center border-r border-gray-100" onClick={() => requestSort('phRate')}>PH Rate {getSortIcon('phRate')}</th>
              <th className="text-center" onClick={() => requestSort('coachingDays')}>Coach Days {getSortIcon('coachingDays')}</th>
              <th className="text-center bg-gray-50/50 border-l border-gray-100">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mrStats.length === 0 ? (
               <tr><td colSpan="11" className="text-center py-8 text-gray-400 text-xs italic">No data available in current range.</td></tr>
            ) : mrStats.map((mr) => (
              <tr key={mr.name} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-50">{mr.name}</td>
                <td className="px-4 py-3 text-gray-500 font-medium border-r border-gray-50">{mr.line}</td>
                
                <td className="px-4 py-3 text-center text-blue-600 font-medium group-hover:font-bold">{mr.totalHcp}</td>
                <td className="px-4 py-3 text-center text-green-600 font-medium group-hover:font-bold">{mr.totalHco}</td>
                <td className="px-4 py-3 text-center text-teal-600 font-medium group-hover:font-bold">{mr.totalPh}</td>
                <td className="px-4 py-3 text-center font-black bg-gray-50/50 text-gray-900 border-x border-gray-50">{mr.total}</td>
                
                <td className="px-4 py-3 text-center font-black text-gray-700">{mr.hcpRate.toFixed(1)}</td>
                <td className="px-4 py-3 text-center font-black text-gray-700">{mr.hcoRate.toFixed(1)}</td>
                <td className="px-4 py-3 text-center font-black text-gray-700 border-r border-gray-50">{mr.phRate.toFixed(1)}</td>
                
                <td className="px-4 py-3 text-center font-bold text-gray-600">{mr.coachingDays}</td>
                <td className="px-4 py-3 text-center bg-gray-50/50 border-l border-gray-50">
                  <span className={`px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-widest border shadow-sm ${mr.statusColor}`}>
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
