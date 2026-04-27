import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast, { useToast } from '../components/Toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Artificial delay for feel
    setTimeout(() => {
      const result = login(email, password);
      
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        showToast(result.message, 'error');
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <Toast toast={toast} onClose={hideToast} />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl">🔍</span>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
              data<span className="text-accent">-lens</span>
            </h1>
          </div>
          <p className="text-muted font-medium tracking-wide">Your data, crystal clear</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-surface border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />

          <h2 className="text-2xl font-bold text-white mb-8">Access Portal</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-accent transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-xl text-white focus:outline-none focus:border-accent transition-all placeholder:text-muted/30"
                  placeholder="admin@datalens.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-muted mb-2 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-xl text-white focus:outline-none focus:border-accent transition-all placeholder:text-muted/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-accent hover:bg-accent-hover text-bg font-black rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-bg border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-border/50 flex items-center justify-center">
            <p className="text-xs text-muted flex items-center gap-1">
              Secured data environment <span className="text-accent">●</span> Supervisor Access Only
            </p>
          </div>
        </motion.div>
        
        <p className="mt-8 text-center text-[10px] text-muted uppercase tracking-[0.2em] font-medium">
          Datalens Platform © 2026 ● Version 1.0.012
        </p>
      </div>
    </div>
  );
};

export default Login;
