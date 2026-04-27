import React from 'react';
import { List, Columns, AlertTriangle } from 'lucide-react';

const SummaryCards = ({ rows, cols, emptyCells }) => {
  const cards = [
    { title: 'Total Rows', value: rows, icon: List, color: 'text-accent' },
    { title: 'Total Columns', value: cols, icon: Columns, color: 'text-accent' },
    { title: 'Empty Cells', value: emptyCells, icon: AlertTriangle, color: 'text-danger' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-surface border-t-2 border-t-accent p-6 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.2)]">
          <p className="text-[12px] text-muted uppercase tracking-wider font-semibold mb-1">{card.title}</p>
          <div className="flex items-center justify-between">
            <h4 className="text-2xl font-bold text-white tracking-tight">{card.value.toLocaleString()}</h4>
            <card.icon size={20} className={card.color} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
