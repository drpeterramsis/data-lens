import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  ClipboardCheck, 
  CheckCircle2, 
  AlertCircle, 
  Star, 
  PlusCircle, 
  PieChart as PieIcon, 
  BarChart3, 
  Calendar as CalendarIcon, 
  Search, 
  Download, 
  Filter, 
  X,
  ChevronDown,
  LayoutDashboard,
  Map as MapIcon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// --- VERSION ---
const ROUTING_VERSION = {
  version: '1.0.431',
  releaseDate: 'Jun 2025',
  label: 'Advanced Routing Analysis Engine — Local Storage & Multi-file'
};

// --- HELPERS ---
const parseCSV = (text) => {
  // Use PapaParse for robust CSV handling (handles commas, pipes, etc.)
  const result = Papa.parse(text.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  const lines = result.data;
  if (lines.length < 2) return { data: [], month: '', lineName: '' };
  
  const headers = lines[0];
  // Detect month from col[10] header (e.g. "April Planned")
  const monthPlannedHeader = headers[10] || '';
  const monthName = monthPlannedHeader.replace('Planned', '').trim();
  
  const data = lines.slice(1).map(cols => {
    const parseDays = (str) => {
      if (!str || !str.trim()) return [];
      return str.trim().split(/\s+/)
        .map(d => parseInt(d))
        .filter(d => !isNaN(d));
    };

    const totalPlanned = parseInt(cols[7]) || 0;
    const totalReported = parseInt(cols[8]) || 0;

    return {
      customerId:    cols[0]?.trim(),
      customerName:  cols[1]?.trim(),
      customerType:  cols[2]?.trim(),
      customerGrade: cols[3]?.trim(),
      specialty:     cols[4]?.trim(),
      mrName:        cols[5]?.trim(),
      lineName:      cols[6]?.trim(),
      totalPlanned:  totalPlanned,
      totalReported: totalReported,
      daysInterval:  parseInt(cols[9]) || 0,
      monthPlanned:  parseDays(cols[10]),
      monthReported: parseDays(cols[11]),
    };
  }).filter(r => r.customerId);

  const lineName = data.length > 0 ? data[0].lineName : '';

  return { data, month: monthName, lineName };
};

const getStatus = (planned, reported) => {
  if (planned === 0 && reported === 0) return 'Inactive';
  if (planned === 0 && reported > 0) return 'Not Planned';
  if (reported === 0 && planned > 0) return 'Not Visited';
  if (reported >= planned && planned > 0) return (reported > planned) ? 'Extra' : 'Fully Covered';
  if (reported > 0 && reported < planned) return 'Partial';
  return 'Inactive';
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'Fully Covered':
      return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><CheckCircle2 size={10}/> Fully Covered</span>;
    case 'Partial':
      return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">🟡 Partial</span>;
    case 'Not Visited':
      return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><AlertCircle size={10}/> Not Visited</span>;
    case 'Extra':
      return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><Star size={10}/> Extra</span>;
    case 'Not Planned':
      return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><PlusCircle size={10}/> Not Planned</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-tighter">⬜ Inactive</span>;
  }
};

// --- COMPONENTS ---

