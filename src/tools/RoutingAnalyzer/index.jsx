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
  version: '1.0.440',
  releaseDate: 'Apr 2026',
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
      sourceMonth:   monthName,
    };
  }).filter(r => r.customerId);

  // period name prefixing
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
  const styles = {
    'Fully Covered': 
      'bg-green-100 text-green-700 ' +
      'border-green-200',
    'Partial':       
      'bg-amber-100 text-amber-700 ' +
      'border-amber-200',
    'Not Visited':   
      'bg-red-100 text-red-600 ' +
      'border-red-200',
    'Extra':         
      'bg-purple-100 text-purple-700 ' +
      'border-purple-200',
    'Not Planned':   
      'bg-blue-100 text-blue-600 ' +
      'border-blue-200',
    'Inactive':      
      'bg-gray-100 text-gray-400 ' +
      'border-gray-200',
  };
  const icons = {
    'Fully Covered': '✅',
    'Partial':       '🟡',
    'Not Visited':   '❌',
    'Extra':         '⭐',
    'Not Planned':   '🆕',
    'Inactive':      '⬜',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border ${styles[status] || styles['Inactive']}`}>
      {icons[status] || '⬜'} {status}
    </span>
  );
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
  const [mrSearch, setMrSearch] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [isScrolled, setIsScrolled] = useState(false);
  const [previewMonth, setPreviewMonth] = useState('');
  const [sortKey, setSortKey] = useState('customerName');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const fileInputRef = useRef(null);
  const contentRef = useRef(null);

  // Grade Targets State
  const [gradeTargets, setGradeTargets] = useState({
    'A+': 3,
    'A': 2,
    'B': 1,
    'C': 1
  });
  const [isEditingTargets, setIsEditingTargets] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    targets:     false,
    visitStatus: true,
    mrName:      true,
    specialty:   false,
    grade:       false,
    customerType:false,
    lineName:    false,
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openSection = (key) => {
    setExpandedSections(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k !== key) {
          const hasSelection = Array.isArray(filters[k]) 
            ? filters[k].length > 0 
            : filters[k] !== 'All';
          if (!hasSelection) next[k] = false;
        }
      });
      next[key] = true;
      return next;
    });
  };

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
          lineName,
          availableMonths
        })
      );
    }
  }, [rawData, reportMonth, lineName, availableMonths]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('routingData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRawData(parsed.rawData || []);
        setReportMonth(parsed.reportMonth || '');
        setLineName(parsed.lineName || '');
        setAvailableMonths(parsed.availableMonths || []);
        setSelectedMonth('All');
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
      setAvailableMonths([]);
      setSelectedMonth('All');
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
        setRawData(prev => {
          const existingKeys = new Set(
            prev.map(r => `${r.customerId}__${r.sourceMonth}`)
          );
          const newRows = data.filter(r => 
            !existingKeys.has(`${r.customerId}__${r.sourceMonth}`)
          );
          return [...prev, ...newRows];
        });
        setAvailableMonths(prev => {
          const updated = [...prev];
          if (!updated.includes(month)) {
            updated.push(month);
          }
          return updated;
        });
      } else {
        // Replace
        setRawData(data);
        setReportMonth(month);
        setLineName(ln);
        setAvailableMonths([month]);
        setSelectedMonth('All');
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

    // Month filter FIRST
    if (selectedMonth !== 'All') {
      d = d.filter(r => 
        r.sourceMonth === selectedMonth
      );
    }

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
    // (only apply when on 'list' tab)
    if (activeTab === 'list') {
      if (quickVisitFilter === 'full') {
        // Fully reported = reported >= planned > 0
        d = d.filter(r => 
          r.totalPlanned > 0 && 
          r.totalReported >= r.totalPlanned
        );
      } else if (quickVisitFilter === 'partial') {
        // Partial = 0 < reported < planned
        d = d.filter(r => 
          r.totalReported > 0 && 
          r.totalReported < r.totalPlanned
        );
      } else if (quickVisitFilter === 'uncovered') {
        // Uncovered = planned > 0, reported = 0
        d = d.filter(r => 
          r.totalReported === 0 && 
          r.totalPlanned > 0
        );
      }
      // 'all' → no extra filter
    }

    if (searchQ.trim()) {
      const q = searchQ.toLowerCase().trim();
      d = d.filter(r => 
        (r.customerName || '')
          .toLowerCase().includes(q) ||
        (r.customerId || '')
          .toLowerCase().includes(q) ||
        (r.mrName || '')
          .toLowerCase().includes(q) ||
        (r.specialty || '')
          .toLowerCase().includes(q) ||
        (r.customerGrade || '')
          .toLowerCase().includes(q) ||
        (r.customerType || '')
          .toLowerCase().includes(q) ||
        (r.lineName || '')
          .toLowerCase().includes(q)
      );
    }
    
    return d;
  }, [rawData, filters, searchQ, quickVisitFilter, gradeTargets, activeTab, selectedMonth]);

  const deduplicatedData = useMemo(() => {
    if (selectedMonth !== 'All' ||
        availableMonths.length <= 1) {
      return filteredData;
    }

    // Group by customerId
    const map = new Map();

    filteredData.forEach(r => {
      if (!map.has(r.customerId)) {
        map.set(r.customerId, {
          ...r,
          totalPlanned:  0,
          totalReported: 0,
          monthlyData: {},
          // months this customer appears in
          customerMonths: [],
        });
      }
      const entry = map.get(r.customerId);
      entry.totalPlanned  += r.totalPlanned;
      entry.totalReported += r.totalReported;
      if (!entry.customerMonths.includes(r.sourceMonth)) {
        entry.customerMonths.push(r.sourceMonth);
      }
      entry.monthlyData[r.sourceMonth] = {
        planned:  r.monthPlanned,
        reported: r.monthReported,
        plannedCount:  r.totalPlanned,
        reportedCount: r.totalReported,
      };
    });

    return Array.from(map.values());
  }, [filteredData, selectedMonth, availableMonths]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!deduplicatedData.length) return [];
    return [...deduplicatedData].sort((a, b) => {
      let valA, valB;
      
      if (sortKey === '_status') {
        valA = getStatus(a.totalPlanned, a.totalReported);
        valB = getStatus(b.totalPlanned, b.totalReported);
      } else {
        valA = a[sortKey] ?? '';
        valB = b[sortKey] ?? '';
      }
      
      // Numeric sort for numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      
      // String sort
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [deduplicatedData, sortKey, sortDir]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Stats Calculations
  const stats = useMemo(() => {
    // Global raw counts (for info bar only)
    const rawTotal = rawData.length;
    
    // ALL stats from deduplicatedData
    // so they respond to filters and show unique customer counts
    const dData = deduplicatedData;
    const allCustomers  = dData.length;
    
    const deleted = dData.filter(r =>
      r.totalPlanned === 0 && 
      r.totalReported === 0
    ).length;
    
    const active = dData.filter(r =>
      r.totalPlanned > 0 || r.totalReported > 0
    ).length;

    const totalHCP = dData.filter(r =>
      (r.customerType || '').toUpperCase() === 'HCP'
    ).length;

    const totalPlanned = dData.reduce(
      (acc, r) => acc + r.totalPlanned, 0
    );
    const totalReported = dData.reduce(
      (acc, r) => acc + r.totalReported, 0
    );
    const coverage = totalPlanned > 0 
      ? (totalReported / totalPlanned * 100) 
      : 0;

    const uncovered = dData.filter(r =>
      r.totalReported === 0 && r.totalPlanned > 0
    ).length;

    const fullyCovered = dData.filter(r =>
      r.totalPlanned > 0 && 
      r.totalReported >= r.totalPlanned
    ).length;

    const partial = dData.filter(r =>
      r.totalReported > 0 && 
      r.totalReported < r.totalPlanned
    ).length;

    const extraVisits = dData.filter(r =>
      r.totalReported > r.totalPlanned
    ).length;

    const targetMetCount = dData.filter(r =>
      r.totalPlanned > 0 &&
      r.totalReported >= 
        (gradeTargets[r.customerGrade] || 0)
    ).length;

    const types = dData.reduce((acc, r) => {
      const t = r.customerType || 'Unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    return {
      rawTotal,
      allCustomers,
      deleted,
      active,
      totalHCP,
      totalPlanned,
      totalReported,
      coverage,
      uncovered,
      fullyCovered,
      partial,
      extraVisits,
      targetMetCount,
      types,
      // keep backward compat:
      totalGross: dData.length,
    };
  }, [rawData, deduplicatedData, gradeTargets]);

  // Export
  const handleExport = () => {
    // Export exactly what user sees:
    // sortedData (filtered + toggled + searched + sorted)
    const dataToExport = sortedData;

    const csvData = dataToExport.map((r, i) => {
      const status = getStatus(r.totalPlanned, r.totalReported);
      let plannedStr = '';
      let reportedStr = '';
      
      if (r.monthlyData) {
        plannedStr = Object.entries(r.monthlyData).map(([m, d]) => `${m}: ${d.planned.join(', ')}`).join(' | ');
        reportedStr = Object.entries(r.monthlyData).map(([m, d]) => `${m}: ${d.reported.join(', ')}`).join(' | ');
      } else {
        plannedStr = r.monthPlanned.join(', ');
        reportedStr = r.monthReported.join(', ');
      }

      return {
        '#': i + 1,
        'Customer ID':   r.customerId,
        'Customer Name': r.customerName,
        'Type':          r.customerType,
        'Grade':         r.customerGrade,
        'Specialty':     r.specialty,
        'MR Name':       r.mrName,
        'Line':          r.lineName,
        'Total Planned': r.totalPlanned,
        'Total Reported':r.totalReported,
        'Coverage %': r.totalPlanned > 0 
          ? (r.totalReported / r.totalPlanned * 100).toFixed(1) + '%' 
          : '0%',
        'Status':        status,
        'Planned Days':  plannedStr,
        'Reported Days': reportedStr,
        'Days Interval': r.daysInterval,
        'Source Months': r.customerMonths ? r.customerMonths.join(', ') : r.sourceMonth,
      };
    });

    const csvContent = Papa.unparse(csvData);
    const blob = new Blob(
      [csvContent], 
      { type: 'text/csv;charset=utf-8;' }
    );
    
    // Filename includes active filters info
    const mrTag = filters.mrName.length > 0 
      ? `_${filters.mrName[0].split(' ')[0]}` 
      : '';
    const toggleTag = quickVisitFilter !== 'all'
      ? `_${quickVisitFilter}`
      : '';
    
    saveAs(
      blob, 
      `Routing_${reportMonth || 'Combined'}_${reportYear}${mrTag}${toggleTag}_${dataToExport.length}records.csv`
    );
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
    <div className="p-3 space-y-1.5 scrollbar-thin h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-2 mb-1">
        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest"
        >
          Reset All
        </button>
      </div>

      {/* ── Grade Targets Section ── */}
      <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <button
          onClick={() => toggleSection('targets')}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> Grade Targets
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections.targets ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.targets && (
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Visits required</span>
              <button
                onClick={() => setIsEditingTargets(!isEditingTargets)}
                className="text-[9px] font-black text-yellow-600 hover:text-yellow-700 uppercase"
              >
                {isEditingTargets ? '✓ Done' : 'Edit'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(gradeTargets).map(([grade, target]) => (
                <div key={grade} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                  <span className="text-xs font-black text-gray-700">{grade}</span>
                  {isEditingTargets ? (
                    <input type="number"
                      min="0" max="10"
                      value={target}
                      onChange={e => setGradeTargets(prev => ({ ...prev, [grade]: parseInt(e.target.value) || 0 }))}
                      className="w-10 h-6 text-center text-xs font-black border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 bg-white" />
                  ) : (
                    <span className="text-xs font-black text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                      {target}x
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Visit Status ── */}
      <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <button
          onClick={() => openSection('visitStatus')}
          className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${filters.visitStatus !== 'All' ? 'bg-yellow-50 border-yellow-100' : 'bg-gray-50 hover:bg-gray-100'}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Visit Status</span>
            {filters.visitStatus !== 'All' && (
              <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 rounded-md">1</span>
            )}
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections.visitStatus ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.visitStatus && (
          <div className="p-2 bg-white border-t border-gray-100 space-y-1">
            {[
              { val: 'All', label: 'All Statuses' },
              { val: 'Fully Covered',     label: '✅ Fully Covered' },
              { val: 'Partially Covered', label: '🟡 Partially Covered' },
              { val: 'Not Visited',       label: '❌ Not Visited' },
              { val: 'Extra Visits',      label: '⭐ Extra Visits' },
              { val: 'Not Planned',       label: '🆕 Not Planned' },
            ].map(opt => (
              <button key={opt.val}
                onClick={() => setFilters(p => ({ ...p, visitStatus: opt.val }))}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filters.visitStatus === opt.val ? 'bg-yellow-400 text-black shadow-sm' : 'hover:bg-gray-50 text-gray-600'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Multi-select sections ── */}
      {[
        { label: 'Medical Reps',  key: 'mrName',       options: filterOptions.mrName, hasSearch: true },
        { label: 'Specialty',     key: 'specialty',    options: filterOptions.specialty },
        { label: 'Grade',         key: 'grade',        options: filterOptions.grade },
        { label: 'Customer Type', key: 'customerType', options: filterOptions.customerType },
        { label: 'Line Name',     key: 'lineName',     options: filterOptions.lineName },
      ].map(section => (
        <div key={section.key} className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Section Header */}
          <button
            onClick={() => openSection(section.key)}
            className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${filters[section.key].length > 0 ? 'bg-yellow-50' : 'bg-gray-50 hover:bg-gray-100'}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{section.label}</span>
              {filters[section.key].length > 0 && (
                <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-md">{filters[section.key].length}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {expandedSections[section.key] && (
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setFilters(p => ({ ...p, [section.key]: [...section.options] }))} className="text-[9px] font-black text-yellow-600 hover:text-yellow-700 uppercase px-1">All</button>
                  <span className="text-gray-200">|</span>
                  <button onClick={() => setFilters(p => ({ ...p, [section.key]: [] }))} className="text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase px-1">None</button>
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedSections[section.key] ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Section Content */}
          {expandedSections[section.key] && (
            <div className="bg-white border-t border-gray-100 p-2">
              {/* Search */}
              {section.hasSearch && (
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={mrSearch}
                    onChange={e => setMrSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-100 text-xs font-bold text-gray-700 bg-gray-50 focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 placeholder:text-gray-300 transition-all"
                  />
                </div>
              )}

              {/* Options List */}
              <div className="space-y-0.5 max-h-44 overflow-y-auto scrollbar-thin pr-1">
                {(section.hasSearch
                  ? section.options.filter(o => o.toLowerCase().includes(mrSearch.toLowerCase()))
                  : section.options
                ).map(opt => (
                  <label key={opt} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all group border ${filters[section.key].includes(opt) ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-gray-50 border-transparent'}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${filters[section.key].includes(opt) ? 'bg-yellow-400 border-yellow-400' : 'border-gray-300 group-hover:border-yellow-300 bg-white shadow-inner'}`}>
                      {filters[section.key].includes(opt) && <CheckCircle2 size={10} className="text-black" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters[section.key].includes(opt)} onChange={() => handleToggleFilter(section.key, opt)} />
                    <span className={`text-xs font-bold flex-1 truncate ${filters[section.key].includes(opt) ? 'text-yellow-800' : 'text-gray-600'}`}>{opt}</span>
                    <span className="text-[9px] text-gray-400 font-bold flex-shrink-0">
                      {rawData.filter(r => r[section.key] === opt).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderKPIs = () => (
    <div className="flex items-stretch gap-2 px-4 py-2 h-[72px]">
      {[
        { label: 'All HCPs',   value: stats.totalHCP,   icon: '👨‍⚕️', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
        { label: 'Active',     value: stats.active,     icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { label: 'Deleted',    value: stats.deleted,    icon: '🗑️', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
        { label: 'Planned',    value: stats.totalPlanned,  icon: '📋', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100' },
        { label: 'Reported',   value: stats.totalReported, icon: '📝', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        { label: 'Coverage',   value: `${stats.coverage.toFixed(1)}%`, icon: '🎯', 
          color: stats.coverage >= 80 ? 'text-emerald-600' : stats.coverage >= 50 ? 'text-amber-500' : 'text-red-500',
          bg: stats.coverage >= 80 ? 'bg-emerald-50' : stats.coverage >= 50 ? 'bg-amber-50' : 'bg-red-50',
          border: stats.coverage >= 80 ? 'border-emerald-100' : stats.coverage >= 50 ? 'border-amber-100' : 'border-red-100' },
        { label: 'Full',       value: stats.fullyCovered,  icon: '💚', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
        { label: 'Partial',    value: stats.partial,    icon: '🟡', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        { label: 'Not Visited',value: stats.uncovered,  icon: '❌', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
      ].map((card, i) => (
        <div key={i} className={`flex-1 ${card.bg} border ${card.border} rounded-xl px-2.5 py-2 flex flex-col justify-between min-w-0 shadow-sm sm:shadow-none transition-shadow hover:shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs leading-none">{card.icon}</span>
          </div>
          <p className={`text-base font-black leading-none ${card.color}`}>
            {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
          </p>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-none truncate">
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

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return (
      <span className="opacity-30 ml-1">⇅</span>
    );
    return (
      <span className="ml-1 text-yellow-400">
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const handleSort = (col) => {
    if (sortKey === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const renderCustomerList = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Toggles + Search bar FIXED ── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-white border-b border-gray-100">
        {/* Toggles */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Toggles</span>
          {[
            { id: 'all',       label: 'All',       count: deduplicatedData.length },
            { id: 'full',      label: '✅ Full',   count: stats.fullyCovered },
            { id: 'partial',   label: '🟡 Partial',count: stats.partial },
            { id: 'uncovered', label: '❌ Uncovered',count: stats.uncovered },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setQuickVisitFilter(opt.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${quickVisitFilter === opt.id ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-200'}`}
            >
              {opt.label}
              <span className={`text-[9px] px-1 py-0.5 rounded font-black ${quickVisitFilter === opt.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Count */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQ}
              onChange={e => {
                setSearchQ(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 w-56 placeholder:text-gray-300 focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 bg-white transition-all"
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-gray-300 hover:text-red-400"/>
              </button>
            )}
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
            Showing <span className="text-gray-900">{sortedData.length}</span> of <span className="text-gray-900">{deduplicatedData.length}</span>
          </span>
        </div>
      </div>

      {/* ── Table Area — ONLY THIS SCROLLS ── */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto scrollbar-thin">
          <table className="w-full text-sm border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('customerId')}>
                  ID <SortIcon col="customerId"/>
                </th>

                {showMonthColumn && (
                  <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('sourceMonth')}>
                    Month <SortIcon col="sourceMonth"/>
                  </th>
                )}

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-gray-800 select-none shadow-sm min-w-[160px]" onClick={() => handleSort('customerName')}>
                  Name <SortIcon col="customerName"/>
                </th>

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('customerGrade')}>
                  Grade <SortIcon col="customerGrade"/>
                </th>

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('specialty')}>
                  Specialty <SortIcon col="specialty"/>
                </th>

                {showMRColumn && (
                  <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('mrName')}>
                    MR Name <SortIcon col="mrName"/>
                  </th>
                )}

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('totalPlanned')}>
                  Planned <SortIcon col="totalPlanned"/>
                </th>

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('totalReported')}>
                  Reported <SortIcon col="totalReported"/>
                </th>

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm">Planned Days</th>
                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px) font-black uppercase tracking-wider whitespace-nowrap shadow-sm">Reported Days</th>

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('daysInterval')}>
                  Interval <SortIcon col="daysInterval"/>
                </th>

                <th className="sticky top-0 z-[3] bg-gray-900 text-white px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-800 select-none shadow-sm" onClick={() => handleSort('_status')}>
                  Status <SortIcon col="_status"/>
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.map((r, i) => {
                const status = getStatus(r.totalPlanned, r.totalReported);
                const missed = r.monthlyData ? [] : r.monthPlanned.filter(d => !r.monthReported.includes(d));

                return (
                  <tr key={`${r.customerId}_${i}`} className={i % 2 === 0 ? 'bg-white hover:bg-yellow-50/40 transition-colors' : 'bg-gray-50/60 hover:bg-yellow-50/40 transition-colors'}>
                    <td className="px-2.5 py-1.5 text-[11px] text-gray-500 border-b border-gray-50 whitespace-nowrap font-mono">{r.customerId}</td>
                    
                    {showMonthColumn && (
                      <td className="px-2.5 py-1.5 border-b border-gray-50">
                        <div className="flex gap-0.5">
                          {(r.customerMonths || [r.sourceMonth]).map(m => (
                            <span key={m} className="px-1.5 py-0.5 rounded text-[9px] font-black bg-yellow-50 text-yellow-700 border border-yellow-200">
                              {m.slice(0,3)}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    <td className="px-2.5 py-1.5 text-[11px] text-gray-800 font-semibold border-b border-gray-50 max-w-[180px] truncate">{r.customerName}</td>

                    <td className="px-2.5 py-1.5 border-b border-gray-50 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border ${
                        r.customerGrade === 'A+' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        r.customerGrade === 'A' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        r.customerGrade === 'B' ? 'bg-green-50 text-green-700 border-green-100' :
                        'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {r.customerGrade}
                      </span>
                    </td>

                    <td className="px-2.5 py-1.5 text-[11px] text-yellow-600 border-b border-gray-50 max-w-[140px] truncate">{r.specialty}</td>

                    {showMRColumn && (
                      <td className="px-2.5 py-1.5 text-[11px] text-gray-600 border-b border-gray-50 max-w-[130px] truncate">{r.mrName}</td>
                    )}

                    <td className="px-2.5 py-1.5 text-[11px] text-gray-700 font-bold border-b border-gray-50 whitespace-nowrap text-center">{r.totalPlanned}</td>
                    <td className="px-2.5 py-1.5 text-[11px] text-gray-700 font-bold border-b border-gray-50 whitespace-nowrap text-center">{r.totalReported}</td>

                    <td className="px-2.5 py-1.5 border-b border-gray-50">
                      {r.monthlyData ? (
                        <div className="space-y-0.5">
                          {Object.entries(r.monthlyData).map(([m, d]) => (
                            <div key={m} className="flex items-center gap-1">
                              <span className="text-[8px] font-black text-gray-400 w-7 flex-shrink-0">{m.slice(0,3)}:</span>
                              <div className="flex flex-wrap gap-0.5">
                                {d.planned.map(day => (
                                  <span key={day} className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">{day}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                          {r.monthPlanned.map(d => (
                            <span key={d} className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">{d}</span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-2.5 py-1.5 border-b border-gray-50">
                      {r.monthlyData ? (
                        <div className="space-y-0.5">
                          {Object.entries(r.monthlyData).map(([m, d]) => {
                            const mMissed = d.planned.filter(dd => ! d.reported.includes(dd));
                            return (
                              <div key={m} className="flex items-center gap-1">
                                <span className="text-[8px] font-black text-gray-400 w-7 flex-shrink-0">{m.slice(0,3)}:</span>
                                <div className="flex flex-wrap gap-0.5">
                                  {d.reported.map(day => (
                                    <span key={day} className="px-1 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-black border border-green-100">{day}</span>
                                  ))}
                                  {mMissed.map(day => (
                                    <span key={`m_${day}`} className="px-1 py-0.5 bg-red-50 text-red-400 rounded text-[9px] font-black border border-red-100 line-through">{day}</span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                          {r.monthReported.map(d => (
                            <span key={d} className="px-1 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-black border border-green-100">{d}</span>
                          ))}
                          {missed.map(d => (
                            <span key={`m_${d}`} className="px-1 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-black border border-red-100 line-through">{d}</span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-2.5 py-1.5 text-[11px] text-gray-500 border-b border-gray-50 whitespace-nowrap text-center">{r.daysInterval}d</td>
                    <td className="px-2.5 py-1.5 border-b border-gray-50 whitespace-nowrap">{getStatusBadge(status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination FIXED ── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2 bg-white border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Show:</span>
          <div className="flex gap-1">
            {[10, 25, 50, 100, 200].map(n => (
              <button key={n}
                onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                className={`w-8 h-6 rounded text-[10px] font-black transition-all border ${itemsPerPage === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-3 h-3"/> Prev
            </button>
            {(() => {
              const pages = [];
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, currentPage + 2);
              if (start > 1) {
                pages.push(<button key={1} onClick={() => setCurrentPage(1)} className="w-7 h-7 rounded-lg text-[10px] font-black bg-white border border-gray-200 text-gray-600">1</button>);
                if (start > 2) pages.push(<span key="e1" className="text-gray-300 text-xs text-center w-4">…</span>);
              }
              for (let i = start; i <= end; i++) {
                pages.push(
                  <button key={i} onClick={() => setCurrentPage(i)} className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${currentPage === i ? 'bg-yellow-400 text-black' : 'bg-white border border-gray-200 text-gray-600'}`}>
                    {i}
                  </button>
                );
              }
              if (end < totalPages) {
                if (end < totalPages - 1) pages.push(<span key="e2" className="text-gray-300 text-xs text-center w-4">…</span>);
                pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="w-7 h-7 rounded-lg text-[10px] font-black bg-white border border-gray-200 text-gray-600">{totalPages}</button>);
              }
              return pages;
            })()}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50">
              Next <ChevronRight className="w-3 h-3"/>
            </button>
          </div>
        )}

        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
          Page <span className="text-gray-900">{currentPage}</span> / <span className="text-gray-900">{totalPages}</span> · <span className="text-gray-900">{sortedData.length}</span> nodes
        </span>
      </div>
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

  const kpiTop = availableMonths.length > 1 ? 'top-[141px]' : 'top-[101px]';
  const tabsTop = availableMonths.length > 1 ? 'top-[225px]' : 'top-[185px]';
  const filterChipsTop = availableMonths.length > 1 ? 'top-[185px]' : 'top-[145px]';

  // Active filter detection
  const hasActiveFilters = useMemo(() => 
    Object.entries(filters).some(([k, v]) =>
      Array.isArray(v) ? v.length > 0 : v !== 'All'
    )
  , [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.entries(filters).forEach(([k, v]) => {
      if (Array.isArray(v)) count += v.length;
      else if (v !== 'All') count += 1;
    });
    return count;
  }, [filters]);

  const showMRColumn = filters.mrName.length !== 1;
  const showMonthColumn = selectedMonth === 'All' && availableMonths.length > 1;

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
    <div className="fixed inset-0 flex bg-gray-50/50 text-gray-900 font-sans overflow-hidden">
      {/* ── Sidebar — Left FIXED ── */}
      {renderSidebar()}

      {/* ── Main Content — Right ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {/* FIXED HEADER SECTION (Header + KPIs + Tabs) */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 z-10 shadow-sm">
          {/* Main Top Header */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">Routing Analyzer</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-yellow-400 text-black uppercase tracking-widest">
                    v{ROUTING_VERSION.version}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Efficiency & Coverage Monitoring System</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {rawData.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-md group"
                >
                  <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                  Export Data
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-black uppercase tracking-widest hover:bg-yellow-500 transition-all shadow-md group"
              >
                <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                Upload Reports
              </button>
            </div>
          </div>

          {/* Month Indicator Bar (If multiple months) */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-3 px-6 py-1.5 bg-gray-50/50 border-y border-gray-100">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reporting Period:</span>
               <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <button 
                    onClick={() => { setSelectedMonth('All'); setCurrentPage(1); }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border ${selectedMonth === 'All' ? 'bg-yellow-400 text-black border-yellow-400 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-200'}`}
                  >
                    ALL MONTHS
                  </button>
                  {availableMonths.map(m => (
                    <button
                      key={m}
                      onClick={() => { setSelectedMonth(m); setCurrentPage(1); }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border ${selectedMonth === m ? 'bg-yellow-400 text-black border-yellow-400 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-200'}`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
               </div>
            </div>
          )}

          {/* KPIs Bar */}
          {rawData.length > 0 && (
            <div className={`sticky ${kpiTop} z-[15] bg-white border-b border-gray-100/80 shadow-sm px-6 py-3`}>
              {renderKPIs()}
            </div>
          )}

          {/* Tabs Bar */}
          <div className="px-4 py-2 bg-white flex items-center justify-between">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {[
                { id: 'overview',  label: 'Overview', icon: LayoutDashboard },
                { id: 'list',      label: 'Customers', icon: Users },
                { id: 'by-mr',     label: 'MR Analysis', icon: UserCircle },
                { id: 'by-spec',   label: 'Specialty', icon: Stethoscope },
                { id: 'map',       label: 'Coverage Map', icon: Calendar },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Scrollable Content Area ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {rawData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-gray-50/30">
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 mb-6 group animate-bounce">
                  <FileText size={40} className="text-yellow-400" />
               </div>
               <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight uppercase">No Data Loaded</h2>
               <p className="text-gray-400 max-w-sm font-bold text-sm leading-relaxed mb-8">
                  Upload your CRM routing report (CSV) to analyze visits, coverage, and MR performance.
               </p>
               <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-yellow-400 text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-yellow-500 transition-all shadow-xl hover:scale-105 active:scale-95"
               >
                  <Plus size={18} />
                  Start Analysis
               </button>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden p-4">
               <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col overflow-hidden"
               >
                  {activeTab === 'overview' && renderOverview()}
                  {activeTab === 'list' && renderCustomerList()}
                  {activeTab === 'by-mr' && renderByMR()}
                  {activeTab === 'by-spec' && renderBySpecialty()}
                  {activeTab === 'map' && renderCoverageMap()}
               </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
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

            <label className="block w-full border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50/30 transition-all group">
              <div className="text-5xl mb-4 grayscale group-hover:grayscale-0 transition-all">📂</div>
              <p className="text-base font-black text-gray-700 group-hover:text-yellow-600 tracking-tight">Click to select CSV file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => handleFileUpload(e, uploadMode)}
              />
            </label>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-100 text-sm font-black text-gray-500 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutingAnalyzer;
