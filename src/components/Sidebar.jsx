import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { ALL_TOOLS } from '../config/toolsConfig';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isExpanded, isMobileOpen, toggleExpanded, closeMobile } = useSidebar();
  const sidebarRef = React.useRef(null);

  const closeSidebar = () => {
    if (window.innerWidth < 768) {
      if (isMobileOpen) closeMobile();
    } else {
      if (isExpanded) toggleExpanded();
    }
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      if (isMobileOpen) closeMobile();
    } else {
      toggleExpanded();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target)
      ) {
        closeSidebar();
      }
    };

    if (isMobileOpen || isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileOpen, isExpanded, closeMobile, toggleExpanded]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isMobileOpen, isExpanded, closeMobile, toggleExpanded]);

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const visibleItems = ALL_TOOLS.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (user?.role !== 'admin' && !user?.allowedPages?.includes(item.id)) return false;
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      {(isMobileOpen || isExpanded) && (
        <div 
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${isMobileOpen ? 'bg-black/50' : 'hidden md:block bg-transparent'}`}
          onClick={closeSidebar}
          onTouchStart={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        ref={sidebarRef}
        className={`fixed top-0 left-0 bottom-0 h-full bg-gray-900 border-r border-gray-800 text-white z-50 flex flex-col transition-all duration-300 transform 
          ${isExpanded ? 'md:w-[240px]' : 'md:w-[64px]'} 
          ${isMobileOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full md:translate-x-0'}
        `}
      >
        {/* Top Section - Logo */}
        <div 
          onClick={toggleSidebar}
          className={`h-14 flex items-center shrink-0 border-b border-gray-800 relative cursor-pointer hover:bg-white/10 transition-colors ${isExpanded || isMobileOpen ? 'px-4' : 'px-0 justify-center'}`}
          title="Toggle Menu"
        >
          <div className="flex items-center gap-2 overflow-hidden h-full py-2">
            <span className="text-xl shrink-0">🔍</span>
            <div className={`flex flex-col whitespace-nowrap transition-opacity duration-300 ${isExpanded || isMobileOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
              <div className="font-bold text-base text-white leading-tight">Data Lens</div>
              <div className="text-[10px] text-yellow-400 leading-tight">Pharma Analytics Portal</div>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              closeMobile();
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-1 custom-scrollbar">
          {visibleItems.map((item) => (
            <NavLink
              key={item.route}
              to={item.route}
              onClick={() => {
                closeSidebar();
              }}
              title={(!isExpanded && !isMobileOpen) ? item.name : undefined}
              className={({ isActive }) =>
                `group flex items-center rounded-xl font-bold transition-all whitespace-nowrap overflow-hidden
                ${isActive 
                  ? 'bg-yellow-400 text-gray-900 shadow-sm' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
                ${isExpanded || isMobileOpen ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5'}
                `
              }
            >
              <div className="w-5 flex items-center justify-center text-lg shrink-0">
                {typeof item.icon === 'string' ? item.icon : <item.icon size={20} />}
              </div>
              <span className={`transition-opacity duration-300 ${isExpanded || isMobileOpen ? 'opacity-100' : 'opacity-0 hidden md:block w-0'}`}>
                {item.name}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Bottom Section - User Info */}
        <div className="shrink-0 border-t border-gray-800 relative">
          <div className={`flex items-center ${isExpanded || isMobileOpen ? 'p-4 gap-3' : 'p-3 flex-col gap-2'}`}>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-gray-700 shadow-sm"
              style={{ backgroundColor: user?.username ? `hsl(${user.username.length * 40}, 60%, 40%)` : '#198754' }}
              title={(!isExpanded && !isMobileOpen) ? user?.fullName : undefined}
            >
              <span className="text-xs font-black text-white">
                {user?.avatar || getInitials(user?.fullName)}
              </span>
            </div>
            
            <div className={`flex-1 min-w-0 flex flex-col justify-center whitespace-nowrap transition-opacity duration-300 ${isExpanded || isMobileOpen ? 'opacity-100' : 'opacity-0 hidden md:block w-0 h-0'}`}>
              <div className="text-sm font-bold truncate text-white">{user?.fullName}</div>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider truncate pb-[1px]">{user?.role}</div>
            </div>

            <button 
              onClick={logout}
              className={`text-gray-400 hover:text-red-400 transition-colors ${isExpanded || isMobileOpen ? 'p-1.5' : 'p-0 pt-2'}`}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Desktop Collapse Arrow Button */}
          <button
            onClick={toggleExpanded}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-800 border border-gray-700 text-gray-300 rounded-full items-center justify-center hover:bg-gray-700 hover:text-white transition-colors z-50 shadow-sm"
          >
            {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
