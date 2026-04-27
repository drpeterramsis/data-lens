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
import UserManagement from './pages/admin/UserManagement';

const AppLayout = ({ children }) => {
  const { isOpen } = useSidebar();
  
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans selection:bg-accent/30 selection:text-accent-dark">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main 
          className={`pt-14 flex-1 flex flex-col transition-all duration-300 ${isOpen ? 'pl-60' : 'pl-0'}`}
        >
          <div className="p-8 pb-32 max-w-[1600px] mx-auto w-full flex flex-col flex-1">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/tools/call-detailing" element={
        <ProtectedRoute>
          <AppLayout>
            <CallDetailingAnalyzer />
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/tools/sales-analyzer" element={
        <ProtectedRoute>
          <AppLayout>
            <SalesAnalyzer />
          </AppLayout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/users" element={
        <ProtectedRoute adminOnly={true}>
          <AppLayout>
            <UserManagement />
          </AppLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
