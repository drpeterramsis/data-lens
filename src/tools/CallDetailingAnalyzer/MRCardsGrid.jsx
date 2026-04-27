import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';

// Calendar Modal Component
const CalendarModal = ({ mr, data, onClose }) => {
  const dailyData = useMemo(() => {
    const days = {};
    data.filter(d => safeStr(d.MrName) === mr.name).forEach(d => {
      const date = safeStr(d.ReportDate);
      if (!date) return;
      if (!days[date]) days[date] = { date, hcp: 0, hco: 0, ph: 0, total: 0, coached: 0 };
      
      const type = safeStr(d.InteractionType);
      if (type === 'HCP') days[date].hcp++;
      else if (type === 'HCO') days[date].hco++;
      else if (type === 'Pharmacy') days[date].ph++;
      
      days[date].total++;
      if (safeStr(d.IsMRCoachingSubmitted) === 'True') days[date].coached++;
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, mr.name]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">{mr.name} — Activity Calendar</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
            {dailyData.map(day => (
              <div key={day.date} className={`bg-white border rounded-xl p-3 shadow-sm ${day.coached >= 4 ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-200'}`}>
                <p className="text-[10px] font-bold text-gray-400 mb-2">{day.date}</p>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-600"><span className="text-[9px] text-gray-400">HCP</span> {day.hcp}</p>
                    <p className="text-xs font-medium text-green-600"><span className="text-[9px] text-gray-400">HCO</span> {day.hco}</p>
                    <p className="text-xs font-medium text-purple-600"><span className="text-[9px] text-gray-400">PH</span> {day.ph}</p>
                  </div>
                  <p className="text-2xl font-black text-gray-800 leading-none">{day.total}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">HCP</th>
                  <th className="px-4 py-3">HCO</th>
                  <th className="px-4 py-3">PH</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Coached</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailyData.map(day => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{day.date}</td>
                    <td className="px-4 py-2 text-blue-600">{day.hcp}</td>
                    <td className="px-4 py-2 text-green-600">{day.hco}</td>
                    <td className="px-4 py-2 text-purple-600">{day.ph}</td>
                    <td className="px-4 py-2 font-bold">{day.total}</td>
                    <td className="px-4 py-2">{day.coached >= 4 ? '✅ Yes' : day.coached > 0 ? `Partial (${day.coached})` : '—'}</td>
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

const MRCardsGrid = ({ data, targets }) => {
  const [selectedMR, setSelectedMR] = useState(null);

  const mrStats = useMemo(() => {
    const rawMap = {};
    data.forEach(d => {
      const mr = safeStr(d.MrName);
      if (!mr) return;
      if (!rawMap[mr]) {
        rawMap[mr] = {
           name: mr, line: safeStr(d.LineName),
           totalHcp: 0, totalHco: 0, totalPh: 0,
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
      
      if (safeStr(d.IsMRCoachingSubmitted) === 'True') rawMap[mr].days[date].coached++;
    });

    const parsed = Object.values(rawMap).map(mrInfo => {
      let hcpDays = 0, hcoDays = 0, phDays = 0, coachingDays = 0;
      let totalCoached = 0;
      let coachedHcp = 0, coachedHco = 0, coachedPh = 0;
      
      Object.values(mrInfo.days).forEach(day => {
         if (day.hcp > 0) hcpDays++;
         if (day.hco > 0) hcoDays++;
         if (day.ph > 0) phDays++;
         if (day.coached >= 4) coachingDays++;
         totalCoached += day.coached;
      });

      const hcpRate = hcpDays > 0 ? (mrInfo.totalHcp / hcpDays) : 0;
      const hcoRate = hcoDays > 0 ? (mrInfo.totalHco / hcoDays) : 0;
      const phRate = phDays > 0 ? (mrInfo.totalPh / phDays) : 0;

      return {
        ...mrInfo,
        hcpDays, hcoDays, phDays, coachingDays, totalCoached,
        hcpRate, hcoRate, phRate
      };
    });

    return parsed.sort((a, b) => (b.totalHcp + b.totalHco + b.totalPh) - (a.totalHcp + a.totalHco + a.totalPh));
  }, [data]);

  const getStatusColor = (rate, target) => {
    if (!target || target === 0) return 'text-gray-500 bg-gray-100 border-gray-200';
    const percent = (rate / target) * 100;
    if (percent >= 90) return 'text-green-700 bg-green-50 border-green-500';
    if (percent >= 70) return 'text-yellow-700 bg-yellow-50 border-yellow-500';
    return 'text-red-700 bg-red-50 border-red-500';
  };

  const getStatusIcon = (rate, target) => {
    if (!target || target === 0) return '—';
    const percent = (rate / target) * 100;
    if (percent >= 90) return '✅';
    if (percent >= 70) return '🟡';
    return '🔴';
  };

  if (!mrStats.length) return null;

  return (
    <div className="mb-12">
      <h3 className="text-xl font-bold text-gray-900 mb-6 italic tracking-tight underline decoration-accent/40 decoration-4 underline-offset-2">MR Performance Grid</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mrStats.map(mr => (
          <div key={mr.name} className="bg-white border text-sm border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-black text-gray-900 flex items-center gap-2">
                  <span>🧑‍⚕️</span> {mr.name}
                </h4>
                <p className="text-xs font-medium text-gray-400 mt-0.5 ml-7">{mr.line}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Working Days</p>
                <p className="text-xs text-gray-600 mb-0.5">HCP: <span className="font-bold text-gray-900">{mr.hcpDays}</span></p>
                <p className="text-xs text-gray-600 mb-0.5">HCO: <span className="font-bold text-gray-900">{mr.hcoDays}</span></p>
                <p className="text-xs text-gray-600">PH: <span className="font-bold text-gray-900">{mr.phDays}</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Total Calls</p>
                <p className="text-xs text-gray-600 mb-0.5">HCP: <span className="font-bold text-gray-900">{mr.totalHcp}</span></p>
                <p className="text-xs text-gray-600 mb-0.5">HCO: <span className="font-bold text-gray-900">{mr.totalHco}</span></p>
                <p className="text-xs text-gray-600">PH: <span className="font-bold text-gray-900">{mr.totalPh}</span></p>
              </div>
            </div>

            <div className="mb-4">
               <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Call Rate (per working day)</p>
               <div className="space-y-2">
                 <div className={`flex justify-between text-xs px-2 py-1 border-l-2 rounded-r ${getStatusColor(mr.hcpRate, targets?.hcpPerDay)}`}>
                   <span>HCP: <strong>{mr.hcpRate.toFixed(1)}</strong></span>
                   <span>{getStatusIcon(mr.hcpRate, targets?.hcpPerDay)}</span>
                 </div>
                 <div className={`flex justify-between text-xs px-2 py-1 border-l-2 rounded-r ${getStatusColor(mr.hcoRate, targets?.hcoPerDay)}`}>
                   <span>HCO: <strong>{mr.hcoRate.toFixed(1)}</strong></span>
                   <span>{getStatusIcon(mr.hcoRate, targets?.hcoPerDay)}</span>
                 </div>
                 <div className={`flex justify-between text-xs px-2 py-1 border-l-2 rounded-r ${getStatusColor(mr.phRate, targets?.phPerDay)}`}>
                   <span>PH: <strong>{mr.phRate.toFixed(1)}</strong></span>
                   <span>{getStatusIcon(mr.phRate, targets?.phPerDay)}</span>
                 </div>
               </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mb-4">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 flex items-center gap-1">
                <span>🎓</span> Coaching Summary
              </p>
              <p className="text-xs text-gray-700 mb-1">Coaching Days: <span className="font-black text-gray-900">{mr.coachingDays}</span></p>
              <p className="text-xs text-gray-700">Total Coached Visits: <span className="font-black text-gray-900">{mr.totalCoached}</span></p>
            </div>

            <button 
              onClick={() => setSelectedMR(mr)}
              className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CalendarIcon size={14} /> View Calendar
            </button>
          </div>
        ))}
      </div>

      {selectedMR && <CalendarModal mr={selectedMR} data={data} onClose={() => setSelectedMR(null)} />}
    </div>
  );
};

export default MRCardsGrid;
