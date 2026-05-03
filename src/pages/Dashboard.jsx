import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ALL_TOOLS } from '../config/toolsConfig';
import { getDashboardConfig } from '../services/githubService';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { content } = await getDashboardConfig();
        setConfig(content);
      } catch (error) {
        console.error('Error fetching dashboard config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="p-8 space-y-10 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-2xl w-1/3" />
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // Fallback to static config if fetch fails or config is empty
  const dashboardConfig = config || {
    categories: [
      { id: 'all', name: 'Modules', icon: '⊞', color: '#6366f1', order: 1, visible: true, modules: ALL_TOOLS.filter(t => t.showOnDashboard).map(t => t.id) }
    ],
    modules: ALL_TOOLS.map(t => ({
      ...t,
      visible: t.showOnDashboard
    })),
    dashboardSettings: {
      showCategories: false,
      gridColumns: 4,
      showModuleDescriptions: true,
      showOpenLink: true,
      categorySeparator: true
    }
  };

  const { categories, modules, dashboardSettings } = dashboardConfig;

  const renderModuleCard = (module) => {
    // Find color and other details from config
    const toolInfo = ALL_TOOLS.find(t => t.id === module.id) || module;
    const color = toolInfo.color || '#6366f1';

    return (
      <motion.div
        key={module.id}
        whileHover={{ scale: 1.03, y: -2 }}
        onClick={() => navigate(toolInfo.route || module.route)}
        className="group relative bg-white rounded-xl p-5 shadow-sm transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[160px] border-[1.5px] hover:shadow-md"
        style={{ 
          borderColor: `${color}30`,
          boxShadow: `0 4px 12px ${color}08`
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = color}
        onMouseOut={(e) => e.currentTarget.style.borderColor = `${color}30`}
      >
        <div>
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-inner"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {module.icon || toolInfo.icon}
          </div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            {module.name || toolInfo.name}
          </h3>
          {dashboardSettings.showModuleDescriptions && (
            <p className="text-[11px] leading-relaxed font-medium text-slate-400 mt-1 line-clamp-2">
              {module.description || toolInfo.description}
            </p>
          )}
        </div>

        {dashboardSettings.showOpenLink && (
          <div className="mt-4 flex items-center justify-between">
            <span 
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all"
              style={{ color }}
            >
               Open <ArrowRight size={12} />
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="text-accent" size={32} />
            </div>
            <span className="text-accent">DASHBOARD</span>
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-2 ml-1">Select an intelligence module to begin analysis</p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm">
           <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
           <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Node Node Primary</span>
        </div>
      </div>

      {dashboardSettings.showCategories ? (
        <div className="space-y-12">
          {categories
            .filter(cat => cat.visible && (!cat.adminOnly || isAdmin))
            .sort((a, b) => a.order - b.order)
            .map(category => {
              const categoryModules = modules.filter(m => 
                category.modules.includes(m.id) && 
                m.visible &&
                (!m.adminOnly || isAdmin) &&
                (isAdmin || user?.allowedPages?.includes(m.id))
              );

              if (categoryModules.length === 0) return null;

              return (
                <div key={category.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-6 group">
                     <div className="w-1 h-6 rounded-full" style={{ backgroundColor: category.color }} />
                     <span className="text-lg">{category.icon}</span>
                     <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3">
                       {category.name}
                       {category.adminOnly && (
                         <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[9px] lowercase font-black italic shadow-sm flex items-center gap-1">
                           <ShieldAlert size={10} /> admin vault
                         </span>
                       )}
                     </h3>
                  </div>
                  <div 
                    className="grid gap-6"
                    style={{ 
                      gridTemplateColumns: `repeat(${dashboardSettings.gridColumns || 4}, minmax(0, 1fr))` 
                    }}
                  >
                    {categoryModules.sort((a,b) => a.order - b.order).map(mod => renderModuleCard(mod))}
                  </div>
                  {dashboardSettings.categorySeparator && <div className="mt-12 h-px bg-gray-100" />}
                </div>
              );
            })}
        </div>
      ) : (
        <div 
          className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ 
            gridTemplateColumns: `repeat(${dashboardSettings.gridColumns || 4}, minmax(0, 1fr))` 
          }}
        >
          {modules
            .filter(m => m.visible && (!m.adminOnly || isAdmin) && (isAdmin || user?.allowedPages?.includes(m.id)))
            .sort((a,b) => a.order - b.order)
            .map(mod => renderModuleCard(mod))}
        </div>
      )}

      {/* Security Footer Banner */}
      <div className="pt-12">
        <div className="p-8 bg-gradient-to-r from-gray-900 to-slate-800 rounded-3xl text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center gap-8 border border-white/5">
           <div className="relative z-10 space-y-4 max-w-xl">
              <h3 className="text-2xl font-black italic uppercase tracking-tight leading-none tracking-tighter">DATA LENS <span className="text-accent underline decoration-accent/30 underline-offset-4">ANALYTICS HUB</span></h3>
              <p className="text-gray-400 text-xs leading-relaxed font-medium">
                Access to data modules is strictly governed by regional assignment and security clearance. 
                Any unauthorized access attempts are logged and flagged for administrative review.
              </p>
           </div>
           <div className="relative z-10 bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex-1 flex flex-col items-center gap-3">
               <span className="text-[10px] uppercase font-black tracking-[0.2em] text-accent">Clearance Verified</span>
               <p className="text-xs text-center text-gray-300 font-medium font-mono lowercase">usr::node::{user?.fullName?.replace(/\s+/g, '_')}</p>
               <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-accent w-3/4" />
               </div>
           </div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full -mr-32 -mt-32 blur-3xl opacity-30" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
