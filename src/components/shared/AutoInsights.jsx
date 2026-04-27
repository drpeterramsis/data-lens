import React from 'react';

const AutoInsights = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">🤖 Auto Insights</h3>
        <p className="text-gray-500 text-sm">Automatically generated intelligence from your dataset</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.map((insight) => (
          <div 
            key={insight.id} 
            className={`bg-white p-5 rounded-xl border border-gray-200 border-l-4 ${insight.border} shadow-soft hover:shadow-card transition-shadow`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">{insight.emoji}</span>
              <h4 className="font-bold text-gray-800 text-sm">{insight.title}</h4>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {(insight.text?.split(/(\[.*?\])/g) || []).map((part, i) => {
                if (part?.startsWith('[') && part?.endsWith(']')) {
                  return <span key={i} className="bg-accent/20 text-accent-dark px-1 rounded font-bold">{part.slice(1, -1)}</span>;
                }
                return part;
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutoInsights;
