import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';

const APP_VERSION_DATA = {
  version: '1.0.467',
  releaseDate: 'May 2026',
  label: 'Dynamic Matrix & Multi-Period Perf Hub'
};

export default function Footer() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#000000] border-t border-gray-900 py-3 px-6 shadow-2xl">
      <div className="flex items-center justify-between">
        {/* LEFT */}
        <p className="text-[10px] sm:text-xs text-white flex items-center gap-1 font-medium">
          Developed by{" "}
          <span className="text-[#F5C518] font-bold uppercase tracking-tighter">
            Dr. Peter Ramsis
          </span>{" "}
          <span className="hidden sm:inline text-white/50 lowercase tracking-widest">| Area Supervisor</span>
        </p>

        {/* CENTER */}
        <p className="text-[10px] sm:text-xs text-white/40 font-black hidden md:block uppercase tracking-[0.3em]">
          Data Lens Analytics
        </p>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />
          <span className="text-[10px] sm:text-xs text-white font-medium">
            Version{" "}
            <span className="text-[#F5C518] font-bold">
              {APP_VERSION_DATA.version}
            </span>
          </span>
          <span className="text-white/20 hidden sm:block">|</span>
          <button
            onClick={handleLogout}
            className="text-[10px] sm:text-xs border border-[#F5C518]/50 
                       text-[#F5C518] bg-[#F5C518]/5 white font-black px-3 py-1.5
                       hover:bg-[#F5C518] hover:text-black rounded-xl
                       transition-all duration-300 uppercase tracking-widest shadow-lg"
          >
            Logout
          </button>
        </div>
      </div>
    </footer>
  );
}
