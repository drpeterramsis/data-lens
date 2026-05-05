
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, UserCircle, ClipboardCheck, CheckCircle2, AlertCircle,
  Star, Plus, PlusCircle, PieChart as PieIcon, BarChart3,
  Calendar as CalendarIcon, Calendar, Search, Download, Filter,
  X, ChevronDown, ChevronUp, LayoutDashboard, Map as MapIcon,
  ChevronRight, ChevronLeft, Trash2, RefreshCw, Eye, EyeOff,
  Check, Info, AlertTriangle, SlidersHorizontal, TrendingUp,
  TrendingDown, MapPin, Clock, Award, Target, Stethoscope,
  Upload, FileText, Activity, Building2, Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { 
  toNumberSafe, formatKpi, formatKpiGrouped, formatKpiPercent 
} from '../../utils/formatNumber';
import { FilterButton } from '../../components/ui/FilterButton';

// ─── Constants ────────────────────────────────
const SIDEBAR_W    = 256; // px  (w-64)
const NAV_H_VAR    = '56px';
const FOOTER_H     = 48;  // px  must match Footer.jsx

const ROUTING_VERSION = {
  version: '1.0.533',
  releaseDate: 'May 2026',
  label: 'Navigation Enhancements',
};

// ─── CSV Parser ───────────────────────────────
const parseCSV = (text) => {
  const result = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
  const lines  = result.data;
  if (lines.length < 2) return { data: [], month: '', lineName: '' };

  const headers          = lines[0];
  const monthPlannedHeader = headers[10] || '';
  const monthName        = monthPlannedHeader.replace('Planned', '').trim();

  const data = lines.slice(1).map(cols => {
    const parseDays = (str) =>
      str?.trim()
        ? str.trim().split(/\s+/).map(d => parseInt(d)).filter(d => !isNaN(d))
        : [];

    return {
      customerId:    cols[0]?.trim(),
      customerName:  cols[1]?.trim(),
      customerType:  cols[2]?.trim(),
      customerGrade: cols[3]?.trim(),
      specialty:     cols[4]?.trim(),
      mrName:        cols[5]?.trim(),
      lineName:      cols[6]?.trim(),
      totalPlanned:  parseInt(cols[7])  || 0,
      totalReported: parseInt(cols[8])  || 0,
      daysInterval:  parseInt(cols[9])  || 0,
      monthPlanned:  parseDays(cols[10]),
      monthReported: parseDays(cols[11]),
      sourceMonth:   monthName,
    };
  }).filter(r => r.customerId);

  return { data, month: monthName, lineName: data[0]?.lineName || '' };
};

// ─── Status Helpers ───────────────────────────
const getStatus = (planned, reported) => {
  if (planned === 0 && reported === 0) return 'Inactive';
  if (planned === 0 && reported > 0)   return 'Not Planned';
  if (reported === 0 && planned > 0)   return 'Not Visited';
  if (reported > planned)              return 'Extra';
  if (reported === planned)            return 'Fully Covered';
  return 'Partial';
};

const STATUS_CFG = {
  'Fully Covered': { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  icon: '✅' },
  'Partial':       { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  icon: '🟡' },
  'Not Visited':   { bg: 'bg-red-100',    text: 'text-red-600',    border: 'border-red-200',    icon: '❌' },
  'Extra':         { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: '⭐' },
  'Not Planned':   { bg: 'bg-blue-100',   text: 'text-blue-600',   border: 'border-blue-200',   icon: '🆕' },
  'Inactive':      { bg: 'bg-gray-100',   text: 'text-gray-400',   border: 'border-gray-200',   icon: '⬜' },
};

