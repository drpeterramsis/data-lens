import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const getPageIdFromPath = (path) => {
    if (path === '/dashboard') return 'dashboard';
    if (path === '/tools/call-detailing') return 'call-detailing';
    if (path === '/tools/sales-analyzer') return 'sales-analyzer';
    if (path === '/tools/sales-forecast') return 'sales-forecast';
    if (path === '/routing-analyzer') return 'routing-analyzer';
    if (path === '/links-library') return 'links-library';
    if (path === '/admin/users') return 'user-management';
    return null;
  };

  const requiredPageId = getPageIdFromPath(location.pathname);
  // Admin always has access. For others, check allowedPages.
  if (user.role !== 'admin' && requiredPageId && !user.allowedPages?.includes(requiredPageId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
