import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Settings, 
  ChevronRight, 
  Activity, 
  BarChart3 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const allTools = [
    {
      id: 'call-detailing',
      title: 'Call Detailing Analyzer',
      description: 'Analyze field force activity, coaching effectiveness, and product detailing frequency from supervisor reports.',
      icon: Activity,
      path: '/tools/call-detailing',
      accent: 'border-accent'
    },
    {
      id: 'sales-analyzer',
      title: 'Sales Analyzer',
      description: 'Track revenue performance, regional growth, and target achievement across product portfolios.',
      icon: BarChart3,
      path: '/tools/sales-analyzer',
      accent: 'border-blue-400'
    }
  ];

  const visibleTools = allTools.filter(tool => user?.tools?.includes(tool.id));

  return (
    <div className="space-y-10 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-accent" size={32} />
            SUPERVISOR <span className="text-accent">DASHBOARD</span>
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Select an intelligence module to begin analysis</p>
        </div>
        <div className="flex items-center gap-3 bg-accent/5 border border-accent/10 px-4 py-2 rounded-xl">
           <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
           <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest text-[9px]">Node Secure</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleTools.map((tool) => (
          <motion.div
            key={tool.id}
            whileHover={{ y: -5 }}
            className={`group relative bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-card transition-all cursor-pointer overflow-hidden border-t-4 ${tool.accent}`}
            onClick={() => navigate(tool.path)}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="p-4 rounded-2xl bg-gray-50 group-hover:bg-accent/10 group-hover:scale-110 transition-all duration-300 shadow-sm text-gray-400 group-hover:text-accent">
                <tool.icon size={32} />
              </div>
              <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-white text-gray-300 group-hover:text-accent shadow-sm transition-all">
                <ChevronRight size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight group-hover:text-accent transition-colors">
                {tool.title}
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed font-medium">
                {tool.description}
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</span>
               <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-success/10 text-success text-[10px] font-black uppercase tracking-tighter">
                  Ready
               </span>
            </div>
          </motion.div>
        ))}

        {user?.role === 'admin' && (
          <motion.div
            whileHover={{ y: -5 }}
            className="group bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent/40 transition-all hover:bg-white"
            onClick={() => navigate('/admin/users')}
          >
            <div className="p-4 rounded-full bg-white mb-4 shadow-sm group-hover:scale-110 transition-all">
              <Settings className="text-gray-300 group-hover:text-accent" size={32} />
            </div>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest group-hover:text-accent transition-all">Administrative Control</h3>
            <p className="text-[10px] text-gray-400 mt-1 font-bold">Manage node access and permissions</p>
          </motion.div>
        )}
      </div>

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
             <p className="text-xs text-center text-gray-300 font-medium">This node is verified as <span className="text-white font-black">{user?.name}</span></p>
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