const getStatusBadge = (status) => {
  const c = STATUS_CFG[status] || STATUS_CFG['Inactive'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${c.bg} ${c.text} ${c.border} whitespace-nowrap`}>
      {c.icon} {status}
    </span>
  );
};

// ─── Grade Badge ──────────────────────────────
const GradeBadge = ({ grade }) => {
  const cfg = {
    'A+': 'bg-purple-50 text-purple-700 border-purple-100',
    'A':  'bg-blue-50 text-blue-700 border-blue-100',
    'B':  'bg-green-50 text-green-700 border-green-100',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border ${cfg[grade] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {grade}
    </span>
  );
};

// ══════════════════════════════════════════════
// TABLE COMPONENT — reused in main + modal
// ══════════════════════════════════════════════
const CustomerTable = ({
  paginatedData,
  sortedData,
  deduplicatedData,
  showMonthColumn,
  showMRColumn,
  sortKey,
  sortDir,
  handleSort,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  quickVisitFilter,
  setQuickVisitFilter,
  searchQ,
  setSearchQ,
  stats,
  isModal = false,
}) => {
  const SortIcon = ({ col }) => (
    <span className="ml-1 opacity-60 text-[9px]">
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
    </span>
  );

  const [hiddenColumns, setHiddenColumns] = useState(() => {
    const saved = localStorage.getItem('routingHiddenCols');
    return saved ? JSON.parse(saved) : [];
  });

  const [showColMenu, setShowColMenu] = useState(false);
  const colMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target)) {
        setShowColMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('routingHiddenCols', JSON.stringify(hiddenColumns));
  }, [hiddenColumns]);

  const toggleColumn = (col) => {
    setHiddenColumns(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col]);
  };

  const columns = [
    { label: 'ID',            col: 'customerId' },
    ...(showMonthColumn ? [{ label: 'Month', col: 'sourceMonth' }] : []),
    { label: 'Name',          col: 'customerName' },
    { label: 'Grade',         col: 'customerGrade' },
    { label: 'Specialty',     col: 'specialty' },
    ...(showMRColumn ? [{ label: 'MR Name', col: 'mrName' }] : []),
    { label: 'Planned',       col: 'totalPlanned' },
    { label: 'Reported',      col: 'totalReported' },
    { label: 'Planned Days',  col: null },
    { label: 'Reported Days', col: null },
    { label: 'Interval',      col: 'daysInterval' },
    { label: 'Status',        col: '_status' },
  ].filter(c => !hiddenColumns.includes(c.label));

  return (
    <div className="flex flex-col w-full">
      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex flex-col p-4 bg-white border-b border-gray-100 gap-3">
        {/* Row 1: Hide Cols and Search */}
        <div className="flex items-center justify-between gap-2">
            {/* Column Toggle */}
            <div className="relative" ref={colMenuRef}>
               <button 
                 onClick={() => setShowColMenu(!showColMenu)}
                 className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-[10px] font-black text-gray-600 hover:bg-gray-200 uppercase tracking-tighter">
                 <SlidersHorizontal className="w-3 h-3" /> Hide Cols
               </button>
               <div className={`absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-xl p-2 w-40 z-50 ${showColMenu ? 'block' : 'hidden'}`}>
                  {['ID', 'Month', 'Name', 'Grade', 'Specialty', 'MR Name', 'Planned', 'Reported', 'Planned Days', 'Reported Days', 'Interval', 'Status']
                    .filter(label => label !== 'ID' && label !== 'Name') // Keep ID/Name fixed
                    .map(label => (
                      <label key={label} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" checked={!hiddenColumns.includes(label)} onChange={() => toggleColumn(label)} className="w-3 h-3" />
                        <span className="text-[10px] font-bold text-gray-700">{label}</span>
                      </label>
                    ))}
               </div>
            </div>
            
            {/* Search */}
            <div className="relative flex-grow max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 w-full placeholder:text-gray-300 focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 bg-white"
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-gray-300 hover:text-red-400" />
                </button>
              )}
            </div>
        </div>

        {/* Row 2: Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest min-w-[32px]">Filter:</span>
          {[
            { id: 'all',       emoji: '👥', label: 'All',       count: deduplicatedData.length },
            { id: 'full',      emoji: '✅', label: 'Full',      count: stats.fullyCovered },
            { id: 'partial',   emoji: '🟡', label: 'Partial',   count: stats.partial },
            { id: 'uncovered', emoji: '❌', label: 'Uncovered', count: stats.uncovered },
          ].map(opt => (
            <FilterButton
              key={opt.id}
              onClick={() => { setQuickVisitFilter(opt.id); setCurrentPage(1); }}
              isActive={quickVisitFilter === opt.id}
              label={opt.label}
              className="flex items-center gap-1"
            >
              {opt.emoji}
              <span className="hidden sm:inline-block">{opt.label}</span>
              <span className={`text-[9px] px-1 py-0.5 rounded font-black ${quickVisitFilter === opt.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                {opt.count}
              </span>
            </FilterButton>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {columns.map(({ label, col }) => (
                <th
                  key={label}
                  onClick={col ? () => handleSort(col) : undefined}
                  className={`sticky top-0 z-10 bg-gray-900 text-white px-2.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-b border-gray-700 ${col ? 'cursor-pointer hover:bg-gray-800 select-none' : ''}`}
                >
                  {label}{col && <SortIcon col={col} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((r, i) => {
              const status = getStatus(r.totalPlanned, r.totalReported);
              const missed = r.monthlyData ? [] : r.monthPlanned.filter(d => !r.monthReported.includes(d));
              return (
                <tr key={`${r.customerId}_${i}`} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-yellow-50/40 transition-colors`}>
                  {columns.map(col => {
                    switch (col.label) {
                      case 'ID': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-gray-500 font-mono whitespace-nowrap border-b border-gray-50">{r.customerId}</td>;
                      case 'Month': return <td key={col.label} className="px-2.5 py-1.5 border-b border-gray-50">
                        <div className="flex flex-wrap gap-0.5 whitespace-nowrap">{(r.customerMonths || [r.sourceMonth]).map(m => (<span key={m} className="filter-tag">{m?.slice(0, 3)}</span>))}</div>
                        </td>;
                      case 'Name': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-gray-800 font-semibold border-b border-gray-50 whitespace-nowrap">{r.customerName}</td>;
                      case 'Grade': return <td key={col.label} className="px-2.5 py-1.5 border-b border-gray-50 text-center"><GradeBadge grade={r.customerGrade} /></td>;
                      case 'Specialty': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-yellow-600 border-b border-gray-50 whitespace-nowrap">{r.specialty}</td>;
                      case 'MR Name': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-gray-600 border-b border-gray-50 whitespace-nowrap">{r.mrName}</td>;
                      case 'Planned': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-gray-700 font-bold border-b border-gray-50 text-center">{formatKpiGrouped(r.totalPlanned)}</td>;
                      case 'Reported': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-gray-700 font-bold border-b border-gray-50 text-center">{formatKpiGrouped(r.totalReported)}</td>;
                      case 'Coverage %': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-blue-700 font-bold border-b border-gray-50 text-center">{r.totalPlanned > 0 ? formatKpiPercent(r.totalReported / r.totalPlanned * 100) : formatKpiPercent(0)}</td>;
                      case 'Planned Days': return <td key={col.label} className="px-2.5 py-1.5 border-b border-gray-50">
                        {r.monthlyData ? (<div className="space-y-0.5">{Object.entries(r.monthlyData).map(([m, d]) => (<div key={m} className="flex items-center gap-1"><span className="text-[8px] font-black text-gray-400 w-7 flex-shrink-0">{m.slice(0, 3)}:</span><div className="flex flex-wrap gap-0.5 whitespace-nowrap">{d.planned.map(day => <span key={day} className="filter-tag">{day}</span>)}</div></div>))}</div>) : (<div className="flex flex-wrap gap-0.5 whitespace-nowrap">{r.monthPlanned.map(d => <span key={d} className="filter-tag">{d}</span>)}</div>)}
                      </td>;
                      case 'Reported Days': return <td key={col.label} className="px-2.5 py-1.5 border-b border-gray-50">
                        {r.monthlyData ? (<div className="space-y-0.5">{Object.entries(r.monthlyData).map(([m, d]) => {const mMissed = d.planned.filter(dd => !d.reported.includes(dd)); return (<div key={m} className="flex items-center gap-1"><span className="text-[8px] font-black text-gray-400 w-7 flex-shrink-0">{m.slice(0, 3)}:</span><div className="flex flex-wrap gap-0.5 whitespace-nowrap">{d.reported.map(day => <span key={day} className="filter-tag !bg-green-100">{day}</span>)}{mMissed.map(day => <span key={`m${day}`} className="filter-tag !bg-red-100 !text-red-600 line-through">{day}</span>)}</div></div>);})}</div>) : (<div className="flex flex-wrap gap-0.5 whitespace-nowrap">{r.monthReported.map(d => <span key={d} className="filter-tag !bg-green-100">{d}</span>)}{missed.map(d => <span key={`m${d}`} className="filter-tag !bg-red-100 !text-red-600 line-through">{d}</span>)}</div>)}
                      </td>;
                      case 'Interval': return <td key={col.label} className="px-2.5 py-1.5 text-[11px] text-gray-500 border-b border-gray-50 text-center whitespace-nowrap">{r.daysInterval}d</td>;
                      case 'Status': return <td key={col.label} className="px-2.5 py-1.5 border-b border-gray-50 whitespace-nowrap text-center">{getStatusBadge(status)}</td>;
                      default: return null;
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-white border-t border-gray-100">
        {/* Items per page */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">Show:</span>
          <div className="flex gap-1">
            {[10, 25, 50, 100, 200].map(n => (
              <FilterButton
                key={n}
                onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                isActive={itemsPerPage === n}
                label={n.toString()}
                className="!w-8 !h-6 !p-0"
              />
            ))}
          </div>
        </div>

        {/* Page buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <FilterButton
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              label="Prev"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </FilterButton>

            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page  = start + idx;
              if (page > totalPages) return null;
              return (
                <FilterButton
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  label={page.toString()}
                  className="!w-7 !h-7 !p-0"
                />
              );
            })}

            <FilterButton
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              label="Next"
            >
              Next <ChevronRight className="w-3 h-3" />
            </FilterButton>
          </div>
        )}

        <span className="text-[10px] font-black text-gray-400 hidden sm:block">
          Page <span className="text-gray-900">{currentPage}</span> · <span className="text-gray-900">{formatKpiGrouped(sortedData.length)}</span> records
        </span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// FULL TABLE MODAL
// ══════════════════════════════════════════════
const FullTableModal = ({ onClose, ...tableProps }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col bg-white w-full h-full">
        {/* Modal Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-gray-900 text-white">
          <div className="flex items-center gap-3">
            <Maximize2 className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-black tracking-widest uppercase">
              Full Table View
            </span>
            <span className="text-[10px] text-gray-400 font-bold">
              {formatKpiGrouped(tableProps.sortedData.length)} records
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 hidden sm:block">Press ESC to close</span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500 transition-all border border-white/10"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Table fills the rest */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <CustomerTable {...tableProps} isModal={true} />
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════
import { useSidebar } from '../../context/SidebarContext';

const RoutingAnalyzer = () => {
  const { isExpanded } = useSidebar();
  // ── State ────────────────────────────────────
  const [rawData,          setRawData]          = useState([]);
  const [reportMonth,      setReportMonth]      = useState('');
  const [lineName,         setLineName]         = useState('');
  const [isLoading,        setIsLoading]        = useState(false);
  const [availableMonths,  setAvailableMonths]  = useState([]);
  const [selectedMonth,    setSelectedMonth]    = useState('All');
  const [activeTab,        setActiveTab]        = useState('overview');
  const [searchQ,          setSearchQ]          = useState('');
  const [mrSearch,         setMrSearch]         = useState('');
  const [sortKey,          setSortKey]          = useState('customerName');
  const [sortDir,          setSortDir]          = useState('asc');
  const [currentPage,      setCurrentPage]      = useState(1);
  const [itemsPerPage,     setItemsPerPage]     = useState(50);
  const [quickVisitFilter, setQuickVisitFilter] = useState('all');
  const [showUploadModal,  setShowUploadModal]  = useState(false);
  const [showTableModal,   setShowTableModal]   = useState(false); // ← NEW
  const [uploadMode,       setUploadMode]       = useState('replace');
  const [isSidebarOpen,    setIsSidebarOpen]    = useState(false);
  const [expandedMR,       setExpandedMR]       = useState(null);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [isKpiExpanded,    setIsKpiExpanded]    = useState(true);
  const [gradeTargets,     setGradeTargets]     = useState({ 'A+': 3, 'A': 2, 'B': 1, 'C': 1 });

  const [filters, setFilters] = useState({
    mrName: [], specialty: [], grade: [],
    customerType: [], lineName: [], visitStatus: 'All',
  });

  const [expandedSections, setExpandedSections] = useState({
    targets: false, visitStatus: false, mrName: false,
    specialty: false, grade: false, customerType: false, lineName: false,
  });

  const fileInputRef = useRef(null);

  // ── Persist / Load ──────────────────────────
  useEffect(() => {
    if (rawData.length > 0)
      localStorage.setItem('routingData', JSON.stringify({ rawData, reportMonth, lineName, availableMonths }));
  }, [rawData, reportMonth, lineName, availableMonths]);

  useEffect(() => {
    const saved = localStorage.getItem('routingData');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setRawData(p.rawData || []);
        setReportMonth(p.reportMonth || '');
        setLineName(p.lineName || '');
        setAvailableMonths(p.availableMonths || []);
      } catch { localStorage.removeItem('routingData'); }
    }
  }, []);

  // ── Helpers ──────────────────────────────────
  const toggleSection = (key) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const openSection = (key) => {
    setExpandedSections(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k !== key && k !== 'targets') {
          const filterValue = filters[k];
          const hasSel = Array.isArray(filterValue) ? filterValue.length > 0 : filterValue !== 'All';
          if (!hasSel) next[k] = false;
        }
      });
      next[key] = !prev[key];
      return next;
    });
  };

  const handleToggleFilter = (key, val) => {
    setFilters(prev => {
      const cur = prev[key];
      return { ...prev, [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ mrName: [], specialty: [], grade: [], customerType: [], lineName: [], visitStatus: 'All' });
    setSearchQ('');
    setCurrentPage(1);
  };

  const handleClearData = () => {
    if (!window.confirm('Clear all routing data?')) return;
    setRawData([]); setReportMonth(''); setLineName('');
    setAvailableMonths([]); setSelectedMonth('All');
    localStorage.removeItem('routingData');
    clearFilters();
  };

  const handleSort = (col) => {
    if (sortKey === col) setSortDir(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortKey(col); setSortDir('asc'); }
    setCurrentPage(1);
  };

  // ── Upload ────────────────────────────────────
  const handleFileUpload = (e, mode = uploadMode) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { data, month, lineName: ln } = parseCSV(ev.target.result);
      if (mode === 'append' && rawData.length > 0) {
        setRawData(prev => {
          const keys = new Set(prev.map(r => `${r.customerId}__${r.sourceMonth}`));
          return [...prev, ...data.filter(r => !keys.has(`${r.customerId}__${r.sourceMonth}`))];
        });
        setAvailableMonths(prev => prev.includes(month) ? prev : [...prev, month]);
      } else {
        setRawData(data); setReportMonth(month);
        setLineName(ln); setAvailableMonths([month]); setSelectedMonth('All');
      }
      setIsLoading(false); setShowUploadModal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // ── Filter Options ────────────────────────────
  const filterOptions = useMemo(() => {
    const o = { mrName: new Set(), specialty: new Set(), grade: new Set(), customerType: new Set(), lineName: new Set() };
    rawData.forEach(r => {
      if (r.mrName)        o.mrName.add(r.mrName);
      if (r.specialty)     o.specialty.add(r.specialty);
      if (r.customerGrade) o.grade.add(r.customerGrade);
      if (r.customerType)  o.customerType.add(r.customerType);
      if (r.lineName)      o.lineName.add(r.lineName);
    });
    return {
      mrName:       [...o.mrName].sort(),
      specialty:    [...o.specialty].sort(),
      grade:        [...o.grade].sort(),
      customerType: [...o.customerType].sort(),
      lineName:     [...o.lineName].sort(),
    };
  }, [rawData]);

  // ── Filtering ─────────────────────────────────
  const filteredData = useMemo(() => {
    let d = selectedMonth !== 'All'
      ? rawData.filter(r => r.sourceMonth === selectedMonth)
      : [...rawData];

    if (filters.mrName.length)       d = d.filter(r => filters.mrName.includes(r.mrName));
    if (filters.specialty.length)    d = d.filter(r => filters.specialty.includes(r.specialty));
    if (filters.grade.length)        d = d.filter(r => filters.grade.includes(r.customerGrade));
    if (filters.customerType.length) d = d.filter(r => filters.customerType.includes(r.customerType));
    if (filters.lineName.length)     d = d.filter(r => filters.lineName.includes(r.lineName));

    if (filters.visitStatus !== 'All') {
      const map = {
        'Fully Covered':     'Fully Covered',
        'Partially Covered': 'Partial',
        'Not Visited':       'Not Visited',
        'Extra Visits':      'Extra',
        'Not Planned':       'Not Planned',
      };
      d = d.filter(r => getStatus(r.totalPlanned, r.totalReported) === map[filters.visitStatus]);
    }

    // Quick toggle — applies globally (not just in 'list' tab)
    if (quickVisitFilter === 'full')
      d = d.filter(r => r.totalPlanned > 0 && r.totalReported >= r.totalPlanned);
    if (quickVisitFilter === 'partial')
      d = d.filter(r => r.totalReported > 0 && r.totalReported < r.totalPlanned);
    if (quickVisitFilter === 'uncovered')
      d = d.filter(r => r.totalReported === 0 && r.totalPlanned > 0);

    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      d = d.filter(r =>
        [r.customerName, r.customerId, r.mrName, r.specialty, r.customerGrade, r.customerType, r.lineName]
          .some(v => (v || '').toLowerCase().includes(q))
      );
    }
    return d;
  }, [rawData, filters, searchQ, quickVisitFilter, selectedMonth]);

  // ── Deduplication ─────────────────────────────
  const deduplicatedData = useMemo(() => {
    if (selectedMonth !== 'All' || availableMonths.length <= 1) return filteredData;
    const map = new Map();
    filteredData.forEach(r => {
      if (!map.has(r.customerId))
        map.set(r.customerId, { ...r, totalPlanned: 0, totalReported: 0, monthlyData: {}, customerMonths: [] });
      const e = map.get(r.customerId);
      e.totalPlanned  += r.totalPlanned;
      e.totalReported += r.totalReported;
      if (!e.customerMonths.includes(r.sourceMonth)) e.customerMonths.push(r.sourceMonth);
      e.monthlyData[r.sourceMonth] = { planned: r.monthPlanned, reported: r.monthReported };
    });
    return [...map.values()];
  }, [filteredData, selectedMonth, availableMonths]);

  // ── Sorting ───────────────────────────────────
  const sortedData = useMemo(() => {
    return [...deduplicatedData].sort((a, b) => {
      const valA = sortKey === '_status' ? getStatus(a.totalPlanned, a.totalReported) : (a[sortKey] ?? '');
      const valB = sortKey === '_status' ? getStatus(b.totalPlanned, b.totalReported) : (b[sortKey] ?? '');
      if (typeof valA === 'number' && typeof valB === 'number')
        return sortDir === 'asc' ? valA - valB : valB - valA;
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [deduplicatedData, sortKey, sortDir]);

  // ── Pagination ────────────────────────────────
  const totalPages    = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedData, currentPage, itemsPerPage]
  );

  // ── Stats ─────────────────────────────────────
  const stats = useMemo(() => {
    const d = deduplicatedData;
    const totalPlanned  = d.reduce((s, r) => s + r.totalPlanned,  0);
    const totalReported = d.reduce((s, r) => s + r.totalReported, 0);
    return {
      rawTotal:     rawData.length,
      allCustomers: d.length,
      totalHCP:     d.filter(r => (r.customerType || '').toUpperCase() === 'HCP').length,
      active:       d.filter(r => r.totalPlanned > 0 || r.totalReported > 0).length,
      deleted:      d.filter(r => r.totalPlanned === 0 && r.totalReported === 0).length,
      totalPlanned, totalReported,
      coverage:     totalPlanned > 0 ? (totalReported / totalPlanned * 100) : 0,
      fullyCovered: d.filter(r => r.totalPlanned > 0 && r.totalReported >= r.totalPlanned).length,
      partial:      d.filter(r => r.totalReported > 0 && r.totalReported < r.totalPlanned).length,
      uncovered:    d.filter(r => r.totalReported === 0 && r.totalPlanned > 0).length,
      extraVisits:  d.filter(r => r.totalReported > r.totalPlanned).length,
      totalGross:   d.length,
      types:        d.reduce((acc, r) => {
        const t = r.customerType || 'Unknown';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {}),
    };
  }, [rawData, deduplicatedData]);

  // ── Derived flags ─────────────────────────────
  const hasActiveFilters = useMemo(() =>
    Object.entries(filters).some(([, v]) => Array.isArray(v) ? v.length > 0 : v !== 'All'),
  [filters]);

  const showMRColumn    = filters.mrName.length !== 1;
  const showMonthColumn = selectedMonth === 'All' && availableMonths.length > 1;
  const hasMonthBar     = availableMonths.length > 1;

  // ── Export ────────────────────────────────────
  const handleExport = () => {
    const rows = sortedData.map((r, i) => ({
      '#': i + 1,
      'Customer ID':    r.customerId,
      'Customer Name':  r.customerName,
      'Type':           r.customerType,
      'Grade':          r.customerGrade,
      'Specialty':      r.specialty,
      'MR Name':        r.mrName,
      'Line':           r.lineName,
      'Total Planned':  r.totalPlanned,
      'Total Reported': r.totalReported,
      'Coverage %':     r.totalPlanned > 0
        ? formatKpiPercent(r.totalReported / r.totalPlanned * 100)
        : formatKpiPercent(0),
      'Status': getStatus(r.totalPlanned, r.totalReported),
    }));
    const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Routing_${reportMonth || 'Combined'}_${sortedData.length}records.csv`);
  };

  // ── Shared table props ────────────────────────
  const tableProps = {
    paginatedData,
    sortedData,
    deduplicatedData,
    showMonthColumn,
    showMRColumn,
    sortKey,
    sortDir,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    quickVisitFilter,
    setQuickVisitFilter,
    searchQ,
    setSearchQ,
    stats,
  };

  // ════════════════════════════════════════════
  // SIDEBAR
  // ════════════════════════════════════════════
  const renderSidebar = () => (
    <aside
      className={`
        fixed z-40
        flex flex-col
        bg-white border-r border-gray-100 shadow-xl
        transition-transform duration-300 ease-in-out
        w-64 overflow-hidden
      `}
      style={{
        top:    NAV_H_VAR,
        bottom: `${FOOTER_H}px`,
        left:   isExpanded ? '240px' : '80px',
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest">⚙ Filters</span>
        <div className="flex items-center gap-2">
          <FilterButton onClick={clearFilters} label="Reset" className="!text-[9px] !px-2 !py-0.5" />
          <button onClick={() => setIsSidebarOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">

        {/* Grade Targets */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <button onClick={() => toggleSection('targets')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">🎯 Grade Targets</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections.targets ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections.targets && (
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase">Visits required</span>
                <button onClick={() => setIsEditingTargets(p => !p)}
                  className="text-[9px] font-black text-yellow-600 hover:text-yellow-700 uppercase">
                  {isEditingTargets ? '✓ Done' : 'Edit'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(gradeTargets).map(([grade, target]) => (
                  <div key={grade} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <span className="text-xs font-black text-gray-700">{grade}</span>
                    {isEditingTargets ? (
                      <input
                        type="number" min="0" max="10" value={target}
                        onChange={e => setGradeTargets(p => ({ ...p, [grade]: parseInt(e.target.value) || 0 }))}
                        className="w-10 h-6 text-center text-xs font-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 bg-white"
                      />
                    ) : (
                      <span className="text-xs font-black text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-md">{target}x</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visit Status */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <button onClick={() => openSection('visitStatus')}
            className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${filters.visitStatus !== 'All' ? 'bg-yellow-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Visit Status</span>
              {filters.visitStatus !== 'All' && (
                <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-md">1</span>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections.visitStatus ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections.visitStatus && (
            <div className="p-2 bg-white border-t border-gray-100 space-y-0.5">
              {[
                { val: 'All',               label: 'All Statuses' },
                { val: 'Fully Covered',     label: '✅ Fully Covered' },
                { val: 'Partially Covered', label: '🟡 Partially Covered' },
                { val: 'Not Visited',       label: '❌ Not Visited' },
                { val: 'Extra Visits',      label: '⭐ Extra Visits' },
                { val: 'Not Planned',       label: '🆕 Not Planned' },
              ].map(opt => (
                <FilterButton
                  key={opt.val}
                  onClick={() => { setFilters(p => ({ ...p, visitStatus: opt.val })); setCurrentPage(1); }}
                  isActive={filters.visitStatus === opt.val}
                  label={opt.label}
                  className="w-full text-left justify-start px-2.5 py-1.5 !text-xs !font-bold"
                />
              ))}
            </div>
          )}
        </div>

        {/* Multi-select sections */}
        {[
          { label: 'Medical Reps',  key: 'mrName',       options: filterOptions.mrName,       hasSearch: true },
          { label: 'Specialty',     key: 'specialty',    options: filterOptions.specialty },
          { label: 'Grade',         key: 'grade',        options: filterOptions.grade },
          { label: 'Customer Type', key: 'customerType', options: filterOptions.customerType },
          { label: 'Line Name',     key: 'lineName',     options: filterOptions.lineName },
        ].map(section => {
          const fieldMap = { mrName: 'mrName', specialty: 'specialty', grade: 'customerGrade', customerType: 'customerType', lineName: 'lineName' };
          const field = fieldMap[section.key];
          return (
            <div key={section.key} className="rounded-xl border border-gray-100 overflow-hidden">
              <div
                onClick={() => openSection(section.key)}
                className={`cursor-pointer w-full flex items-center justify-between px-3 py-2.5 transition-colors ${filters[section.key].length > 0 ? 'bg-yellow-50' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{section.label}</span>
                  {filters[section.key].length > 0 && (
                    <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-md">{filters[section.key].length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {expandedSections[section.key] && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <FilterButton onClick={() => setFilters(p => ({ ...p, [section.key]: [...section.options] }))}
                        label="All"
                        className="!text-[9px] !px-1.5 !py-0.5"
                      />
                      <span className="text-gray-200 text-xs">|</span>
                      <FilterButton onClick={() => setFilters(p => ({ ...p, [section.key]: [] }))}
                        label="None"
                        className="!text-[9px] !px-1.5 !py-0.5 !bg-gray-100 !text-gray-400"
                      />
                    </div>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections[section.key] ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {expandedSections[section.key] && (
                <div className="bg-white border-t border-gray-100 p-2">
                  {section.hasSearch && (
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                      <input
                        type="text" placeholder="Search..." value={mrSearch}
                        onChange={e => setMrSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-100 text-xs font-bold text-gray-700 bg-gray-50 focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 placeholder:text-gray-300"
                      />
                    </div>
                  )}
                  <div className="space-y-0.5 max-h-44 overflow-y-auto">
                    {(section.hasSearch
                      ? section.options.filter(o => o.toLowerCase().includes(mrSearch.toLowerCase()))
                      : section.options
                    ).map(opt => (
                      <label key={opt}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all group ${filters[section.key].includes(opt) ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${filters[section.key].includes(opt) ? 'bg-yellow-400 border-yellow-400' : 'border-gray-300 group-hover:border-yellow-300'}`}>
                          {filters[section.key].includes(opt) && (
                            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <input type="checkbox" className="hidden"
                          checked={filters[section.key].includes(opt)}
                          onChange={() => handleToggleFilter(section.key, opt)} />
                        <span className="text-xs font-bold text-gray-700 flex-1 truncate">{opt}</span>
                        <span className="text-[9px] text-gray-400 font-bold flex-shrink-0">
                          {rawData.filter(r => r[field] === opt).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );

  // ════════════════════════════════════════════
  // KPIs
  // ════════════════════════════════════════════
  const renderKPIs = () => (
    <div className="flex items-stretch gap-2 px-4 py-2 overflow-x-auto">
      {[
        { label: 'All HCPs',    value: formatKpiGrouped(stats.totalHCP),    icon: '👨‍⚕️', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-100' },
        { label: 'Active',      value: formatKpiGrouped(stats.active),      icon: '✅',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { label: 'Deleted',     value: formatKpiGrouped(stats.deleted),     icon: '🗑️',  color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200' },
        { label: 'Planned',     value: formatKpiGrouped(stats.totalPlanned),  icon: '📋', color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-100' },
        { label: 'Reported',    value: formatKpiGrouped(stats.totalReported), icon: '📝', color: 'text-green-600',   bg: 'bg-green-50',   border: 'border-green-100' },
        {
          label: 'Coverage', value: formatKpiPercent(stats.coverage), icon: '🎯',
          color:  stats.coverage >= 80 ? 'text-emerald-600' : stats.coverage >= 50 ? 'text-amber-500' : 'text-red-500',
          bg:     stats.coverage >= 80 ? 'bg-emerald-50'    : stats.coverage >= 50 ? 'bg-amber-50'    : 'bg-red-50',
          border: stats.coverage >= 80 ? 'border-emerald-100' : stats.coverage >= 50 ? 'border-amber-100' : 'border-red-100',
        },
        { label: 'Full',        value: formatKpiGrouped(stats.fullyCovered), icon: '💚', color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-100' },
        { label: 'Partial',     value: formatKpiGrouped(stats.partial),      icon: '🟡', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
        { label: 'Not Visited', value: formatKpiGrouped(stats.uncovered),    icon: '❌', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100' },
      ].map((card, i) => (
        <div key={i} className={`flex-shrink-0 ${card.bg} border ${card.border} rounded-xl px-3 py-2 flex flex-col justify-between min-w-[72px]`}>
          <span className="text-sm">{card.icon}</span>
          <p className={`text-base font-black leading-none mt-1 ${card.color}`}>
            {card.value}
          </p>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-none mt-1 truncate">{card.label}</p>
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════════════════
  // OVERVIEW
  // ════════════════════════════════════════════
  const renderOverview = () => {
    const statusCounts = filteredData.reduce((acc, r) => {
      const s = getStatus(r.totalPlanned, r.totalReported);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    const total   = entries.reduce((s, [, v]) => s + v, 0) || 1;

    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Type */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-3">Customer Type Distribution</h4>
            <div className="space-y-2">
              {Object.entries(stats.types).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-gray-600">{type || 'Unknown'}</span>
                    <span className="text-xs font-black text-gray-800">{formatKpiGrouped(count)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(count / stats.allCustomers) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visit Status Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-3">Visit Status Distribution</h4>
            <div className="space-y-2">
              {entries.map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-gray-600">{status}</span>
                    <span className="text-xs font-black text-gray-800">{formatKpiGrouped(count)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] font-black text-amber-700">⚠ Intelligence Audit</p>
              <p className="text-[10px] text-amber-600 mt-0.5">{stats.uncovered} nodes uncovered · {stats.deleted} inactive</p>
            </div>
          </div>
        </div>

        {/* Grade Performance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-3">Grade Performance</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['A+', 'A', 'B', 'C'].map(grade => {
              const gd       = filteredData.filter(r => r.customerGrade === grade);
              const planned  = gd.reduce((s, r) => s + r.totalPlanned, 0);
              const reported = gd.reduce((s, r) => s + r.totalReported, 0);
              const cov      = planned > 0 ? (reported / planned * 100) : 0;
              return (
                <div key={grade} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black text-gray-800">{grade}</span>
                    <span className={`text-xs font-black ${cov >= 80 ? 'text-green-600' : cov >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{formatKpiPercent(cov)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${cov >= 80 ? 'bg-green-500' : cov >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(cov, 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold">P:{formatKpiGrouped(planned)} R:{formatKpiGrouped(reported)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════
  // BY MR
  // ════════════════════════════════════════════
  const renderByMR = () => {
    const mrStats = filterOptions.mrName.map(mr => {
      const mData = filteredData.filter(r => r.mrName === mr);
      if (!mData.length) return null;
      const planned  = mData.reduce((s, r) => s + r.totalPlanned,  0);
      const reported = mData.reduce((s, r) => s + r.totalReported, 0);
      return {
        mr, count: mData.length, planned, reported,
        coverage:   planned > 0 ? (reported / planned * 100) : 0,
        notVisited: mData.filter(r => r.totalReported === 0 && r.totalPlanned > 0).length,
        extra:      mData.filter(r => r.totalReported > r.totalPlanned).length,
      };
    }).filter(Boolean);

    return (
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  {['MR Name', 'Customers', 'Planned', 'Reported', 'Coverage', 'Not Visited', 'Extra'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mrStats.map((m, i) => (
                  <React.Fragment key={m.mr}>
                    <tr
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50/40 cursor-pointer`}
                      onClick={() => setExpandedMR(expandedMR === m.mr ? null : m.mr)}
                    >
                      <td className="px-4 py-2.5 font-bold text-xs text-gray-800">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedMR === m.mr ? 'rotate-180' : ''}`} />
                          {m.mr}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(m.count)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(m.planned)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(m.reported)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${m.coverage >= 80 ? 'bg-green-100 text-green-700' : m.coverage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {formatKpiPercent(m.coverage)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(m.notVisited)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(m.extra)}</td>
                    </tr>
                    {expandedMR === m.mr && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-yellow-50/60 border-b border-yellow-100">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {filteredData.filter(r => r.mrName === m.mr).map(r => (
                              <div key={r.customerId} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-800 truncate">{r.customerName}</p>
                                  <p className="text-[10px] text-gray-400">{r.specialty} · {r.customerGrade}</p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className="text-[10px] font-black text-gray-700">{r.totalPlanned}/{r.totalReported}</p>
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
      </div>
    );
  };

  // ════════════════════════════════════════════
  // BY SPECIALTY
  // ════════════════════════════════════════════
  const renderBySpecialty = () => {
    const specStats = filterOptions.specialty.map(spec => {
      const sData = filteredData.filter(r => r.specialty === spec);
      if (!sData.length) return null;
      const planned  = sData.reduce((s, r) => s + r.totalPlanned,  0);
      const reported = sData.reduce((s, r) => s + r.totalReported, 0);
      return { specialty: spec, count: sData.length, planned, reported, coverage: planned > 0 ? (reported / planned * 100) : 0 };
    }).filter(Boolean).sort((a, b) => b.count - a.count);

    return (
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  {['Specialty', 'Customers', 'Planned', 'Reported', 'Coverage'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specStats.map((s, i) => (
                  <tr key={s.specialty} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50/40`}>
                    <td className="px-4 py-2.5 text-xs font-bold text-yellow-600">{s.specialty}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(s.count)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(s.planned)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{formatKpiGrouped(s.reported)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div className={`h-full rounded-full ${s.coverage >= 80 ? 'bg-green-500' : s.coverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(s.coverage, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 w-10 flex-shrink-0">{formatKpiPercent(s.coverage)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════
  // COVERAGE MAP
  // ════════════════════════════════════════════
  const renderCoverageMap = () => (
    <div className="p-4 space-y-4">
      {filterOptions.mrName.map(mr => {
        const mData = filteredData.filter(r => r.mrName === mr);
        if (!mData.length) return null;
        const plannedSet  = new Set(mData.flatMap(r => r.monthPlanned));
        const reportedSet = new Set(mData.flatMap(r => r.monthReported));
        return (
          <div key={mr} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-gray-800">{mr}</h4>
              <span className="text-[10px] font-bold text-gray-400">{plannedSet.size} planned · {reportedSet.size} reported days</span>
            </div>
            <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                const isP = plannedSet.has(d), isR = reportedSet.has(d);
                return (
                  <div
                    key={d}
                    title={`Day ${d}: ${isP && isR ? 'Planned & Reported' : isR ? 'Extra' : isP ? 'Missed' : 'Free'}`}
                    className={`aspect-square rounded flex items-center justify-center text-[8px] font-black cursor-default ${isP && isR ? 'bg-green-500 text-white' : isR ? 'bg-blue-400 text-white' : isP ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-300'}`}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2">
              {[
                { color: 'bg-green-500', label: 'Planned & Reported' },
                { color: 'bg-amber-400', label: 'Missed' },
                { color: 'bg-blue-400',  label: 'Extra' },
                { color: 'bg-gray-100',  label: 'Free' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                  <span className="text-[9px] font-bold text-gray-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ════════════════════════════════════════════
  // EMPTY STATE
  // ════════════════════════════════════════════
  if (!rawData.length && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Upload className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Routing Analyzer</h2>
          <p className="text-sm text-gray-500 mb-6">Upload a routing report CSV to begin analysis.</p>
          <label className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-yellow-400 text-black text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-yellow-500 transition-all shadow-xl hover:scale-105 active:scale-95">
            <Upload className="w-4 h-4" /> Upload CSV
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFileUpload(e, 'replace')} />
          </label>
          <p className="text-[10px] text-gray-400 mt-4">v{ROUTING_VERSION.version}</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════
  return (
    <>
      {/* ── Sidebar ── */}
      {renderSidebar()}

      {/* ── Mobile overlay ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Main wrapper ── */}
      <div
        className="flex-1 min-w-0 bg-gray-50 relative pb-12"
      >
        {/* ══ TOP HEADER (Now Static/Relative for full page scroll) ══ */}
        <div className="bg-white shadow-sm z-20 w-full overflow-x-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <FilterButton
                onClick={() => setIsSidebarOpen(p => !p)}
                isActive={isSidebarOpen}
                label="Filters"
                className="!py-1.5 !px-3 shadow-none shrink-0"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
              </FilterButton>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="block text-sm font-black text-gray-900 tracking-tight truncate">
                    ROUTING <span className="text-yellow-500">ANALYZER</span>
                  </span>
                  {availableMonths.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center bg-yellow-400 border border-yellow-500 rounded-full px-3 py-1 whitespace-nowrap overflow-hidden shadow-sm">
                        <span className="text-[10px] font-black text-black uppercase tracking-tight">
                          {availableMonths.length > 1 
                            ? `Period: ${availableMonths[0]} – ${availableMonths[availableMonths.length - 1]}`
                            : `Month: ${reportMonth}`
                          }
                        </span>
                      </div>
                      <div className="flex items-center bg-gray-100 border border-gray-200 rounded-full px-3 py-1 whitespace-nowrap">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">
                          {availableMonths.length * 30} Days Data
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="hidden sm:block text-[9px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  v{ROUTING_VERSION.version}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Export */}
              {rawData.length > 0 && (
                <button onClick={handleExport}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-all shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              )}
              {/* Clear */}
              {rawData.length > 0 && (
                <button onClick={handleClearData} title="Clear All Data"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Upload */}
              <button onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Upload
              </button>
            </div>
          </div>

          {/* Month bar */}
          {hasMonthBar && (
            <div className="flex items-center gap-3 px-4 h-[40px] border-b border-gray-100 overflow-x-auto">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0">Period:</span>
              <div className="flex items-center gap-1">
                <FilterButton onClick={() => { setSelectedMonth('All'); setCurrentPage(1); }}
                  isActive={selectedMonth === 'All'}
                  label="All"
                />
                {availableMonths.map(m => (
                  <FilterButton key={m} onClick={() => { setSelectedMonth(m); setCurrentPage(1); }}
                    isActive={selectedMonth === m}
                    label={m}
                  />
                ))}
              </div>
              <div className="ml-auto flex-shrink-0">
                <span className="text-[10px] font-black text-gray-400">
                  <span className="text-gray-900">{formatKpiGrouped(rawData.length)}</span> records · {lineName}
                </span>
              </div>
            </div>
          )}

        {/* ══ KPIs GRID ══ */}
          {rawData.length > 0 && (
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ">Key Performance Indicators</span>
                <button onClick={() => setIsKpiExpanded(!isKpiExpanded)} className="text-gray-400 hover:text-gray-600">
                  {isKpiExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              {isKpiExpanded && (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                  {[
                    { label: 'All HCPs',    value: formatKpiGrouped(stats.totalHCP),    icon: '👨‍⚕️', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-100' },
                    { label: 'Active',      value: formatKpiGrouped(stats.active),      icon: '✅',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Deleted',     value: formatKpiGrouped(stats.deleted),     icon: '🗑️',  color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200' },
                    { label: 'Planned',     value: formatKpiGrouped(stats.totalPlanned),  icon: '📋', color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-100' },
                    { label: 'Reported',    value: formatKpiGrouped(stats.totalReported), icon: '📝', color: 'text-green-600',   bg: 'bg-green-50',   border: 'border-green-100' },
                    {
                      label: 'Coverage', value: formatKpiPercent(stats.coverage), icon: '🎯',
                      color:  stats.coverage >= 80 ? 'text-emerald-600' : stats.coverage >= 50 ? 'text-amber-500' : 'text-red-500',
                      bg:     stats.coverage >= 80 ? 'bg-emerald-50'    : stats.coverage >= 50 ? 'bg-amber-50'    : 'bg-red-50',
                      border: stats.coverage >= 80 ? 'border-emerald-100' : stats.coverage >= 50 ? 'border-amber-100' : 'border-red-100',
                    },
                    { label: 'Full',        value: formatKpiGrouped(stats.fullyCovered), icon: '💚', color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-100' },
                    { label: 'Partial',     value: formatKpiGrouped(stats.partial),      icon: '🟡', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
                    { label: 'Not Visited', value: formatKpiGrouped(stats.uncovered),    icon: '❌', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100' },
                  ].map((card, i) => (
                    <div key={i} className={`${card.bg} border ${card.border} rounded-xl px-2 py-1.5 flex flex-col justify-center min-w-[60px] text-center`}>
                      <span className="text-[10px]">{card.icon}</span>
                      <p className={`text-xs font-black leading-none mt-0.5 ${card.color}`}>
                        {card.value}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5 truncate">{card.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-50 border-b border-yellow-100 overflow-x-auto flex-shrink-0">
              <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest flex-shrink-0">● Active:</span>
              {filters.visitStatus !== 'All' && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400 text-black rounded-md text-[10px] font-black flex-shrink-0">
                  {filters.visitStatus}
                  <button onClick={() => setFilters(p => ({ ...p, visitStatus: 'All' }))}><X className="w-2.5 h-2.5" /></button>
                </div>
              )}
              {Object.entries(filters).map(([k, v]) =>
                Array.isArray(v) ? v.map(val => (
                  <div key={`${k}_${val}`} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-yellow-200 text-gray-700 rounded-md text-[10px] font-black flex-shrink-0 shadow-sm">
                    {val}
                    <button onClick={() => handleToggleFilter(k, val)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                  </div>
                )) : null
              )}
              <button onClick={clearFilters} className="ml-auto flex-shrink-0 text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest px-2 py-0.5 hover:bg-red-50 rounded-md">
                Clear All
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 h-[44px] overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview',     icon: LayoutDashboard },
              { id: 'list',     label: 'Customers',    icon: Users },
              { id: 'by-mr',    label: 'By MR',        icon: UserCircle },
              { id: 'by-spec',  label: 'Specialty',    icon: Stethoscope },
              { id: 'map',      label: 'Coverage Map', icon: MapPin },
            ].map(tab => (
              <FilterButton key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                isActive={activeTab === tab.id}
                label={tab.label}
                className="h-[32px] !p-1 !px-3"
              >
                <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </FilterButton>
            ))}

            {/* ── Full Table Button ── */}
            <button
              onClick={() => setShowTableModal(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap h-[32px] flex-shrink-0 bg-gray-100 text-gray-600 hover:bg-gray-900 hover:text-white border border-gray-200"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Full Table</span>
            </button>
          </div>
        </div>

        {/* ══ CONTENT AREA (Static for full page scroll) ══ */}
        <div className="w-full">
          {activeTab === 'list' ? (
            <div className="bg-white">
              <CustomerTable {...tableProps} />
            </div>
          ) : (
            <div className="pb-8">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'by-mr'    && renderByMR()}
              {activeTab === 'by-spec'  && renderBySpecialty()}
              {activeTab === 'map'      && renderCoverageMap()}
            </div>
          )}
        </div>
      </div>

      {/* ══ FULL TABLE MODAL ══ */}
      {showTableModal && (
        <FullTableModal
          onClose={() => setShowTableModal(false)}
          {...tableProps}
        />
      )}

      {/* ══ UPLOAD MODAL ══ */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-gray-900">Upload Routing File</h3>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Choose how to handle the new dataset</p>
            <div className="flex gap-3 mb-4">
              {[
                { id: 'replace', label: '🔄 Replace', desc: 'Clear current data' },
                { id: 'append',  label: '➕ Append',  desc: 'Merge with current' },
              ].map(m => (
                <button key={m.id} onClick={() => setUploadMode(m.id)}
                  className={`flex-1 p-4 rounded-2xl border-2 text-left transition-all ${uploadMode === m.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                  <p className="text-sm font-black text-gray-800">{m.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/30 transition-all">
              <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-gray-700">Click to select CSV file</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Pipe or comma delimited</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={e => handleFileUpload(e, uploadMode)} />
            </label>
            <button onClick={() => setShowUploadModal(false)}
              className="w-full mt-3 py-3 rounded-2xl border-2 border-gray-100 text-sm font-black text-gray-500 hover:bg-gray-50 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RoutingAnalyzer;