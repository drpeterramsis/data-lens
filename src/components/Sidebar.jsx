import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, ChevronRight, Activity, BarChart3, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Sidebar = () => {
  const { user } = useAuth();
  const { isOpen } = useSidebar();

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all' },
    { title: 'Call Detailing', path: '/tools/call-detailing', icon: Activity, role: 'user' },
    { title: 'Sales Analyzer', path: '/tools/sales-analyzer', icon: BarChart3, role: 'user' },
    { title: 'User Management', path: '/admin/users', icon: Settings, role: 'admin' },
  ];

  const visibleItems = menuItems.filter(item => {
    if (item.role === 'all') return true;
    if (item.role === 'admin') return user?.role === 'admin';
    if (item.role === 'user') return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'viewer';
    return false;
  });

  return (
    <aside 
      className={`fixed left-0 top-14 bottom-0 bg-white border-r border-border z-40 flex flex-col transition-all duration-300 transform shadow-sm ${
        isOpen ? 'w-60 translate-x-0' : 'w-0 -translate-x-full'
      }`}
    >
      <div className={`flex-1 overflow-y-auto py-6 ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
        <div className="px-4 mb-6">
          <p className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-400 pl-3">Navigation</p>
        </div>
        
        <nav className="px-2 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 border-l-4 font-bold text-sm whitespace-nowrap overflow-hidden ${
                  isActive
                    ? 'bg-accent/10 border-accent text-accent-dark shadow-sm'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className="transition-transform group-hover:scale-110 shrink-0" />
                <span>{item.title}</span>
              </div>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
