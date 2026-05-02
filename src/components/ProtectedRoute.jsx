import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ALL_TOOLS } from '../config/toolsConfig';

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
    // Exact match
    const tool = ALL_TOOLS.find(t => t.route === path);
    if (tool) return tool.id;
    // Fallback prefix match (for subpaths if any)
    const prefixTool = ALL_TOOLS.find(t => t.route !== '/' && path.startsWith(t.route));
    if (prefixTool) return prefixTool.id;
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
