import React, { useMemo } from 'react';
import { ArrowLeft, ChevronRight, User, Package, Users, Building, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DrillDownTab = ({ data, drillPath, setDrillPath }) => {
  // Navigation: All Lines -> Line -> DM -> MR
  const level = drillPath.length; // 0=Lines, 1=DMs, 2=MRs, 3=Products

  const currentData = useMemo(() => {
    let d = data;
    if (level >= 1) d = d.filter(r => r.lineName === drillPath[0].name);
    if (level >= 2) d = d.filter(r => r.dmName === drillPath[1].name);
    if (level >= 3) d = d.filter(r => r.mrName === drillPath[2].name);
    return d;
  }, [data, drillPath, level]);

  const drillingItems = useMemo(() => {
    const map = {};
    if (level === 0) {
      currentData.forEach(r => {
        if (!map[r.lineName]) map[r.lineName] = { id: r.lineName, name: r.lineName, sales: 0, target: 0, mrs: new Set(), prods: new Set() };
        map[r.lineName].sales += r.salesUnit;
        map[r.lineName].target += r.targetUnit;
        map[r.lineName].mrs.add(r.mrName);
        map[r.lineName].prods.add(r.productName);
      });
    } else if (level === 1) {
      currentData.forEach(r => {
        if (!map[r.dmName]) map[r.dmName] = { id: r.dmName, name: r.dmName, sales: 0, target: 0, mrs: new Set(), prods: new Set() };
        map[r.dmName].sales += r.salesUnit;
        map[r.dmName].target += r.targetUnit;
        map[r.dmName].mrs.add(r.mrName);
        map[r.dmName].prods.add(r.productName);
      });
    } else if (level === 2) {
      currentData.forEach(r => {
        if (!map[r.mrName]) map[r.mrName] = { id: r.mrName, name: r.mrName, area: r.areaName, sales: 0, target: 0, prods: new Set() };
        map[r.mrName].sales += r.salesUnit;
        map[r.mrName].target += r.targetUnit;
        map[r.mrName].prods.add(r.productName);
      });
    } else if (level === 3) {
      currentData.forEach(r => {
        if (!map[r.productName]) map[r.productName] = { 
          id: r.productCode, name: r.productName, code: r.productCode,
          salesUnits: 0, targetUnits: 0, salesValue: 0, targetValue: 0, points: 0 
        };
        map[r.productName].salesUnits += r.salesUnit;
        map[r.productName].targetUnits += r.targetUnit;
        map[r.productName].salesValue += r.salesValue;
        map[r.productName].targetValue += r.targetValue;
        map[r.productName].points += r.salesPoints;
      });
    }

    return Object.values(map).map(item => ({
      ...item,
      achievement: item.target > 0 ? (item.sales / item.target) * 100 : 0,
      mrCount: item.mrs?.size,
      prodCount: item.prods?.size
    })).sort((a, b) => b.sales - a.sales);
  }, [currentData, level]);

  const goBack = () => setDrillPath(prev => prev.slice(0, -1));
  const drillInto = (item) => setDrillPath(prev => [...prev, { level, id: item.id, name: item.name }]);

  return (
    <div className="space-y-6 pb-20">
      {/* BREADCRUMBS */}
      <div className="flex items-center gap-2 mb-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <button 
          onClick={() => setDrillPath([])}
          className={`text-xs font-black uppercase tracking-widest ${level === 0 ? 'text-gray-900 cursor-default' : 'text-blue-600 hover:underline'}`}
        >
          All Lines
        </button>
        {drillPath.map((p, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={14} className="text-gray-300" />
            <button 
              onClick={() => setDrillPath(prev => prev.slice(0, i + 1))}
              className={`text-xs font-black uppercase tracking-widest ${i === drillPath.length - 1 ? 'text-gray-900 cursor-default' : 'text-blue-600 hover:underline'}`}
            >
              {p.name}
            </button>
          </React.Fragment>
        ))}
        {level > 0 && (
          <button 
            onClick={goBack}
            className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={level}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          {level < 3 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {drillingItems.map((item, idx) => (
                <DrillCard 
                  key={idx} 
                  item={item} 
                  level={level} 
                  onClick={() => drillInto(item)} 
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Product Breakdown</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Detailed performance for {drillPath[2].name}</p>
                  </div>
                  <Package className="text-gray-200" size={32} />
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <TH label="Product" />
                        <TH label="Sales Units" align="right" />
                        <TH label="Target Units" align="right" />
                        <TH label="Achievement %" align="right" />
                        <TH label="Sales Value" align="right" />
                        <TH label="Points" align="right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {drillingItems.map((p, i) => {
                        const ach = p.targetUnits > 0 ? (p.salesUnits / p.targetUnits) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                               <div className="font-black text-gray-900 text-sm">{p.name}</div>
                               <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.code}</div>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{p.salesUnits.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-400 text-right">{p.targetUnits.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex flex-col items-end gap-1">
                                 <span className={`text-xs font-black ${ach >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{ach.toFixed(1)}%</span>
                                 <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                   <div className={`h-full ${ach >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, ach)}%` }} />
                                 </div>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-gray-900 text-right">${p.salesValue.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-black text-blue-600 text-right">{p.points.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                 </table>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const DrillCard = ({ item, level, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all text-left flex flex-col justify-between group h-full relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
      {level === 0 ? <Building size={80} /> : level === 1 ? <Users size={80} /> : <User size={80} />}
    </div>

    <div className="flex items-center justify-between mb-6">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg ${item.achievement >= 100 ? 'bg-emerald-500' : item.achievement >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}>
        {level === 0 ? <Building size={20} /> : level === 1 ? <Users size={20} /> : level === 2 ? <User size={20} /> : <Package size={20} />}
      </div>
      <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
    </div>

    <div>
      <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1 line-clamp-1">{item.name}</h4>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{level === 2 ? item.area : 'Aggregate Summary'}</span>
    </div>

    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Achievement</span>
        <span className={`text-xs font-black ${item.achievement >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
          {item.achievement.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${item.achievement >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(100, item.achievement)}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] font-bold text-gray-500">
        <div className="flex flex-col">
          <span className="text-[8px] uppercase text-gray-300">Sales</span>
          {item.sales.toLocaleString()}
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[8px] uppercase text-gray-300">Target</span>
          {item.target.toLocaleString()}
        </div>
      </div>
    </div>

    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
       <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">
          {level === 0 ? `${item.mrCount} MRs` : level === 1 ? `${item.mrCount} MRs` : `${item.prodCount} Products`}
       </span>
       <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 group-hover:text-blue-500 transition-colors">
          View Detail <ChevronRight size={10} />
       </span>
    </div>
  </button>
);

const TH = ({ label, align = 'left' }) => (
  <th className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-${align} border-b border-gray-100`}>
    {label}
  </th>
);

export default DrillDownTab;
