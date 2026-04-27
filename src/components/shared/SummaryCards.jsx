import React from 'react';
import { 
  ClipboardList, 
  Users, 
  UserRound, 
  GraduationCap, 
  Hospital, 
  Pill,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const SummaryCards = ({ metrics }) => {
  const cards = [
    { label: 'Total Interactions', value: metrics.totalInteractions, icon: ClipboardList, accent: 'bg-blue-500', text: 'text-blue-500' },
    { label: 'Unique Customers', value: metrics.uniqueCustomers, icon: Users, accent: 'bg-green-500', text: 'text-green-500' },
    { label: 'Active MRs', value: metrics.uniqueMRs, icon: UserRound, accent: 'bg-yellow-500', text: 'text-yellow-500' },
    { label: 'Coaching Sessions', value: metrics.coachingSessions, icon: GraduationCap, accent: 'bg-purple-500', text: 'text-purple-500' },
    { label: 'HCP Visits', value: metrics.hcpVisits, icon: Hospital, accent: 'bg-red-500', text: 'text-red-500' },
    { label: 'Pharmacy Visits', value: metrics.pharmacyVisits, icon: Pill, accent: 'bg-teal-500', text: 'text-teal-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-soft relative overflow-hidden group hover:shadow-card transition-shadow">
          <div className={`absolute top-0 left-0 w-full h-1 ${card.accent}`} />
          <div className="flex flex-col gap-2">
            <div className={`p-2 rounded-lg ${card.accent}/10 w-fit`}>
              <card.icon size={18} className={card.text} />
            </div>
            <div>
              <h4 className="text-xl font-black text-gray-900 tracking-tight">{card.value.toLocaleString()}</h4>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-0.5">{card.label}</p>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-success mt-1">
               <TrendingUp size={10} />
               <span>Synced</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
