import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, DollarSign, Package, RotateCcw, 
  Grid, Upload, RefreshCw, ChevronLeft, ChevronRight, 
  ChevronDown, Filter, Users, Search, X, 
  Trash2, Save, Edit2, Plus, CheckCircle2, History, Clock,
  Calendar, AlertCircle, Expand, Download,
  Maximize2, Minimize2, Type, ChevronsUpDown, TrendingUp,
  Layout, Activity, Info, Map as MapIcon, Layers
} from 'lucide-react';
import FullscreenWrapper from '../../components/shared/FullscreenWrapper';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
  ComposedChart, Area
} from 'recharts';

import { 
  toNumberSafe, formatKpi, formatKpiGrouped, formatKpiPercent 
} from '../../utils/formatNumber';
import { inferPeriodFromFiles } from '../../utils/inferPeriodFromFilename';
import { FilterButton } from '../../components/ui/FilterButton';
import { 
  saveSession as dbSaveSession, 
  getAllSessions as dbGetAllSessions, 
  deleteSession as dbDeleteSession 
} from '../../utils/indexedDbSessions';

// ── CONSTANTS & STYLES ──
const TABLE_BASE = "w-full table-auto border-collapse text-[11px] md:text-xs text-gray-700 font-sans";
const THEAD_ROW = "text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-500 bg-gray-50";
const TH_BASE = "px-3 py-2 text-left whitespace-normal leading-tight border-b border-gray-200";
const TD_BASE = "px-3 py-2 align-top border-b border-gray-50";
const TD_TEXT = `${TD_BASE} whitespace-normal break-words font-semibold`;
const TD_NUM = `${TD_BASE} whitespace-nowrap tabular-nums font-mono font-bold text-right`;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const COLUMN_MAP = {
  "Product":     "product",
  "Eva Brick":   "evaBrick",
  "DIS Brick":   "disBrick",
  "Client Code": "clientCode",
  "Client Name": "clientName",
  "Dis":         "distributor",
  "Net Sales":   "netSalesQty",
  "Value":       "netSalesValue"
};

  // ── HELPERS ──
  const processInChunks = async (items, chunkSize = 2000, onChunk) => {
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      onChunk(chunk, i + chunk.length);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  };

const useSortableTable = (data, defaultKey, defaultDir = 'desc') => {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey || !data) return data || [];
    return [...(data || [])].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggle = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return { sorted, sortKey, sortDir, toggle };
};

