import React from 'react';
import { Shield, Database, Smartphone, Lock, Github, Clock, Server } from 'lucide-react';
import { APP_VERSION } from '../../../config/version';

const SystemSettingsTab = () => {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* SECURITY SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Lock size={18} className="text-red-500" />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Security & Session</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Session Timeout (minutes)</label>
            <input 
              type="number" 
              defaultValue={30}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
             <div>
               <p className="text-sm font-bold text-slate-700">Force Re-login on Update</p>
               <p className="text-[10px] text-slate-400 font-medium">Require login after system update</p>
             </div>
             <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#FFC300] transition-colors">
               <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
             </button>
          </div>
        </div>
      </section>

      {/* DATA SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Database size={18} className="text-blue-500" />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Data Storage (GitHub)</h3>
        </div>
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
           <div className="grid grid-cols-2 gap-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <Github size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Repository</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{import.meta.env.VITE_GITHUB_REPO || 'Not Configured'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <Clock size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Branch</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{import.meta.env.VITE_GITHUB_BRANCH || 'main'}</p>
                 </div>
              </div>
           </div>
           <div className="h-px bg-slate-200" />
           <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-1">
                 <Server size={12} />
                 Environment: PRODUCTION
              </div>
              <div>Last Sync: {new Date().toLocaleDateString()}</div>
           </div>
        </div>
      </section>

      {/* APP INFO SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Smartphone size={18} className="text-emerald-500" />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Application Information</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
           <InfoCard label="App Name" value="Data Lens Analytics" />
           <InfoCard label="Version" value={`v${APP_VERSION.version}`} />
           <InfoCard label="Status" value="Healthy" color="text-emerald-500" />
        </div>
      </section>

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
         <Shield className="text-amber-500 mt-0.5" size={18} />
         <div>
            <p className="text-xs font-black text-amber-700 uppercase tracking-wide">System Security Advisory</p>
            <p className="text-xs text-amber-600/80 mt-1 leading-relaxed">All changes within this panel directly affect core application behavior and data flows. Ensure all configurations are double-checked before saving.</p>
         </div>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value, color = 'text-slate-700' }) => (
  <div className="p-4 bg-white border border-slate-100 rounded-xl text-center shadow-sm">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-base font-black ${color}`}>{value}</p>
  </div>
);

export default SystemSettingsTab;
