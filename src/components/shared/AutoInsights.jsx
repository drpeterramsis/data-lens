import React from 'react';

const AutoInsights = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="mt-8 mb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 border-b border-transparent">🤖 Automated AI Insights</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Algorithmic analysis of field operations</p>
        </div>
        <span className="text-[10px] font-black text-white bg-accent px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
          {insights.length} Insights Detected
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.map((insight) => (
          <div 
            key={insight.id} 
            className={`bg-white p-5 rounded-xl border border-gray-100 border-l-4 shadow-sm hover:shadow-md transition-shadow ${insight.color || ''}`}
          >
            <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2">
              <span className="text-lg bg-gray-50 p-1.5 rounded-lg">{insight.icon}</span>
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">{insight.title}</h4>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed min-h-[40px] font-medium">
              {insight.text}
            </p>
            {insight.metric && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest font-black text-gray-400">Key Metric</span>
                <span className="text-xs font-black text-gray-900 bg-gray-100 px-2 py-1 rounded">{insight.metric}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutoInsights;
