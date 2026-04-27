import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Redirect to the first available tool
      if (user.tools && user.tools.length > 0) {
        navigate(`/tools/${user.tools[0]}`, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/users', { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent animate-spin rounded-full" />
        <p className="text-muted font-medium italic">Loading your personalized workspace...</p>
      </div>
    </div>
  );
};

export default Dashboard;