const KPICard = ({ title, value, icon: Icon, colorClass, subValue }) => (
  <div className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-1 transition-all hover:shadow-md border-t-4 ${colorClass}`}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</span>
      <Icon className="text-gray-300" size={18} />
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-black text-gray-900 tracking-tight">{value}</span>
      {subValue && <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">{subValue}</span>}
    </div>
  </div>
);

const RoutingAnalyzer = () => {
  const [rawData, setRawData] = useState([]);
  const [reportMonth, setReportMonth] = useState('');
  const [reportYear] = useState('2026'); // Mock year as per spec
  const [lineName, setLineName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    mrName: [],
    specialty: [],
    grade: [],
    customerType: [],
    lineName: [],
    visitStatus: 'All',
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQ, setSearchQ] = useState('');
  const fileInputRef = useRef(null);
  const [sortKey, setSortKey] = useState('customerName');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Grade Targets State
  const [gradeTargets, setGradeTargets] = useState({
    'A+': 3,
    'A': 2,
    'B': 1,
    'C': 1
  });
  const [isEditingTargets, setIsEditingTargets] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Quick Visit Toggles
  const [quickVisitFilter, setQuickVisitFilter] = useState('all'); // all, visited, uncovered, target_met

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('replace'); // 'replace' | 'append'

  // Save to localStorage on data change
  useEffect(() => {
    if (rawData.length > 0) {
      localStorage.setItem(
        'routingData', 
        JSON.stringify({ 
          rawData, 
          reportMonth, 
          lineName 
        })
      );
    }
  }, [rawData, reportMonth, lineName]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('routingData');
    if (saved) {
      try {
        const { rawData: savedData, reportMonth: savedMonth, lineName: savedLine } = JSON.parse(saved);
        setRawData(savedData || []);
        setReportMonth(savedMonth || '');
        setLineName(savedLine || '');
      } catch(e) {
        localStorage.removeItem('routingData');
      }
    }
  }, []);

  const handleClearData = () => {
    if (window.confirm('Clear all routing data? This cannot be undone.')) {
      setRawData([]);
      setReportMonth('');
      setLineName('');
      localStorage.removeItem('routingData');
      clearFilters();
    }
  };

  // File Upload Handling
  const handleFileUpload = (e, mode = uploadMode) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const { data, month, lineName: ln } = parseCSV(text);
      
      if (mode === 'append' && rawData.length > 0) {
        // Merge by customerId + mrName (avoid dups)
        setRawData(prev => {
          const existingKeys = new Set(prev.map(r => `${r.customerId}_${r.mrName}`));
          const newRows = data.filter(r => !existingKeys.has(`${r.customerId}_${r.mrName}`));
          return [...prev, ...newRows];
        });
      } else {
        setRawData(data);
        setReportMonth(month);
        setLineName(ln);
      }
      setIsLoading(false);
      setShowUploadModal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Filter Options Extraction
  const filterOptions = useMemo(() => {
    const options = {
      mrName: new Set(),
      specialty: new Set(),
      grade: new Set(),
      customerType: new Set(),
      lineName: new Set(),
    };
    
    rawData.forEach(r => {
      if (r.mrName) options.mrName.add(r.mrName);
      if (r.specialty) options.specialty.add(r.specialty);
      if (r.customerGrade) options.grade.add(r.customerGrade);
      if (r.customerType) options.customerType.add(r.customerType);
      if (r.lineName) options.lineName.add(r.lineName);
    });

    return {
      mrName: Array.from(options.mrName).sort(),
      specialty: Array.from(options.specialty).sort(),
      grade: Array.from(options.grade).sort(),
      customerType: Array.from(options.customerType).sort(),
      lineName: Array.from(options.lineName).sort(),
    };
  }, [rawData]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];
    let d = [...rawData];
    
    if (filters.mrName.length > 0) d = d.filter(r => filters.mrName.includes(r.mrName));
    if (filters.specialty.length > 0) d = d.filter(r => filters.specialty.includes(r.specialty));
    if (filters.grade.length > 0) d = d.filter(r => filters.grade.includes(r.customerGrade));
    if (filters.customerType.length > 0) d = d.filter(r => filters.customerType.includes(r.customerType));
    if (filters.lineName.length > 0) d = d.filter(r => filters.lineName.includes(r.lineName));
    
    if (filters.visitStatus !== 'All') {
      d = d.filter(r => {
        const status = getStatus(r.totalPlanned, r.totalReported);
        switch(filters.visitStatus) {
          case 'Fully Covered': return status === 'Fully Covered';
          case 'Partially Covered': return status === 'Partial';
          case 'Not Visited': return status === 'Not Visited';
          case 'Extra Visits': return status === 'Extra';
          case 'Not Planned': return status === 'Not Planned';
          default: return true;
        }
      });
    }

    // Quick Visit Toggles
    if (quickVisitFilter === 'visited') {
      d = d.filter(r => r.totalReported > 0);
    } else if (quickVisitFilter === 'uncovered') {
      d = d.filter(r => r.totalReported === 0 && r.totalPlanned > 0);
    } else if (quickVisitFilter === 'target_met') {
      d = d.filter(r => r.totalReported >= (gradeTargets[r.customerGrade] || 0));
    }

    if (searchQ) {
      const q = searchQ.toLowerCase();
      d = d.filter(r => 
        r.customerName.toLowerCase().includes(q) || 
        r.customerId.toLowerCase().includes(q)
      );
    }
    
    return d;
  }, [rawData, filters, searchQ]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Stats Calculations
  const stats = useMemo(() => {
    const totalGross = filteredData.length;
    const deleted = filteredData.filter(r => r.totalPlanned === 0 && r.totalReported === 0).length;
    const active = totalGross - deleted;
    
    const totalPlanned = filteredData.reduce((acc, r) => acc + r.totalPlanned, 0);
    const totalReported = filteredData.reduce((acc, r) => acc + r.totalReported, 0);
    const coverage = totalPlanned > 0 ? (totalReported / totalPlanned * 100) : 0;
    
    // Uncovered: Active (planned > 0) but not visited at all
    const uncovered = filteredData.filter(r => r.totalReported === 0 && r.totalPlanned > 0).length;
    const targetMetCount = filteredData.filter(r => r.totalReported >= (gradeTargets[r.customerGrade] || 0) && r.totalPlanned > 0).length;
    const extraVisits = filteredData.filter(r => r.totalReported > r.totalPlanned).length;

    // Type Breakdown
    const types = filteredData.reduce((acc, r) => {
      acc[r.customerType] = (acc[r.customerType] || 0) + 1;
      return acc;
    }, {});

    return { totalGross, deleted, active, totalPlanned, totalReported, coverage, uncovered, targetMetCount, extraVisits, types };
  }, [filteredData]);

  // Export
  const handleExport = () => {
    const csvData = filteredData.map(r => ({
      'Customer ID': r.customerId,
      'Customer Name': r.customerName,
      'Type': r.customerType,
      'Grade': r.customerGrade,
      'Specialty': r.specialty,
      'MR Name': r.mrName,
      'Line': r.lineName,
      'Planned': r.totalPlanned,
      'Reported': r.totalReported,
      'Coverage %': r.totalPlanned > 0 ? (r.totalReported / r.totalPlanned * 100).toFixed(1) + '%' : '0%',
      'Status': getStatus(r.totalPlanned, r.totalReported),
      'Missed Days': r.monthPlanned.filter(d => !r.monthReported.includes(d)).join(', ')
    }));

    const csvContent = Papa.unparse(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Routing_Report_${reportMonth}_${reportYear}.csv`);
  };

  const handleToggleFilter = (key, val) => {
    setFilters(prev => {
      const current = prev[key];
      const next = current.includes(val) 
        ? current.filter(v => v !== val)
        : [...current, val];
      return { ...prev, [key]: next };
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      mrName: [],
      specialty: [],
      grade: [],
      customerType: [],
      lineName: [],
      visitStatus: 'All',
    });
    setSearchQ('');
    setCurrentPage(1);
  };

  // UI Sections
  const renderSidebar = () => (
    <div className="p-6 h-full flex flex-col gap-8 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] italic">Intelligence Filter</h3>
        <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors group">
          <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
        </button>
      </div>

      {/* Grade Targets */}
      <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Grade Targets</span>
          <button
            onClick={() => setIsEditingTargets(!isEditingTargets)}
            className="text-[10px] font-black text-yellow-600 hover:text-yellow-700 uppercase tracking-widest underline decoration-yellow-200 underline-offset-4"
          >
            {isEditingTargets ? '✓ Save' : 'Adjust'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(gradeTargets).map(([grade, target]) => (
            <div key={grade} className="flex items-center justify-between bg-white rounded-2xl px-3 py-2.5 border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <span className="text-xs font-black text-gray-800">{grade}</span>
              {isEditingTargets ? (
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={target}
                  onChange={(e) => setGradeTargets(prev => ({...prev, [grade]: parseInt(e.target.value) || 0}))}
                  className="w-10 h-7 text-center text-xs font-black border border-gray-200 rounded-xl focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all"
                />
              ) : (
                <span className="text-[10px] font-black text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100 italic">
                  {target}<span className="text-[8px] opacity-70 ml-0.5 uppercase">VIS</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {/* Visit Status */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Visit Status Node</label>
          <select
            value={filters.visitStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, visitStatus: e.target.value }))}
            className="w-full px-4 py-3 rounded-2xl border border-gray-100 text-sm font-black text-gray-700 bg-gray-50 focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Execution States</option>
            <option value="Fully Covered">✅ Fully Covered</option>
            <option value="Partially Covered">🟡 Partial Scope</option>
            <option value="Not Visited">❌ Zero Coverage</option>
            <option value="Extra Visits">⭐ Yield Burst</option>
            <option value="Not Planned">🆕 Unlisted Visit</option>
          </select>
        </div>

        {/* Multi-select Filter Sections */}
        {[
          { label: 'Medical Reps', key: 'mrName', options: filterOptions.mrName },
          { label: 'Specialty Scope', key: 'specialty', options: filterOptions.specialty },
          { label: 'Triage Grade', key: 'grade', options: filterOptions.grade },
          { label: 'Entity Type', key: 'customerType', options: filterOptions.customerType },
          { label: 'Assigned Line', key: 'lineName', options: filterOptions.lineName },
        ].map(section => (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">{section.label}</label>
              {filters[section.key].length > 0 && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, [section.key]: [] }))}
                  className="text-[9px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-2 bg-gray-50/50 rounded-2xl p-2 border border-gray-100/50">
              {section.options.map(opt => (
                <label key={opt} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer group transition-all hover:shadow-sm">
                  <div className={`w-4 h-4 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${filters[section.key].includes(opt) ? 'bg-yellow-400 border-yellow-400' : 'border-gray-200 group-hover:border-yellow-300 bg-white'}`}>
                    {filters[section.key].includes(opt) && <CheckCircle2 size={10} className="text-black" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={filters[section.key].includes(opt)}
                    onChange={() => handleToggleFilter(section.key, opt)}
                  />
                  <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900 truncate uppercase flex-1">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Clear All */}
      <div className="pt-6 border-t border-gray-100">
        <button
          onClick={clearFilters}
          className="w-full py-4 rounded-2xl bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-lg shadow-gray-200"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );

  const renderKPIs = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {[
        {
          label: 'Total Customers',
          value: stats.totalGross.toLocaleString(),
          sub: `${stats.active} active`,
          icon: '👥',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-100',
        },
        {
          label: 'Total Planned',
          value: stats.totalPlanned.toLocaleString(),
          icon: '📋',
          color: 'text-gray-700',
          bg: 'bg-gray-50',
          border: 'border-gray-100',
        },
        {
          label: 'Total Reported',
          value: stats.totalReported.toLocaleString(),
          icon: '✅',
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-100',
        },
        {
          label: 'Coverage',
          value: `${stats.coverage.toFixed(1)}%`,
          icon: '🎯',
          color: stats.coverage >= 80 ? 'text-emerald-600' : stats.coverage >= 50 ? 'text-amber-500' : 'text-red-500',
          bg: stats.coverage >= 80 ? 'bg-emerald-50' : stats.coverage >= 50 ? 'bg-amber' : 'bg-red-50',
          border: stats.coverage >= 80 ? 'border-emerald-100' : stats.coverage >= 50 ? 'border-amber-100' : 'border-red-100',
        },
        {
          label: 'Not Visited',
          value: stats.uncovered.toLocaleString(),
          icon: '⚠️',
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-100',
        },
        {
          label: 'Extra Visits',
          value: stats.extraVisits.toLocaleString(),
          icon: '⭐',
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-100',
        },
      ].map((card, i) => (
        <div key={i} className={`${card.bg} border-2 ${card.border} rounded-2xl p-4 flex flex-col gap-1 transition-all hover:shadow-md cursor-default group`}>
          <div className="flex items-center justify-between">
            <span className="text-xl group-hover:scale-110 transition-transform">{card.icon}</span>
            {card.sub && <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{card.sub}</span>}
          </div>
          <p className={`text-2xl font-black ${card.color} leading-none tracking-tighter mt-2`}>
            {card.value}
          </p>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );

  const renderOverview = () => {
    // Basic Distribution Logic
    const statusCounts = filteredData.reduce((acc, r) => {
      const s = getStatus(r.totalPlanned, r.totalReported);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* HCP/HCO Distribution */}
           <div className="bg-white rounded-3xl border shadow-sm p-6 overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                 <Users className="text-accent" size={20} />
                 <h4 className="text-lg font-black text-gray-900 tracking-tight uppercase">Customer Types</h4>
              </div>
              <div className="space-y-4">
                 {Object.entries(stats.types).map(([type, count]) => (
                    <div key={type} className="space-y-1">
                       <div className="flex justify-between text-xs font-black uppercase tracking-tight">
                          <span className="text-gray-500">{type || 'Unknown'}</span>
                          <span className="text-gray-900">{count}</span>
                       </div>
                       <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                             className="h-full rounded-full bg-accent"
                             style={{ width: `${(count / stats.totalGross) * 100}%` }}
                          />
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-white rounded-3xl border shadow-sm p-6 overflow-hidden col-span-1 lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                 <PieIcon className="text-accent" />
                 <h4 className="text-lg font-black text-gray-900 tracking-tight uppercase">Visit Status Overview</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    {entries.map(([status, count]) => (
                       <div key={status} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                             <span className="text-gray-500">{status}</span>
                             <span className="text-gray-900">{count}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                             <div 
                                className={`h-full rounded-full ${
                                   status === 'Fully Covered' ? 'bg-green-500' :
                                   status === 'Partial' ? 'bg-amber-500' :
                                   status === 'Not Visited' ? 'bg-red-500' :
                                   status === 'Extra' ? 'bg-purple-500' :
                                   'bg-blue-500'
                                }`}
                                style={{ width: `${(count / filteredData.length) * 100}%` }}
                             />
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="flex flex-col justify-center bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 leading-none">Intelligence Audit</p>
                    <p className="text-xs font-bold text-gray-600 leading-relaxed mb-4">
                       Out of <span className="text-gray-900 font-black">{stats.totalGross}</span> nodes, <span className="text-red-500 font-black">{stats.uncovered}</span> nodes are currently <span className="underline decoration-red-200">uncovered</span>. {stats.deleted} nodes are flagged as <span className="italic">deleted/inactive</span>.
                    </p>
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                       <span className="text-[10px] font-black text-red-500 uppercase">Attention Required at {stats.uncovered} Points</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="bg-white rounded-3xl border shadow-sm p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-accent" />
              <h4 className="text-lg font-black text-gray-900 tracking-tight uppercase">Performance per Grade</h4>
            </div>
            <div className="h-64 flex items-end justify-around gap-2 px-4">
              {['A+', 'A', 'B', 'C'].map(grade => {
                const gradeData = filteredData.filter(r => r.customerGrade === grade);
                const planned = gradeData.reduce((acc, r) => acc + r.totalPlanned, 0);
                const reported = gradeData.reduce((acc, r) => acc + r.totalReported, 0);
                const max = Math.max(...['A+', 'A', 'B', 'C'].map(g => {
                  const gd = filteredData.filter(r => r.customerGrade === g);
                  return Math.max(gd.reduce((acc, r) => acc + r.totalPlanned, 0), gd.reduce((acc, r) => acc + r.totalReported, 0));
                })) || 1;

                return (
                  <div key={grade} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] p-2 rounded-lg z-10 whitespace-nowrap">
                          P: {planned} | R: {reported}
                      </div>
                    <div className="w-full flex items-end justify-center gap-1">
                      <div className="w-4 bg-gray-200 rounded-t-md transition-all group-hover:bg-gray-300" style={{ height: `${(planned/max)*100}%` }} />
                      <div className="w-4 bg-accent rounded-t-md transition-all group-hover:bg-accent-hover" style={{ height: `${(reported/max)*100}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase">{grade}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-6">
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-200 rounded" /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Planned</span></div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-accent rounded" /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reported</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [expandedMR, setExpandedMR] = useState(null);

  const renderByMR = () => {
    const mrStats = filterOptions.mrName.map(mr => {
      const data = rawData.filter(r => r.mrName === mr);
      // Re-apply filters for this MR calculation? No, the spec implies the table shows stats for the listed MRs based on raw data but maybe I should use filteredData?
      // Actually, By MR usually shows all MRs in the dataset, but affected by global filters except MR filter? No, standard is use the global filteredData.
      const mData = filteredData.filter(r => r.mrName === mr);
      if (mData.length === 0) return null;

      const planned = mData.reduce((acc, r) => acc + r.totalPlanned, 0);
      const reported = mData.reduce((acc, r) => acc + r.totalReported, 0);
      const notVisited = mData.filter(r => r.totalReported === 0 && r.totalPlanned > 0).length;
      const extra = mData.filter(r => r.totalReported > r.totalPlanned).length;
      const coverage = planned > 0 ? (reported / planned * 100) : 0;

      return { mr, count: mData.length, planned, reported, coverage, notVisited, extra };
    }).filter(Boolean);

    return (
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">MR Name</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Customers</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Planned</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Reported</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Coverage %</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Not Visited</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Extra</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mrStats.map(m => (
                <React.Fragment key={m.mr}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedMR(expandedMR === m.mr ? null : m.mr)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {expandedMR === m.mr ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                        <span className="font-bold text-gray-900">{m.mr}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-gray-600">{m.count}</td>
                    <td className="p-4 text-center font-bold text-gray-600">{m.planned}</td>
                    <td className="p-4 text-center font-bold text-gray-900">{m.reported}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-tight ${
                        m.coverage >= 80 ? 'bg-green-100 text-green-700' : 
                        m.coverage >= 50 ? 'bg-amber-100 text-amber-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {m.coverage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-center text-red-500 font-bold">{m.notVisited}</td>
                    <td className="p-4 text-center text-purple-600 font-bold">{m.extra}</td>
                    <td className="p-4 text-center">
                       <ChevronDown className={`text-gray-300 transition-transform ${expandedMR === m.mr ? 'rotate-180' : ''}`} size={16} />
                    </td>
                  </tr>
                  {expandedMR === m.mr && (
                    <tr>
                      <td colSpan={8} className="p-0 bg-gray-50/50">
                        <div className="p-4 space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                          {filteredData.filter(r => r.mrName === m.mr).map(r => (
                            <div key={r.customerId} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <div>
                                <p className="text-sm font-black text-gray-900">{r.customerName}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{r.specialty} • {r.customerGrade}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-xs font-black text-gray-500 uppercase tracking-tighter">Planned/Reported</p>
                                  <p className="text-sm font-black text-gray-900">{r.totalPlanned} / {r.totalReported}</p>
                                </div>
                                {getStatusBadge(getStatus(r.totalPlanned, r.totalReported))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBySpecialty = () => {
    const specStats = filterOptions.specialty.map(spec => {
      const sData = filteredData.filter(r => r.specialty === spec);
      if (sData.length === 0) return null;

      const planned = sData.reduce((acc, r) => acc + r.totalPlanned, 0);
      const reported = sData.reduce((acc, r) => acc + r.totalReported, 0);
      const coverage = planned > 0 ? (reported / planned * 100) : 0;

      return { specialty: spec, count: sData.length, planned, reported, coverage };
    }).filter(Boolean).sort((a, b) => b.count - a.count);

    return (
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden text-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Specialty</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Customers</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Planned</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Reported</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Coverage Progression</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {specStats.map(s => (
                <tr key={s.specialty} className="hover:bg-gray-50 transition-colors capitalize">
                  <td className="p-4 font-bold lowercase first-letter:uppercase">{s.specialty}</td>
                  <td className="p-4 text-center font-bold text-gray-600">{s.count}</td>
                  <td className="p-4 text-center font-bold text-gray-600">{s.planned}</td>
                  <td className="p-4 text-center font-bold text-gray-900">{s.reported}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            s.coverage >= 80 ? 'bg-green-500' : s.coverage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(s.coverage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black w-12">{s.coverage.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCustomerList = () => (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by ID or Name..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border-gray-200 text-sm font-bold bg-white focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
           Showing <span className="text-gray-900">{paginatedData.length}</span> of <span className="text-gray-900">{sortedData.length}</span> results
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors" onClick={() => {setSortKey('customerId'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}}>ID</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-accent" onClick={() => {setSortKey('customerName'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}}>Customer Name</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Grade</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Specialty</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">MR Name</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Planned</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Reported</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Planned Days</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reported Days</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Interval</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.map(r => {
              const status = getStatus(r.totalPlanned, r.totalReported);
              const missed = r.monthPlanned.filter(d => !r.monthReported.includes(d));
              
              return (
                <tr key={r.customerId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-[10px] font-bold text-gray-500 tracking-tighter">{r.customerId}</td>
                  <td className="p-4 font-black text-gray-900 text-sm whitespace-nowrap">{r.customerName}</td>
                  <td className="p-4 text-center">
                     <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-black text-[10px] border border-gray-200">{r.customerGrade}</span>
                  </td>
                  <td className="p-4 text-xs font-bold text-gray-500 capitalize">{r.specialty}</td>
                  <td className="p-4 text-xs font-bold text-gray-700">{r.mrName}</td>
                  <td className="p-4 text-center font-black text-gray-600">{r.totalPlanned}</td>
                  <td className="p-4 text-center font-black text-gray-900">{r.totalReported}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[100px]">
                      {r.monthPlanned.map(d => (
                         <span key={d} className={`text-[9px] font-black rounded px-1 min-w-[16px] text-center ${r.monthReported.includes(d) ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                           {d}
                         </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[100px]">
                      {r.monthReported.map(d => (
                         <span key={d} className={`text-[9px] font-black rounded px-1 min-w-[16px] text-center ${r.monthPlanned.includes(d) ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                           {d}
                         </span>
                      ))}
                      {missed.length > 0 && (
                        <div className="w-full flex flex-wrap gap-1 mt-1 border-t border-red-50 pt-1">
                          {missed.map(d => (
                            <span key={d} className="text-[9px] font-bold text-red-500 line-through opacity-60">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center text-xs font-bold text-gray-400">{r.daysInterval}d</td>
                  <td className="p-4">{getStatusBadge(status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-black text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <div className="flex items-center gap-2">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = currentPage;
                if (currentPage < 3) pageNum = i + 1;
                else if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                
                if (pageNum <= 0 || pageNum > totalPages) return null;

                return (
                    <button 
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${currentPage === pageNum ? 'bg-accent text-white shadow-md' : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'}`}
                    >
                        {pageNum}
                    </button>
                )
            })}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-black text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );

  const renderCoverageMap = () => {
    const mrs = filterOptions.mrName;
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
      <div className="space-y-6">
        {mrs.map(mr => {
          const mData = filteredData.filter(r => r.mrName === mr);
          if (mData.length === 0) return null;

          const plannedSet = new Set();
          const reportedSet = new Set();
          mData.forEach(r => {
            r.monthPlanned.forEach(p => plannedSet.add(p));
            r.monthReported.forEach(rp => reportedSet.add(rp));
          });

          return (
            <div key={mr} className="bg-white rounded-3xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                 <h4 className="font-black text-gray-900 uppercase tracking-tight">{mr}</h4>
                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {plannedSet.size} Planned / {reportedSet.size} Reported Days
                 </div>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-[repeat(31,minmax(0,1fr))] gap-1">
                {days.map(d => {
                  const isP = plannedSet.has(d);
                  const isR = reportedSet.has(d);
                  
                  let color = 'bg-gray-100';
                  if (isP && isR) color = 'bg-green-700';
                  else if (isR) color = 'bg-green-400/60';
                  else if (isP) color = 'bg-amber-500/80';

                  return (
                    <div 
                      key={d} 
                      className={`aspect-square sm:aspect-auto sm:h-8 rounded flex items-center justify-center text-[9px] font-black transition-colors group relative ${color} ${isP || isR ? 'text-white' : 'text-gray-300'}`}
                    >
                      {d}
                      {(isP || isR) && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-gray-900 text-[8px] text-white p-1 rounded whitespace-nowrap shadow-xl">
                            {isP && isR ? 'Planned & Reported' : isR ? 'Extra Visit' : 'Missed Visit'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!rawData.length && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-500">
          {/* Icon */}
          <div className="w-24 h-24 bg-yellow-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-100 transform -rotate-6 transition-transform hover:rotate-0">
            <MapIcon className="w-12 h-12 text-yellow-500" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">Routing Analyzer</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            Upload a routing report CSV to begin analysis. Pipe-delimited format supported. Your data persists locally between sessions.
          </p>

          {/* Upload Button */}
          <label className="inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-2xl cursor-pointer transition-all shadow-lg shadow-yellow-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-200">
            <PlusCircle className="w-5 h-5" />
            Upload Routing Report
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'replace')}
            />
          </label>

          <p className="text-[10px] text-gray-300 mt-10 uppercase tracking-widest font-bold">
            Data Lens Routing Engine v{ROUTING_VERSION.version}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[420px] border border-gray-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Upload Routing File</h3>
            <p className="text-sm text-gray-400 mb-8 font-medium italic">Choose how to handle the new dataset analysis</p>

            {/* Mode Toggle */}
            <div className="flex gap-3 mb-8">
              {[
                { id: 'replace', label: '🔄 Replace', desc: 'Clear current data' },
                { id: 'append', label: '➕ Append', desc: 'Merge with current' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setUploadMode(m.id)}
                  className={`flex-1 p-5 rounded-3xl border-2 text-left transition-all ${uploadMode === m.id ? 'border-yellow-400 bg-yellow-50 shadow-sm' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                >
                  <p className="text-sm font-black text-gray-900">{m.label}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Drop Zone */}
            <label className="block w-full border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/30 transition-all group">
              <div className="text-5xl mb-4 grayscale group-hover:grayscale-0 transition-all">📂</div>
              <p className="text-base font-black text-gray-700 group-hover:text-yellow-600 tracking-tight">Click to select CSV file</p>
              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Pipe-delimited (|) supported</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => handleFileUpload(e, uploadMode)}
              />
            </label>

            {/* Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-100 text-sm font-black text-gray-500 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              {rawData.length > 0 && (
                <button
                  onClick={handleClearData}
                  className="flex-1 py-4 rounded-2xl bg-red-50 border-2 border-red-100 text-sm font-black text-red-600 hover:bg-red-100 transition-all"
                >
                  Clear Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-40 shadow-sm">
        {/* Left — Logo + Title */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-200">
            <MapIcon className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-none flex items-center gap-2 tracking-tight italic uppercase">
              Routing <span className="text-yellow-500">Analyzer</span>
            </h2>
            <div className="flex items-center gap-2 mt-1 px-1 py-0.5 bg-gray-50 rounded w-fit border border-gray-100">
               <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
               <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                  Intelligence Engine {ROUTING_VERSION.version}
               </p>
            </div>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          {/* Upload / Add More */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:-translate-y-0.5 shadow-sm shadow-yellow-200"
          >
            <PlusCircle className="w-4 h-4" />
            {rawData.length > 0 ? 'Batch Upload' : 'Upload File'}
          </button>

          {/* Export */}
          {rawData.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}

          {/* Clear Data */}
          {rawData.length > 0 && (
            <button
              onClick={handleClearData}
              className="flex items-center justify-center w-10 h-10 bg-red-50 border border-red-100 text-red-600 rounded-xl hover:bg-red-100 transition-all"
              title="Clear Data"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Vertical Separator */}
          <div className="w-px h-8 bg-gray-100 mx-2" />

          {/* Toggle Sidebar */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm ${!isSidebarOpen ? 'ring-2 ring-yellow-400/20' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.entries(filters).some(([k,v]) => Array.isArray(v) ? v.length > 0 : v !== 'All') && (
              <span className="w-5 h-5 bg-yellow-400 text-black text-[9px] font-black rounded-full flex items-center justify-center ml-1">
                {Object.values(filters).flat().filter(v => v !== 'All' && v !== '').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'circOut' }}
              className="h-full bg-white border-r border-gray-100 overflow-y-auto flex-shrink-0 shadow-sm z-30"
            >
              {renderSidebar()}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col scrollbar-thin">
          {/* Data Info Bar */}
          <div className="bg-white border-b border-gray-100 px-8 py-2.5 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dataset:</span>
                <span className="text-[11px] font-black text-gray-800">{rawData.length.toLocaleString()} records</span>
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Period:</span>
                <span className="text-[11px] font-black text-yellow-600 italic">{reportMonth || 'Global'} 2026</span>
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Line:</span>
                <span className="text-[11px] font-black text-gray-700">{lineName || 'N/A'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded border">
                 Showing <span className="text-gray-900 font-black">{filteredData.length.toLocaleString()}</span> nodes
               </span>
            </div>
          </div>

          <div className="p-8 pb-32 space-y-8 max-w-[1600px] mx-auto w-full">
            {renderKPIs()}

            {/* Active Filter Chips */}
            {Object.entries(filters).some(([k,v]) => Array.isArray(v) ? v.length > 0 : v !== 'All') && (
              <div className="flex flex-wrap items-center gap-2 p-4 bg-yellow-50/50 rounded-3xl border border-yellow-100/50 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-1.5 mr-2">
                   <div className="w-1 h-3 bg-yellow-400 rounded-full" />
                   <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Active Filters</span>
                </div>
                {filters.visitStatus !== 'All' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-black rounded-xl text-[10px] font-black shadow-sm group">
                    Status: {filters.visitStatus}
                    <button onClick={() => setFilters(prev => ({...prev, visitStatus: 'All'}))} className="hover:scale-125 transition-transform"><X size={12} /></button>
                  </div>
                )}
                {Object.entries(filters).map(([k, v]) => {
                  if (!Array.isArray(v)) return null;
                  return v.map(val => (
                    <div key={`${k}_${val}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-yellow-200 text-gray-700 rounded-xl text-[10px] font-black shadow-sm hover:border-yellow-400 transition-colors">
                      {val}
                      <button onClick={() => handleToggleFilter(k, val)} className="hover:text-red-500 hover:scale-125 transition-all"><X size={12} /></button>
                    </div>
                  ));
                })}
                <button onClick={clearFilters} className="ml-auto text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all uppercase tracking-widest border border-transparent hover:border-red-100">Clear All</button>
              </div>
            )}

            {/* Tabs Bar Fix */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-3xl p-3 border border-gray-100 shadow-sm sticky top-16 z-10 backdrop-blur-sm bg-white/95">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'by-mr',    label: 'By MR', icon: Users },
                  { id: 'by-spec',  label: 'By Specialty', icon: BarChart3 },
                  { id: 'list',     label: 'Customer List', icon: ClipboardCheck },
                  { id: 'map',      label: 'Coverage Map', icon: MapIcon },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    <tab.icon className={activeTab === tab.id ? 'w-4 h-4' : 'w-3.5 h-3.5 text-gray-300'} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 px-3 py-1 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mr-1">Toggles</span>
                {[
                  { id: 'all',        label: 'All' },
                  { id: 'visited',    label: 'Visited' },
                  { id: 'uncovered',  label: 'Uncovered' },
                  { id: 'target_met', label: 'Target Met' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setQuickVisitFilter(opt.id); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${quickVisitFilter === opt.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {activeTab === 'overview'  && renderOverview()}
              {activeTab === 'by-mr'    && renderByMR()}
              {activeTab === 'by-spec'  && renderBySpecialty()}
              {activeTab === 'list'     && renderCustomerList()}
              {activeTab === 'map'      && renderCoverageMap()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutingAnalyzer;
