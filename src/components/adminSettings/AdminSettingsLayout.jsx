import React from 'react';
import { Shield, Settings, Layout, Users, ChevronRight, Compass, Palette } from 'lucide-react';

const AdminSettingsLayout = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'users', label: 'User Management', icon: <Users size={18} /> },
    { id: 'dashboard', label: 'Dashboard View', icon: <Layout size={18} /> },
    { id: 'sidebar', label: 'Sidebar Menu', icon: <Compass size={18} /> },
    { id: 'messages', label: 'Messages', icon: <Layout size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-2xl p-8 mb-8 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
            <Settings className="text-[#FFC300]" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Admin Settings</h1>
            <p className="text-slate-400 font-medium mt-1">System Configuration & Management</p>
          </div>
        </div>
        <div className="bg-[#FFC300] text-[#7B0000] px-4 py-1.5 rounded-lg font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-400/20">
          <Shield size={16} />
          ADMIN PANEL
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex min-h-[650px] transition-all duration-300 hover:shadow-md">
        {/* Sidebar */}
        <div className="w-[240px] border-r border-slate-100 bg-white py-4 flex flex-col shrink-0">
          <div className="px-6 py-2 mb-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Management</h3>
          </div>
          <nav className="flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all duration-200 relative group ${
                  activeTab === tab.id
                    ? 'bg-[#FFF8E7] text-[#7B0000]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {activeTab === tab.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFC300]" />
                )}
                <span className={`${activeTab === tab.id ? 'text-[#7B0000]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {tab.icon}
                </span>
                {tab.label}
                {activeTab === tab.id && <ChevronRight size={14} className="ml-auto text-[#7B0000]/40" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-8 bg-white overflow-y-auto">
           {children}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsLayout;
