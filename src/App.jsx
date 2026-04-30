import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CallDetailingAnalyzer from './tools/CallDetailingAnalyzer';
import SalesAnalyzer from './tools/SalesAnalyzer';
import RoutingAnalyzer from './tools/RoutingAnalyzer';
import UserManagement from './pages/admin/UserManagement';
import ScrollToTopButton from './components/ScrollToTopButton';

// ── Must match Footer.jsx h-[48px] ──
const FOOTER_H = 48;

// ════════════════════════════════════════════
// APP LAYOUT
// ════════════════════════════════════════════
const AppLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Navbar — fixed at top, sets --nav-height via its own useEffect */}
      <Navbar />

      {/* Main body — sits between Navbar and Footer */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          marginTop:    'var(--nav-height, 64px)',
          marginBottom: `${FOOTER_H}px`,
        }}
      >
        {children}
      </main>

      {/* Footer — fixed at bottom */}
      <Footer />

      {/* Scroll to top button */}
      <ScrollToTopButton />
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

      {/* Sales Analyzer */}
      <Route
        path="/tools/sales-analyzer"
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

      {/* User Management — Admin only */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout>
              <UserManagement />
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
        <SidebarProvider>
          <AppRoutes />
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;