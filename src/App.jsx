import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CallDetailingAnalyzer from './tools/CallDetailingAnalyzer';
import SalesAnalyzer from './tools/SalesAnalyzer';
import UserManagement from './pages/admin/UserManagement';

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <Sidebar />
      <main className="pl-[260px] pt-16 min-h-screen">
        <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-6">
          {children}
        </div>
      </main>
      
      <footer className="pl-[260px] pb-8 text-center">
        <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-medium">
          Datalens Analytics Engine ● Developed for Supervisors ● Version 1.0.012
        </p>
      </footer>
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
