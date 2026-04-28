import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import appVersion from "../config/version";

export default function Footer() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[100] bg-black border-t border-gray-800 py-2 px-6 shadow-2xl">
      <div className="flex items-center justify-between">
        {/* LEFT */}
        <p className="text-[10px] sm:text-xs text-white/70 flex items-center gap-1 font-medium">
          Developed by{" "}
          <span className="text-accent font-black uppercase tracking-tighter">
            Dr. Peter Ramsis
          </span>{" "}
          <span className="hidden sm:inline text-white/50">| Area Supervisor</span>
        </p>

        {/* CENTER */}
        <p className="text-[10px] sm:text-xs text-white/40 font-medium hidden md:block">
          Copyright © 2026 Data Lens. All rights reserved.
        </p>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            <span className="text-[10px] text-white/60 font-black uppercase tracking-widest leading-none">System Live</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />
          <span className="text-[10px] sm:text-xs text-white/70 font-medium">
            Version{" "}
            <span className="text-accent font-black">
              {appVersion.version}
            </span>
          </span>
          <span className="text-white/20 hidden sm:block">|</span>
          <button
            onClick={handleLogout}
            className="text-[10px] sm:text-xs border border-accent/50 
                       text-accent bg-accent/10 rounded-md px-2.5 py-1
                       hover:bg-accent hover:text-black
                       transition-all duration-150 font-black uppercase tracking-widest shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </footer>
  );
}
