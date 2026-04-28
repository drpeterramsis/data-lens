import React from 'react';
import { 
  ClipboardList, 
  Users, 
  UserRound, 
  GraduationCap, 
  Hospital, 
  Pill,
  TrendingUp
} from 'lucide-react';

const SummaryCards = ({ metrics }) => {
  const cards = [
    { 
      label: 'Coaching Days', 
      value: `${metrics.coachingDays || 0} days`, 
      icon: GraduationCap, 
      accent: 'border-purple-500', 
      text: 'text-purple-500', 
      bg: 'bg-purple-50',
      subtext: `${metrics.coachingMRs || 0} MRs have coaching sessions` 
    },
    { 
      label: 'Avg HCO Call Rate', 
      value: metrics.dmHCORate ? metrics.dmHCORate.toFixed(1) : "0.0", 
      icon: Hospital, 
      accent: 'border-green-500', 
      text: 'text-green-500', 
      bg: 'bg-green-50',
      subtext: `Team average across ${metrics.activeMRCountHCO || 0} MRs` 
    },
    { 
      label: 'Avg HCP Call Rate', 
      value: metrics.dmHCPRate ? metrics.dmHCPRate.toFixed(1) : "0.0", 
      icon: UserRound, 
      accent: 'border-blue-500', 
      text: 'text-blue-500', 
      bg: 'bg-blue-50',
      subtext: `Team average across ${metrics.activeMRCountHCP || 0} MRs` 
    },
    { 
      label: 'Avg PH Call Rate', 
      value: metrics.dmPHRate ? metrics.dmPHRate.toFixed(1) : "0.0", 
      icon: Pill, 
      accent: 'border-teal-500', 
      text: 'text-teal-500', 
      bg: 'bg-teal-50',
      subtext: `Team average across ${metrics.activeMRCountPH || 0} MRs` 
    },
    { 
      label: 'Active MRs', 
      value: metrics.uniqueMRs || 0, 
      icon: Users, 
      accent: 'border-yellow-500', 
      text: 'text-yellow-500', 
      bg: 'bg-yellow-50',
      subtext: 'Unique MRs visited' 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className={`bg-white border-t-4 border-l border-r border-b border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow ${card.accent}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
               <h4 className="text-xl font-black text-gray-900 tracking-tight">
                 {card.value}
                 {card.label.includes('Rate') && <span className="text-[10px] text-gray-400 font-bold ml-1">/d</span>}
               </h4>
            </div>
            <div className={`p-1.5 rounded-lg ${card.bg}`}>
              <card.icon size={16} className={card.text} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{card.label}</p>
            <p className="text-[9px] text-gray-400 font-bold mt-1 tracking-wider">{card.subtext}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
