import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Globe } from 'lucide-react';
import CSVUploader from '../../components/shared/CSVUploader';

const STORAGE_KEY = 'datalens_csv_cache_sales_analyzer';

const SalesAnalyzer = () => {
  const [data, setData] = React.useState([]);

  const handleDataLoaded = (d) => {
    setData(d);
    if (!d || d.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (data.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12 text-center">
           <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-500 mb-4 shadow-sm">
             <BarChart3 size={48} />
           </div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
             Revenue <span className="text-blue-500">Intelligence</span> Analyzer
           </h2>
           <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Deep Market Penetration & Sales Forecasting Node</p>
        </div>
        <CSVUploader onDataLoaded={handleDataLoaded} storageKey={STORAGE_KEY} toolName="Sales Intelligence" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Sales Performance Summary</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Global Target Achievement Tracking</p>
          </div>
          <button onClick={() => handleDataLoaded([])} className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all shadow-sm">Reset Dataset</button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Net Revenue', val: '$1.42M', delta: '+12%', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Growth rate', val: '24.8%', delta: '+2.1%', icon: TrendingUp, color: 'text-success', bg: 'bg-green-50' },
            { label: 'Active Regions', val: '12', delta: '0', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Target Ratio', val: '94.2%', delta: '-0.5%', icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50' }
          ].map((card, i) => (
            <div key={i} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-soft group hover:border-blue-200 transition-all">
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                     <card.icon size={24} />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${card.delta.startsWith('+') ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {card.delta}
                  </span>
               </div>
               <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">{card.label}</p>
               <p className="text-2xl font-black text-gray-900 tracking-tight">{card.val}</p>
            </div>
          ))}
       </div>

       <div className="p-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-blue-500">
             <BarChart3 size={32} />
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Module Initializing</h3>
          <p className="text-xs text-gray-400 font-medium max-w-sm mt-2 leading-relaxed">
            The Sales Analyzer engine for v2.0 is currently in secure deployment. Deep regional mapping and predictive modeling will be active in the next release cycle.
          </p>
          <div className="mt-8 flex gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-100" />
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-200" />
          </div>
       </div>
    </div>
  );
};

export default SalesAnalyzer;
