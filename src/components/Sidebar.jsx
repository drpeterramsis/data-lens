import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useDashboardConfig } from '../context/DashboardConfigContext';
import { 
  LayoutDashboard, 
  Phone, 
  BarChart2, 
  TrendingUp, 
  Map as MapIcon, 
  Link as LinkIcon, 
  GraduationCap, 
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';

const DEFAULT_GROUPS = [
  { id: 'grp_main', label: 'Main', icon: '📊', color: '#3B82F6', order: 1, visible: true, collapsible: false, defaultCollapsed: false },
  { id: 'grp_analytics', label: 'Analytics', icon: '📈', color: '#10B981', order: 2, visible: true, collapsible: true, defaultCollapsed: false },
  { id: 'grp_resources', label: 'Resources', icon: '📚', color: '#EC4899', order: 3, visible: true, collapsible: true, defaultCollapsed: false },
  { id: 'grp_admin', label: 'Administration', icon: '⚙️', color: '#8B5CF6', order: 4, visible: true, collapsible: false, defaultCollapsed: false, adminOnly: true }
];

const DEFAULT_MENU_ITEMS = [
  { id: 'menu_dashboard', label: 'Dashboard', icon: 'dashboard', route: '/', order: 1, visible: true, adminOnly: false, groupId: 'grp_main' },
  { id: 'menu_call_detailing', label: 'Call Detailing', icon: 'phone', route: '/call-detailing', order: 2, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_sales_analyzer', label: 'ATR Sales Analyzer', icon: 'bar_chart', route: '/sales-analyzer', order: 3, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_sales_forecast', label: 'Sales Forecast', icon: 'trending_up', route: '/sales-forecast', order: 4, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_routing', label: 'Routing Analyzer', icon: 'map', route: '/routing-analyzer', order: 5, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_library', label: 'Library', icon: 'link', route: '/library', order: 6, visible: true, adminOnly: false, groupId: 'grp_resources' },
  { id: 'menu_skillzaty', label: 'Skill-Zaty', icon: 'school', route: '/skill-zaty', order: 7, visible: true, adminOnly: false, groupId: 'grp_resources' },
  { id: 'menu_admin_settings', label: 'Admin Settings', icon: 'shield', route: '/admin-settings', order: 8, visible: true, adminOnly: true, groupId: 'grp_admin' }
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isExpanded, isMobileOpen, toggleExpanded, closeMobile } = useSidebar();
  const { config } = useDashboardConfig();
  const sidebarRef = React.useRef(null);
  const isAdmin = user?.role === 'admin';
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Helper to get Icon
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'dashboard': return <LayoutDashboard size={20} />;
      case 'phone': return <Phone size={20} />;
      case 'bar_chart': return <BarChart2 size={20} />;
      case 'trending_up': return <TrendingUp size={20} />;
      case 'map': return <MapIcon size={20} />;
      case 'link': return <LinkIcon size={20} />;
      case 'school': return <GraduationCap size={20} />;
      case 'settings': return <SettingsIcon size={20} />;
      case 'shield': return <Shield size={20} />;
      default: return '🔍';
    }
  };

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
        if (g.defaultCollapsed) {
          initialCollapsed[g.id] = true;
        }
      });
      setCollapsedGroups(prev => ({ ...initialCollapsed, ...prev }));
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

  const menuItems = config?.sidebarMenu || DEFAULT_MENU_ITEMS;

  const getGroupItems = (groupId) =>
    menuItems
      .filter(item =>
        item.groupId === groupId &&
        item.visible &&
        (!item.adminOnly || isAdmin)
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 custom-scrollbar">
          {groups.map(group => {
            const items = getGroupItems(group.id);
            if (items.length === 0) return null;

            const isCollapsed = collapsedGroups[group.id];

            return (
              <div key={group.id} className="mb-2">
                {/* Group Header */}
                {group.id !== 'grp_main' && (
                  <div
                    className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none
                      ${group.collapsible ? 'cursor-pointer hover:text-gray-300 transition-colors' : ''}
                      ${(!isExpanded && !isMobileOpen) ? 'justify-center mx-2 px-0 bg-gray-800/50 rounded-lg text-[8px] whitespace-nowrap overflow-hidden' : ''}
                    `}
                    onClick={() => group.collapsible && toggleGroup(group.id)}
                  >
                    <span className="text-xs">{group.icon}</span>
                    <span className={`transition-opacity duration-300 ${isExpanded || isMobileOpen ? 'opacity-100 flex-1' : 'opacity-0 hidden md:block w-0'}`}>
                      {group.label}
                    </span>
                    {group.collapsible && (isExpanded || isMobileOpen) && (
                      <span className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                        ▾
                      </span>
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
                          {getIcon(item.icon)}
                        </div>
                        <span className={`transition-opacity duration-300 ${isExpanded || isMobileOpen ? 'opacity-100' : 'opacity-0 hidden md:block w-0'}`}>
                          {item.label}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
