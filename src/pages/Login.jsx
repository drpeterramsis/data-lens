import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Lock, LogIn, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const result = login(username, password);
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message);
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-12 font-sans bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-accent rounded-[1.5rem] flex items-center justify-center shadow-xl transform rotate-3 border-4 border-white">
               <span className="text-3xl">🔍</span>
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">
                Data<span className="text-accent underline decoration-accent/10"> Lens</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-tight mt-0.5">Pharma Analytics Portal</p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />

          <h2 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-[0.2em] border-b-4 border-accent w-fit pb-1">Authenticate</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
                <AlertCircle size={18} />
                <p className="text-[10px] font-black uppercase">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Username / ID Code</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-accent transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-gray-900 focus:outline-none focus:border-accent focus:bg-white transition-all placeholder:text-gray-200 font-bold shadow-inner"
                  placeholder="e.g. admin"
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
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-gray-900 focus:outline-none focus:border-accent focus:bg-white transition-all placeholder:text-gray-200 font-bold shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-5 px-4 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-gray-100 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4 text-xs"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Enter Portal</span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-10 pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
              <Shield size={10} className="text-success" /> Secure 256-bit encrypted tunnel
            </p>
          </div>
        </motion.div>
        
        <p className="mt-12 text-center text-[9px] text-gray-400 uppercase tracking-[0.4em] font-black opacity-40">
          Data Lens Analytics Engine ● Pharma Analytics Portal
        </p>
      </div>
    </div>
  );
};

export default Login;
