
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
import ResponsivePanel from '../../components/shared/ResponsivePanel';
import { Menu } from 'lucide-react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// ─── Constants ────────────────────────────────
const SIDEBAR_W    = 256; // px  (w-64)
const NAV_H_VAR    = 'var(--nav-height, 64px)';
const FOOTER_H     = 48;  // px  must match Footer.jsx

const ROUTING_VERSION = {
  version: '1.0.445',
  releaseDate: 'Apr 2026',
  label: 'Advanced Routing Analysis Engine',
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
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white border-b border-gray-100">
        {/* Quick toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Filter:</span>
          {[
            { id: 'all',       label: 'All',          count: deduplicatedData.length },
            { id: 'full',      label: '✅ Full',       count: stats.fullyCovered },
            { id: 'partial',   label: '🟡 Partial',   count: stats.partial },
            { id: 'uncovered', label: '❌ Uncovered', count: stats.uncovered },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setQuickVisitFilter(opt.id); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all
                ${quickVisitFilter === opt.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'}`}
            >
              {opt.label}
              <span className={`text-[9px] px-1 py-0.5 rounded font-black ${quickVisitFilter === opt.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + count */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 w-44 placeholder:text-gray-300 focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 bg-white"
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-gray-300 hover:text-red-400" />
              </button>
            )}
          </div>
          <span className="text-[10px] font-black text-gray-400 whitespace-nowrap hidden sm:block">
            <span className="text-gray-900">{sortedData.length}</span> / <span className="text-gray-900">{deduplicatedData.length}</span>
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm border-collapse" style={{ minWidth: isModal ? '1100px' : '900px' }}>
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
                  {/* ID */}
                  <td className="px-2.5 py-1.5 text-[11px] text-gray-500 font-mono whitespace-nowrap border-b border-gray-50">{r.customerId}</td>

                  {/* Month */}
                  {showMonthColumn && (
                    <td className="px-2.5 py-1.5 border-b border-gray-50">
                      <div className="flex flex-wrap gap-0.5">
                        {(r.customerMonths || [r.sourceMonth]).map(m => (
                          <span key={m} className="px-1.5 py-0.5 rounded text-[9px] font-black bg-yellow-50 text-yellow-700 border border-yellow-200">{m?.slice(0, 3)}</span>
                        ))}
                      </div>
                    </td>
                  )}

                  {/* Name */}
                  <td className="px-2.5 py-1.5 text-[11px] text-gray-800 font-semibold border-b border-gray-50 max-w-[160px] truncate">{r.customerName}</td>

                  {/* Grade */}
                  <td className="px-2.5 py-1.5 border-b border-gray-50"><GradeBadge grade={r.customerGrade} /></td>

                  {/* Specialty */}
                  <td className="px-2.5 py-1.5 text-[11px] text-yellow-600 border-b border-gray-50 max-w-[130px] truncate">{r.specialty}</td>

                  {/* MR */}
                  {showMRColumn && (
                    <td className="px-2.5 py-1.5 text-[11px] text-gray-600 border-b border-gray-50 max-w-[120px] truncate">{r.mrName}</td>
                  )}

                  {/* Planned count */}
                  <td className="px-2.5 py-1.5 text-[11px] text-gray-700 font-bold border-b border-gray-50 text-center">{r.totalPlanned}</td>

                  {/* Reported count */}
                  <td className="px-2.5 py-1.5 text-[11px] text-gray-700 font-bold border-b border-gray-50 text-center">{r.totalReported}</td>

                  {/* Planned Days */}
                  <td className="px-2.5 py-1.5 border-b border-gray-50">
                    {r.monthlyData ? (
                      <div className="space-y-0.5">
                        {Object.entries(r.monthlyData).map(([m, d]) => (
                          <div key={m} className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-gray-400 w-7 flex-shrink-0">{m.slice(0, 3)}:</span>
                            <div className="flex flex-wrap gap-0.5">
                              {d.planned.map(day => <span key={day} className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">{day}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                        {r.monthPlanned.map(d => <span key={d} className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">{d}</span>)}
                      </div>
                    )}
                  </td>

                  {/* Reported Days */}
                  <td className="px-2.5 py-1.5 border-b border-gray-50">
                    {r.monthlyData ? (
                      <div className="space-y-0.5">
                        {Object.entries(r.monthlyData).map(([m, d]) => {
                          const mMissed = d.planned.filter(dd => !d.reported.includes(dd));
                          return (
                            <div key={m} className="flex items-center gap-1">
                              <span className="text-[8px] font-black text-gray-400 w-7 flex-shrink-0">{m.slice(0, 3)}:</span>
                              <div className="flex flex-wrap gap-0.5">
                                {d.reported.map(day => <span key={day} className="px-1 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-black border border-green-100">{day}</span>)}
                                {mMissed.map(day => <span key={`m${day}`} className="px-1 py-0.5 bg-red-50 text-red-400 rounded text-[9px] font-black border border-red-100 line-through">{day}</span>)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                        {r.monthReported.map(d => <span key={d} className="px-1 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-black border border-green-100">{d}</span>)}
                        {missed.map(d => <span key={`m${d}`} className="px-1 py-0.5 bg-red-50 text-red-400 rounded text-[9px] font-black border border-red-100 line-through">{d}</span>)}
                      </div>
                    )}
                  </td>

                  {/* Interval */}
                  <td className="px-2.5 py-1.5 text-[11px] text-gray-500 border-b border-gray-50 text-center whitespace-nowrap">{r.daysInterval}d</td>

                  {/* Status */}
                  <td className="px-2.5 py-1.5 border-b border-gray-50 whitespace-nowrap">{getStatusBadge(status)}</td>
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
              <button
                key={n}
                onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                className={`w-8 h-6 rounded text-[10px] font-black transition-all border ${itemsPerPage === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Page buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page  = start + idx;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-yellow-400 text-black' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {page}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        <span className="text-[10px] font-black text-gray-400 hidden sm:block">
          Page <span className="text-gray-900">{currentPage}</span> · <span className="text-gray-900">{sortedData.length}</span> records
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
              {tableProps.sortedData.length} records
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
const RoutingAnalyzer = () => {
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
  const [isSidebarOpen,    setIsSidebarOpen]    = useState(true);
  const [expandedMR,       setExpandedMR]       = useState(null);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
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
        ? (r.totalReported / r.totalPlanned * 100).toFixed(1) + '%'
        : '0%',
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
        left:   0,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest">⚙ Filters</span>
        <div className="flex items-center gap-2">
          <button onClick={clearFilters} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Reset</button>
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
                <button key={opt.val}
                  onClick={() => { setFilters(p => ({ ...p, visitStatus: opt.val })); setCurrentPage(1); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filters.visitStatus === opt.val ? 'bg-yellow-400 text-black' : 'hover:bg-gray-50 text-gray-600'}`}>
                  {opt.label}
                </button>
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
                      <button onClick={() => setFilters(p => ({ ...p, [section.key]: [...section.options] }))}
                        className="text-[9px] font-black text-yellow-600 hover:text-yellow-700 px-1">All</button>
                      <span className="text-gray-200 text-xs">|</span>
                      <button onClick={() => setFilters(p => ({ ...p, [section.key]: [] }))}
                        className="text-[9px] font-black text-gray-400 hover:text-gray-600 px-1">None</button>
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
        { label: 'All HCPs',    value: stats.totalHCP,    icon: '👨‍⚕️', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-100' },
        { label: 'Active',      value: stats.active,      icon: '✅',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { label: 'Deleted',     value: stats.deleted,     icon: '🗑️',  color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200' },
        { label: 'Planned',     value: stats.totalPlanned,  icon: '📋', color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-100' },
        { label: 'Reported',    value: stats.totalReported, icon: '📝', color: 'text-green-600',   bg: 'bg-green-50',   border: 'border-green-100' },
        {
          label: 'Coverage', value: `${stats.coverage.toFixed(1)}%`, icon: '🎯',
          color:  stats.coverage >= 80 ? 'text-emerald-600' : stats.coverage >= 50 ? 'text-amber-500' : 'text-red-500',
          bg:     stats.coverage >= 80 ? 'bg-emerald-50'    : stats.coverage >= 50 ? 'bg-amber-50'    : 'bg-red-50',
          border: stats.coverage >= 80 ? 'border-emerald-100' : stats.coverage >= 50 ? 'border-amber-100' : 'border-red-100',
        },
        { label: 'Full',        value: stats.fullyCovered, icon: '💚', color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-100' },
        { label: 'Partial',     value: stats.partial,      icon: '🟡', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
        { label: 'Not Visited', value: stats.uncovered,    icon: '❌', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100' },
      ].map((card, i) => (
        <div key={i} className={`flex-shrink-0 ${card.bg} border ${card.border} rounded-xl px-3 py-2 flex flex-col justify-between min-w-[72px]`}>
          <span className="text-sm">{card.icon}</span>
          <p className={`text-base font-black leading-none mt-1 ${card.color}`}>
            {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
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
                    <span className="text-xs font-black text-gray-800">{count}</span>
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
                    <span className="text-xs font-black text-gray-800">{count}</span>
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
                    <span className={`text-xs font-black ${cov >= 80 ? 'text-green-600' : cov >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{cov.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${cov >= 80 ? 'bg-green-500' : cov >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(cov, 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold">P:{planned} R:{reported}</p>
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
                      <td className="px-4 py-2.5 text-xs text-gray-600">{m.count}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{m.planned}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{m.reported}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${m.coverage >= 80 ? 'bg-green-100 text-green-700' : m.coverage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {m.coverage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{m.notVisited}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{m.extra}</td>
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
                    <td className="px-4 py-2.5 text-xs text-gray-600">{s.count}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{s.planned}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{s.reported}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div className={`h-full rounded-full ${s.coverage >= 80 ? 'bg-green-500' : s.coverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(s.coverage, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 w-10 flex-shrink-0">{s.coverage.toFixed(0)}%</span>
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
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Main wrapper ── */}
      <div
        className="fixed overflow-hidden transition-all duration-300 min-h-0 bg-gray-50 flex flex-col"
        style={{
          top: NAV_H_VAR,
          bottom: `${FOOTER_H}px`,
          left: isSidebarOpen ? `${SIDEBAR_W}px` : '0px',
          right: '0px'
        }}
      >
        {/* ══ FIXED TOP HEADER ══ */}
        <div className="flex-shrink-0 bg-white shadow-sm z-20">

          {/* Header bar */}
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(p => !p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${isSidebarOpen ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
              <div>
                <span className="text-sm font-black text-gray-900 tracking-tight">
                  ROUTING <span className="text-yellow-500">ANALYZER</span>
                </span>
                <p className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  v{ROUTING_VERSION.version}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Export */}
              {rawData.length > 0 && (
                <button onClick={handleExport}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-all shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Export ({sortedData.length})
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm shadow-yellow-200">
                <Plus className="w-3.5 h-3.5" /> Upload
              </button>
            </div>
          </div>

          {/* Month bar */}
          {hasMonthBar && (
            <div className="flex items-center gap-3 px-4 h-[40px] border-b border-gray-100 overflow-x-auto">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0">Period:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setSelectedMonth('All'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border ${selectedMonth === 'All' ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-200'}`}>
                  All
                </button>
                {availableMonths.map(m => (
                  <button key={m} onClick={() => { setSelectedMonth(m); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border ${selectedMonth === m ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex-shrink-0">
                <span className="text-[10px] font-black text-gray-400">
                  <span className="text-gray-900">{rawData.length.toLocaleString()}</span> records · {lineName}
                </span>
              </div>
            </div>
          )}

          {/* KPIs */}
          {rawData.length > 0 && (
            <div className="border-b border-gray-100">{renderKPIs()}</div>
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
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap h-[32px] flex-shrink-0 ${activeTab === tab.id ? 'bg-yellow-400 text-black shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
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

        {/* ══ SCROLLABLE CONTENT ══ */}
        {activeTab === 'list' ? (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <CustomerTable {...tableProps} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-4 min-h-0">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'by-mr'    && renderByMR()}
            {activeTab === 'by-spec'  && renderBySpecialty()}
            {activeTab === 'map'      && renderCoverageMap()}
          </div>
        )}
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