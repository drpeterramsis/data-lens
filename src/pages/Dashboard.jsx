import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ALL_TOOLS } from '../config/toolsConfig';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const dashboardCards = ALL_TOOLS.filter(tool => {
    if (!tool.showOnDashboard) return false;
    if (tool.adminOnly && user?.role !== 'admin') return false;
    if (!user?.allowedPages?.includes(tool.id)) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-accent" size={32} />
            <span className="text-accent">DASHBOARD</span>
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Select an intelligence module to begin analysis</p>
        </div>
        <div className="flex items-center gap-3 bg-accent/5 border border-accent/10 px-4 py-2 rounded-xl">
           <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
           <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest text-[9px]">Node Secure</span>
        </div>
      </div>

      {dashboardCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {dashboardCards.map((tool) => (
            <motion.div
              key={tool.id}
              whileHover={{ scale: 1.03, y: -2 }}
              style={{ borderColor: tool.color }}
              className="group relative bg-white rounded-xl p-4 sm:p-5 shadow-sm transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[140px] md:min-h-[160px] border-[1.5px]"
              onMouseOver={(e) => e.currentTarget.style.boxShadow = `0 4px 16px ${tool.color}26`}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
              onClick={() => navigate(tool.route)}
            >
              <div>
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${tool.color}1A`, color: tool.color, fontSize: '1.4rem' }}
                >
                  {tool.icon}
                </div>
                <h3 className="text-[0.9rem] sm:text-base font-bold text-gray-900 tracking-tight line-clamp-1">
                  {tool.name}
                </h3>
                <p className="text-[0.78rem] leading-snug font-medium text-slate-500 mt-1 hidden sm:block line-clamp-2">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span 
                  className="text-[0.8rem] font-semibold transition-colors flex items-center gap-1 group-hover:underline"
                  style={{ color: tool.color }}
                >
                   Open &rarr;
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No tools available. Contact your admin.</p>
        </div>
      )}

      <div className="p-8 bg-gray-900 rounded-3xl text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center gap-8">
         <div className="relative z-10 space-y-4 max-w-xl">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Intelligence. Precision. <span className="text-accent underline decoration-accent/30 underline-offset-4">Performance.</span></h3>
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              Data Lens v2.0 introduces deep neural analysis patterns for pharmaceutical field force detailing. 
              Upload standard supervisor exports and unlock instant visibility across regions and representative performance.
            </p>
         </div>
         <div className="relative z-10 bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl flex-1 flex flex-col items-center gap-3">
             <span className="text-[10px] uppercase font-black tracking-[0.3em] text-accent">Security Protocol</span>
             <p className="text-xs text-center text-gray-300 font-medium">This node is verified as <span className="text-white font-black">{user?.fullName}</span></p>
             <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent w-full" />
             </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
      </div>
    </div>
  );
};

export default Dashboard;
