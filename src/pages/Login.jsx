import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, Shield } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-12 font-sans">
      <Toast toast={toast} onClose={hideToast} />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
               <span className="text-2xl">🔍</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">
              Data<span className="text-accent"> Lens</span>
            </h1>
          </div>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Supervisor Analytics Portal</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-gray-200 rounded-3xl p-8 shadow-card relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12" />

          <h2 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-widest border-b-2 border-accent w-fit pb-1">Authenticate</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Supervisor Node Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-accent transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-gray-200 font-medium"
                  placeholder="admin@datalens.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Secure Passkey</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-gray-200 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-accent hover:bg-accent-hover text-accent-dark font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-accent-dark border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Portal Access</span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-center">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
              <Shield size={12} className="text-success" /> End-to-End Encryption Active
            </p>
          </div>
        </motion.div>
        
        <p className="mt-12 text-center text-[10px] text-gray-400 uppercase tracking-[0.3em] font-black">
          Datalens Analytics Engine ● v1.0.024
        </p>
      </div>
    </div>
  );
};

export default Login;
