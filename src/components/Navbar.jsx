import React from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { toggle } = useSidebar();

  // Get current tool name for breadcrumbs
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/tools/call-detailing') return 'Dashboard  ›  Call Detailing Analyzer';
    if (path === '/tools/sales-analyzer') return 'Dashboard  ›  Sales Analyzer';
    if (path === '/admin/users') return 'Dashboard  ›  User Management';
    return '';
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border z-50 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
      {/* LEFT: App Information */}
      <div className="flex items-center gap-3">
        <button 
          onClick={toggle}
          className="p-1.5 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-[0_0_10px_rgba(245,197,24,0.3)]">
          <span className="text-sm">🔍</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-black tracking-tight text-black leading-tight">
            Data<span className="text-accent underline decoration-accent/20"> Lens</span>
          </h1>
          <span className="text-[10px] text-muted font-medium uppercase tracking-wider">
            Pharma Analytics Portal
          </span>
        </div>
      </div>

      {/* CENTER: Breadcrumbs */}
      <div className="hidden md:block">
        <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] opacity-40">
          {getBreadcrumb()}
        </p>
      </div>

      {/* RIGHT: User Profile */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-black text-gray-900 leading-tight tracking-tight">{user?.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter italic">{user?.jobTitle}</span>
            <span className={`text-[8px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border shadow-inner ${
              user?.role === 'admin' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-gray-100 text-gray-400 border-gray-200'
            }`}>
              {user?.role}
            </span>
          </div>
        </div>
        
        <div 
          className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center border-4 border-white shadow-xl"
          style={{ backgroundColor: user?.username ? `hsl(${user.username.length * 40}, 60%, 40%)` : '#1A1A2E' }}
        >
          <span className="text-xs font-black text-white">
            {getInitials(user?.name)}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
