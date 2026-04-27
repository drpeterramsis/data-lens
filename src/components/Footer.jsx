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
    <footer className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 py-2 px-6 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        {/* LEFT */}
        <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 font-medium">
          Developed by{" "}
          <span className="text-accent font-black uppercase tracking-tighter">
            Dr. Peter Ramsis
          </span>{" "}
          <span className="hidden sm:inline">| Area Supervisor</span>
        </p>

        {/* CENTER */}
        <p className="text-[10px] sm:text-xs text-gray-400 font-medium hidden md:block">
          Copyright © 2026 Data Lens. All rights reserved.
        </p>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none">System Live</span>
          </div>
          <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden sm:block" />
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium">
            Version{" "}
            <span className="text-accent font-black">
              {appVersion.version}
            </span>
          </span>
          <span className="text-gray-200 hidden sm:block">|</span>
          <button
            onClick={handleLogout}
            className="text-[10px] sm:text-xs border border-accent 
                       text-accent-dark bg-accent/5 rounded-md px-2.5 py-1
                       hover:bg-accent hover:text-white
                       transition-all duration-150 font-black uppercase tracking-widest shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </footer>
  );
}
