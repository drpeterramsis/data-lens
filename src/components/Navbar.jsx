import React from 'react';
import { LogOut, Search, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border z-50 px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔍</span>
        <h1 className="text-xl font-bold tracking-tight text-accent flex items-center gap-2">
          data<span className="text-white">-lens</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-2">
          <span className="text-sm font-semibold text-white leading-tight">{user?.name}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="bg-border text-accent text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-white/5 shadow-inner">
              {user?.role === 'admin' ? 'Administrator' : user?.role}
            </span>
          </div>
        </div>
        
        <div className="h-6 w-[1px] bg-border mx-1" />
        
        <button
          onClick={logout}
          className="px-4 py-1.5 rounded-lg bg-transparent border border-border hover:bg-border text-white transition-all text-xs font-semibold shadow-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