const SortableTH = ({ label, sortKey, currentKey, dir, onSort, className = '' }) => (
  <th
    onClick={() => onSort(sortKey)}
    className={`${TH_BASE} cursor-pointer hover:bg-gray-100 select-none transition-colors ${className}`}
  >
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <span className="text-gray-300">
        {currentKey === sortKey ? (dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </div>
  </th>
);

const KPICard = ({ title, value, subtext, icon: Icon, colorClass = "text-blue-600", onClick, style = {} }) => (
  <div 
    onClick={onClick}
    style={style}
    className={`bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4 ${onClick ? 'cursor-pointer hover:border-violet-300 hover:shadow-md transition-all' : ''}`}
  >
    <div className={`p-2 md:p-3 rounded-xl bg-gray-50 ${colorClass} shrink-0`}>
      <Icon className="w-4 h-4 md:w-6 md:h-6" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{title}</p>
      <h3 className="text-xs md:text-xl font-black text-gray-900 leading-none truncate tracking-tight">{value}</h3>
      {subtext && <p className="text-[8px] md:text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tight truncate">{subtext}</p>}
    </div>
  </div>
);

// ── MAIN TOOL COMPONENT ──
const PerCustomerAnalyzer = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [data, setData] = useState([]);
  const [fileNames, setFileNames] = useState([]);
  const [fileMeta, setFileMeta] = useState({ name: '', reportMonthLabel: 'Unknown Month' });
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ stage: '', rows: 0 });
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepProgress, setPrepProgress] = useState({ stage: '', processed: 0, total: 0 });
  const [prepared, setPrepared] = useState(null);
  const [preparedFiltered, setPreparedFiltered] = useState(null);
  const [prepError, setPrepError] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [lastMergeStats, setLastMergeStats] = useState(null);
  const [filterPresets, setFilterPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadProgress, setLoadProgress] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [productTableQuery, setProductTableQuery] = useState('');
  const [statementSearch, setStatementSearch] = useState('');
  const [statementPage, setStatementPage] = useState(1);
  const [statementPageSize] = useState(25);

  const [statementModal, setStatementModal] = useState({ open: false, title: '', rows: [], loading: false, query: '', page: 1 });
  const [productSummaryModal, setProductSummaryModal] = useState({ open: false, rows: [], totalQty: 0, totalValue: 0, loading: false, query: '', page: 1 });
  const pendingRequests = useRef(new Map());

  const callWorker = (type, payload = {}) => {
    if (!workerRef.current) return Promise.reject("Worker not initialized");
    const requestId = Math.random().toString(36).substring(7);
    return new Promise((resolve, reject) => {
      pendingRequests.current.set(requestId, { resolve, reject });
      workerRef.current.postMessage({ type, requestId, ...payload });
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          reject(new Error(`Worker request ${type} timed out`));
        }
      }, 60000);
    });
  };

  const [duplicatesModal, setDuplicatesModal] = useState({
    open: false,
    rows: [],
    loading: false,
    total: 0,
    stored: 0,
    page: 1,
    query: '',
    sortKey: 'value',
    sortDir: 'desc'
  });

  const fetchDuplicates = async (page = 1, query = '', sortKey = 'value', sortDir = 'desc') => {
    if (!workerRef.current) return;
    setDuplicatesModal(prev => ({ ...prev, loading: true, page, query, sortKey, sortDir }));
    try {
      const response = await callWorker('getDuplicates', { page, pageSize: 50, query, sortBy: sortKey, sortDir });
      setDuplicatesModal(prev => ({ 
        ...prev, 
        rows: response.rows, 
        total: response.total, 
        stored: response.stored,
        loading: false 
      }));
    } catch (err) {
      console.error("Fetch duplicates failed", err);
      setDuplicatesModal(prev => ({ ...prev, loading: false }));
    }
  };
  
  const fetchProductSummary = async (query = '') => {
    if (!workerRef.current) return;
    setProductSummaryModal(prev => ({ ...prev, loading: true, open: true, query }));
    try {
      // Use the same applied filters so we get summary of current result
      await callWorker('getProductsSummary', { filters: appliedFilters });
    } catch (err) {
      console.error("Fetch product summary failed", err);
      setProductSummaryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const workerRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [filterLimits, setFilterLimits] = useState({
    products: 200,
    distributors: 200,
    evaBricks: 200,
    disBricks: 200,
    customers: 200
  });

  const [expandedFilters, setExpandedFilters] = useState({});

  const [filterSearch, setFilterSearch] = useState({
    product: '',
    distributor: '',
    evaBrick: '',
    disBrick: '',
    customer: ''
  });
  
  const [filters, setFilters] = useState({
    products: [],
    evaBricks: [],
    disBricks: [],
    distributors: [],
    customers: [],
    customerCodes: [],
    customerCode: '',
    minValue: '',
    maxValue: '',
    minQty: '',
    maxQty: '',
    arabicOnly: false
  });

  const [appliedFilters, setAppliedFilters] = useState({
    products: [],
    evaBricks: [],
    disBricks: [],
    distributors: [],
    customers: [],
    customerCodes: [],
    customerCode: '',
    minValue: '',
    maxValue: '',
    minQty: '',
    maxQty: '',
    arabicOnly: false
  });

  const [tagsExpanded, setTagsExpanded] = useState(false);

  const activePrepared = preparedFiltered || prepared;
  const isCsvMode = !!prepared;

  // ── FILTER PRESETS ──
  useEffect(() => {
    const saved = localStorage.getItem('perCustomerFilterPresets');
    if (saved) {
      try {
        setFilterPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse filter presets", e);
      }
    }
  }, []);

  const saveFilterPreset = (name) => {
    const newPreset = {
      id: Date.now(),
      name,
      savedAt: Date.now(),
      filters: { ...appliedFilters }
    };
    const updated = [...filterPresets, newPreset];
    setFilterPresets(updated);
    localStorage.setItem('perCustomerFilterPresets', JSON.stringify(updated));
    alert("Filter preset saved!");
  };

  const deletePreset = (id) => {
    const updated = filterPresets.filter(p => p.id !== id);
    setFilterPresets(updated);
    localStorage.setItem('perCustomerFilterPresets', JSON.stringify(updated));
  };

  const loadPreset = (preset) => {
    // Ensure preset uses plain JSON and includes expected keys for robust parsing
    const normalizedFilters = {
       products: preset.filters.products || [],
       evaBricks: preset.filters.evaBricks || [],
       disBricks: preset.filters.disBricks || [],
       distributors: preset.filters.distributors || [],
       customers: preset.filters.customers || [],
       customerCodes: preset.filters.customerCodes || [],
       customerCode: preset.filters.customerCode || '',
       minValue: preset.filters.minValue || '',
       maxValue: preset.filters.maxValue || '',
       arabicOnly: !!preset.filters.arabicOnly
    };

    setFilters(normalizedFilters);
    setAppliedFilters(normalizedFilters);
    
    // Auto-apply if in CSV mode
    if (isCsvMode) {
      setIsFiltering(true);
      callWorker('applyFilters', { filters: normalizedFilters });
      setIsSidebarOpen(false);
      setPage(1);
    }
  };

  const reportMonthLabel = useMemo(() => {
    if (activePrepared?.period?.label) return activePrepared.period.label;
    if (fileNames.length > 0) {
      const inferred = inferPeriodFromFiles(fileNames);
      if (inferred) return inferred.label;
    }
    return fileMeta.reportMonthLabel || 'UNKNOWN PERIOD';
  }, [activePrepared, fileNames, fileMeta.reportMonthLabel]);

  // 1) File Handling
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const initWorker = () => {
    if (workerRef.current) return workerRef.current;
    
    const worker = new Worker(new URL('../../workers/perCustomerWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, requestId, stage, processed, total, payload, message, mergeStats, period, snapshot, snapshotData } = e.data;
      
      // Handle Request/Response correlation
      if (requestId && pendingRequests.current.has(requestId)) {
        if (type === 'progress') {
          // Progress updates don't resolve the promise, just update UI
          setPrepProgress({ stage, processed, total });
          return;
        }
        
        const { resolve, reject } = pendingRequests.current.get(requestId);
        if (type === 'error') {
          reject(new Error(message));
          setPrepError(message);
          setIsPreparing(false);
          setIsFiltering(false);
        } else {
          resolve(payload || snapshot || e.data);
        }
        pendingRequests.current.delete(requestId);
        
        // If it's a final state, we might still want to update standard states
        if (type === 'done' || type === 'filtered') {
          updatePreparedState(type, payload, period, mergeStats);
        } else if (type === 'statement') {
          setStatementModal(prev => ({ ...prev, rows: payload.rows, title: payload.title, loading: false }));
        } else if (type === 'productsSummary') {
          setProductSummaryModal(prev => ({ 
            ...prev, 
            rows: payload.rows, 
            totalQty: payload.totalQty, 
            totalValue: payload.totalValue,
            loading: false 
          }));
        } else if (type === 'duplicates') {
          // Handled by resolve
        } else if (type === 'snapshot') {
          handleFinalizeSave(snapshot);
        }
        return;
      }

      // Fallback for non-requestId messages (streams/errors)
      if (type === 'progress') {
        setPrepProgress({ stage, processed, total });
      } else if (type === 'done' || type === 'filtered') {
        updatePreparedState(type, payload, period, mergeStats);
      } else if (type === 'statement') {
        setStatementModal(prev => ({ ...prev, rows: payload.rows, title: payload.title, loading: false }));
      } else if (type === 'productsSummary') {
        setProductSummaryModal(prev => ({ 
          ...prev, 
          rows: payload.rows, 
          totalQty: payload.totalQty, 
          totalValue: payload.totalValue,
          loading: false 
        }));
      } else if (type === 'duplicates') {
        setDuplicatesModal(prev => ({ 
          ...prev, 
          rows: payload.rows, 
          total: payload.total, 
          stored: payload.stored,
          loading: false 
        }));
      } else if (type === 'snapshot') {
        handleFinalizeSave(snapshot);
      } else if (type === 'error') {
        setPrepError(message);
        setIsPreparing(false);
        setIsFiltering(false);
      }
    };
    workerRef.current = worker;
    return worker;
  };

  const updatePreparedState = (type, payload, period, mergeStats) => {
    if (type === 'done') {
      setPrepared(payload);
      setPreparedFiltered(null); 
      setIsPreparing(false);
      if (period) {
        setFileMeta(prev => ({ ...prev, reportMonthLabel: period.label }));
        // Ensure prepared object has period for fallback
        payload.period = period;
      }
      if (mergeStats) setLastMergeStats(mergeStats);
      setFilterSearch({ product: '', distributor: '', evaBrick: '', disBrick: '', customer: '' });
    } else if (type === 'filtered') {
      setPreparedFiltered(payload);
      if (period) {
        setFileMeta(prev => ({ ...prev, reportMonthLabel: period.label }));
      }
      setIsFiltering(false);
    }
  };

  const handleUpload = async (file, isMerge = false) => {
    if (!file) return;
    
    if (!isMerge) {
      setPrepared(null);
      setPreparedFiltered(null);
      setData([]); 
      setFileNames([file.name]);
      setPrepError('');
      setSelectedCustomer(null);
      setFilters({
        products: [],
        evaBricks: [],
        disBricks: [],
        distributors: [],
        customers: [],
        customerCodes: [],
        customerCode: '',
        minValue: '',
        maxValue: '',
        minQty: '',
        maxQty: '',
        arabicOnly: false
      });
      setPage(1);
    }

    if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
      setIsPreparing(true);
      setPrepProgress({ stage: 'Reading file...', processed: 0, total: 0 });
      
      try {
        const csvText = await file.text();
        const worker = initWorker();

        // Detect month from filename (Fallback handled by reportMonthLabel memo now)
        setFileNames(prev => isMerge ? [...prev, file.name] : [file.name]);
        
        const lowerName = file.name.toLowerCase();
        const nameKeywords = [
          'January', 'February', 'March', 'April', 'May', 'June', 
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const foundMonthName = nameKeywords.find(m => lowerName.includes(m.toLowerCase()));
        let initialMonthKey = "Unknown Month";
        if (foundMonthName) {
          const yearMatch = file.name.match(/\d{4}/);
          initialMonthKey = `${foundMonthName} ${yearMatch ? yearMatch[0] : ''}`;
        }

        worker.postMessage({ 
          type: isMerge ? 'merge' : 'prepare', 
          csvText,
          fileMonthKey: initialMonthKey,
          sourceFileName: file.name
        });
      } catch (err) {
        console.error("Worker process failed", err);
        setPrepError("Failed to process data.");
        setIsPreparing(false);
      }
      return;
    }

    // Legacy parser for XLSX or if CSV worker fails (fallback)
    setParsing(true);
    setParseProgress({ stage: 'Reading file...', rows: 0 });

    try {
      const dataBuffer = await file.arrayBuffer();
      setParseProgress({ stage: 'Parsing workbook...', rows: 0 });
      
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      let sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('percustomer')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(ws);
      
      setParseProgress({ stage: 'Normalizing rows...', rows: 0 });
      let rowBuffer = [];
      
      await processInChunks(rawJson, 5000, (chunk, processed) => {
        const normalizedChunk = chunk.map((row, idx) => {
          const entry = {};
          Object.entries(COLUMN_MAP).forEach(([header, internal]) => {
            let value = row[header];
            if (internal === 'netSalesQty' || internal === 'netSalesValue') {
              if (typeof value === 'string') {
                value = parseFloat(value.replace(/,/g, '')) || 0;
              } else {
                value = toNumberSafe(value);
              }
            }
            if (internal === 'clientCode') {
              value = String(value || '');
            }
            entry[internal] = value;
          });
          entry.__rowId = `row-${idx}-${Date.now()}`;
          return entry;
        }).filter(r => 
          r.clientName && 
          r.clientName.toString().toLowerCase() !== 'total' && 
          r.product && 
          r.product.toString().toLowerCase() !== 'total'
        );
        
        rowBuffer.push(...normalizedChunk);
        setParseProgress({ stage: 'Normalizing rows...', rows: processed });
      });

      setParseProgress({ stage: 'Computing aggregates...', rows: rowBuffer.length });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setData(rowBuffer);
      
      // Month Detection
      let detectedMonth = "Unknown Month";
      const nameKeywords = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const lowerName = file.name.toLowerCase();
      const foundMonth = nameKeywords.find(m => lowerName.includes(m.toLowerCase()));
      if (foundMonth) {
        const yearMatch = file.name.match(/\d{4}/);
        detectedMonth = `${foundMonth} ${yearMatch ? yearMatch[0] : ''}`;
      }
      
      setFileMeta({ name: file.name, reportMonthLabel: detectedMonth });
    } catch (err) {
      console.error("Parsing failed", err);
      alert("Failed to parse file. Check console for details.");
    } finally {
      setParsing(false);
      setParseProgress({ stage: '', rows: 0 });
    }
  };

  const applyFilters = () => {
    if (workerRef.current && isCsvMode) {
      setIsFiltering(true);
      setAppliedFilters(filters);
      callWorker('applyFilters', { filters });
      setIsSidebarOpen(false);
      setPage(1);
    }
  };

  const removeFilterTag = (tag) => {
    const keyMap = {
      'Product': 'products',
      'EVA': 'evaBricks',
      'DIS': 'disBricks',
      'Distributor': 'distributors',
      'Customer': 'customers'
    };
    
    setAppliedFilters(prev => {
      let updatedApplied = { ...prev };
      
      if (tag.type === 'Range') {
        if (tag.label.startsWith('Min:')) updatedApplied.minValue = '';
        else updatedApplied.maxValue = '';
      } else if (tag.type === 'Misc') {
        updatedApplied.arabicOnly = false;
      } else {
        const key = keyMap[tag.type];
        if (key) {
          updatedApplied[key] = (prev[key] || []).filter(v => v !== tag.value);
          // Sync customerCodes if deleting a customer tag
          if (key === 'customers' && prev.customerCodes) {
             // This is tricky because we don't have the code in the tag easily
             // But we can find it from filterOptions
             const opt = (filterOptions.customers || []).find(c => c.clientName === tag.value);
             if (opt) {
                updatedApplied.customerCodes = (prev.customerCodes || []).filter(c => c !== opt.clientCode);
             }
          }
        }
      }

      // Sync with draft filters too so modal is consistent
      setFilters(updatedApplied);
      
      // Trigger worker
      if (workerRef.current && isCsvMode) {
        setIsFiltering(true);
        callWorker('applyFilters', { filters: updatedApplied });
      }
      
      return updatedApplied;
    });
  };

  const filterTags = useMemo(() => {
    const tags = [];
    const mk = (type, val) => ({ type, value: val, label: `${type}: ${val}` });
    
    (appliedFilters.products || []).forEach(v => tags.push(mk('Product', v)));
    (appliedFilters.distributors || []).forEach(v => tags.push(mk('Distributor', v)));
    (appliedFilters.evaBricks || []).forEach(v => tags.push(mk('EVA', v)));
    (appliedFilters.disBricks || []).forEach(v => tags.push(mk('DIS', v)));
    (appliedFilters.customers || []).forEach(v => tags.push(mk('Customer', v)));
    
    if (appliedFilters.minValue) tags.push({ type: 'Range', label: `Min: ${appliedFilters.minValue}`, value: appliedFilters.minValue, isRange: true });
    if (appliedFilters.maxValue) tags.push({ type: 'Range', label: `Max: ${appliedFilters.maxValue}`, value: appliedFilters.maxValue, isRange: true });
    if (appliedFilters.arabicOnly) tags.push({ type: 'Misc', label: `Arabic Only`, isRange: true });

    return tags;
  }, [appliedFilters]);

    const filterOptions = useMemo(() => {
    if (prepared) return prepared.filterOptions;
    if (!data.length) return { products: [], evaBricks: [], disBricks: [], distributors: [], customers: [] };

    // Group customers by a unique key to match worker logic and avoid duplicates
    const customersMap = new Map();
    data.forEach(d => {
      const cKey = d.clientCode && d.clientCode !== 'N/A' ? d.clientCode : d.clientName;
      if (!customersMap.has(cKey)) {
        customersMap.set(cKey, { clientCode: d.clientCode || 'N/A', clientName: d.clientName });
      }
    });

    return {
      products: [...new Set(data.map(d => d.product))].filter(Boolean).sort(),
      evaBricks: [...new Set(data.map(d => d.evaBrick))].filter(Boolean).sort(),
      disBricks: [...new Set(data.map(d => d.disBrick))].filter(Boolean).sort(),
      distributors: [...new Set(data.map(d => d.distributor))].filter(Boolean).sort(),
      customers: Array.from(customersMap.values()).sort((a,b) => a.clientName.localeCompare(b.clientName))
    };
  }, [data, prepared]);

  const searchedOptions = useMemo(() => {
    const filterBySearch = (list, search) => {
      const q = (search || '').trim().toLowerCase();
      if (!q) return list;
      return list.filter(item => String(item).toLowerCase().includes(q));
    };

    const filterBySearchCustomers = (list, search) => {
      const q = (search || '').trim().toLowerCase();
      if (!q) return list;
      return list.filter(item => 
        String(item.clientName || '').toLowerCase().includes(q) ||
        String(item.clientCode || '').toLowerCase().includes(q)
      );
    };

    return {
      products: filterBySearch((filterOptions || {}).products || [], filterSearch.product),
      distributors: filterBySearch((filterOptions || {}).distributors || [], filterSearch.distributor),
      evaBricks: filterBySearch((filterOptions || {}).evaBricks || [], filterSearch.evaBrick),
      disBricks: filterBySearch((filterOptions || {}).disBricks || [], filterSearch.disBrick),
      customers: filterBySearchCustomers((filterOptions || {}).customers || [], filterSearch.customer)
    };
  }, [filterOptions, filterSearch]);

  const filteredRows = useMemo(() => {
    let res = data || [];
    if ((filters.products || []).length) res = res.filter(r => filters.products.includes(r.product));
    if ((filters.evaBricks || []).length) res = res.filter(r => filters.evaBricks.includes(r.evaBrick));
    if ((filters.disBricks || []).length) res = res.filter(r => filters.disBricks.includes(r.disBrick));
    if ((filters.distributors || []).length) res = res.filter(r => filters.distributors.includes(r.distributor));
    if ((filters.customers || []).length) res = res.filter(r => filters.customers.includes(r.clientName));
    if (filters.customerCode) res = res.filter(r => r.clientCode && r.clientCode.includes(filters.customerCode));
    if (filters.minValue) res = res.filter(r => r.netSalesValue >= parseFloat(filters.minValue));
    if (filters.maxValue) res = res.filter(r => r.netSalesValue <= parseFloat(filters.maxValue));
    if (filters.arabicOnly) {
      const arabicPattern = /[\u0600-\u06FF]/;
      res = res.filter(r => arabicPattern.test(r.clientName));
    }
    return res;
  }, [data, filters]);

  const kpis = useMemo(() => {
    if (activePrepared && activePrepared.globalTotals) {
      return {
        ...activePrepared.globalTotals,
        avgPerCust: activePrepared.globalTotals.customerCount > 0 ? activePrepared.globalTotals.totalValue / activePrepared.globalTotals.customerCount : 0,
        avgQtyPerCust: activePrepared.globalTotals.customerCount > 0 ? activePrepared.globalTotals.totalQty / activePrepared.globalTotals.customerCount : 0,
        uniqueCust: activePrepared.globalTotals.customerCount,
        uniqueProd: activePrepared.globalTotals.productCount
      };
    }
    const safeRows = filteredRows || [];
    const totalValue = safeRows.reduce((acc, r) => acc + (r.netSalesValue || 0), 0);
    const totalQty = safeRows.reduce((acc, r) => acc + (r.netSalesQty || 0), 0);
    const uniqueCust = new Set(safeRows.map(r => r.clientCode)).size;
    const uniqueProd = new Set(safeRows.map(r => r.product)).size;
    return {
      totalValue,
      totalQty,
      uniqueCust,
      uniqueProd,
      avgPerCust: uniqueCust > 0 ? totalValue / uniqueCust : 0,
      avgQtyPerCust: uniqueCust > 0 ? totalQty / uniqueCust : 0
    };
  }, [filteredRows, activePrepared]);

  const aggregates = useMemo(() => {
    if (activePrepared) {
      const customers = activePrepared.customers || [];
      const totalValForPct = customers.reduce((acc, c) => acc + (c.totalValue || 0), 0);
      return {
        customers: customers.map(c => ({...c, pct: totalValForPct > 0 ? (c.totalValue / totalValForPct) * 100 : 0})),
        products: activePrepared.products || [],
        productDistributors: activePrepared.productDistributors || [],
        distributors: activePrepared.distributors || [],
        evaBricks: activePrepared.evaBricks || [],
        disBricks: activePrepared.disBricks || []
      };
    }
    const byCust = {};
    const byProd = {};
    const byDis = {};
    const byEva = {};
    const byDisBrick = {};

    (filteredRows || []).forEach(r => {
      if (!r) return;
      // By Customer
      const cKey = r.clientCode || 'N/A';
      if (!byCust[cKey]) {
        byCust[cKey] = { 
          clientCode: cKey, 
          clientName: r.clientName || 'Unknown', 
          distributor: r.distributor,
          evaBrick: r.evaBrick,
          disBrick: r.disBrick,
          totalQty: 0, 
          totalValue: 0, 
          products: new Set() 
        };
      }
      byCust[cKey].totalQty += (r.netSalesQty || 0);
      byCust[cKey].totalValue += (r.netSalesValue || 0);
      byCust[cKey].products.add(r.product);

      // By Product (and implied ProductDistributors for legacy fallback)
      if (!byProd[r.product]) {
        byProd[r.product] = { product: r.product, totalQty: 0, totalValue: 0, customers: new Set() };
      }
      byProd[r.product].totalQty += r.netSalesQty;
      byProd[r.product].totalValue += r.netSalesValue;
      byProd[r.product].customers.add(r.clientCode);

      // By Distributor
      if (!byDis[r.distributor]) {
        byDis[r.distributor] = { distributor: r.distributor, totalQty: 0, totalValue: 0, customers: new Set(), products: new Set() };
      }
      byDis[r.distributor].totalQty += r.netSalesQty;
      byDis[r.distributor].totalValue += r.netSalesValue;
      byDis[r.distributor].customers.add(r.clientCode);
      byDis[r.distributor].products.add(r.product);

      // By Eva Brick
      if (!byEva[r.evaBrick]) {
        byEva[r.evaBrick] = { evaBrick: r.evaBrick, totalQty: 0, totalValue: 0, customers: new Set(), products: new Set() };
      }
      byEva[r.evaBrick].totalQty += r.netSalesQty;
      byEva[r.evaBrick].totalValue += r.netSalesValue;
      byEva[r.evaBrick].customers.add(r.clientCode);
      byEva[r.evaBrick].products.add(r.product);

      // By DIS Brick
      if (!byDisBrick[r.disBrick]) {
        byDisBrick[r.disBrick] = { disBrick: r.disBrick, totalQty: 0, totalValue: 0, customers: new Set(), products: new Set() };
      }
      byDisBrick[r.disBrick].totalQty += r.netSalesQty;
      byDisBrick[r.disBrick].totalValue += r.netSalesValue;
      byDisBrick[r.disBrick].customers.add(r.clientCode);
      byDisBrick[r.disBrick].products.add(r.product);
    });

    const custArray = Object.values(byCust).map(c => ({...c, productCount: c.products.size, pct: kpis.totalValue > 0 ? (c.totalValue / kpis.totalValue) * 100 : 0 }));
    const prodArray = Object.values(byProd).map(p => ({...p, customerCount: p.customers.size, avgValue: p.customers.size > 0 ? p.totalValue / p.customers.size : 0 }));

    return {
      customers: custArray,
      products: prodArray,
      productDistributors: [], // Legacy fallback doesn't easily support PD without more logic
      distributors: Object.values(byDis).map(d => ({...d, customerCount: d.customers.size, productCount: d.products.size})),
      evaBricks: Object.values(byEva).map(e => ({...e, customerCount: e.customers.size, productCount: e.products.size})),
      disBricks: Object.values(byDisBrick).map(b => ({...b, customerCount: b.customers.size, productCount: b.products.size}))
    };
  }, [filteredRows, kpis.totalValue, activePrepared]);

  const dataTags = useMemo(() => {
    if (!data || !data.length) return [];
    const tags = [];
    
    const topProd = (aggregates.products || []).sort((a,b) => b.totalValue - a.totalValue).slice(0, 3);
    topProd.forEach(p => tags.push({ label: `Top: ${p.product}`, onClick: () => setFilters(f => ({...f, products: [p.product]})) }));

    const topEva = (aggregates.evaBricks || []).sort((a,b) => b.totalValue - a.totalValue).slice(0, 1);
    topEva.forEach(e => tags.push({ label: `Eva: ${e.evaBrick}`, onClick: () => setFilters(f => ({...f, evaBricks: [e.evaBrick]})) }));

    tags.push({ label: `${kpis.uniqueCust} Customers`, type: 'info' });
    tags.push({ label: `${kpis.uniqueProd} Products`, type: 'info' });

    return tags;
  }, [data, aggregates, kpis]);

  const { sorted: sortedCust, sortKey: custSortKey, sortDir: custSortDir, toggle: custToggle } = useSortableTable(aggregates.customers, 'totalValue', 'desc');
  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) return sortedCust;
    return sortedCust.filter(c => {
      const name = (c.clientName || '').toString().toLowerCase();
      const code = (c.clientCode || '').toString();
      return name.includes(search) || code.includes(search);
    });
  }, [sortedCust, customerSearch]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredCustomers.slice(start, end);
  }, [filteredCustomers, page, pageSize]);

  const statementRows = useMemo(() => {
    if (!selectedCustomer || !activePrepared) return [];
    const cKey = selectedCustomer.clientCode !== 'N/A' ? selectedCustomer.clientCode : selectedCustomer.clientName;
    const raw = activePrepared.customerDetails[cKey] || [];
    
    // Filtering
    const search = statementSearch.trim().toLowerCase();
    if (!search) return raw;
    return raw.filter(r => 
      String(r.product).toLowerCase().includes(search) ||
      String(r.distributor).toLowerCase().includes(search) ||
      String(r.monthKey).toLowerCase().includes(search)
    );
  }, [selectedCustomer, activePrepared, statementSearch]);

  const paginatedStatement = useMemo(() => {
    const start = (statementPage - 1) * statementPageSize;
    return statementRows.slice(start, start + statementPageSize);
  }, [statementRows, statementPage, statementPageSize]);

  const { sorted: sortedProd, sortKey: prodSortKey, sortDir: prodSortDir, toggle: prodToggle } = useSortableTable(
    useMemo(() => {
      let base = aggregates.productDistributors || [];
      if (!base.length && aggregates.products.length) {
        base = aggregates.products.map(p => ({ ...p, distributor: '-' }));
      }
      
      if (!productTableQuery.trim()) return base;
      const q = productTableQuery.toLowerCase();
      return base.filter(p => 
        p.product.toLowerCase().includes(q) || 
        (p.distributor || '').toLowerCase().includes(q)
      );
    }, [aggregates.productDistributors, aggregates.products, productTableQuery]), 
    'totalValue', 
    'desc'
  );

  const { sorted: sortedStatement, sortKey: stSortKey, sortDir: stSortDir, toggle: stToggle } = useSortableTable(statementRows, 'value', 'desc');
  
  const { sorted: sortedDist, sortKey: distSortKey, sortDir: distSortDir, toggle: distToggle } = useSortableTable(aggregates.distributors, 'totalValue', 'desc');
  const { sorted: sortedEva, sortKey: evaSortKey, sortDir: evaSortDir, toggle: evaToggle } = useSortableTable(aggregates.evaBricks, 'totalValue', 'desc');
  const { sorted: sortedDis, sortKey: disSortKey, sortDir: disSortDir, toggle: disToggle } = useSortableTable(aggregates.disBricks, 'totalValue', 'desc');
  
  const { sorted: sortedProdSumm, sortKey: psummSortKey, sortDir: psummSortDir, toggle: psummToggle } = useSortableTable(productSummaryModal.rows, 'value', 'desc');

  const handleDrillDown = (scope, key) => {
    if (!workerRef.current) return;
    setStatementModal({ open: true, title: `Loading ${key}...`, rows: [], loading: true, query: '', page: 1 });
    callWorker('getStatement', { scope, key, filters });
  };

  const drillDownRows = useMemo(() => {
    if (!statementModal.rows) return [];
    const q = statementModal.query.trim().toLowerCase();
    if (!q) return statementModal.rows;
    return statementModal.rows.filter(r => 
      String(r.product || '').toLowerCase().includes(q) ||
      String(r.distributor || '').toLowerCase().includes(q) ||
      String(r.clientName || '').toLowerCase().includes(q) ||
      String(r.clientCode || '').toLowerCase().includes(q) ||
      String(r.monthKey || '').toLowerCase().includes(q) ||
      String(r.qty || '').includes(q) ||
      String(r.value || '').includes(q)
    );
  }, [statementModal.rows, statementModal.query]);

  const { sorted: sortedDrillDown, sortKey: drillSortKey, sortDir: drillSortDir, toggle: drillToggle } = useSortableTable(drillDownRows, 'value', 'desc');

  const paginatedDrillDown = useMemo(() => {
    const start = (statementModal.page - 1) * 50;
    return sortedDrillDown.slice(start, start + 50);
  }, [sortedDrillDown, statementModal.page]);

  // ── SESSIONS ──
  const refreshSessions = async () => {
    try {
      const sessions = await dbGetAllSessions();
      setSavedSessions(sessions);
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  };

  const onOpenLoadModal = () => {
    refreshSessions();
    setIsSessionModalOpen(true);
  };

  const handleSaveTrigger = () => {
    if (!workerRef.current || !prepared) return;
    const name = prompt("Enter session name:", `Session - ${new Date().toLocaleDateString()}`);
    if (!name) return;
    
    setIsSaving(true);
    window.__pendingSessionName = name; 
    callWorker('getSnapshot');
  };

  const handleFinalizeSave = async (snapshot) => {
    try {
      const name = window.__pendingSessionName || "Untitled Session";
      const sessionData = {
        id: `session-${Date.now()}`,
        name,
        createdAt: Date.now(),
        period: activePrepared?.period || { label: reportMonthLabel },
        rowCount: activePrepared?.globalTotals?.totalAdded || aggregates.customers.length,
        fileMeta: { name: fileMeta.name, label: reportMonthLabel },
        fileNames,
        mergeStats: lastMergeStats,
        snapshot,
        filters,
        uiState: { activeTab }
      };

      await dbSaveSession(sessionData);
      alert("Session saved successfully!");
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save session.");
    } finally {
      setIsSaving(false);
      delete window.__pendingSessionName;
    }
  };

  const handleLoadSession = async (session) => {
    setIsSessionModalOpen(false);
    setIsPreparing(true);
    setPrepProgress({ stage: 'Restoring session...', processed: 0, total: 0 });

    try {
      initWorker();
      setFilters(session.filters || filters);
      setAppliedFilters(session.filters || filters);
      setActiveTab(session.uiState?.activeTab || 'overview');
      setFileNames(session.fileNames || (session.fileMeta?.name ? [session.fileMeta.name] : []));
      setFileMeta(session.fileMeta || { name: 'Restored', reportMonthLabel: 'Unknown' });
      setLastMergeStats(session.mergeStats || null);

      callWorker('restoreSnapshot', { snapshot: session.snapshot });
    } catch (err) {
      console.error("Load failed", err);
      setIsPreparing(false);
      alert("Failed to restore session.");
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      await dbDeleteSession(id);
      refreshSessions();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Exports
  const exportToCSV = (tableData, filename) => {
    if (!tableData.length) return;
    const headers = Object.keys(tableData[0]).filter(k => k !== 'products' && k !== 'customers' && k !== '__rowId');
    const csvContent = [
      headers.join(','),
      ...tableData.map(row => headers.map(h => {
        let val = row[h];
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isPreparing || parsing) {
    const stage = isPreparing ? prepProgress.stage : parseProgress.stage;
    const processed = isPreparing ? prepProgress.processed : parseProgress.rows;
    const total = isPreparing ? prepProgress.total : 0;
    const isWorker = isPreparing;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 min-h-[calc(100vh-104px)]">
        <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-xl border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-6">
            <RefreshCw size={40} className="animate-spin" />
          </div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
            {isWorker ? 'Preparing Data' : 'Analyzing Large Dataset'}
          </h2>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
             <div 
              className="h-full bg-violet-600 transition-all duration-300" 
              style={{ width: isWorker ? (total > 0 ? (processed/total)*100 : 30) + '%' : (parseProgress.stage === 'Normalizing rows...' ? '60%' : '30%') }}
            />
          </div>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-1">{stage}</p>
          {processed > 0 && (
            <p className="text-violet-600 font-black text-lg tabular-nums">
              {formatKpiGrouped(processed)} {total > 0 && <span className="text-gray-300 mx-1">/</span>} {total > 0 ? formatKpiGrouped(total) : ''} <span className="text-gray-400 text-xs font-bold uppercase">Rows</span>
            </p>
          )}
          {prepError && <p className="text-red-500 text-xs mt-4 font-bold">{prepError}</p>}
          <p className="text-xs text-gray-400 mt-4 italic">Please don't close this tab while we prepare your dashboard.</p>
        </div>
      </div>
    );
  }

  if (!prepared && !data.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 min-h-[calc(100vh-104px)]">
        <div className="w-full max-w-xl bg-white rounded-3xl p-12 shadow-card border border-gray-100 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-6">
            <Upload size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">
            Per Customer Analyzer
          </h2>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Upload your customer-level sales report to begin. <br/>
            Supported formats: .xlsx, .csv
          </p>
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            accept=".xlsx, .csv, .tsv" 
            onChange={e => handleUpload(e.target.files[0])} 
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button 
              onClick={() => document.getElementById('file-upload').click()}
              className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Upload size={20} />
              Choose File
            </button>
            <button 
              onClick={onOpenLoadModal}
              className="flex-1 py-4 bg-white text-violet-600 border-2 border-violet-100 rounded-2xl font-black uppercase tracking-widest hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
            >
              <History size={20} />
              Load Session
            </button>
          </div>
          <div className="mt-6 flex gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <span>Product</span> • <span>Eva Brick</span> • <span>Client Code</span> • <span>Net Sales</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FullscreenWrapper isFullscreen={fullscreen} setIsFullscreen={setFullscreen}>
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative h-full">
        
        {/* HEADER */}
        <div className="md:h-14 bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-tight">Per Customer Analyzer</h2>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-violet-600 font-bold uppercase tracking-widest">{reportMonthLabel}</p>
                {preparedFiltered && (
                  <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black uppercase">Filtered</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCsvMode && (
              <>
                <input 
                  type="file" 
                  id="merge-upload" 
                  className="hidden" 
                  accept=".csv, .tsv" 
                  onChange={e => handleUpload(e.target.files[0], true)} 
                />
                <button 
                  onClick={() => document.getElementById('merge-upload').click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-600 text-[10px] font-black uppercase tracking-tighter hover:bg-violet-600 hover:text-white transition-all shadow-sm group">
                  <Plus size={14} className="group-hover:scale-110 transition-transform" /> Add
                </button>
                <button 
                  onClick={handleSaveTrigger}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
              </>
            )}
            <button 
              onClick={onOpenLoadModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all shadow-sm text-center">
              <History size={14} /> Load
            </button>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-tighter hover:bg-violet-600 hover:text-white transition-all">
              <Filter size={14} /> Filters
            </button>
            <div className="flex items-center gap-1 ml-auto md:ml-0">
              <button 
                onClick={() => setFullscreen(!fullscreen)}
                className="p-2 text-gray-400 hover:text-violet-600 transition-colors">
                {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button 
                onClick={() => setData([])}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* DATA TAGS */}
        <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 shrink-0">Data Tags:</span>
          {dataTags.map((tag, i) => (
            <button
              key={i}
              onClick={tag.onClick}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0
                ${tag.type === 'info' ? 'bg-gray-100 text-gray-600' : 'bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white'}
              `}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          
          {/* MERGE STATS BANNER */}
          {lastMergeStats && (
            <div className="bg-violet-600 text-white p-4 md:p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between shadow-xl animate-in slide-in-from-top duration-500 gap-4 relative">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-xl shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Merge Statistics</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
                      <p className="text-[10px] font-bold opacity-90 uppercase">
                        Added: <span className="font-black underline">{formatKpiGrouped(lastMergeStats.added)}</span> rows
                      </p>
                      <p className="text-[10px] font-bold opacity-90 uppercase">
                        Detected: <span className="font-black underline">{formatKpiGrouped(lastMergeStats.duplicatesDetected)}</span> dups
                      </p>
                      <p className="text-[10px] font-bold opacity-90 uppercase">
                        Total: <span className="font-black underline">{formatKpiGrouped(lastMergeStats.total)}</span> rows
                      </p>
                    </div>
                  </div>
                </div>
                {lastMergeStats.duplicatesDetected > 0 && (
                  <button 
                    onClick={() => {
                      setDuplicatesModal(prev => ({ ...prev, open: true }));
                      fetchDuplicates(1, '');
                    }}
                    className="w-full md:w-auto px-4 py-2.5 md:py-2 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={14} /> View Duplicates ({lastMergeStats.duplicatesDetected})
                  </button>
                )}
              </div>
              <button 
                onClick={() => setLastMergeStats(null)} 
                className="absolute top-4 right-4 md:relative md:top-auto md:right-auto p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* APPLIED FILTER TAGS */}
          {filterTags.length > 0 && (
            <div className={`bg-gray-50 border border-gray-100 rounded-3xl p-3 flex flex-wrap gap-2 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${tagsExpanded ? '' : 'max-h-[120px] overflow-hidden'}`}>
                {(tagsExpanded ? filterTags : filterTags.slice(0, isMobile ? 3 : 8)).map((tag, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-violet-100 text-violet-700 rounded-xl shadow-sm group hover:border-violet-300 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-tight">{tag.label}</span>
                    <button 
                      onClick={() => removeFilterTag(tag)}
                      className="p-0.5 hover:bg-violet-100 rounded-md transition-colors text-violet-400 hover:text-violet-700"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                
                {filterTags.length > (isMobile ? 3 : 8) && (
                  <button 
                    onClick={() => setTagsExpanded(!tagsExpanded)}
                    className="px-3 py-1.5 bg-white border border-violet-200 text-violet-600 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-violet-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    {tagsExpanded ? (
                      <>Collapse <ChevronDown size={12} className="rotate-180" /></>
                    ) : (
                      <>+{filterTags.length - (isMobile ? 3 : 8)} more <ChevronDown size={12} /></>
                    )}
                  </button>
                )}
            </div>
          )}

          {/* KPI TIER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard 
              title="Total Net Sales (Qty)" 
              value={formatKpiGrouped(kpis.totalQty)} 
              icon={Package} 
              subtext={appliedFilters.products.length > 1 ? `Total across selected products (${appliedFilters.products.length})` : null}
            />
            <KPICard title="Total Value (EGP)" value={formatKpiGrouped(kpis.totalValue)} icon={DollarSign} colorClass="text-emerald-600" />
            <KPICard title="Unique Customers" value={kpis.uniqueCust} icon={Users} colorClass="text-violet-600" />
            <KPICard 
              title="Unique Products" 
              value={kpis.uniqueProd} 
              icon={Grid} 
              colorClass="text-amber-600" 
              onClick={() => fetchProductSummary()}
            />
            <KPICard title="Avg Value / Cust" value={formatKpiGrouped(kpis.avgPerCust)} icon={TrendingUp} colorClass="text-blue-600" />
            <KPICard title="Avg Qty / Cust" value={formatKpiGrouped(kpis.avgQtyPerCust)} icon={Activity} colorClass="text-indigo-600" />
          </div>

          {/* TABS SELECTOR */}
          <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap no-scrollbar scroll-smooth">
            {['overview', 'customers', 'products', 'distributors', 'insights'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all relative shrink-0
                  ${activeTab === tab ? 'text-violet-600' : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Top 10 Customers by Value</h4>
                    <Users size={16} className="text-gray-400" />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aggregates.customers.sort((a,b) => b.totalValue - a.totalValue).slice(0, 10)}>
                        <XAxis dataKey="clientName" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}}
                          formatter={(v) => formatKpiGrouped(v)}
                        />
                        <Bar dataKey="totalValue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Top 10 Products by Value</h4>
                    <Package size={16} className="text-gray-400" />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aggregates.products.sort((a,b) => b.totalValue - a.totalValue).slice(0, 10)}>
                        <XAxis dataKey="product" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}}
                          formatter={(v) => formatKpiGrouped(v)}
                        />
                        <Bar dataKey="totalValue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-4 md:p-5 border border-gray-100 shadow-sm">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top Eva Bricks</h5>
                  <div className="space-y-2">
                    {aggregates.evaBricks.sort((a,b)=>b.totalValue-a.totalValue).slice(0,5).map((e, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all">
                        <span className="text-[11px] font-bold text-gray-700 truncate max-w-[150px]">{e.evaBrick}</span>
                        <div className="flex gap-2 items-center">
                           <span className="text-[9px] font-bold text-gray-400">{formatKpiGrouped(e.totalQty)}</span>
                           <span className="text-[11px] font-black text-gray-900">{formatKpiGrouped(e.totalValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-4 md:p-5 border border-gray-100 shadow-sm">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top Distributors</h5>
                  <div className="space-y-2">
                    {aggregates.distributors.sort((a,b)=>b.totalValue-a.totalValue).slice(0,5).map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all">
                        <span className="text-[11px] font-bold text-gray-700 truncate max-w-[150px]">{d.distributor}</span>
                        <div className="flex gap-2 items-center">
                           <span className="text-[9px] font-bold text-gray-400">{formatKpiGrouped(d.totalQty)}</span>
                           <span className="text-[11px] font-black text-gray-900">{formatKpiGrouped(d.totalValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-4 md:p-5 border border-gray-100 shadow-sm">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Concentration</h5>
                  <div className="flex flex-col items-center justify-center h-full pb-4">
                    <PieChart width={140} height={140}>
                      <Pie
                        data={[
                          { name: 'Top 10', value: aggregates.customers.sort((a,b)=>b.totalValue-a.totalValue).slice(0,10).reduce((acc,c)=>acc+c.totalValue,0) },
                          { name: 'Others', value: kpis.totalValue - aggregates.customers.sort((a,b)=>b.totalValue-a.totalValue).slice(0,10).reduce((acc,c)=>acc+c.totalValue,0) }
                        ]}
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#f1f5f9" />
                      </Pie>
                    </PieChart>
                    <p className="text-[11px] font-black text-violet-600 mt-2 uppercase tracking-tighter">
                      Top 10 = {formatKpiPercent((aggregates.customers.sort((a,b)=>b.totalValue-a.totalValue).slice(0,10).reduce((acc,c)=>acc+c.totalValue,0) / kpis.totalValue)*100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or code..."
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                {activePrepared && (
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="p-2 bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30 hover:bg-violet-600 hover:text-white transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="text-[10px] font-black uppercase text-gray-400">
                      Page <span className="text-violet-600">{page}</span> of {Math.ceil((filteredCustomers || []).length / pageSize)}
                    </div>
                    <button 
                      disabled={page >= Math.ceil((filteredCustomers || []).length / pageSize)}
                      onClick={() => setPage(p => p + 1)}
                      className="p-2 bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30 hover:bg-violet-600 hover:text-white transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => exportToCSV(sortedCust, `Customers_Analysis_${fileMeta.reportMonthLabel}`)}
                  className="px-3 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-600 transition-all flex items-center gap-2"
                >
                  <Download size={14} /> Export
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-white">
                {(sortedCust || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 h-80 text-center bg-gray-50/50">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                      <Search size={32} />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-2">No matching customers</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-[200px] leading-loose">
                      Your current filters returned zero results. <br/> Please try adjusting your filters or resetting the search.
                    </p>
                    <button 
                      onClick={() => setAppliedFilters({products:[], evaBricks:[], disBricks:[], distributors:[], customers:[], customerCodes:[], customerCode:'', minValue:'', maxValue:'', minQty:'', maxQty:'', arabicOnly:false})}
                      className="mt-6 px-6 py-2 bg-white text-violet-600 border border-violet-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-50 transition-all shadow-sm"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : isMobile ? (
                  <div className="flex-1 overflow-auto divide-y divide-gray-100 bg-white">
                    {pageItems.map((c, i) => (
                      <div key={c.clientCode} onClick={() => setSelectedCustomer(c)} className="p-4 hover:bg-violet-50 cursor-pointer transition-colors space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                             <p className="text-[9px] font-black text-violet-600 uppercase tracking-tighter mb-0.5">{c.clientCode}</p>
                             <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight truncate leading-none">{c.clientName}</h4>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-xs font-black text-gray-900">{formatKpiGrouped(c.totalValue)}</p>
                             <p className="text-[9px] font-bold text-gray-400">{c.pct.toFixed(2)}% SHARE</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Brick / Dis</p>
                            <p className="text-[9px] font-bold text-gray-700 truncate">{c.evaBrick} • {c.distributor}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Qty / Prods</p>
                             <p className="text-[9px] font-bold text-gray-700">{formatKpiGrouped(c.totalQty)} • {c.productCount} items</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pageItems.length === 0 && (
                       <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                         No customers found matching search criteria.
                       </div>
                    )}
                  </div>
                ) : (
                  <table className={TABLE_BASE}>
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className={THEAD_ROW}>
                      <SortableTH label="Code" sortKey="clientCode" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                      <SortableTH label="Customer Name" sortKey="clientName" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                      <SortableTH label="Distributor" sortKey="distributor" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                      <SortableTH label="Brick" sortKey="evaBrick" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                      <SortableTH label="Qty" sortKey="totalQty" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                      <SortableTH label="Value (EGP)" sortKey="totalValue" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                      <SortableTH label="% Share" sortKey="pct" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                      <SortableTH label="Prods" sortKey="productCount" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((c, i) => (
                      <tr key={c.clientCode} onClick={() => setSelectedCustomer(c)} className="hover:bg-violet-50 cursor-pointer transition-colors">
                        <td className={TD_NUM}>{c.clientCode}</td>
                        <td className={TD_TEXT}>{c.clientName}</td>
                        <td className={TD_TEXT}>{c.distributor}</td>
                        <td className={TD_TEXT}>{c.evaBrick}</td>
                        <td className={TD_NUM}>{formatKpiGrouped(c.totalQty)}</td>
                        <td className={TD_NUM}>{formatKpiGrouped(c.totalValue)}</td>
                        <td className={TD_NUM}>{c.pct.toFixed(2)}%</td>
                        <td className={TD_NUM}>{c.productCount}</td>
                      </tr>
                    ))}
                    {pageItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                          No customers found matching search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none mb-1">Product Table</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Complete Performance Breakdown</p>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                       type="text" 
                       placeholder="Search products..."
                       value={productTableQuery}
                       onChange={e => setProductTableQuery(e.target.value)}
                       className="text-[10px] font-bold bg-gray-50 border-none rounded-xl pl-9 pr-4 py-2 w-64 focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-auto border border-gray-100 rounded-3xl no-scrollbar">
                  {isMobile ? (
                    <div className="divide-y divide-gray-50">
                      {sortedProd.map((p, i) => (
                        <div key={i} className="p-4 hover:bg-violet-50/50 cursor-pointer space-y-3" onClick={() => handleDrillDown('product', p.product)}>
                          <div className="flex justify-between items-start gap-2">
                             <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight truncate leading-none flex-1">{p.product}</h4>
                             <p className="text-xs font-black text-emerald-600 shrink-0">{formatKpiGrouped(p.totalValue)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                            <div>
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Distributor</p>
                               <p className="text-[9px] font-bold text-gray-700 truncate">{p.distributor}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Qty / Custs</p>
                               <p className="text-[9px] font-bold text-gray-700">{formatKpiGrouped(p.totalQty)} • {p.customerCount} custs</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
                      <tr>
                        <SortableTH label="Product" sortKey="product" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} />
                        <SortableTH label="Distributor" sortKey="distributor" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} />
                        <SortableTH label="Total Qty" sortKey="totalQty" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                        <SortableTH label="Total Value" sortKey="totalValue" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                        <SortableTH label="Cust Count" sortKey="customerCount" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                        <SortableTH label="Avg / Cust" sortKey="avgValue" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold text-gray-900 divide-y divide-gray-50">
                      {sortedProd.map((p, i) => (
                        <tr key={i} className="hover:bg-violet-50/50 cursor-pointer group" onClick={() => handleDrillDown('product', p.product)}>
                          <td className={TD_TEXT}>{p.product}</td>
                          <td className={TD_TEXT}>{p.distributor}</td>
                          <td className={TD_NUM}>{formatKpiGrouped(p.totalQty)}</td>
                          <td className={TD_NUM}>{formatKpiGrouped(p.totalValue)}</td>
                          <td className={TD_NUM}>{p.customerCount}</td>
                          <td className={TD_NUM}>{formatKpiGrouped(p.avgValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Top 15 Products by Value</h4>
                 <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aggregates.products.sort((a,b)=>b.totalValue-a.totalValue).slice(0, 15)} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="product" type="category" width={120} tick={{fontSize: 9, fontWeight: 900}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{borderRadius:'20px', border:'none', boxShadow:'0 10px 25px rgba(0,0,0,0.1)'}} formatter={(v)=>formatKpiGrouped(v)} />
                        <Bar dataKey="totalValue" fill="#10b981" radius={[0, 10, 10, 0]} barSize={20} />
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'distributors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Distributors', data: sortedDist, label: 'distributor', sKey: distSortKey, sDir: distSortDir, sToggle: distToggle },
                { title: 'Eva Bricks', data: sortedEva, label: 'evaBrick', sKey: evaSortKey, sDir: evaSortDir, sToggle: evaToggle },
                { title: 'DIS Bricks', data: sortedDis, label: 'disBrick', sKey: disSortKey, sDir: disSortDir, sToggle: disToggle }
              ].map((sec, idx) => (
                <div key={idx} className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-96">
                  <div className="p-4 border-b border-gray-50">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sec.title}</h4>
                  </div>
                  <div className="flex-1 overflow-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-gray-100">
                        <tr className={THEAD_ROW}>
                          <SortableTH label={sec.title} sortKey={sec.label} currentKey={sec.sKey} dir={sec.sDir} onSort={sec.sToggle} />
                          <SortableTH label="Qty" sortKey="totalQty" currentKey={sec.sKey} dir={sec.sDir} onSort={sec.sToggle} className="text-right" />
                          <SortableTH label="Value" sortKey="totalValue" currentKey={sec.sKey} dir={sec.sDir} onSort={sec.sToggle} className="text-right" />
                          <SortableTH label="Cust" sortKey="customerCount" currentKey={sec.sKey} dir={sec.sDir} onSort={sec.sToggle} className="text-right" />
                        </tr>
                      </thead>
                      <tbody>
                        {sec.data.map((row, i) => (
                          <tr key={i} className="hover:bg-violet-50/50 cursor-pointer group" onClick={() => handleDrillDown(sec.label, row[sec.label])}>
                            <td className={TD_TEXT}>{row[sec.label]}</td>
                            <td className={TD_NUM}>{formatKpiGrouped(row.totalQty)}</td>
                            <td className={TD_NUM}>{formatKpiGrouped(row.totalValue)}</td>
                            <td className={TD_NUM}>{row.customerCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden">
               <div className="flex items-center gap-4 mb-6">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Rows By</label>
                    <select className="bg-gray-50 border-none rounded-xl text-xs font-bold px-3 py-1.5 focus:ring-2 focus:ring-violet-500">
                      <option>Distributor</option>
                      <option>Eva Brick</option>
                      <option>DIS Brick</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Top N Products</label>
                    <select className="bg-gray-50 border-none rounded-xl text-xs font-bold px-3 py-1.5 focus:ring-2 focus:ring-violet-500">
                      <option>5</option>
                      <option>10</option>
                      <option>20</option>
                    </select>
                  </div>
               </div>
               <div className="overflow-auto border rounded-2xl">
                 {/* Pivot Placeholder */}
                 <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    Cross-Analysis Matrix Rendering...
                    <p className="normal-case font-medium mt-1">This feature provides a heatmap of products across bricks/distributors.</p>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Info size={16}/></div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Concentration</h4>
                 </div>
                 <div className="space-y-4">
                    <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Top 10 Customers Share</p>
                       <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600" style={{width: `${(aggregates.customers.sort((a,b)=>b.totalValue-a.totalValue).slice(0,10).reduce((acc,c)=>acc+c.totalValue,0)/kpis.totalValue)*100}%`}} />
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Top 5 Products Share</p>
                       <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600" style={{width: `${(aggregates.products.sort((a,b)=>b.totalValue-a.totalValue).slice(0,5).reduce((acc,c)=>acc+c.totalValue,0)/kpis.totalValue)*100}%`}} />
                       </div>
                    </div>
                 </div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity size={16}/></div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Efficiency</h4>
                 </div>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-gray-500">Max Cust Contribution</span>
                       <span className="text-[11px] font-black text-gray-900">{formatKpiPercent((Math.max(...aggregates.customers.map(c=>c.pct))))}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-gray-500">Avg Value / Cust</span>
                       <span className="text-[11px] font-black text-gray-900">{formatKpiGrouped(kpis.avgPerCust)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-gray-500">Mult-Product Buyers</span>
                       <span className="text-[11px] font-black text-gray-900">{aggregates.customers.filter(c=>c.productCount>1).length}</span>
                    </div>
                 </div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Info size={16}/></div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Dominance</h4>
                 </div>
                 {aggregates.distributors.length > 0 && (
                   <div className="p-3 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Top Distributor</p>
                      <p className="text-sm font-black text-amber-600">{aggregates.distributors.sort((a,b)=>b.totalValue-a.totalValue)[0].distributor}</p>
                      <div className="flex justify-between mt-2">
                         <span className="text-[10px] text-gray-500">Market Share</span>
                         <span className="text-[10px] font-bold">{(aggregates.distributors.sort((a,b)=>b.totalValue-a.totalValue)[0].totalValue/kpis.totalValue*100).toFixed(1)}%</span>
                      </div>
                   </div>
                 )}
              </div>
           </div>
          )}
        </div>
                {/* PRODUCTS SUMMARY MODAL */}
        {productSummaryModal.open && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setProductSummaryModal({ ...productSummaryModal, open: false })} />
            <div className="bg-white w-full max-w-4xl h-[75vh] rounded-[40px] shadow-2xl relative z-[310] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Selected Products Summary</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Aggregation for {productSummaryModal.rows.length} currently selected products
                  </p>
                </div>
                <button onClick={() => setProductSummaryModal({ ...productSummaryModal, open: false })} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl flex items-center justify-center">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 bg-gray-50 flex-1 overflow-hidden flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Qty</p>
                    <p className="text-xl font-black text-gray-900">{formatKpiGrouped(productSummaryModal.totalQty)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
                    <p className="text-xl font-black text-emerald-600">{formatKpiGrouped(productSummaryModal.totalValue)}</p>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-gray-50">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search products in summary..."
                        value={productSummaryModal.query}
                        onChange={e => setProductSummaryModal(prev => ({ ...prev, query: e.target.value }))}
                        className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-auto no-scrollbar flex-1">
                    <table className={TABLE_BASE}>
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className={THEAD_ROW}>
                          <SortableTH label="Product Name" sortKey="product" currentKey={psummSortKey} dir={psummSortDir} onSort={psummToggle} />
                          <SortableTH label="Qty" sortKey="qty" currentKey={psummSortKey} dir={psummSortDir} onSort={psummToggle} className="text-right" />
                          <SortableTH label="Value" sortKey="value" currentKey={psummSortKey} dir={psummSortDir} onSort={psummToggle} className="text-right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {productSummaryModal.loading ? (
                           <tr><td colSpan={3} className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest bg-white">Loading summary...</td></tr>
                        ) : sortedProdSumm.filter(r => r.product.toLowerCase().includes(productSummaryModal.query.toLowerCase())).map((row, i) => (
                          <tr key={i} className="hover:bg-violet-50/50">
                            <td className={TD_TEXT}>{row.product}</td>
                            <td className={TD_NUM}>{formatKpiGrouped(row.qty)}</td>
                            <td className={TD_NUM}>{formatKpiGrouped(row.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DUPLICATES MODAL */}
        {duplicatesModal.open && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setDuplicatesModal({ ...duplicatesModal, open: false })} />
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl relative z-[310] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Duplicates Report</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Detected {duplicatesModal.total} redundant rows included in current analysis
                  </p>
                </div>
                <button onClick={() => setDuplicatesModal({ ...duplicatesModal, open: false })} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl flex items-center justify-center">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 bg-gray-50 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                   <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search duplicates..."
                        value={duplicatesModal.query}
                        onChange={e => fetchDuplicates(1, e.target.value)}
                        className="text-[11px] font-bold bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 w-80 focus:ring-2 focus:ring-violet-500 outline-none shadow-sm"
                      />
                   </div>
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-tight">
                      Stored samples: {duplicatesModal.stored} / {duplicatesModal.total}
                   </div>
                </div>

                <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-auto no-scrollbar flex-1">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100">
                        <tr>
                          <SortableTH label="Month" sortKey="monthKey" currentKey={duplicatesModal.sortKey} dir={duplicatesModal.sortDir} onSort={key => {
                            const newDir = duplicatesModal.sortKey === key ? (duplicatesModal.sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
                            fetchDuplicates(1, duplicatesModal.query, key, newDir);
                          }} className="px-4 py-3 whitespace-nowrap" />
                          <SortableTH label="File" sortKey="fileName" currentKey={duplicatesModal.sortKey} dir={duplicatesModal.sortDir} onSort={key => {
                            const newDir = duplicatesModal.sortKey === key ? (duplicatesModal.sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
                            fetchDuplicates(1, duplicatesModal.query, key, newDir);
                          }} className="px-4 py-3 whitespace-nowrap" />
                          <SortableTH label="Client" sortKey="clientName" currentKey={duplicatesModal.sortKey} dir={duplicatesModal.sortDir} onSort={key => {
                            const newDir = duplicatesModal.sortKey === key ? (duplicatesModal.sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
                            fetchDuplicates(1, duplicatesModal.query, key, newDir);
                          }} className="px-4 py-3 whitespace-nowrap" />
                          <SortableTH label="Product" sortKey="product" currentKey={duplicatesModal.sortKey} dir={duplicatesModal.sortDir} onSort={key => {
                            const newDir = duplicatesModal.sortKey === key ? (duplicatesModal.sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
                            fetchDuplicates(1, duplicatesModal.query, key, newDir);
                          }} className="px-4 py-3 whitespace-nowrap" />
                          <SortableTH label="Distributor" sortKey="distributor" currentKey={duplicatesModal.sortKey} dir={duplicatesModal.sortDir} onSort={key => {
                            const newDir = duplicatesModal.sortKey === key ? (duplicatesModal.sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
                            fetchDuplicates(1, duplicatesModal.query, key, newDir);
                          }} className="px-4 py-3 whitespace-nowrap" />
                          <SortableTH label="Qty" sortKey="qty" currentKey={duplicatesModal.sortKey} dir={duplicatesModal.sortDir} onSort={key => {
                            const newDir = duplicatesModal.sortKey === key ? (duplicatesModal.sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
                            fetchDuplicates(1, duplicatesModal.query, key, newDir);
                          }} className="px-4 py-3 whitespace-nowrap text-right" />
                          <SortableTH label="Value" sortKey="value" currentKey={duplicatesModal.sortKey} dir={duplicatesModal.sortDir} onSort={key => {
                            const newDir = duplicatesModal.sortKey === key ? (duplicatesModal.sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
                            fetchDuplicates(1, duplicatesModal.query, key, newDir);
                          }} className="px-4 py-3 whitespace-nowrap text-right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {duplicatesModal.loading ? (
                          <tr><td colSpan={7} className="py-20 text-center"><RefreshCw size={24} className="animate-spin mx-auto text-violet-600 mb-4" /><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading...</span></td></tr>
                        ) : duplicatesModal.rows.length === 0 ? (
                          <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-black uppercase tracking-widest italic">No duplicates found</td></tr>
                        ) : (
                          duplicatesModal.rows.map((r, i) => (
                            <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                              <td className="px-4 py-3 font-bold text-gray-600">{r.monthKey}</td>
                              <td className="px-4 py-3 text-gray-400 italic text-[9px] max-w-[120px] truncate">{r.fileName}</td>
                              <td className="px-4 py-3 font-bold text-gray-900">
                                <span className="block text-[10px]">{r.clientName}</span>
                                <span className="block text-[9px] text-gray-400">{r.clientCode}</span>
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-800">{r.product}</td>
                              <td className="px-4 py-3 text-gray-500">{r.distributor}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold">{formatKpiGrouped(r.qty)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 tabular-nums">{formatKpiGrouped(r.value)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {duplicatesModal.total > 50 && (
                     <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-tight">
                           Page {duplicatesModal.page} of {Math.ceil(duplicatesModal.total / 50)}
                        </div>
                        <div className="flex gap-1">
                           <button 
                             disabled={duplicatesModal.page <= 1}
                             onClick={() => fetchDuplicates(duplicatesModal.page - 1, duplicatesModal.query)}
                             className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 disabled:opacity-30"
                           ><ChevronLeft size={16} /></button>
                           <button 
                             disabled={duplicatesModal.page * 50 >= duplicatesModal.total}
                             onClick={() => fetchDuplicates(duplicatesModal.page + 1, duplicatesModal.query)}
                             className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 disabled:opacity-30"
                           ><ChevronRight size={16} /></button>
                        </div>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FILTER PRESET MODAL */}
        {showPresetModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPresetModal(false)} />
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-[310] overflow-hidden flex flex-col animate-in zoom-in duration-300">
               <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Filter Presets</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Manage and load your saved filter states</p>
                  </div>
                  <button onClick={() => setShowPresetModal(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl flex items-center justify-center">
                    <X size={24} />
                  </button>
               </div>
               <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3 no-scrollbar bg-gray-50">
                  {filterPresets.length === 0 && (
                    <div className="py-12 text-center text-gray-400 font-black uppercase tracking-widest text-xs italic">
                      No presets saved yet
                    </div>
                  )}
                  {filterPresets.map(preset => (
                    <div 
                      key={preset.id} 
                      className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-violet-600 transition-all"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => { loadPreset(preset); setShowPresetModal(false); }}>
                        <h4 className="text-sm font-black text-gray-900">{preset.name}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Saved {new Date(preset.savedAt).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => deletePreset(preset.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
               </div>
               <div className="p-6 text-center bg-white border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                    Presets are saved to your browser's local storage.
                  </p>
               </div>
            </div>
          </div>
        )}

        {/* SESSION LIST MODAL */}
        {isSessionModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsSessionModalOpen(false)} />
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-[310] overflow-hidden flex flex-col animate-in zoom-in duration-300">
               <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Saved Sessions</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Select a session to restore your dashboard</p>
                  </div>
                  <button onClick={() => setIsSessionModalOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl flex items-center justify-center">
                    <X size={24} />
                  </button>
               </div>
               <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 no-scrollbar bg-gray-50">
                  {savedSessions.length === 0 && (
                    <div className="py-12 text-center text-gray-400 font-black uppercase tracking-widest text-xs italic">
                      No saved sessions found
                    </div>
                  )}
                  {savedSessions.map(session => (
                    <div 
                      key={session.id} 
                      onClick={() => handleLoadSession(session)}
                      className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:border-violet-600 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 group-hover:text-violet-600 transition-colors">{session.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            {new Date(session.createdAt).toLocaleString()} • {formatKpiGrouped(session.rowCount)} rows
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-gray-100 text-[9px] font-black text-gray-500 rounded-md uppercase">{session.period?.label || 'Multiple Months'}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
               </div>
               <div className="p-8 border-t border-gray-100 bg-white text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Sessions are stored locally in your browser (IndexedDB)
                  </p>
               </div>
            </div>
          </div>
        )}

        {/* CUST DRILL DRAWER (MODAL) */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedCustomer(null)} />
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] md:rounded-[40px] shadow-2xl relative z-[210] overflow-hidden flex flex-col animate-in zoom-in duration-300">
               <div className="p-4 md:p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-violet-50 text-violet-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-inner shrink-0">
                       <Users size={isMobile ? 24 : 32} />
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-base md:text-xl font-black text-gray-900 uppercase tracking-tight leading-tight truncate">{selectedCustomer.clientName}</h3>
                       <p className="text-[10px] md:text-xs font-black text-violet-600 uppercase tracking-widest mt-1">Code: {selectedCustomer.clientCode}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setStatementSearch(''); setStatementPage(1); }} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl flex items-center justify-center transition-all shrink-0 ml-2">
                    <X size={20} />
                  </button>
               </div>
               <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6 md:space-y-8 no-scrollbar">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="p-3 md:p-4 bg-violet-600 text-white rounded-2xl shadow-lg">
                       <p className="text-[8px] md:text-[10px] font-black opacity-80 uppercase tracking-widest mb-1">Rank</p>
                       <p className="text-sm md:text-lg font-black leading-none">#{aggregates.customers.findIndex(c => (c.clientCode === selectedCustomer.clientCode && c.clientName === selectedCustomer.clientName)) + 1}</p>
                    </div>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unique Products</p>
                       <p className="text-sm md:text-lg font-black text-gray-900 leading-none">{selectedCustomer.productCount}</p>
                    </div>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
                       <p className="text-sm md:text-lg font-black text-gray-900 leading-none tabular-nums">{formatKpiGrouped(selectedCustomer.totalValue)}</p>
                    </div>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Qty</p>
                       <p className="text-sm md:text-lg font-black text-gray-900 leading-none tabular-nums">{formatKpiGrouped(selectedCustomer.totalQty)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Breakdown</h4>
                      <div className="relative">
                         <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                         <input 
                           type="text" 
                           placeholder="Search breakdown..." 
                           value={statementSearch}
                           onChange={e => { setStatementSearch(e.target.value); setStatementPage(1); }}
                           className="text-[10px] font-bold bg-gray-100 border-none outline-none pl-9 pr-4 py-2 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-violet-500"
                         />
                      </div>
                    </div>
                    
                    <div className="border border-gray-100 rounded-2xl md:rounded-3xl overflow-hidden bg-white shadow-sm">
                        {isMobile ? (
                          <div className="divide-y divide-gray-50">
                            {paginatedStatement.map((r, i) => (
                               <div key={i} className="p-4 space-y-2">
                                  <div className="flex justify-between items-start gap-2">
                                     <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate leading-none flex-1">{r.product}</h4>
                                     <p className="text-[11px] font-black text-violet-600 shrink-0">{formatKpiGrouped(r.value)}</p>
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                                     <span className="truncate max-w-[120px]">{r.distributor}</span>
                                     <div className="flex gap-2">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{r.monthKey}</span>
                                        <span className="text-gray-900">QTY: {formatKpiGrouped(r.qty)}</span>
                                     </div>
                                  </div>
                               </div>
                            ))}
                            {paginatedStatement.length === 0 && (
                               <div className="py-12 text-center text-gray-400 font-black uppercase tracking-widest italic text-[10px]">No matching records</div>
                            )}
                          </div>
                        ) : (
                          <table className="w-full text-[11px] border-collapse">
                             <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                   <SortableTH label="Product" sortKey="product" currentKey={stSortKey} dir={stSortDir} onSort={stToggle} />
                                   <SortableTH label="Distributor" sortKey="distributor" currentKey={stSortKey} dir={stSortDir} onSort={stToggle} />
                                   <SortableTH label="Month" sortKey="monthKey" currentKey={stSortKey} dir={stSortDir} onSort={stToggle} className="text-center" />
                                   <SortableTH label="Qty" sortKey="qty" currentKey={stSortKey} dir={stSortDir} onSort={stToggle} className="text-right" />
                                   <SortableTH label="Value" sortKey="value" currentKey={stSortKey} dir={stSortDir} onSort={stToggle} className="text-right" />
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50">
                                {paginatedStatement.map((r, i) => (
                                  <tr key={i} className="hover:bg-violet-50/30 transition-colors">
                                     <td className="px-4 py-3 font-bold text-gray-900">{r.product}</td>
                                     <td className="px-4 py-3 text-gray-500 font-medium">{r.distributor}</td>
                                     <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-1 bg-gray-100 text-[9px] font-black text-gray-600 rounded-lg uppercase">{r.monthKey}</span>
                                     </td>
                                     <td className="px-4 py-3 text-right font-mono font-bold">{formatKpiGrouped(r.qty)}</td>
                                     <td className="px-4 py-3 text-right font-mono font-bold text-violet-600">{formatKpiGrouped(r.value)}</td>
                                  </tr>
                                ))}
                                {paginatedStatement.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="py-20 text-center text-gray-400 font-black uppercase tracking-widest italic">No matching records found</td>
                                  </tr>
                                )}
                             </tbody>
                          </table>
                        )}
                    </div>

                    {/* Statement Pagination */}
                    {statementRows.length > statementPageSize && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                          Showing {Math.min(statementRows.length, (statementPage-1)*statementPageSize+1)}-{Math.min(statementRows.length, statementPage*statementPageSize)} of {statementRows.length} rows
                        </p>
                        <div className="flex items-center gap-1">
                           <button 
                            disabled={statementPage === 1}
                            onClick={() => setStatementPage(p => p - 1)}
                            className="p-1.5 bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30"
                           ><ChevronLeft size={16} /></button>
                           <span className="text-[10px] font-black px-2 tabular-nums">{statementPage}</span>
                           <button 
                            disabled={statementPage * statementPageSize >= statementRows.length}
                            onClick={() => setStatementPage(p => p + 1)}
                            className="p-1.5 bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30"
                           ><ChevronRight size={16} /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Location & Delivery Brick</h4>
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm"><MapIcon size={20}/></div>
                          <div>
                             <p className="text-xs font-black text-gray-900">{selectedCustomer.evaBrick}</p>
                             <p className="text-[9px] font-bold text-gray-400 uppercase">District Architecture</p>
                          </div>
                       </div>
                    </div>
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Channel Details</h4>
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm"><Package size={20}/></div>
                          <div>
                             <p className="text-xs font-black text-gray-900">{selectedCustomer.distributor}</p>
                             <p className="text-[9px] font-bold text-gray-400 uppercase">Primary Distributor Fulfillment</p>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
               <div className="p-8 border-t border-gray-100 bg-white shrink-0 flex gap-4">
                  <button 
                    onClick={() => {
                       const blob = new Blob([JSON.stringify(statementRows, null, 2)], { type: 'application/json' });
                       const link = document.createElement("a");
                       link.href = URL.createObjectURL(blob);
                       link.setAttribute("download", `Statement_${selectedCustomer.clientName}.json`);
                       link.click();
                    }}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Export Statement
                  </button>
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl"
                  >
                    Done
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* GENERAL DRILL-DOWN STATEMENT MODAL */}
        {statementModal.open && (
           <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setStatementModal({ ...statementModal, open: false })} />
             <div className="bg-white w-full max-w-5xl max-h-[85vh] rounded-[40px] shadow-2xl relative z-[310] overflow-hidden flex flex-col animate-in zoom-in duration-300">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-100 text-gray-900 rounded-2xl flex items-center justify-center">
                       <BarChart size={28} />
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{statementModal.title}</h3>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Underlying Transactional Data</p>
                    </div>
                  </div>
                  <button onClick={() => setStatementModal({ ...statementModal, open: false })} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden p-8 flex flex-col gap-4">
                  {statementModal.loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                       <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Aggregating records...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                             Total: {drillDownRows.length} Transactions
                          </div>
                          <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text" 
                              placeholder="Search anything..." 
                              value={statementModal.query}
                              onChange={e => setStatementModal({ ...statementModal, query: e.target.value, page: 1 })}
                              className="text-[10px] font-bold bg-gray-50 border-none outline-none pl-9 pr-4 py-2 rounded-xl w-64 focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const csvContent = "Product,Distributor,Cust Code,Customer,Month,Qty,Value\n" + 
                              drillDownRows.map(r => `"${r.product}","${r.distributor}","${r.clientCode}","${r.clientName}","${r.monthKey}",${r.qty},${r.value}`).join("\n");
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.setAttribute("download", `Statement_Export.csv`);
                            link.click();
                          }}
                          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-600 transition-all flex items-center gap-2"
                        >
                          <Download size={12} /> Export CSV
                        </button>
                      </div>
                      <div className="flex-1 border border-gray-100 rounded-3xl overflow-hidden bg-gray-50 flex flex-col">
                        <div className="overflow-auto no-scrollbar flex-1">
                          <table className="w-full text-[11px] border-collapse bg-white">
                             <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm border-b border-gray-100">
                                <tr className="border-b border-gray-100">
                                   <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-widest">Product</th>
                                   <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-widest">Distributor</th>
                                   <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-widest">Cust Code</th>
                                   <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-widest">Customer</th>
                                   <th className="px-4 py-3 text-center font-black text-gray-500 uppercase tracking-widest">Month</th>
                                   <th className="px-4 py-3 text-right font-black text-gray-500 uppercase tracking-widest">Qty</th>
                                   <th className="px-4 py-3 text-right font-black text-gray-500 uppercase tracking-widest">Value</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50">
                                {paginatedDrillDown.map((r, i) => (
                                  <tr key={i} className="hover:bg-violet-50/20 transition-colors">
                                     <td className="px-4 py-3 font-bold text-gray-900">{r.product}</td>
                                     <td className="px-4 py-3 text-gray-500">{r.distributor}</td>
                                     <td className="px-4 py-3 font-mono text-violet-600 font-black text-[9px]">{r.clientCode}</td>
                                     <td className="px-4 py-3 font-bold text-gray-600">{r.clientName}</td>
                                     <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-1 bg-gray-100 text-[9px] font-black text-gray-600 rounded-lg uppercase">{r.monthKey}</span>
                                     </td>
                                     <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">{formatKpiGrouped(r.qty)}</td>
                                     <td className="px-4 py-3 text-right font-mono font-bold text-violet-600 tabular-nums">{formatKpiGrouped(r.value)}</td>
                                  </tr>
                                ))}
                                {paginatedDrillDown.length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="py-20 text-center text-gray-400 font-black uppercase tracking-widest italic">No matching records found</td>
                                  </tr>
                                )}
                             </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* DrillDown Pagination */}
                      {drillDownRows.length > 50 && (
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                            Showing {Math.min(drillDownRows.length, (statementModal.page-1)*50+1)}-{Math.min(drillDownRows.length, statementModal.page*50)} of {drillDownRows.length} rows
                          </p>
                          <div className="flex items-center gap-1">
                             <button 
                              disabled={statementModal.page === 1}
                              onClick={() => setStatementModal({ ...statementModal, page: statementModal.page - 1 })}
                              className="p-1.5 bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30"
                             ><ChevronLeft size={16} /></button>
                             <span className="text-[10px] font-black px-3 tabular-nums">{statementModal.page}</span>
                             <button 
                              disabled={statementModal.page * 50 >= drillDownRows.length}
                              onClick={() => setStatementModal({ ...statementModal, page: statementModal.page + 1 })}
                              className="p-1.5 bg-gray-100 rounded-lg text-gray-600 disabled:opacity-30"
                             ><ChevronRight size={16} /></button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button onClick={() => setStatementModal({ ...statementModal, open: false })} className="px-8 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all">
                    Close
                  </button>
                </div>
             </div>
           </div>
        )}

        {/* FILTERS SIDEBAR */}
        {isSidebarOpen && (
          <>
            <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 w-80 bg-white z-[120] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
               <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Filter size={16} className="text-violet-600" />
                     <span className="text-sm font-black text-gray-900 uppercase">Advanced Filters</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button 
                      onClick={() => {
                        const name = prompt("Enter preset name:");
                        if (name) saveFilterPreset(name);
                      }}
                      className="p-1.5 hover:bg-violet-50 text-violet-600 rounded-lg group relative"
                    >
                      <Save size={16} />
                    </button>
                    <button 
                      onClick={() => setShowPresetModal(true)}
                      className="p-1.5 hover:bg-violet-50 text-violet-600 rounded-lg group relative"
                    >
                      <History size={16} />
                    </button>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-900">
                      <X size={18} />
                    </button>
                  </div>
               </div>
               <div className="flex-1 overflow-auto p-4 space-y-6">
                   {/* Filter Sections */}
                    {[
                      { id: 'product', label: 'Products', options: searchedOptions.products, key: 'products' },
                      { id: 'evaBrick', label: 'Eva Bricks', options: searchedOptions.evaBricks, key: 'evaBricks' },
                      { id: 'disBrick', label: 'DIS Bricks', options: searchedOptions.disBricks, key: 'disBricks' },
                      { id: 'distributor', label: 'Distributors', options: searchedOptions.distributors, key: 'distributors' },
                      { id: 'customer', label: 'Customers', options: searchedOptions.customers, key: 'customers' }
                    ].map(group => (
                       <div key={group.id} className="space-y-0 border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 bg-white group select-none relative"
                            onClick={() => setExpandedFilters(e => ({...e, [group.id]: !e[group.id]}))}
                          >
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none group-hover:text-violet-600 pointer-events-none">{group.label}</label>
                             <div className="flex items-center gap-2 pointer-events-none">
                               <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">
                                 {(filters[group.id === 'customer' ? 'customerCodes' : group.key] || []).length} / {(filterOptions[group.key] || []).length}
                               </span>
                               <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedFilters[group.id] ? 'rotate-180' : ''}`} />
                             </div>
                          </div>
                          {expandedFilters[group.id] && (
                            <div className="p-2 pt-0 space-y-2 bg-white">
                              <div className="flex items-center gap-1">
                                 <div className="relative flex-1">
                                   <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                   <input 
                                     type="text" 
                                     placeholder="Search..." 
                                     value={filterSearch[group.id]}
                                     onChange={e => setFilterSearch(prev => ({...prev, [group.id]: e.target.value}))}
                                     className="w-full text-[10px] bg-gray-50 border-none outline-none pl-6 pr-2 py-1.5 rounded-xl focus:ring-1 focus:ring-violet-500"
                                   />
                                 </div>
                                 <button 
                                   onClick={() => {
                                     if (group.id === 'customer') {
                                       const names = group.options.map(o => o.clientName);
                                       const codes = group.options.map(o => o.clientCode);
                                       setFilters(f => ({...f, customers: [...new Set([...(f.customers || []), ...names])], customerCodes: [...new Set([...(f.customerCodes || []), ...codes])] }));
                                     } else {
                                       const vals = group.options.map(o => o);
                                       setFilters(f => ({...f, [group.key]: [...new Set([...(f[group.key] || []), ...vals])] }));
                                     }
                                   }}
                                   className="text-[9px] font-black uppercase text-violet-600 px-1.5 hover:underline"
                                 >All</button>
                                 <button 
                                   onClick={() => {
                                     if (group.id === 'customer') {
                                       const names = group.options.map(o => o.clientName);
                                       const codes = group.options.map(o => o.clientCode);
                                       setFilters(f => ({...f, customers: (f.customers || []).filter(x => !names.includes(x)), customerCodes: (f.customerCodes || []).filter(x => !codes.includes(x)) }));
                                     } else {
                                       const vals = group.options.map(o => o);
                                       setFilters(f => ({...f, [group.key]: (f[group.key] || []).filter(x => !vals.includes(x)) }));
                                     }
                                   }}
                                   className="text-[9px] font-black uppercase text-gray-400 px-1.5 hover:underline"
                                 >None</button>
                              </div>
                              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-1.5 bg-gray-50 space-y-0.5 scrollbar-thin">
                                {group.options.slice(0, filterLimits[group.key]).map((opt, idx) => {
                                  const isCust = group.id === 'customer';
                                  const val = isCust ? opt.clientName : opt;
                                  const valCode = isCust ? opt.clientCode : null;
                                  const label = isCust ? `${opt.clientCode} — ${opt.clientName}` : opt;
                                  const isSelected = isCust ? (filters.customerCodes || []).includes(valCode) : (filters[group.key] || []).includes(val);
                                  return (
                                    <button 
                                       key={`${group.id}-${idx}-${isCust ? valCode : val}`} 
                                       onClick={() => {
                                         if (isCust) {
                                           setFilters(f => ({
                                             ...f, 
                                             customers: isSelected ? (f.customers || []).filter(x => x !== val) : [...(f.customers || []), val],
                                             customerCodes: isSelected ? (f.customerCodes || []).filter(x => x !== valCode) : [...(f.customerCodes || []), valCode]
                                           }));
                                         } else {
                                           setFilters(f => ({...f, [group.key]: isSelected ? (f[group.key] || []).filter(x=>x!==val) : [...(f[group.key] || []), val]}));
                                         }
                                       }}
                                       className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all
                                         ${isSelected ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}
                                       `}
                                    >
                                       {label}
                                    </button>
                                  );
                                })}
                                {group.options.length > filterLimits[group.key] && (
                                  <button 
                                    onClick={() => setFilterLimits(prev => ({...prev, [group.key]: prev[group.key] + 500}))}
                                    className="w-full py-2 text-[10px] font-black text-violet-600 uppercase hover:bg-violet-50 rounded-xl"
                                  >
                                    Show more ({group.options.length - filterLimits[group.key]} left)
                                  </button>
                                )}
                                {group.options.length === 0 && <div className="p-4 text-center text-[10px] text-gray-400 font-bold uppercase italic">No results</div>}
                              </div>
                            </div>
                          )}
                       </div>
                    ))}
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Ranges</label>
                         <div className="grid grid-cols-2 gap-2">
                             <input 
                               type="number" 
                               placeholder="Min Qty" 
                               value={filters.minQty}
                               onChange={e => setFilters(f => ({...f, minQty: e.target.value}))}
                               className="bg-gray-50 border-none rounded-xl text-[10px] p-2 focus:ring-1 focus:ring-violet-500" 
                             />
                             <input 
                               type="number" 
                               placeholder="Max Qty" 
                               value={filters.maxQty}
                               onChange={e => setFilters(f => ({...f, maxQty: e.target.value}))}
                               className="bg-gray-50 border-none rounded-xl text-[10px] p-2 focus:ring-1 focus:ring-violet-500" 
                             />
                             <input 
                               type="number" 
                               placeholder="Min Val" 
                               value={filters.minValue}
                               onChange={e => setFilters(f => ({...f, minValue: e.target.value}))}
                               className="bg-gray-50 border-none rounded-xl text-[10px] p-2 focus:ring-1 focus:ring-violet-500" 
                             />
                             <input 
                               type="number" 
                               placeholder="Max Val" 
                               value={filters.maxValue}
                               onChange={e => setFilters(f => ({...f, maxValue: e.target.value}))}
                               className="bg-gray-50 border-none rounded-xl text-[10px] p-2 focus:ring-1 focus:ring-violet-500" 
                             />
                          </div>
                       </div>
                       <div className="flex items-center justify-between p-3 bg-violet-50 rounded-2xl">
                          <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Arabic Names Only</span>
                          <button 
                            onClick={() => setFilters(f => ({...f, arabicOnly: !f.arabicOnly}))}
                            className={`w-8 h-4 rounded-full transition-all relative ${filters.arabicOnly ? 'bg-violet-600' : 'bg-gray-200'}`}
                           >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${filters.arabicOnly ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                       </div>
                     </div>
                  </div>
               <div className="p-4 border-t border-gray-100 flex gap-2">
                  <button 
                    onClick={() => setFilters({products:[], evaBricks:[], disBricks:[], distributors:[], customers:[], customerCodes:[], customerCode:'', minValue:'', maxValue:'', minQty:'', maxQty:'', arabicOnly:false})}
                    className="flex-1 py-2 text-[10px] font-black uppercase text-gray-400 hover:text-red-500"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={applyFilters}
                    disabled={isFiltering}
                    className="flex-[2] py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-violet-600 transition-all disabled:opacity-50"
                  >
                    {isFiltering ? <RefreshCw size={12} className="animate-spin" /> : null}
                    {isFiltering ? 'Filtering...' : 'Apply Filters'}
                  </button>
               </div>
            </div>
          </>
        )}

      </div>
    </FullscreenWrapper>
  );
};

export default PerCustomerAnalyzer;
