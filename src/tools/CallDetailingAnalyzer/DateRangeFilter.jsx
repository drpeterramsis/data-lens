import React from 'react';

const DateRangeFilter = ({ dateFrom, dateTo, setDateFrom, setDateTo, data }) => {
  const minDate = React.useMemo(() => {
    if (!data || data.length === 0) return '';
    const dates = data.map(d => d.ReportDate).filter(Boolean);
    if (dates.length === 0) return '';
    const min = dates.reduce((m, d) => d < m ? d : m, dates[0]);
    return min.split('T')[0];
  }, [data]);
  
  const maxDate = React.useMemo(() => {
    if (!data || data.length === 0) return '';
    const dates = data.map(d => d.ReportDate).filter(Boolean);
    if (dates.length === 0) return '';
    const max = dates.reduce((m, d) => d > m ? d : m, dates[0]);
    return max.split('T')[0];
  }, [data]);

  const displayFrom = dateFrom ? dateFrom : minDate;
  const displayTo = dateTo ? dateTo : maxDate;
  
  // compute active days
  const activeDaysCount = React.useMemo(() => {
    let days = new Set();
    data.forEach(d => {
       if (d.ReportDate) {
         if ((!dateFrom || d.ReportDate >= dateFrom) && (!dateTo || d.ReportDate <= dateTo)) {
            days.add(d.ReportDate);
         }
       }
    });
    return days.size;
  }, [data, dateFrom, dateTo]);

  const handleClear = () => {
    setDateFrom('');
    setDateTo('');
  };

  const handleFullPeriod = () => {
    setDateFrom(minDate);
    setDateTo(maxDate);
  };

  return (
    <div className="bg-white/95 backdrop-blur border text-sm border-gray-200 rounded-[1.25rem] shadow-sm mb-8 overflow-hidden transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="p-4 flex flex-col xl:flex-row items-center gap-6 justify-between">
        
        <div className="flex items-center gap-3 w-full xl:w-auto shrink-0">
           <div className="bg-blue-50 p-2 border border-blue-100 rounded-lg shadow-sm">
             <span className="text-xl">📅</span>
           </div>
           <div>
             <h3 className="text-lg font-bold text-gray-900 tracking-tight">Report Period</h3>
             <p className="text-[9px] text-blue-600/80 font-black uppercase tracking-widest mt-0.5">Filter all data by date</p>
           </div>
        </div>

        <div className="flex-1 w-full max-w-3xl flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full relative">
            <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-1.5 block">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner" />
          </div>
          <div className="flex-1 w-full relative">
            <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-1.5 block">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner" />
          </div>
          
          <div className="flex w-full sm:w-auto gap-2">
            <button onClick={handleClear} className="flex-1 sm:w-auto px-5 py-2.5 text-[10px] uppercase tracking-widest font-black bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors rounded-lg shadow-sm">
              Clear
            </button>
            <button onClick={handleFullPeriod} className="flex-1 sm:w-auto px-5 py-2.5 text-[10px] uppercase tracking-widest font-black bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded-lg shadow-sm whitespace-nowrap">
              Full Period
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50/80 px-5 py-2.5 border-t border-gray-100 flex items-center justify-between">
         <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
           <span className="text-[9px] uppercase font-black tracking-widest text-gray-400">Active Range:</span> 
           <span className="bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm text-gray-900 font-bold">{displayFrom || 'N/A'}</span> 
           → 
           <span className="bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm text-gray-900 font-bold">{displayTo || 'N/A'}</span>
         </p>
         <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
           <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
           {activeDaysCount} active days
         </span>
      </div>
    </div>
  );
};

export default DateRangeFilter;
