import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay, 
  addMonths, 
  subMonths,
  isValid,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

const ActivityCalendar = ({ data }) => {
  // Use the most recent date in data as initial focal point
  const focalDate = useMemo(() => {
    if (!data || data.length === 0) return new Date();
    const dates = data.map(d => parseISO(d.ReportDate)).filter(isValid);
    if (dates.length === 0) return new Date();
    return new Date(Math.max(...dates));
  }, [data]);

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(focalDate));
  const [selectedDay, setSelectedDay] = useState(null);

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  const activityByDay = useMemo(() => {
    const acc = {};
    data.forEach(d => {
      if (d.ReportDate) {
        acc[d.ReportDate] = (acc[d.ReportDate] || 0) + 1;
      }
    });
    return acc;
  }, [data]);

  const getIntensityClass = (count) => {
    if (!count) return 'bg-white text-gray-400 border-gray-100';
    if (count <= 5) return 'bg-yellow-50 text-accent-dark border-accent/20';
    if (count <= 15) return 'bg-accent/40 text-accent-dark border-accent/40 font-bold';
    return 'bg-accent text-accent-dark border-accent shadow-sm font-black';
  };

  const startDay = getDay(days[0]);
  const paddingCells = Array.from({ length: startDay });

  const stats = useMemo(() => {
    const counts = Object.values(activityByDay);
    return {
      activeDays: counts.length,
      max: Math.max(...counts, 0),
      avg: counts.length ? (counts.reduce((a,b) => a+b, 0) / counts.length).toFixed(1) : 0
    };
  }, [activityByDay]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 border-b-2 border-accent/20 pb-0.5 leading-none">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-1">Activity Grid</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] uppercase font-black text-gray-400 pb-2">{d}</div>
        ))}
        
        {paddingCells.map((_, i) => <div key={`pad-${i}`} className="h-14 sm:h-20" />)}
        
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = activityByDay[dateStr] || 0;
          return (
            <div 
              key={dateStr}
              onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
              className={`h-14 sm:h-20 border rounded-lg p-1.5 cursor-pointer transition-all flex flex-col justify-between group ${getIntensityClass(count)} ${
                selectedDay === dateStr ? 'ring-2 ring-accent ring-offset-2' : 'hover:scale-[1.02]'
              }`}
            >
              <span className="text-[10px] font-bold">{format(day, 'd')}</span>
              {count > 0 && (
                <div className="text-[11px] sm:text-xs text-center pb-1">
                  {count} <span className="text-[8px] opacity-70">calls</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
         <div className="text-center">
            <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Active Coverage</p>
            <p className="text-xl font-black text-gray-800">{stats.activeDays} days</p>
         </div>
         <div className="text-center border-x border-gray-100 px-4">
            <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Day Average</p>
            <p className="text-xl font-black text-accent">{stats.avg}</p>
         </div>
         <div className="text-center">
            <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Daily Record</p>
            <p className="text-xl font-black text-gray-800">{stats.max}</p>
         </div>
      </div>

      {selectedDay && activityByDay[selectedDay] && (
        <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
           <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800 text-sm">Activity Details for {selectedDay}</h4>
              <button onClick={() => setSelectedDay(null)}><X size={14}/></button>
           </div>
           <div className="space-y-2">
              {data.filter(d => d.ReportDate === selectedDay).slice(0, 5).map((d, i) => (
                <div key={i} className="flex justify-between text-xs p-2 bg-white rounded border border-gray-100">
                   <span className="font-medium">{d.MrName}</span>
                   <span className="text-gray-400">Visited {d.CustomerName}</span>
                </div>
              ))}
              {activityByDay[selectedDay] > 5 && (
                <p className="text-[10px] text-gray-400 text-center italic">...and {activityByDay[selectedDay] - 5} more records</p>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ActivityCalendar;
