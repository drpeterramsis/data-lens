import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { DashboardConfigProvider } from './context/DashboardConfigContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CallDetailingAnalyzer from './tools/CallDetailingAnalyzer';
import SalesAnalyzer from './tools/SalesAnalyzer';
import RoutingAnalyzer from './tools/RoutingAnalyzer';
import SalesForecastTool from './tools/SalesForecast';
import Library from './tools/LinksLibrary';
import SkillZaty from './tools/SkillZaty';
import CourseView from './tools/SkillZaty/CourseView';
import AdminSettings from './pages/AdminSettings';
import UserManagement from './pages/admin/UserManagement';
import ScrollToTopButton from './components/ScrollToTopButton';
import { Menu } from 'lucide-react';
import { ALL_TOOLS } from './config/toolsConfig';

// ── Must match Footer.jsx h-[48px] ──
const FOOTER_H = 48;

const Header = () => {
  const { toggleMobile } = useSidebar();
  const location = useLocation();
  
  const currentTool = ALL_TOOLS.find(t => t.route === location.pathname);
  const currentPath = currentTool ? currentTool.name : 'Data Lens';

  return (
    <header className="h-14 flex items-center bg-gray-900 border-b border-gray-800 text-white px-4 md:px-6 z-10 shrink-0 shadow-sm">
      <button 
        className="md:hidden mr-3 p-1.5 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        onClick={toggleMobile}
      >
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-bold text-white">{currentPath}</h1>
    </header>
  );
};

// ════════════════════════════════════════════
// APP LAYOUT
// ════════════════════════════════════════════
const AppLayout = ({ children }) => {
  const { isExpanded } = useSidebar();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      <Sidebar />

      {/* Main body — responds to sidebar width on desktop */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isExpanded ? 'md:ml-[240px]' : 'md:ml-[80px]'} h-screen`}
        style={{ '--sidebar-width': isExpanded ? '240px' : '80px' }}
      >
        <Header />

        <main
          className="flex-1 flex flex-col relative overflow-auto"
          style={{ paddingBottom: 'var(--footer-height)' }}
        >
          {children}
        </main>

        <div 
          className="fixed bottom-0 right-0 left-0 md:left-[var(--sidebar-width)] transition-all duration-300 z-40 shadow-2xl"
          style={{ height: 'var(--footer-height)' }}
        >
          <Footer />
        </div>

        <ScrollToTopButton />
      </div>
    </div>
  );
};

// ════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>

      {/* Public */}
      <Route path="/" element={<Login />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Call Detailing */}
      <Route
        path="/tools/call-detailing"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CallDetailingAnalyzer />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Aliases for migrated old routes */}
      <Route path="/tools/sales-analyzer" element={<Navigate to="/sales-analyzer" replace />} />
      <Route path="/links-library" element={<Navigate to="/library" replace />} />

      {/* Sales Analyzer */}
      <Route
        path="/sales-analyzer"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SalesAnalyzer />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Routing Analyzer */}
      <Route
        path="/routing-analyzer"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoutingAnalyzer />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Sales Forecast */}
      <Route
        path="/tools/sales-forecast"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SalesForecastTool />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Library */}
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Library />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/skill-zaty"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SkillZaty />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/skill-zaty/:courseId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CourseView />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={<Navigate to="/admin-settings" replace />}
      />

      <Route
        path="/admin-settings"
        element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <AdminSettings />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
};

// ════════════════════════════════════════════
// APP
// ════════════════════════════════════════════
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DashboardConfigProvider>
          <SidebarProvider>
            <AppRoutes />
          </SidebarProvider>
        </DashboardConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;