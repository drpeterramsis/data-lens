import React from 'react';
import { useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

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
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-[0_0_10px_rgba(245,197,24,0.3)]">
          <span className="text-sm">🔍</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold tracking-tight text-black leading-tight">
            Data Lens
          </h1>
          <span className="text-[10px] text-muted font-medium uppercase tracking-wider">
            Field Force Analytics Platform
          </span>
        </div>
      </div>

      {/* CENTER: Breadcrumbs */}
      <div className="hidden md:block">
        <p className="text-xs text-muted font-medium tracking-wide">
          {getBreadcrumb()}
        </p>
      </div>

      {/* RIGHT: User Profile */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-white leading-tight">{user?.name}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border border-white/5 shadow-inner ${
              user?.role === 'admin' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-border text-muted'
            }`}>
              {user?.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        </div>
        
        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center border-2 border-surface shadow-lg">
          <span className="text-xs font-black text-bg">
            {getInitials(user?.name)}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
