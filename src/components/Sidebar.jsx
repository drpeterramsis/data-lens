import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  LayoutDashboard, 
  Phone, 
  BarChart2, 
  TrendingUp, 
  Map as MapIcon, 
  Link as LinkIcon, 
  GraduationCap, 
  Settings as SettingsIcon,
  Shield,
  FolderOpen,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

import { SidebarIcon } from './sidebar/SidebarIcon';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useDashboardConfig } from '../context/DashboardConfigContext';

const DEFAULT_GROUPS = [
  { id: 'grp_main', label: 'Main', icon: 'dashboard', order: 1, visible: true, collapsible: false, defaultCollapsed: false },
  { id: 'grp_analytics', label: 'Analytics', icon: 'bar_chart', order: 2, visible: true, collapsible: true, defaultCollapsed: true },
  { id: 'grp_resources', label: 'Resources', icon: 'folder', order: 3, visible: true, collapsible: true, defaultCollapsed: true },
  { id: 'grp_admin', label: 'Administration', icon: 'settings', order: 4, visible: true, collapsible: false, defaultCollapsed: false, adminOnly: true }
];

const DEFAULT_MENU_ITEMS = [
  { id: 'menu_dashboard', label: 'Dashboard', icon: 'dashboard', route: '/dashboard', order: 1, visible: true, adminOnly: false, groupId: 'grp_main' },
  { id: 'menu_call-detailing', label: 'Call Detailing', icon: 'phone', route: '/tools/call-detailing', order: 2, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_sales-analyzer', label: 'ATR Sales Analyzer', icon: 'bar_chart', route: '/sales-analyzer', order: 3, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_per_customer_analyzer', label: 'Per Customer Analyzer', icon: 'users', route: '/per_customer_analyzer', order: 4, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_sales-forecast', label: 'Sales Forecast', icon: 'trending_up', route: '/tools/sales-forecast', order: 5, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_routing-analyzer', label: 'Routing Analyzer', icon: 'map', route: '/routing-analyzer', order: 5, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_library', label: 'Library', icon: 'link', route: '/library', order: 6, visible: true, adminOnly: false, groupId: 'grp_resources' },
  { id: 'menu_skill-zaty', label: 'Skill-Zaty', icon: 'school', route: '/skill-zaty', order: 7, visible: true, adminOnly: false, groupId: 'grp_resources' },
  { id: 'menu_admin-settings', label: 'Admin Settings', icon: 'shield', route: '/admin-settings', order: 8, visible: true, adminOnly: true, groupId: 'grp_admin' }
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isExpanded, isMobileOpen, toggleExpanded, closeMobile } = useSidebar();
  const { config } = useDashboardConfig();
  const sidebarRef = React.useRef(null);
  const isAdmin = user?.role === 'admin';
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    const initial = {};
    // Only use default groups as standard config might not be loaded yet synchronously here
    DEFAULT_GROUPS.forEach(g => {
      if (g.id !== 'grp_main' && g.collapsible !== false) {
        initial[g.id] = true;
      }
    });
    return initial;
  });

  // Removed getIcon handler

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

  useEffect(() => {
    if (config?.sidebarGroups) {
      const initialCollapsed = {};
      config.sidebarGroups.forEach(g => {
        if (g.collapsible !== false && g.id !== 'grp_main') {
          initialCollapsed[g.id] = true;
        }
      });
      setCollapsedGroups(prev => {
        // Only set the ones that haven't been manually toggled during this session, 
        // actually just trust the currently loaded config on first pass
        if (Object.keys(prev).length <= DEFAULT_GROUPS.length) {
          return { ...initialCollapsed, ...prev };
        }
        return prev;
      });
    }
  }, [config]);

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const groups = (config?.sidebarGroups || DEFAULT_GROUPS)
    .filter(g => g.visible)
    .filter(g => !g.adminOnly || isAdmin)
    .sort((a, b) => a.order - b.order);

  const menuItems = (config?.sidebarMenu || DEFAULT_MENU_ITEMS).map(item => {
    let route = item.route;
    if (route === '/tools/sales-analyzer') route = '/sales-analyzer';
    if (route === '/tools/per-customer-analyzer') route = '/per-customer-analyzer';
    if (route === '/links-library') route = '/library';
    // Clean up dashboard old route if present
    if (route === '/') route = '/dashboard';
    
    return { ...item, route };
  });

  const getGroupItems = (groupId) =>
    menuItems
      .filter(item =>
        item.groupId === groupId &&
        item.visible &&
        (!item.adminOnly || isAdmin) &&
        (isAdmin || user?.allowedPages?.includes(item.id.replace('menu_', ''))) // Handle both tool id and menu_ prefix if used
      )
      .sort((a, b) => a.order - b.order);

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

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
          ${isExpanded ? 'md:w-[240px]' : 'md:w-[80px]'} 
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
            <span className="text-xl shrink-0"><Search size={22} className="text-white" /></span>
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
        
        {/* Top Section - User Info Card */}
        <div className={`shrink-0 border-b border-gray-800 bg-gray-950/20 p-4 transition-all duration-300 ${isExpanded || isMobileOpen ? 'block' : 'flex justify-center'}`}>
          {isExpanded || isMobileOpen ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md group">
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-gray-700/50"
                  style={{ backgroundColor: user?.username ? `hsl(${user.username.length * 40}, 60%, 40%)` : '#198754' }}
                >
                  <span className="text-sm font-black">
                    {user?.avatar || getInitials(user?.fullName)}
                  </span>
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="text-xs font-black text-white truncate leading-tight">{user?.fullName}</div>
                  <div className="text-[9px] text-[#FFC300] font-black uppercase tracking-wider truncate leading-tight mt-1">{user?.role}</div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 cursor-pointer shadow-sm border border-gray-700/50 transition-transform hover:scale-105"
              style={{ backgroundColor: user?.username ? `hsl(${user.username.length * 40}, 60%, 40%)` : '#198754' }}
              title={`Logged in as ${user?.fullName}`}
              onClick={logout}
            >
              <span className="text-sm font-black">
                {user?.avatar || getInitials(user?.fullName)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 custom-scrollbar sidebar-nav">
          {groups.map(group => {
            const items = getGroupItems(group.id);
            if (items.length === 0) return null;

            const isCollapsed = collapsedGroups[group.id];

            return (
              <div key={group.id} className="mb-2">
                {/* Group Header */}
                {group.id !== 'grp_main' && (
                  <div
                    className={`flex items-center justify-between px-4 select-none
                      ${group.collapsible ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}
                      ${(!isExpanded && !isMobileOpen) ? 'py-3' : 'py-2'}
                    `}
                    onClick={() => group.collapsible && toggleGroup(group.id)}
                  >
                    {(!isExpanded && !isMobileOpen) ? (
                      <div 
                        className="w-full flex justify-center text-slate-500 hover:text-slate-300 transition-colors"
                        title={group.label}
                      >
                        <SidebarIcon name={group.icon || 'folder'} size={18} />
                      </div>
                    ) : (
                      <>
                        <span 
                          className="text-[0.65rem] font-bold uppercase tracking-[0.1em]"
                          style={{ color: '#FFC300' }}
                        >
                          {group.label.toUpperCase()}
                        </span>
                        {group.collapsible && (
                          <span 
                            className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                            style={{ color: '#FFC300', fontSize: '0.6rem' }}
                          >
                            ▾
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="flex flex-col gap-1 px-2">
                    {items.map(item => (
                      <NavLink
                        key={item.id}
                        to={item.route}
                        onClick={() => closeSidebar()}
                        title={(!isExpanded && !isMobileOpen) ? item.label : undefined}
                        className={({ isActive }) =>
                          `group flex items-center rounded-xl font-bold transition-all whitespace-nowrap overflow-hidden relative
                          ${isActive 
                            ? 'bg-transparent text-[#FFC300]' 
                            : 'text-white/85 hover:text-white hover:bg-white/5'
                          }
                          ${isExpanded || isMobileOpen ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5'}
                          `
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="w-5 flex items-center justify-center text-lg shrink-0">
                              <SidebarIcon name={item.icon} size={18} strokeWidth={1.8} />
                            </div>
                            <span className={`text-[0.82rem] transition-opacity duration-300 ${isExpanded || isMobileOpen ? 'opacity-100' : 'opacity-0 hidden md:block w-0'}`}>
                              {item.label}
                            </span>
                            
                            {/* Active dot */}
                            {(isExpanded || isMobileOpen) && isActive && (
                               <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#FFC300]" />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Help Section */}
        {(isExpanded || isMobileOpen) && (
          <div className="mt-auto border-t border-gray-800 bg-gray-900/50">
            <details className="group">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors list-none">
                <div className="flex items-center gap-2">
                  <HelpCircle size={16} className="text-yellow-400" />
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Need help?</span>
                </div>
                <span className="text-[10px] text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              
              <div className="px-4 pb-4 space-y-3">
                <div className="flex flex-col border-l-2 border-yellow-400/30 pl-3">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Contact with</span>
                  <span className="text-[11px] text-white font-bold leading-tight">Dr. Peter Ramsis Tawfeek</span>
                  <span className="text-[10px] text-yellow-400/80 font-medium pb-1 border-b border-white/5 mb-2">Area Supervisor</span>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Phone</span>
                    <span className="text-[11px] text-white/90 font-mono">+20 106 999 6672</span>
                  </div>
                </div>
                
                <a 
                  href="https://wa.me/201069996672?text=Hello%20Dr.%20Peter,%20I%20need%20help%20with%20DataLens."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest border-b-4 border-[#128C7E] active:border-b-0 active:translate-y-1"
                >
                  <MessageCircle size={14} className="fill-white" />
                  WhatsApp
                </a>
              </div>
            </details>
          </div>
        )}

        {/* Bottom Section - User Info */}
        <div className="shrink-0 border-t border-gray-800 relative sidebar-footer h-14 flex items-center justify-center">
          {/* Default bottom user controls are now moved to the top of the sidebar. Keeping collapse button */}
          
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
