import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, User, Users, Check } from 'lucide-react';

/**
 * Custom MR Dropdown Selection Component
 * 
 * @param {Object} props
 * @param {Array} props.mrList - Array of MR names (strings)
 * @param {string} props.selected - Currently selected MR name or empty string for "All Team"
 * @param {Function} props.onChange - Callback when MR matches selection change
 */
const MrDropdown = ({ mrList, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const filteredList = mrList.filter(mr =>
    mr.toLowerCase().includes(search.toLowerCase())
  );

  const isAllTeam = !selected;
  
  // Selection logic: empty string is "All Team"
  const handleSelect = (mrName) => {
    onChange(mrName);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-between min-w-[220px] max-w-[280px] h-10 px-3.5 
          border-1.5 rounded-[10px] cursor-pointer transition-all duration-200 shadow-sm text-[0.88rem]
          ${!isAllTeam 
            ? 'border-[#FFC300] bg-[#FFFBEB] text-[#7B0000] font-semibold' 
            : 'border-[#E2E8F0] bg-white text-[#1e293b] font-medium hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
          }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-base shrink-0">
            {isAllTeam ? '👥' : '👤'}
          </span>
          <span className="truncate">
            {isAllTeam ? 'All Team' : selected}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`shrink-0 transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180 text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 min-w-[260px] bg-white border-1.5 border-[#E2E8F0] 
          rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-2 z-[1000] max-h-[320px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Search Box */}
          <div className="px-2.5 pb-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search MR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 border-1.5 border-[#E2E8F0] rounded-lg text-[0.82rem] outline-none 
                  text-[#475569] placeholder:text-gray-300 focus:border-[#FFC300] transition-colors"
              />
            </div>
          </div>

          <div className="h-px bg-[#F1F5F9] my-1.5 mx-0" />

          {/* All Team Option */}
          {!search && (
            <div
              onClick={() => handleSelect('')}
              className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-[0.85rem] transition-colors
                ${isAllTeam 
                  ? 'bg-[#FFFBEB] text-[#7B0000] font-semibold' 
                  : 'text-[#374151] hover:bg-[#F8FAFC] hover:text-[#1e293b]'
                }`}
            >
              <div className="w-4 flex items-center justify-center shrink-0">
                {isAllTeam ? <Check size={14} className="text-[#FFC300] stroke-[3px]" /> : <span className="text-xs">👥</span>}
              </div>
              <span>All Team</span>
            </div>
          )}

          {/* MR List */}
          <div className="space-y-0.5">
            {filteredList.map((mr) => {
              const isSelected = selected === mr;
              return (
                <div
                  key={mr}
                  onClick={() => handleSelect(mr)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-[0.85rem] transition-colors
                    ${isSelected 
                      ? 'bg-[#FFFBEB] text-[#7B0000] font-semibold' 
                      : 'text-[#374151] hover:bg-[#F8FAFC] hover:text-[#1e293b]'
                    }`}
                >
                  <div className="w-4 flex items-center justify-center shrink-0">
                    {isSelected ? <Check size={14} className="text-[#FFC300] stroke-[3px]" /> : <span className="text-xs">👤</span>}
                  </div>
                  <span className="truncate">{mr}</span>
                </div>
              );
            })}
          </div>

          {/* No Results */}
          {filteredList.length === 0 && search && (
            <div className="py-8 px-4 text-center">
              <p className="text-[0.85rem] text-gray-400 italic">No MR found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MrDropdown;
