import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, X } from 'lucide-react';
import { safeStr } from '../../utils/safeCSV';

const ForecastTool = ({ data, targets }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastReportDate, setLastReportDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vacations, setVacations] = useState([]);

  const addVacation = () => setVacations([...vacations, '']);
  const updateVacation = (index, val) => {
    const newV = [...vacations];
    newV[index] = val;
    setVacations(newV);
  };
  const removeVacation = (index) => {
    setVacations(vacations.filter((_, i) => i !== index));
  };

  const periodAnalysis = useMemo(() => {
    if (!lastReportDate || !endDate) return null;
    
    let start = new Date(lastReportDate);
    let end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    
    let totalDays = 0;
    let weekends = 0;
    
    // Convert vacations to set for fast lookup
    const vacSet = new Set(vacations.filter(v => v));
    let vacationDays = 0;
    let current = new Date(start);
    
    while (current <= end) {
      totalDays++;
      const day = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      
      if (day === 4 || day === 5) {
        weekends++;
      } else if (vacSet.has(dateStr)) {
        vacationDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    const workingDays = totalDays - weekends - vacationDays;
    
    return {
      totalDays, weekends, vacationDays, workingDays, start, end, vacSet
    };
  }, [lastReportDate, endDate, vacations]);

  const mrForecast = useMemo(() => {
    if (!periodAnalysis || periodAnalysis.workingDays <= 0 || !targets) return [];
    
    const rawMap = {};
    data.forEach(d => {
      const mr = safeStr(d.MrName);
      if (!mr) return;
      if (!rawMap[mr]) rawMap[mr] = { name: mr, hcp: 0, hco: 0, ph: 0 };
      
      const type = safeStr(d.InteractionType);
      if (type === 'HCP') rawMap[mr].hcp++;
      else if (type === 'HCO') rawMap[mr].hco++;
      else if (type === 'Pharmacy') rawMap[mr].ph++;
    });

    const parsed = Object.values(rawMap).map(mr => {
      // Find working days from min date to end date
      const dataStart = new Date(data.reduce((min, d) => d.ReportDate < min ? d.ReportDate : min, data[0]?.ReportDate));
      let totalWorkingDays = periodAnalysis.workingDays; 
      
      // Calculate full period working days to get total target? 
      // Simplified: Just use targets from TargetSettings
      // Oh, wait: "Required calls per MR per remaining day" = (Target - Done) / remaining
      // Target is total target for period. But user input target is calls per day.
      // So period target = target/day * total Working Days in FULL period.
      
      let fullPeriodWorkingDays = 0;
      let curr = new Date(dataStart);
      while(curr <= periodAnalysis.end) {
         const day = curr.getDay();
         const dateStr = curr.toISOString().split('T')[0];
         if (day !== 4 && day !== 5 && !periodAnalysis.vacSet.has(dateStr)) {
             fullPeriodWorkingDays++;
         }
         curr.setDate(curr.getDate() + 1);
      }

      const hcpTarget = targets.hcpPerDay * fullPeriodWorkingDays;
      const hcoTarget = targets.hcoPerDay * fullPeriodWorkingDays;
      const phTarget = targets.phPerDay * fullPeriodWorkingDays;

      const remHcp = Math.max(0, hcpTarget - mr.hcp);
      const remHco = Math.max(0, hcoTarget - mr.hco);
      const remPh = Math.max(0, phTarget - mr.ph);

      const reqHcp = remHcp / periodAnalysis.workingDays;
      const reqHco = remHco / periodAnalysis.workingDays;
      const reqPh = remPh / periodAnalysis.workingDays;

      // Status
      let status = 'On Track';
      let statClass = 'bg-green-100 text-green-800';
      
      const maxReqRatio = Math.max(
         targets.hcpPerDay > 0 ? reqHcp / targets.hcpPerDay : 0,
         targets.hcoPerDay > 0 ? reqHco / targets.hcoPerDay : 0,
         targets.phPerDay > 0 ? reqPh / targets.phPerDay : 0
      );

      if (maxReqRatio > 1.5) { status = 'Critical'; statClass = 'bg-red-100 text-red-800'; }
      else if (maxReqRatio > 1.2) { status = 'At Risk'; statClass = 'bg-yellow-100 text-yellow-800'; }

      return {
         ...mr, hcpTarget, hcoTarget, phTarget, remHcp, remHco, remPh,
         reqHcp, reqHco, reqPh, status, statClass
      };
    });

    return parsed;
  }, [data, periodAnalysis, targets]);

  const renderCalendar = () => {
    if (!periodAnalysis) return null;
    let current = new Date(periodAnalysis.start);
    const grids = [];
    while (current <= periodAnalysis.end) {
      const day = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      let bg = "bg-green-100 border-green-200 text-green-800";
      if (day === 5) bg = "bg-red-100 border-red-200 text-red-800";
      else if (day === 4) bg = "bg-orange-100 border-orange-200 text-orange-800";
      else if (periodAnalysis.vacSet.has(dateStr)) bg = "bg-purple-100 border-purple-200 text-purple-800";
      
      grids.push(
        <div key={dateStr} className={`text-[9px] p-1 border rounded flex items-center justify-center font-bold ${bg}`}>
           {current.getDate()}
        </div>
      );
      current.setDate(current.getDate() + 1);
    }
    return <div className="grid grid-cols-7 gap-1 mt-4 max-w-sm">{grids}</div>;
  };

  return (
    <div className="bg-white text-sm border border-gray-200 rounded-2xl shadow-sm mb-12 overflow-hidden">
      <div 
        className="p-4 bg-gray-50/50 flex justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-gray-600" />
          <h3 className="font-bold text-gray-900 border-b-2 border-transparent hover:border-gray-200">
            📈 Call Rate Forecast
          </h3>
          <span className="ml-2 text-[9px] bg-accent/20 text-accent-dark px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Beta</span>
        </div>
        <span className="text-xs font-bold text-gray-400">{isOpen ? 'Collapse' : 'Expand'}</span>
      </div>

      {isOpen && (
        <div className="p-6 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div className="md:col-span-1 space-y-4 border-r border-gray-100 pr-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Last Report Date</label>
                <input type="date" className="w-full border rounded p-2 text-sm" value={lastReportDate} onChange={e => setLastReportDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Period End Date</label>
                <input type="date" className="w-full border rounded p-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1 flex justify-between">
                  Upcoming Vacations 
                  <button onClick={addVacation} className="text-accent underline">Add</button>
                </label>
                <div className="space-y-2 mt-2">
                  {vacations.map((v, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="date" className="flex-1 border rounded px-2 py-1 text-xs" value={v} onChange={e => updateVacation(idx, e.target.value)} />
                      <button onClick={() => removeVacation(idx)} className="text-red-500 px-2 hover:bg-red-50 rounded"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
               {periodAnalysis ? (
                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
                   <h4 className="font-bold text-gray-900 mb-3">📅 Period Analysis</h4>
                   <p className="text-xs text-gray-600 mb-1">Last report: {lastReportDate} · End: {endDate}</p>
                   <p className="text-xs text-gray-600 mb-1">Total remaining days: <strong>{periodAnalysis.totalDays}</strong></p>
                   <p className="text-xs text-gray-600 mb-1">Weekends detected: <strong>{periodAnalysis.weekends} Thursdays/Fridays</strong></p>
                   <p className="text-xs text-gray-600 mb-2">Vacations entered: <strong>{periodAnalysis.vacationDays} days</strong></p>
                   <div className="mt-3 py-2 px-3 bg-white border border-green-200 rounded text-green-800 text-sm flex items-center gap-2 font-bold shadow-sm">
                      ✅ Working days remaining: {periodAnalysis.workingDays}
                   </div>
                   
                   {renderCalendar()}
                 </div>
               ) : (
                 <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 text-gray-400 text-xs text-center">
                   Select Last Report Date and Period End Date to view forecast analysis.
                 </div>
               )}
            </div>
          </div>

          {mrForecast.length > 0 && (
             <div className="overflow-x-auto border rounded-xl shadow-sm">
               <table className="w-full text-left text-xs">
                 <thead className="bg-gray-50 border-b">
                   <tr className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                     <th className="px-4 py-2 border-r">MR Name</th>
                     <th className="px-4 py-2 text-center" colSpan="3">HCP (Done / Target / Rem)</th>
                     <th className="px-4 py-2 text-center" colSpan="3">HCO (Done / Target / Rem)</th>
                     <th className="px-4 py-2 text-center" colSpan="3">PH (Done / Target / Rem)</th>
                     <th className="px-4 py-2 text-center border-l bg-accent/5">Req. HCP/day</th>
                     <th className="px-4 py-2 text-center bg-accent/5">Req. HCO/day</th>
                     <th className="px-4 py-2 text-center bg-accent/5">Req. PH/day</th>
                     <th className="px-4 py-2 text-center border-l">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {mrForecast.map(mr => (
                     <tr key={mr.name} className="hover:bg-gray-50">
                       <td className="px-4 py-2 font-bold border-r">{mr.name}</td>
                       <td className="px-2 py-2 text-center text-blue-600">{mr.hcp}</td>
                       <td className="px-2 py-2 text-center text-gray-400">{mr.hcpTarget.toFixed(0)}</td>
                       <td className="px-2 py-2 text-center font-medium border-r">{mr.remHcp.toFixed(0)}</td>
                       
                       <td className="px-2 py-2 text-center text-green-600">{mr.hco}</td>
                       <td className="px-2 py-2 text-center text-gray-400">{mr.hcoTarget.toFixed(0)}</td>
                       <td className="px-2 py-2 text-center font-medium border-r">{mr.remHco.toFixed(0)}</td>
                       
                       <td className="px-2 py-2 text-center text-purple-600">{mr.ph}</td>
                       <td className="px-2 py-2 text-center text-gray-400">{mr.phTarget.toFixed(0)}</td>
                       <td className="px-2 py-2 text-center font-medium">{mr.remPh.toFixed(0)}</td>
                       
                       <td className="px-4 py-2 text-center border-l bg-accent/5 font-black">{mr.reqHcp.toFixed(1)}</td>
                       <td className="px-4 py-2 text-center bg-accent/5 font-black">{mr.reqHco.toFixed(1)}</td>
                       <td className="px-4 py-2 text-center bg-accent/5 font-black">{mr.reqPh.toFixed(1)}</td>
                       
                       <td className="px-4 py-2 text-center border-l">
                         <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider ${mr.statClass}`}>
                           {mr.status}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center text-[10px] text-gray-400 uppercase font-bold tracking-widest">
            ⚠️ This tool will be updated with more advanced features soon.
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastTool;
