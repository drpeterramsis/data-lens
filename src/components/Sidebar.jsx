import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, BarChart2, Users, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const menuItems = [
    {
      id: 'call-detailing',
      title: 'Call Detailing Analyzer',
      path: '/tools/call-detailing',
      icon: Search,
      onlyAdmin: false,
    },
    {
      id: 'sales-analyzer',
      title: 'Sales Analyzer',
      path: '/tools/sales-analyzer',
      icon: BarChart2,
      onlyAdmin: false,
    },
    {
      id: 'user-management',
      title: 'User Management',
      path: '/admin/users',
      icon: Users,
      onlyAdmin: true,
    },
  ];

  // Logic to show tools assigned to user or admin menu
  const visibleItems = menuItems.filter(item => {
    if (item.onlyAdmin) return user.role === 'admin';
    return user.tools.includes(item.id);
  });

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-[260px] bg-surface border-r border-border z-40 overflow-y-auto pt-6 flex flex-col">
      <div className="mb-4">
        <div className="space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-6 py-3 transition-all duration-150 border-l-4 text-sm font-medium ${
                  isActive
                    ? 'text-accent border-accent bg-accent/5'
                    : 'border-transparent text-muted hover:bg-white/[0.03] hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>
      
      <div className="mt-auto p-8 text-center border-t border-border/10">
        <p className="text-[10px] text-muted tracking-widest font-black uppercase">v1.0.012</p>
      </div>
    </aside>
  );
};

export default Sidebar;
