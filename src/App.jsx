import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CallDetailingAnalyzer from './tools/CallDetailingAnalyzer';
import SalesAnalyzer from './tools/SalesAnalyzer';
import RoutingAnalyzer from './tools/RoutingAnalyzer';
import UserManagement from './pages/admin/UserManagement';

import ScrollToTopButton from './components/ScrollToTopButton';

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans selection:bg-accent/30 selection:text-accent-dark">
      <Navbar />
      <main 
        style={{ paddingTop: "calc(var(--nav-height) + 16px)" }}
        className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-32 space-y-4 sm:space-y-6"
      >
        {children}
      </main>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root redirect to login or dashboard */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      {/* Main App Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/tools/call-detailing" element={
        <ProtectedRoute>
          <AppLayout><CallDetailingAnalyzer /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/tools/sales-analyzer" element={
        <ProtectedRoute>
          <AppLayout><SalesAnalyzer /></AppLayout>
        </ProtectedRoute>
      } />

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

      {/* Admin Route still protected for adminOnly check */}
      <Route path="/admin/users" element={
        <ProtectedRoute adminOnly={true}>
          <AppLayout><UserManagement /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all redirect to dash */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;
