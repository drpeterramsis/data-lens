import React, { useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Activity, BarChart3, Menu, X, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = React.useRef(null);

  React.useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        const h = navRef.current.offsetHeight;
        document.documentElement.style.setProperty("--nav-height", `${h}px`);
      }
    };
    updateNavHeight();
    window.addEventListener("resize", updateNavHeight);
    return () => window.removeEventListener("resize", updateNavHeight);
  }, []);

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all' },
    { title: 'Call Detailing', path: '/tools/call-detailing', icon: Activity, role: 'user' },
    { title: 'ATR Sales Analyzer', path: '/tools/sales-analyzer', icon: BarChart3, role: 'user' },
    { title: 'Routing Analyzer', path: '/routing-analyzer', icon: Map, role: 'user' },
    { title: 'User Management', path: '/admin/users', icon: Settings, role: 'admin' },
  ];

  const visibleItems = menuItems.filter(item => {
    if (item.role === 'all') return true;
    if (item.role === 'admin') return user?.role === 'admin';
    if (item.role === 'user') return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'viewer';
    return false;
  });

  return (
    <>
      <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-6 py-3 bg-gray-900 text-white shadow-md">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <div>
            <div className="font-bold text-sm sm:text-base text-white">
              Data Lens
            </div>
            <div className="text-[9px] sm:text-[11px] text-yellow-400 leading-tight hidden sm:block">
              Pharma Analytics Portal
            </div>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${
                  isActive
                    ? 'bg-yellow-400 text-gray-900 shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>

        {/* User + hamburger */}
        <div className="flex items-center gap-2">
          {/* User info hidden on very small mobile, visible on sm+ */}
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-xs font-bold leading-tight">{user?.name}</span>
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">{user?.role}</span>
          </div>
          
          <div 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 border-gray-700 shadow-sm"
            style={{ backgroundColor: user?.username ? `hsl(${user.username.length * 40}, 60%, 40%)` : '#1A1A2E' }}
          >
            <span className="text-[10px] sm:text-xs font-black text-white">
              {getInitials(user?.name)}
            </span>
          </div>

          <button 
            className="md:hidden text-white text-xl p-1 ml-1 rounded-md hover:bg-gray-800 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed top-[60px] left-0 right-0 bg-gray-900 border-t border-gray-800 z-40 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-200">
          <div className="px-4 py-4 space-y-2">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                    isActive
                      ? 'bg-yellow-400 text-gray-900'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
