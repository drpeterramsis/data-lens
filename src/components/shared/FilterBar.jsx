import React, { useState } from 'react';
import { Search, ChevronDown, Check, X, Filter } from 'lucide-react';

const FilterBar = ({ options, filters, onFilterChange, onReset, dataCount }) => {
  const [showFilters, setShowFilters] = useState(true);

  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'search') return !!val;
    if (key === 'mrNames' || key === 'specialties') return val.length > 0;
    return val !== 'All' && val !== '';
  }).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-accent" />
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Analysis Filters</h3>
          {activeCount > 0 && (
            <span className="bg-accent text-accent-dark px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
              {activeCount} Active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-gray-400">
             Showing <span className="text-gray-900">{dataCount.toLocaleString()}</span> interactions
          </div>
          <button 
            onClick={onReset}
            className="text-xs font-bold text-gray-500 hover:text-danger px-3 py-1 rounded-lg border border-gray-200 hover:border-danger/20 transition-all"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Search */}
        <div className="col-span-full mb-2">
           <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Global Intent Search</label>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
               type="text" 
               placeholder="Search Customer Name, MR Name, or Product..."
               className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent transition-all"
               value={filters.search}
               onChange={(e) => onFilterChange('search', e.target.value)}
             />
           </div>
        </div>

        {/* MR Multi-Select (Simplified for now) */}
        <div>
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Medical Representative</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none font-medium"
            value={filters.mrName}
            onChange={(e) => onFilterChange('mrName', e.target.value)}
          >
            <option value="All">All Representatives</option>
            {options.mrNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {/* Interaction Type */}
        <div>
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Interaction Type</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none font-medium"
            value={filters.interactionType}
            onChange={(e) => onFilterChange('interactionType', e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="HCP">HCP (Doctor)</option>
            <option value="HCO">HCO (Hospital/Center)</option>
            <option value="Pharmacy">Pharmacy</option>
          </select>
        </div>

        {/* Customer Grade */}
        <div>
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Customer Grade</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none font-medium"
            value={filters.customerGrade}
            onChange={(e) => onFilterChange('customerGrade', e.target.value)}
          >
            <option value="All">All Grades</option>
            {options.customerGrades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </div>

        {/* Coaching */}
        <div>
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Coaching Status</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none font-medium"
            value={filters.coaching}
            onChange={(e) => onFilterChange('coaching', e.target.value)}
          >
            <option value="All">All Sessions</option>
            <option value="True">Coached Only</option>
            <option value="False">Not Coached Only</option>
          </select>
        </div>

        {/* Specialty */}
        <div className="lg:col-span-3">
          <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Specialty Domain</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none font-medium"
            value={filters.specialty}
            onChange={(e) => onFilterChange('specialty', e.target.value)}
          >
            <option value="All">All Specialties</option>
            {options.specialties.map(spec => <option key={spec} value={spec}>{spec}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
