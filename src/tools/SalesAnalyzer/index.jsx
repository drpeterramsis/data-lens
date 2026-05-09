import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, DollarSign, Package, RotateCcw, 
  Grid, Upload, RefreshCw, ChevronLeft, ChevronRight, 
  ChevronDown, Filter, Users, Search, X, 
  Trash2, Save, Edit2, Plus, CheckCircle2, History, Clock,
  Calendar, AlertCircle, Expand, Download,
  Maximize2, Minimize2, Type, ChevronsUpDown, TrendingUp
} from 'lucide-react';
import FullscreenWrapper from '../../components/shared/FullscreenWrapper';

import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';

import { 
  toNumberSafe, formatKpi, formatKpiGrouped, formatKpiPercent 
} from '../../utils/formatNumber';

import ReportsTab from '../reports/ReportsTab';
import { FilterButton } from '../../components/ui/FilterButton';

const TABLE_BASE =
  "w-full table-auto border-collapse text-[11px] md:text-xs text-gray-700 font-sans";

const THEAD_ROW =
  "text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-500 bg-gray-50";

const TH_BASE =
  "px-3 py-2 text-left whitespace-normal leading-tight border-b border-gray-200";

const TD_BASE =
  "px-3 py-2 align-top border-b border-gray-50";

const TD_TEXT =
  `${TD_BASE} whitespace-normal break-words font-semibold`;

const TD_NUM =
  `${TD_BASE} whitespace-nowrap tabular-nums font-mono font-bold text-right`;

const APP_VERSION = {
  version: '1.0.564',
  releaseDate: 'May 2026',
  label: 'Enhanced Search & Layout'
};

const CACHE_KEY = 'atr_sales_v1';

const SALES_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

const COLUMN_MAP = {
  "المشرف":          "supervisor",
  "المندوب":         "mrName",
  "نوع العميل":      "customerType",
  "كود العميل":      "customerId",
  "اسم العميل":      "customerName",
  "Party Site Id":   "partySiteId",
  "عنوان العميل":    "customerAddress",
  "كود الجهة":       "entityCode",
  "كود الخط":        "lineCode",
  "اسم الخط":        "lineName",
  "رقم الفاتورة":    "invoiceNo",
  "تاريخ الفاتورة":  "invoiceDate",
  "كود الصنف":       "productCode",
  "اسم الصنف":       "productName",
  "كمية البيع":      "salesQty",
  "قيمة البيع":      "salesValue",
  "كمية التخصيم":    "discountQty",
  "قيمة التخصيم":    "discountValue",
  "كمية المرتجع":    "returnQty",
  "قيمة المرتجع":    "returnValue",
  "كمية الصافي":     "netQty",
  "قيمة الصافي":     "netValue",
  "الفرع":           "branch",
};

const useSortableTable = (data, defaultKey, defaultDir = 'desc') => {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
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

const fmt = (date) => (!date || !(date instanceof Date)) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const DrilldownPanel = ({ invoices, type }) => {
  const total = invoices.reduce((acc, inv) => ({
    netQty:      acc.netQty + (inv.salesQty || inv.netQty),
    netValue:    acc.netValue + (inv.salesValue || inv.netValue),
    returnQty:   acc.returnQty + (inv.returnQty || Math.abs(inv.netQty < 0 ? inv.netQty : 0)),
    returnValue: acc.returnValue + (inv.returnValue || Math.abs(inv.netValue < 0 ? inv.netValue : 0)),
  }), { netQty:0, netValue:0, returnQty:0, returnValue:0 });

  return (
    <div className="px-6 py-4 border-t-2 border-blue-200">
      <div className="flex gap-6 mb-3 flex-wrap">
        <div className="text-[11px] md:text-xs"><span className="text-gray-400">Invoices: </span><span className="font-bold text-gray-800 ml-1">{(invoices || []).length}</span></div>
        <div className="text-[11px] md:text-xs"><span className="text-gray-400">Sales Qty: </span><span className="font-bold text-emerald-700 ml-1"><FormatNum val={total.netQty} defaultClass="text-emerald-700" /></span></div>
        <div className="text-[11px] md:text-xs"><span className="text-gray-400">Sales Value: </span><span className="font-bold text-gray-800 ml-1"><FormatNum val={total.netValue} suffix="EGP" defaultClass="text-gray-800" /></span></div>
      </div>
      <div className="overflow-x-hidden rounded-lg border border-blue-100">
        <table className="w-full text-left table-auto text-[11px] md:text-[12px] border-collapse font-sans">
          <thead className="sticky top-0 bg-blue-100">
            <tr>
              <th className="px-3 py-2 font-bold text-blue-700 uppercase whitespace-nowrap text-[11px] md:text-[12px] tabular-nums">Invoice #</th>
              <th className="px-3 py-2 font-bold text-blue-700 uppercase whitespace-nowrap text-[11px] md:text-[12px]">Customer</th>
              <th className="px-3 py-2 font-bold text-blue-700 uppercase whitespace-nowrap text-[11px] md:text-[12px]">Date</th>
              <th className="px-3 py-2 text-right font-bold text-blue-700 uppercase whitespace-nowrap text-[11px] md:text-[12px] tabular-nums">Sales Qty</th>
              <th className="px-3 py-2 text-right font-bold text-blue-700 uppercase whitespace-nowrap text-[11px] md:text-[12px] tabular-nums">Sales Value</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv.invoiceNo} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap text-[11px] md:text-[12px]">{inv.invoiceNo}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-normal break-words text-[11px] md:text-[12px]">{inv.customerName}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-[11px] md:text-[12px]">{fmt(inv.invoiceDate)}</td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-700 tabular-nums text-[11px] md:text-[12px]"><FormatNum val={inv.netQty} defaultClass="text-emerald-700 font-semibold" /></td>
                <td className="px-3 py-2 text-right text-gray-700 tabular-nums text-[11px] md:text-[12px]"><FormatNum val={inv.netValue} defaultClass="text-gray-700" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const formatDate = (d) => d.toLocaleDateString('en-EG', {day:'numeric', month:'short', year:'numeric'});

const FormatNum = ({ val, defaultClass = "", prefix = "", suffix = "" }) => {
  if (val == null) return "—";
  const num = toNumberSafe(val);
  const isNeg = num < 0;
  const cls = isNeg ? `text-[#8b0000] bg-[#ffe6e6] px-1 rounded font-bold inline-block` : defaultClass;
  
  return (
    <span className={`${cls} tabular-nums whitespace-nowrap`}>
      {prefix}<span className="text-[1.12em] font-bold">{formatKpiGrouped(num)}</span>
      {suffix && <span className="text-[0.9em] opacity-50 ml-0.5">{suffix}</span>}
    </span>
  );
};

const ColumnSelectionMenu = ({ columns = [], hiddenCols = [], toggleColumn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  // Ensure hiddenCols is not undefined even if it was explicitly passed as undefined
  const effectiveHiddenCols = hiddenCols || [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-black text-gray-600 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-tighter"
      >
        <Filter className="w-3 h-3" /> Columns
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl p-3 w-52 z-[100] animate-in fade-in slide-in-from-top-2">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">Show/Hide Columns</p>
          <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
            {(columns || []).map(col => col && (
              <label key={col.id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors group">
                <input 
                  type="checkbox" 
                  checked={!effectiveHiddenCols.includes(col.id)} 
                  onChange={() => toggleColumn(col.id)}
                  className="w-3.5 h-3.5 rounded border-gray-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className={`text-xs font-black uppercase tracking-tight ${!effectiveHiddenCols.includes(col.id) ? 'text-gray-900' : 'text-gray-400'} group-hover:text-blue-600`}>{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DB_NAME = 'DataLensDB';
const STORE_NAME = 'sales_data';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};


const loadRowsFromStorage = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const rowsReq = store.get(`${CACHE_KEY}_rows`);
    const metaReq = store.get(`${CACHE_KEY}_meta`);

    return new Promise((resolve, reject) => {
      let pending = 2;
      let rowsResult = null;
      let metaResult = null;
      let hasError = false;

      const checkDone = () => {
        if (hasError) return;
        if (--pending === 0) {
          if (!rowsResult) resolve({ rows: [], meta: null });
          else resolve({
            rows: rowsResult.map(r => ({
              ...r,
              invoiceDate: (() => {
                if (!r.invoiceDate) return null;

                // If it's already a Date object (shouldn't happen in IndexedDB
                // but just in case)
                if (r.invoiceDate instanceof Date) {
                  if (isNaN(r.invoiceDate.getTime())) return null;
                  return new Date(
                    r.invoiceDate.getFullYear(),
                    r.invoiceDate.getMonth(),
                    r.invoiceDate.getDate(),
                    12, 0, 0
                  );
                }

                // If it's a string — extract date parts DIRECTLY
                // to avoid UTC timezone shift
                if (typeof r.invoiceDate === 'string') {
                  // Match YYYY-MM-DD at the start of any ISO string
                  // e.g. "2026-04-01T10:00:00.000Z"
                  //   or "2026-04-01"
                  const match = r.invoiceDate.match(
                    /^(\d{4})-(\d{2})-(\d{2})/
                  );
                  if (match) {
                    return new Date(
                      +match[1],      // year
                      +match[2] - 1,  // month (0-indexed)
                      +match[3],      // day
                      12, 0, 0        // noon — avoids ALL tz issues
                    );
                  }
                }

                // If it's a number (timestamp) — convert but
                // then normalize to local noon
                if (typeof r.invoiceDate === 'number') {
                  const d = new Date(r.invoiceDate);
                  if (isNaN(d.getTime())) return null;
                  return new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate(),
                    12, 0, 0
                  );
                }

                // Fallback — try generic parse + normalize
                const d = new Date(r.invoiceDate);
                if (isNaN(d.getTime())) return null;
                return new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate(),
                  12, 0, 0
                );
              })()
            })),
            meta: metaResult || null
          });
        }
      };

      rowsReq.onsuccess = () => { rowsResult = rowsReq.result; checkDone(); };
      rowsReq.onerror = () => { hasError = true; reject(rowsReq.error); };

      metaReq.onsuccess = () => { metaResult = metaReq.result; checkDone(); };
      metaReq.onerror = () => { hasError = true; reject(metaReq.error); };
    });
  } catch (e) {
    console.error("IndexedDB load failed", e);
    return { rows: [], meta: null };
  }
};

const saveRowsToStorage = async (rows, fileName) => {
  try {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(rows, `${CACHE_KEY}_rows`);
    store.put({
      fileName: fileName || "report.xlsx",
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
    }, `${CACHE_KEY}_meta`);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB save failed", e);
  }
};

const clearStorage = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(`${CACHE_KEY}_rows`);
    store.delete(`${CACHE_KEY}_meta`);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB clear failed", e);
  }
};

const SideFilterSection = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const toggle = (val) => {
    if (selected.includes(val))
      onChange(selected.filter(s => s !== val));
    else
      onChange([...selected, val]);
  };

  const visibleOptions = options.filter(opt =>
    opt?.toString().toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => {
            if (open) setSearch('');
            setOpen(!open);
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
            {label}
          </span>
          {(selected || []).length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {(selected || []).length}
            </span>
          )}
        </div>
        <ChevronDown 
          size={12} 
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pt-2 pb-1">
            {(options || []).length > 5 && (
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${label}...`}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-400 outline-none placeholder:text-gray-300"
              />
            )}

            <div className="flex gap-3 py-1">
                <FilterButton
                  onClick={() => onChange(options)}
                  label="All"
                  className="!px-2 !py-0.5 !text-xs"
                />
                <FilterButton
                  onClick={() => onChange([])}
                  label="None"
                  className="!px-2 !py-0.5 !text-xs"
                />
            </div>

            <div className="max-h-[180px] overflow-y-auto space-y-1 mt-1">
                {(visibleOptions || []).length === 0 ? (
                    <p className="text-xs text-gray-300 py-2 text-center">No results</p>
                ) : (
                    visibleOptions.map(opt => (
                        <FilterButton
                            key={opt}
                            isActive={selected.includes(opt)}
                            onClick={() => toggle(opt)}
                            label={opt}
                            className="w-full text-left truncate justify-start !py-1 px-2 !text-xs !font-medium"
                        />
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
};

const ActiveFiltersBar = ({ filters, setFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tags = [];

  // Date range — keep as single tag
  if (filters.fromDate || filters.toDate) {
    tags.push({
      id: 'date',
      label: `📅 ${filters.fromDate || '...'} → ${filters.toDate || '...'}`,
      clear: () => setFilters(f => ({
        ...f, fromDate: '', toDate: ''
      }))
    });
  }

  // Array filters — one tag PER VALUE
  const arrayFilters = [
    { key: 'branch',       label: 'Branch'    },
    { key: 'supervisor',   label: 'Supervisor' },
    { key: 'mrName',       label: 'SR'        },
    { key: 'line',         label: 'Line'      },
    { key: 'customerType', label: 'Type'      },
    { key: 'product',      label: 'Product'   },
    { key: 'customer',     label: 'Customer'  },
  ];

  arrayFilters.forEach(({ key, label }) => {
    const values = filters[key];
    if (!Array.isArray(values)) return;
    
    values.forEach(val => {
      tags.push({
        id: `${key}-${val}`,
        label: `${label}: ${val}`,
        clear: () => setFilters(f => ({
          ...f,
          [key]: f[key].filter(v => v !== val)
        }))
      });
    });
  });

  if (tags.length === 0) return null;

  return (
    <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-xs font-black text-blue-400 uppercase tracking-widest shrink-0">
            Active Filters ({tags.length}):
          </span>
          {!isExpanded && (
            <div className="flex gap-1 overflow-hidden">
               {tags.slice(0, 2).map(tag => (
                 <span key={tag.id} className="text-xs bg-white border border-blue-100 px-2 py-0.5 rounded text-blue-600 font-bold truncate max-w-[120px]">
                   {tag.label}
                 </span>
               ))}
               {tags.length > 2 && <span className="text-xs text-blue-400 font-bold">+{tags.length - 2} more</span>}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {tags.length > 0 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-black text-blue-600 hover:bg-blue-100 px-2 py-1 rounded uppercase tracking-tighter"
            >
              {isExpanded ? 'Collapse' : 'Show All'}
            </button>
          )}
          {tags.length > 1 && (
            <button
               onClick={() => setFilters({
                branch:[], supervisor:[],
                mrName:[], line:[],
                customerType:[], product:[],
                customer:[], 
                fromDate:'', toDate:''
              })}
              className="text-xs font-black text-red-500 hover:bg-red-50 px-2 py-1 rounded uppercase tracking-tighter"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-blue-100/50">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm max-w-[200px]">
              <span className="truncate" title={tag.label}>
                {tag.label}
              </span>
              <button
                onClick={tag.clear}
                className="text-blue-300 hover:text-red-500 transition-colors font-bold shrink-0 leading-none ml-0.5">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PRESET_COLORS = [
  { id: 'blue',    bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  { id: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  { id: 'rose',    bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
  { id: 'indigo',  bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500' },
  { id: 'violet',  bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500' }
];

const FilterProfilesManager = ({ 
  isOpen, 
  onClose, 
  profiles, 
  onSave, 
  onDelete, 
  onLoad, 
  currentFilters,
  editingProfile 
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [searchTerm, setSearchTerm] = useState('');
  const [localEditing, setLocalEditing] = useState(null);
  const [expandedProfiles, setExpandedProfiles] = useState({});

  useEffect(() => {
    if (editingProfile) {
      setName(editingProfile.name);
      setDesc(editingProfile.description || '');
      setSelectedColor(editingProfile.color || 'blue');
      setLocalEditing(editingProfile);
    } else {
      setName('');
      setDesc('');
      setSelectedColor('blue');
      setLocalEditing(null);
    }
  }, [editingProfile, isOpen]);

  const activeFiltersOnly = useMemo(() => {
    return Object.entries(currentFilters).filter(([k, v]) => 
      Array.isArray(v) ? v.length > 0 : v !== ''
    );
  }, [currentFilters]);

  const filteredProfiles = profiles.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id) => {
    setExpandedProfiles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: localEditing?.id || Date.now().toString(),
      name: name.trim(),
      description: desc.trim(),
      filters: localEditing ? localEditing.filters : { ...currentFilters },
      color: selectedColor,
      savedAt: new Date().toISOString()
    });
    setName('');
    setDesc('');
    setLocalEditing(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row border border-white/20">
        
        {/* LEFT: LIST */}
        <div className="flex-1 flex flex-col border-r border-gray-100 bg-gray-50/50">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <History className="text-blue-600" size={24} />
                  Saved Filter Profiles
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-1">Manage your analysis shortcuts ({profiles.length}/20)</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors block md:hidden">
                <X size={20}/>
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search profiles..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {filteredProfiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
                  <Filter size={32} />
                </div>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No profiles found</p>
                <p className="text-xs text-gray-400 mt-1">Start by saving your current filters</p>
              </div>
            ) : (
              filteredProfiles.map(profile => {
                const colorObj = PRESET_COLORS.find(c => c.id === profile.color) || PRESET_COLORS[0];
                const isExpanded = expandedProfiles[profile.id];
                
                const allFilterTags = [];
                Object.entries(profile.filters).forEach(([k, v]) => {
                  if (Array.isArray(v) && v.length > 0) {
                    v.forEach(val => allFilterTags.push({ key: k, value: val }));
                  } else if (typeof v === 'string' && v !== '' && k !== 'fromDate' && k !== 'toDate') {
                    allFilterTags.push({ key: k, value: v });
                  }
                });

                // Date ranges as special tags
                if (profile.filters.fromDate || profile.filters.toDate) {
                  allFilterTags.unshift({ key: 'date', value: `${profile.filters.fromDate || '...'} → ${profile.filters.toDate || '...'}` });
                }

                const visibleTags = isExpanded ? allFilterTags : allFilterTags.slice(0, 3);

                return (
                  <div key={profile.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorObj.dot}`} />
                        <h4 className="font-black text-gray-800 uppercase tracking-tight">{profile.name}</h4>
                        {JSON.stringify(profile.filters) === JSON.stringify(currentFilters) && (
                          <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Active</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => onLoad(profile)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Load Profile">
                          <CheckCircle2 size={16} />
                        </button>
                        <button 
                          onClick={() => setLocalEditing(profile)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Info">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm(`Delete profile "${profile.name}"?`)) onDelete(profile.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Profile">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {profile.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed italic">
                        "{profile.description}"
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-2">
                      {visibleTags.map((tag, idx) => (
                        <span key={idx} className="text-xs font-bold bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-md uppercase flex items-center gap-1 shrink-0">
                          <span className="text-gray-300 font-black">{tag.key}:</span> {tag.value}
                        </span>
                      ))}
                      {allFilterTags.length > 3 && (
                        <button 
                          onClick={() => toggleExpand(profile.id)}
                          className="text-xs font-black text-blue-600 hover:underline uppercase px-1">
                          {isExpanded ? 'Show Less' : `+ ${allFilterTags.length - 3} more`}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <div className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(profile.savedAt).toLocaleDateString()}
                      </div>
                      <button 
                        onClick={() => onLoad(profile)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${JSON.stringify(profile.filters) === JSON.stringify(currentFilters) ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                        Load Profile
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: SAVE FORM */}
        <div className="w-full md:w-[380px] flex flex-col bg-white">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
              {localEditing ? 'Update Profile' : 'Save As Profile'}
            </h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden md:block">
              <X size={20}/>
            </button>
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Filter Preview */}
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3 block">
                Current Filter Preview
              </span>
              {activeFiltersOnly.length === 0 ? (
                <p className="text-xs text-blue-300 font-medium italic">No active filters to save</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activeFiltersOnly.map(([k, v]) => (
                    <div key={k} className="bg-white border border-blue-100 px-2 py-1 rounded-lg shadow-sm">
                      <span className="text-xs font-bold text-blue-700 capitalize">{k}: </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {Array.isArray(v) ? v.join(', ') : v}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Profile Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sales Q3 - Pharma"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Description (Optional)</label>
                <textarea 
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Notes about these filters..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Choose Profile Color</label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColor(c.id)}
                      className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${c.bg} ${c.border} border-2 ${selectedColor === c.id ? 'scale-125 shadow-lg border-gray-900' : 'hover:scale-110'}`}
                    >
                      {selectedColor === c.id && <div className={`w-2 h-2 rounded-full bg-gray-900`} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <button 
              disabled={!name.trim() || (activeFiltersOnly.length === 0 && !localEditing)}
              onClick={handleSave}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-gray-900 transition-all shadow-xl flex items-center justify-center gap-2">
              <Save size={18} />
              {localEditing ? 'Update Selected Profile' : 'Save As Profile'}
            </button>
            {profiles.length >= 20 && !localEditing && (
              <p className="text-center text-xs text-red-500 font-bold uppercase mt-3">
                Profile limit reached (Max 20)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SideFiltersPanel = ({ isOpen, onClose, filters, setFilters, filterOptions, activeFilterCount, onManageProfiles, profiles }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 overflow-y-auto w-80 z-50 shadow-2xl transition-all">
        <div className="flex flex-col border-b border-gray-100 bg-white z-10 sticky top-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-500"/>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setFilters(f => ({ ...f, fromDate: '', toDate: '' }))}
                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                title="Reset date range to full period"
              >
                Full Period
              </button>
              <button 
                onClick={onManageProfiles}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Saved Filters">
                <History size={16} />
              </button>
              {activeFilterCount > 0 && (
                <FilterButton
                  onClick={() => setFilters({
                    branch:       [],
                    supervisor:   [],
                    mrName:       [],
                    line:         [],
                    customerType: [],
                    product:      [],
                    customer:     [],
                    fromDate:     '',
                    toDate:       ''
                  })}
                  label="Clear"
                />
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={16}/>
              </button>
            </div>
          </div>
        </div>
        
        {/* Quick Load Profiles Chips */}
        {profiles.length > 0 && (
          <div className="flex overflow-x-hidden gap-2 no-scrollbar scroll-smooth">
            {profiles.map(p => {
              const colorObj = PRESET_COLORS.find(c => c.id === p.color) || PRESET_COLORS[0];
              const isActive = JSON.stringify(p.filters) === JSON.stringify(filters);
              return (
                <FilterButton
                  key={p.id}
                  onClick={() => setFilters(p.filters)}
                  isActive={isActive}
                  label={p.name}
                  className={`shrink-0 !text-xs !px-2.5 !py-1 rounded-full border transition-all flex items-center gap-1.5 ${!isActive ? `${colorObj.bg} ${colorObj.text} ${colorObj.border} hover:scale-105 shadow-sm` : ''}`}
                >
                  {!isActive && <div className={`w-1.5 h-1.5 rounded-full ${colorObj.dot}`} />}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                  {p.name}
                </FilterButton>
              );
            })}
          </div>
        )}
      
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date Range</p>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">From</label>
              <input type="date" value={filters.fromDate} onChange={e => setFilters(f => ({...f, fromDate: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"/>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">To</label>
              <input type="date" value={filters.toDate} onChange={e => setFilters(f => ({...f, toDate: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"/>
            </div>
          </div>
        </div>

        {[ { label: 'Branch', key: 'branch', options: filterOptions.branches }, { label: 'Supervisor', key: 'supervisor', options: filterOptions.supervisors }, { label: 'SR', key: 'mrName', options: filterOptions.mrNames }, { label: 'Line', key: 'line', options: filterOptions.lines }, { label: 'Customer Type', key: 'customerType', options: filterOptions.customerTypes }, { label: 'Customer', key: 'customer', options: filterOptions.customers }, { label: 'Product', key: 'product', options: filterOptions.products } ].map(({ label, key, options }) => (
          <SideFilterSection key={key} label={label} options={options} selected={filters[key]} onChange={v => setFilters(f => ({...f, [key]: v}))} />
        ))}
      </div>
    </>
  );
};

const UploadChoiceModal = ({ onChoose, onCancel, existingCount }) => (
  <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
      <button 
        onClick={onCancel}
        className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors">
        <X size={20}/>
      </button>

      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">
        Upload Data
      </h2>
      <p className="text-sm text-gray-500 mb-6 font-medium">
        You already have <strong className="text-gray-800">{formatKpiGrouped(existingCount)}</strong> rows loaded.
        How would you like to handle the new file?
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <button 
          onClick={() => onChoose('append')}
          className="flex flex-col text-left p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-colors">
          <span className="font-black text-emerald-800 text-lg uppercase tracking-tight">
            ➕ Append Data
          </span>
          <span className="text-sm text-emerald-600 mt-1 font-medium">
            Add new rows. Duplicates will be skipped.
          </span>
        </button>

        <button 
          onClick={() => onChoose('replace')}
          className="flex flex-col text-left p-4 rounded-2xl border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors">
          <span className="font-black text-blue-800 text-lg uppercase tracking-tight">
            🔄 Replace All
          </span>
          <span className="text-sm text-blue-600 mt-1 font-medium">
            Clear existing data and load only the new file.
          </span>
        </button>
      </div>

      <button 
        onClick={onCancel}
        className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">
        Cancel Process
      </button>
    </div>
  </div>
);


const DropZone = ({ onUpload, onUploadClick }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Please upload an Excel or CSV file');
      return;
    }
    onUpload(file);
  };

  return (
    <div
      onClick={onUploadClick}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
      className={`p-12 bg-white border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-xl' 
          : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
        }`}
    >
      <Upload size={48} className={`mb-4 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
      <h3 className={`text-lg font-bold transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-700'}`}>
        {isDragging ? '🎯 Drop file here!' : 'Drop XLSX or CSV file here'}
      </h3>
      <p className="text-gray-400 text-sm mt-1">or click to browse</p>
      {isDragging && (
        <p className="text-blue-400 text-xs mt-2 font-semibold animate-pulse">
          Release to upload
        </p>
      )}
    </div>
  );
};

const DIMENSIONS = {
  'MR':         'mrName',
  'Product':    'productName',
  'Customer':   'customerName',
  'Line':       'lineName',
  'Branch':     'branch',
  'Supervisor': 'supervisor',
};

const SalesAnalyzer = () => {
  const [data, setData] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [drillModal, setDrillModal] = useState({
    open: false,
    type: null,
    data: null,
  });
  const [currentUploadMode, setCurrentUploadMode] = useState('replace');
  const [appendResult, setAppendResult] = useState(null);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [dataSources, setDataSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const uploadModeRef = useRef('replace');
  const [filterProfiles, setFilterProfiles] = useState([]);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [smartLoadAlert, setSmartLoadAlert] = useState(null);
  const [prodFullscreen, setProdFullscreen] = useState(false);
  const [mrFullscreen, setMrFullscreen] = useState(false);
  const [custFullscreen, setCustFullscreen] = useState(false);
  const [branchFullscreen, setBranchFullscreen] = useState(false);
  const PROFILES_KEY = 'salesAnalyzer_filterProfiles';

  // Load profiles from local storage
  useEffect(() => {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (saved) {
      try {
        setFilterProfiles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse filter profiles", e);
      }
    }
  }, []);

  const saveProfile = (profile) => {
    setFilterProfiles(prev => {
      const existsIdx = prev.findIndex(p => p.id === profile.id);
      let updated;
      if (existsIdx >= 0) {
        updated = [...prev];
        updated[existsIdx] = profile;
      } else {
        if (prev.length >= 20) return prev;
        updated = [profile, ...prev];
      }
      localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteProfile = (id) => {
    setFilterProfiles(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const loadProfile = (profile) => {
    const newFilters = { ...profile.filters };
    const missing = [];
    const applied = [];

    // Keys that map from filters state to filterOptions keys
    const mapping = [
      { key: 'branch', options: 'branches', label: 'Branch' },
      { key: 'supervisor', options: 'supervisors', label: 'Supervisor' },
      { key: 'mrName', options: 'mrNames', label: 'MR' },
      { key: 'line', options: 'lines', label: 'Line' },
      { key: 'customerType', options: 'customerTypes', label: 'Type' },
      { key: 'product', options: 'products', label: 'Product' },
      { key: 'customer', options: 'customers', label: 'Customer' },
    ];

    mapping.forEach(({ key, options, label }) => {
      if (Array.isArray(newFilters[key]) && newFilters[key].length > 0) {
        const validValues = newFilters[key].filter(val => 
          filterOptions[options].includes(val)
        );
        const invalidValues = newFilters[key].filter(val => 
          !filterOptions[options].includes(val)
        );
        
        if (invalidValues.length > 0) {
          invalidValues.forEach(v => missing.push(`${label}: "${v}"`));
        }
        
        if (validValues.length > 0) {
          newFilters[key] = validValues;
          applied.push(key);
        } else {
          newFilters[key] = [];
        }
      }
    });

    // Date filters always applied
    if (newFilters.fromDate || newFilters.toDate) applied.push('date');

    if (missing.length > 0) {
      if (applied.length === 0) {
        setSmartLoadAlert({
          type: 'error',
          title: 'Profile Load Failed',
          message: 'All saved filter values in this profile are missing from the current dataset.',
          missing
        });
        return;
      } else {
        setSmartLoadAlert({
          type: 'warning',
          title: 'Partial Load Successful',
          message: `${missing.length} filter values were not found in the current data and were skipped.`,
          missing
        });
      }
    } else {
      setSmartLoadAlert({
        type: 'success',
        title: 'Profile Loaded',
        message: 'All filters from this profile were applied successfully.'
      });
    }

    setFilters(newFilters);
  };

  useEffect(() => {
    if (!smartLoadAlert) return;
    const t = setTimeout(() => setSmartLoadAlert(null), 8000);
    return () => clearTimeout(t);
  }, [smartLoadAlert]);


  // Period Compare states
  const [periods, setPeriods] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [colorPopoverIdx, setColorPopoverIdx] = useState(null);
  
  // Performance Analysis States
  const [perfDimension, setPerfDimension] = useState('Product');
  const [perfMetric, setPerfMetric] = useState('netQty');
  const [perfSearch, setPerfSearch] = useState('');
  const [compareFullscreen, setCompareFullscreen] = useState(false);
  const [perfSortKey, setPerfSortKey] = useState('total');
  const [perfSortDir, setPerfSortDir] = useState('desc');
  const [perfChartType, setPerfChartType] = useState('bar');
  const [perfSelectedItems, setPerfSelectedItems] = useState([]); // Track selected rows for chart
  
  const [compareCollapsed, setCompareCollapsed] = useState({
    metrics: false,
    popShift: false,
    insights: false,
    volumeChart: false,
    trendChart: false,
    perfAnalysis: false
  });
  const toggleCompareCollapse = (key) => setCompareCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const [compareFontSize, setCompareFontSize] = useState('text-xs');
  const FONT_OPTIONS = [
    { label: 'Small', value: 'text-xs' },
    { label: 'Medium', value: 'text-sm' },
    { label: 'Large', value: 'text-base' },
    { label: 'X-Large', value: 'text-lg' }
  ];

  const [hiddenCols, setHiddenCols] = useState(() => {
    const defaultVal = {
      'By Product': [],
      'By SR': [],
      'By Customer': [],
      'By Branch': [],
      'Overview': []
    };
    try {
      const saved = localStorage.getItem('salesAnalyzer_hiddenCols');
      if (!saved) return defaultVal;
      const parsed = JSON.parse(saved);
      return {
        'By Product': Array.isArray(parsed['By Product']) ? parsed['By Product'] : [],
        'By SR': Array.isArray(parsed['By SR']) ? parsed['By SR'] : [],
        'By Customer': Array.isArray(parsed['By Customer']) ? parsed['By Customer'] : [],
        'By Branch': Array.isArray(parsed['By Branch']) ? parsed['By Branch'] : [],
        'Overview': Array.isArray(parsed['Overview']) ? parsed['Overview'] : []
      };
    } catch(e) {
      return defaultVal;
    }
  });

  useEffect(() => {
    localStorage.setItem('salesAnalyzer_hiddenCols', JSON.stringify(hiddenCols));
  }, [hiddenCols]);

  const toggleColumn = (tab, colId) => {
    setHiddenCols(prev => ({
      ...prev,
      [tab]: prev[tab] && prev[tab].includes(colId) ? prev[tab].filter(c => c !== colId) : [...(prev[tab] || []), colId]
    }));
  };

  useEffect(() => {
    if (compareFullscreen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => {
        if (e.key === 'Escape') setCompareFullscreen(false);
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [compareFullscreen]);

  const COMPARE_PRESETS_KEY = 'salesAnalyzer_comparePresets';
  const SAVED_CONFIGS_KEY = 'salesAnalyzer_savedConfigs';
  
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(COMPARE_PRESETS_KEY);
    if (saved) {
      try {
        setPeriods(JSON.parse(saved));
      } catch(e) {}
    }
    const savedConfigsList = localStorage.getItem(SAVED_CONFIGS_KEY);
    if (savedConfigsList) {
      try {
        setSavedConfigs(JSON.parse(savedConfigsList));
      } catch(e) {}
    }
  }, []);

  const saveComparePreset = (updatedPeriods) => {
    localStorage.setItem(COMPARE_PRESETS_KEY, JSON.stringify(updatedPeriods));
    setPeriods(updatedPeriods);
  };
  
  const handleSaveConfig = () => {
    if (!newConfigName.trim()) return;
    const newConfig = {
      id: Date.now().toString(),
      name: newConfigName,
      periods: JSON.parse(JSON.stringify(periods)),
      savedAt: new Date().toISOString()
    };
    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(updated));
    setNewConfigName("");
    setShowSaveModal(false);
    setSmartLoadAlert({ type: 'success', title: 'Config Saved', message: `Saved "${newConfigName}" successfully.` });
  };
  
  const handleLoadConfig = (config) => {
    let loadedCnt = 0;
    let droppedCnt = 0;
    const validPeriods = [];
    config.periods.forEach(p => {
 const fp = p.from.split('-');
const tp = p.to.split('-');
const fromD = new Date(+fp[0], +fp[1]-1, +fp[2], 0, 0, 0);
const toD = new Date(+tp[0], +tp[1]-1, +tp[2], 23, 59, 59);
       const hasData = filteredData.some(r => r.invoiceDate >= fromD && r.invoiceDate <= toD);
       if (hasData) {
          validPeriods.push(p);
          loadedCnt++;
       } else {
          droppedCnt++;
       }
    });
    saveComparePreset(validPeriods);
    setShowLoadModal(false);
    setSmartLoadAlert({
       type: droppedCnt === 0 ? 'success' : 'warning',
       title: 'Config Loaded',
       message: `Loaded ${loadedCnt} periods. ${droppedCnt > 0 ? `Dropped ${droppedCnt} period(s) that had NO data available currently.` : ''}`
    });
  };

  const closeDrill = () => setDrillModal({
    open: false, type: null, data: null
  });
  
  const [csvMeta, setCsvMeta] = useState(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const fileInputRef = useRef(null);
  const [filters, setFilters] = useState({
      branch: [], supervisor: [], mrName: [], 
      line: [], customerType: [], product: [],
      customer: [],
      fromDate: '', toDate: ''
  });
  
  useEffect(() => {
    if (!appendResult) return;
    const t = setTimeout(() => setAppendResult(null), 6000);
    return () => clearTimeout(t);
  }, [appendResult]);

  // Auto-load on mount
  useEffect(() => {
    loadRowsFromStorage().then(({ rows, meta }) => {
      if (rows.length > 0) {
        setData(rows);
        setCsvMeta(meta);
        setLoadedFromCache(true);
        console.log(`Auto-loaded ${rows.length} rows from cache`);
      }
    });
  }, []);

  const totalProducts = useMemo(() => new Set(data.map(d => d.productName)).size, [data]);
  const totalMRs = useMemo(() => new Set(data.map(d => d.mrName)).size, [data]);
  const filterOptions = useMemo(() => {
    return {
      branches: [...new Set(data.map(d => d.branch))].filter(Boolean).sort(),
      supervisors: [...new Set(data.map(d => d.supervisor))].filter(Boolean).sort(),
      mrNames: [...new Set(data.map(d => d.mrName))].filter(Boolean).sort(),
      lines: [...new Set(data.map(d => d.lineName))].filter(Boolean).sort(),
      customerTypes: [...new Set(data.map(d => d.customerType))].filter(Boolean).sort(),
      products: [...new Set(data.map(d => d.productName))].filter(Boolean).sort(),
      customers: [...new Set(data.map(d => d.customerName))].filter(Boolean).sort(),
    };
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let filtered = [...data];
    
    if ((filters.branch ?? []).length > 0) 
      filtered = filtered.filter(f => 
        filters.branch.includes(f.branch));
    
    if ((filters.supervisor ?? []).length > 0) 
      filtered = filtered.filter(f => 
        filters.supervisor.includes(f.supervisor));
    
    if ((filters.mrName ?? []).length > 0) 
      filtered = filtered.filter(f => 
        filters.mrName.includes(f.mrName));
    
    if ((filters.line ?? []).length > 0) 
      filtered = filtered.filter(f => 
        filters.line.includes(f.lineName));
    
    if ((filters.customerType ?? []).length > 0) 
      filtered = filtered.filter(f => 
        filters.customerType.includes(f.customerType));
    
    if ((filters.customer ?? []).length > 0) 
      filtered = filtered.filter(f => 
        filters.customer.includes(f.customerName));
    
    if ((filters.product ?? []).length > 0) 
      filtered = filtered.filter(f => 
        filters.product.includes(f.productName));
    

if (filters.fromDate) {
  const from = (() => { const p = filters.fromDate.split('-'); return new Date(+p[0], +p[1]-1, +p[2], 0, 0, 0); })();
  filtered = filtered.filter(f => f.invoiceDate >= from);
}

if (filters.toDate) {
  const to = (() => { const p = filters.toDate.split('-'); return new Date(+p[0], +p[1]-1, +p[2], 23, 59, 59); })();
  filtered = filtered.filter(f => f.invoiceDate <= to);
}
    
    return filtered;
  }, [data, filters]);

  const availableMonths = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return new Set();
    const set = new Set();
    filteredData.forEach(r => {
      const d = r.invoiceDate;
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(key);
      }
    });
    return set;
  }, [filteredData]);

  const valColor = (n) => (n < 0 ? 'text-red-600' : 'text-gray-900');
  const kpis = useMemo(() => {
    let netValue = 0, netQty = 0, returnsValue = 0, returnsQty = 0, salesValue = 0, salesQty = 0;
    if (filteredData && filteredData.length > 0) {
      filteredData.forEach(row => {
        netValue += row.netValue || 0;
        netQty += row.netQty || 0;
        returnsValue += Math.abs(row.returnValue || 0);
        returnsQty += Math.abs(row.returnQty || 0);
        salesValue += row.salesValue || 0;
        salesQty += row.salesQty || 0;
      });
    }
    const uniqueProducts = new Set((filteredData || []).map(d => d.productName)).size;
    return { netValue, netQty, returnsValue, returnsQty, salesValue, salesQty, uniqueProducts };
  }, [filteredData]);


  const [trendGroup, setTrendGroup] = useState('monthly');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [mrSearch, setMrSearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([k, v]) => Array.isArray(v) ? v.length > 0 : v !== '').length, [filters]);

const startDate = useMemo(() => {
  if (data.length === 0) return new Date();
  const d = new Date(Math.min(...data.map(d => d.invoiceDate)));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}, [data]);

const endDate = useMemo(() => {
  if (data.length === 0) return new Date();
  const d = new Date(Math.max(...data.map(d => d.invoiceDate)));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}, [data]);

  const byProduct = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const map = {};
    filteredData.forEach(row => {
      if (!map[row.productName]) {
        map[row.productName] = { 
          productName: row.productName, 
          salesQty: 0, salesValue: 0,
          returnQty: 0, returnValue: 0,
          netQty: 0, netValue: 0, 
          invoices: new Set() 
        };
      }
      map[row.productName].salesQty += row.salesQty;
      map[row.productName].salesValue += row.salesValue;
      map[row.productName].returnQty += Math.abs(row.returnQty);
      map[row.productName].returnValue += Math.abs(row.returnValue);
      map[row.productName].netQty += row.netQty;
      map[row.productName].netValue += row.netValue;
      map[row.productName].invoices.add(row.invoiceNo);
    });
    const total = Object.values(map).reduce((s,r) => s + r.netValue, 0);
    return Object.values(map).map(r => ({ ...r, invoiceCount: r.invoices.size, pct: total > 0 ? formatKpiPercent((r.netValue/total)*100) : '0.00' }));
  }, [filteredData]);

  const filteredByProduct = useMemo(() => {
    if (!productSearch.trim()) return byProduct;
    const q = productSearch.toLowerCase().trim();
    return byProduct.filter(p => p.productName.toLowerCase().includes(q));
  }, [byProduct, productSearch]);

  const { sorted: sortedProducts, sortKey: prodSortKey, sortDir: prodSortDir, toggle: prodToggle } = useSortableTable(filteredByProduct, 'netQty', 'desc');

  const topProductsByVal = useMemo(() => byProduct.slice(0, 10).map(p => ({name: p.productName.substring(0,20), val: p.netValue})), [byProduct]);
  const topProductsByQty = useMemo(() => byProduct.slice(0, 10).map(p => ({name: p.productName.substring(0,20), val: p.netQty})), [byProduct]);
  const customerTypeData = useMemo(() => [...new Set(filteredData.map(d=>d.customerType))].map(t => ({name: t, val: filteredData.filter(d=>d.customerType===t).reduce((acc,f)=>acc+f.netValue,0)})), [filteredData]);

  const byMR = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const map = {};
    filteredData.forEach(row => {
        if (!map[row.mrName]) {
            map[row.mrName] = { 
                mrName: row.mrName, supervisor: row.supervisor, branch: row.branch, 
                salesQty: 0, salesValue: 0,
                returnQty: 0, returnValue: 0,
                netQty: 0, netValue: 0, 
                customers: new Set(), invoices: new Set() 
            };
        }
        const m = map[row.mrName];
        m.salesQty += row.salesQty;
        m.salesValue += row.salesValue;
        m.returnQty += Math.abs(row.returnQty);
        m.returnValue += Math.abs(row.returnValue);
        m.netQty += row.netQty;
        m.netValue += row.netValue;
        m.customers.add(row.customerName);
        m.invoices.add(row.invoiceNo);
    });
    const total = Object.values(map).reduce((s,r) => s + r.netValue, 0);
    return Object.values(map).map(r => ({ ...r, customerCount: r.customers.size, invoiceCount: r.invoices.size, pct: total > 0 ? formatKpiPercent((r.netValue/total)*100) : '0.00' }));
  }, [filteredData]);

  const filteredByMR = useMemo(() => {
    if (!mrSearch.trim()) return byMR;
    const q = mrSearch.toLowerCase().trim();
    return byMR.filter(m => 
      m.mrName.toLowerCase().includes(q) || 
      m.supervisor.toLowerCase().includes(q) || 
      m.branch.toLowerCase().includes(q)
    );
  }, [byMR, mrSearch]);

  const { sorted: sortedMR, sortKey: mrSortKey, sortDir: mrSortDir, toggle: mrToggle } = useSortableTable(filteredByMR, 'netQty', 'desc');

  const byCustomer = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const map = {};
    filteredData.forEach(row => {
        const key = row.customerId || row.customerName;
        if (!map[key]) {
            map[key] = { 
              customerName: row.customerName, 
              customerType: row.customerType, 
              mrName: row.mrName, 
              branch: row.branch, 
              supervisor: row.supervisor,
              line: row.lineName,
              salesQty: 0, salesValue: 0,
              returnQty: 0, returnValue: 0,
              netQty: 0, netValue: 0, 
              products: new Set(), 
              lines: new Set(),
              supervisors: new Set(),
              mrs: new Set(),
              invoices: new Set(), 
              dates: [] 
            };
        }
        const c = map[key];
        c.salesQty += row.salesQty;
        c.salesValue += row.salesValue;
        c.returnQty += Math.abs(row.returnQty);
        c.returnValue += Math.abs(row.returnValue);
        c.netQty += row.netQty;
        c.netValue += row.netValue;
        c.products.add(row.productName);
        c.lines.add(row.lineName);
        c.supervisors.add(row.supervisor);
        c.mrs.add(row.mrName);
        c.invoices.add(row.invoiceNo);
        if (row.invoiceDate instanceof Date && !isNaN(row.invoiceDate)) c.dates.push(row.invoiceDate.getTime());
    });
    return Object.values(map).map(r => ({ 
      ...r, 
      productCount: r.products.size, 
      invoiceCount: r.invoices.size, 
      firstDate: r.dates.length > 0 ? (() => { const d = new Date(Math.min(...r.dates)); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0); })() : null,
      lastDate: r.dates.length > 0 ? (() => { const d = new Date(Math.max(...r.dates)); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0); })() : null
    }));
  }, [filteredData]);

  const filteredByCustomer = useMemo(() => {
    if (!customerSearch.trim()) return byCustomer;
    const q = customerSearch.toLowerCase().trim();
    return byCustomer.filter(c => c.customerName.toLowerCase().includes(q));
  }, [byCustomer, customerSearch]);

  const { sorted: sortedCustomers, sortKey: custSortKey, sortDir: custSortDir, toggle: custToggle } = useSortableTable(filteredByCustomer, 'netQty', 'desc');

  const handleUploadClick = () => {
    if (data.length > 0) {
      setShowUploadChoice(true);
    } else {
      uploadModeRef.current = 'replace';
      setCurrentUploadMode('replace');
      fileInputRef.current?.click();
    }
  };

  const handleUploadChoice = (mode) => {
    setCurrentUploadMode(mode);
    setShowUploadChoice(false);
    setTimeout(() => {
      uploadModeRef.current = mode;
      fileInputRef.current?.click();
    }, 150);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processFile(file, uploadModeRef.current);
  };

const processFile = async (file, mode) => {
    setIsLoading(true);
    setParsing(true);
    try {
      setProgress('Reading file...');
      const buffer = await file.arrayBuffer();
      
const wb = XLSX.read(buffer, { 
  type: 'array', 
  cellDates: false,   // ← اتركها false
  cellNF: false,
  cellText: false
});
      setProgress('Detecting headers...');
      const ws = wb.Sheets[wb.SheetNames[0]];
      
const rawData = XLSX.utils.sheet_to_json(ws, { 
  header: 1,
  raw: true,        // ← dates هتيجي كـ serial numbers
  defval: null
});
      const headerRowIndex = rawData.findIndex(row => row.includes("اسم الصنف") && row.includes("المندوب") && row.includes("رقم الفاتورة"));
      if (headerRowIndex === -1) { 
        alert("Could not detect valid headers."); 
        setParsing(false); 
        setIsLoading(false);
        return; 
      }
      const headers = rawData[headerRowIndex];
      const rows = rawData.slice(headerRowIndex + 1);
      setProgress(`Processing ${rows.length} rows...`);
      const parsedRows = rows.map(row => {
          const rowObj = {};
          headers.forEach((h, i) => { if (COLUMN_MAP[h]) rowObj[COLUMN_MAP[h]] = row[i]; });
          return rowObj;
      })
      .filter(row => row.productName)
      .map(row => {
          let netQty = parseFloat(row.netQty) || 0;
          let netValue = parseFloat(row.netValue) || 0;

          let salesQty = netQty > 0 ? netQty : 0;
          let returnQty = netQty < 0 ? Math.abs(netQty) : 0;

          let salesValue = netValue > 0 ? netValue : 0;
          let returnValue = netValue < 0 ? Math.abs(netValue) : 0;

          return {
              ...row,
              salesQty,
              salesValue,
              discountQty:   parseFloat(row.discountQty)   || 0,
              discountValue: parseFloat(row.discountValue) || 0,
              returnQty,
              returnValue,
              netQty,
              netValue,

     
invoiceDate: (() => {
  const raw = row.invoiceDate;
  if (!raw) return null;

  // With raw:true, Excel dates come as serial numbers
  // e.g. 46035 = 2026-04-28
  if (typeof raw === 'number') {
    // Excel serial: days since 1899-12-30
    // Use integer part only (strip time fraction)
    const days = Math.floor(raw);
    const epoch = new Date(1899, 11, 30); // Dec 30, 1899 LOCAL
    epoch.setDate(epoch.getDate() + days);
    return new Date(
      epoch.getFullYear(),
      epoch.getMonth(),
      epoch.getDate(),
      12, 0, 0  // local noon
    );
  }

  // String fallback e.g. "2026-04-28" or "2026-04-28 00:00:00"
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(+match[1], +match[2]-1, +match[3], 12, 0, 0);
    }
    // DD/MM/YYYY
    const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      return new Date(+dmy[3], +dmy[2]-1, +dmy[1], 12, 0, 0);
    }
  }

  return null;
})()
          };
      }).filter(r => r.invoiceNo);

      if (parsedRows.length === 0) {
        alert('No valid data found in file.');
        setParsing(false);
        setIsLoading(false);
        return;
      }

      let finalRows;
      let resultInfo;

      if (mode === 'append' && data.length > 0) {
        const existingKeys = new Set(
          data.map(r => {
            const inv = String(r.invoiceNo ?? '').trim();
            const prd = String(r.productCode ?? '').trim();
            const pnm = String(r.productName ?? '').trim();
            return `${inv}__${prd}__${pnm}`;
          })
        );

        const newRows = parsedRows.filter(r => {
          const inv = String(r.invoiceNo ?? '').trim();
          const prd = String(r.productCode ?? '').trim();
          const pnm = String(r.productName ?? '').trim();
          return !existingKeys.has(`${inv}__${prd}__${pnm}`);
        });
        finalRows = [...data, ...newRows];
        resultInfo = {
          mode:    'append',
          file:    file.name,
          added:   newRows.length,
          skipped: parsedRows.length - newRows.length,
          total:   finalRows.length,
        };
      } else {
        finalRows = parsedRows;
        resultInfo = {
          mode:  'replace',
          file:  file.name,
          added: parsedRows.length,
          total: parsedRows.length,
        };
        setDataSources([]);
      }

      setData(finalRows);
      setAppendResult(resultInfo);

      const fileDates = parsedRows
        .map(r => r.invoiceDate)
        .filter(d => d instanceof Date && !isNaN(d))
        .map(d => d.getTime());

      setDataSources(prev => {
        const base = mode === 'replace' ? [] : prev;
        return [...base, {
          fileName: file.name,
          rowCount: parsedRows.length,
          mode:     mode,
          dateFrom: fileDates.length
            ? (() => {
                const d = new Date(Math.min(...fileDates));
                return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
              })()
            : null,
          dateTo: fileDates.length
            ? (() => {
                const d = new Date(Math.max(...fileDates));
                return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
              })()
            : null,
        }];
      });

      await saveRowsToStorage(finalRows, file.name);
      setLoadedFromCache(true);
      
    } catch (err) {
      console.error('processFile error:', err);
      alert('Error reading file: ' + err.message);
    } finally {
      setIsLoading(false);
      setParsing(false);
    }
  };

  const fmt = (date) => (!date || !(date instanceof Date)) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const drillInvoices = useMemo(() => {
    if (!drillModal?.open || !drillModal?.data) return [];
    if (!filteredData || filteredData.length === 0) return [];
    
    const rows = drillModal.type === 'mr'
      ? filteredData.filter(r => 
          r.mrName === drillModal.data.mrName)
      : filteredData.filter(r =>
          r.customerName === drillModal.data.customerName);
  
    // Group by invoice
    const invMap = {};
    rows.forEach(row => {
      const k = row.invoiceNo;
      if (!invMap[k]) {
        invMap[k] = {
          invoiceNo:    row.invoiceNo,
          invoiceDate:  row.invoiceDate,
          customerName: row.customerName,
          customerId:   row.customerId,
          customerType: row.customerType,
          mrName:       row.mrName,
          supervisor:   row.supervisor,
          branch:       row.branch,
          lineName:     row.lineName,
          address:      row.customerAddress,
          netQty:       0,
          netValue:     0,
          returnQty:    0,
          returnValue:  0,
          salesQty:     0,
          salesValue:   0,
          products:     [],
        };
      }
      invMap[k].netQty      += row.netQty;
      invMap[k].netValue    += row.netValue;
      invMap[k].returnQty   += Math.abs(row.returnQty);
      invMap[k].returnValue += Math.abs(row.returnValue);
      invMap[k].salesQty    += row.salesQty;
      invMap[k].salesValue  += row.salesValue;
      invMap[k].products.push({
        productCode: row.productCode,
        productName: row.productName,
        netQty:      row.netQty,
        netValue:    row.netValue,
        salesQty:    row.salesQty,
        salesValue:  row.salesValue,
        returnQty:   Math.abs(row.returnQty),
        returnValue: Math.abs(row.returnValue),
      });
    });
  
    return Object.values(invMap)
      .sort((a,b) => b.invoiceDate - a.invoiceDate);
  
  }, [drillModal, filteredData]);
  
  const DrilldownModal = ({ 
    type, row, invoices = [], onClose, fmt 
  }) => {
  
    const [activeInvoice, setActiveInvoice] = 
      useState(null);
    const [viewMode, setViewMode] = useState('split'); // 'split', 'list', 'bill'
  
    const [invSort, setInvSort] = useState({
      key: 'invoiceDate', dir: 'desc'
    });

    const [invoiceSearch, setInvoiceSearch] = 
      useState('');
    
    const [productSearch, setProductSearch] = 
      useState('');
    
    const highlight = (text, query) => {
      if (!query?.trim() || !text) 
        return text;
      
      const str   = text.toString();
      const q     = query.trim();
      const idx   = str.toLowerCase()
                       .indexOf(q.toLowerCase());
      
      if (idx === -1) return str;
      
      return (
        <>
          {str.slice(0, idx)}
          <mark className="bg-yellow-200 
                           text-yellow-900 
                           rounded-sm px-0.5 
                           font-bold">
            {str.slice(idx, idx + q.length)}
          </mark>
          {str.slice(idx + q.length)}
        </>
      );
    };
  
    const sortedInvoices = useMemo(() => {
      return [...invoices].sort((a, b) => {
        const av = a[invSort.key];
        const bv = b[invSort.key];
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === 'string'
          ? av.localeCompare(bv)
          : av - bv;
        return invSort.dir === 'asc' ? cmp : -cmp;
      });
    }, [invoices, invSort]);

    const visibleInvoices = useMemo(() => {
      if (!invoiceSearch.trim()) 
        return sortedInvoices;
      
      const q = invoiceSearch
        .toLowerCase().trim();
      
      return sortedInvoices.filter(inv =>
        inv.invoiceNo?.toString()
           .toLowerCase().includes(q) ||
        inv.customerName?.toLowerCase()
           .includes(q)               ||
        inv.mrName?.toLowerCase()
           .includes(q)               ||
        inv.customerType?.toLowerCase()
           .includes(q)               ||
        inv.lineName?.toLowerCase()
           .includes(q)               ||
        inv.branch?.toLowerCase()
           .includes(q)               ||
        fmt(inv.invoiceDate)
           .toLowerCase().includes(q) ||
        inv.products.some(p => 
          p.productName?.toLowerCase().includes(q) || 
          p.productCode?.toString().toLowerCase().includes(q))
      );
    }, [sortedInvoices, invoiceSearch]);

    const visibleProducts = useMemo(() => {
      const products = activeInvoice?.products ?? [];
      if (!productSearch.trim()) return products;
      
      const q = productSearch
        .toLowerCase().trim();
      
      return products.filter(p =>
        p.productName?.toLowerCase()
         .includes(q) ||
        p.productCode?.toString()
         .toLowerCase().includes(q)
      );
    }, [activeInvoice, productSearch]);

    useEffect(() => {
      setProductSearch('');
    }, [activeInvoice?.invoiceNo]);
  
    const toggleSort = (key) => {
      setInvSort(prev => ({
        key,
        dir: prev.key === key && 
             prev.dir === 'desc' ? 'asc' : 'desc'
      }));
    };
  
    // Summary totals
    const totals = (invoices || []).reduce((acc, inv) => ({
      netQty:      acc.netQty + (inv.netQty || 0),
      netValue:    acc.netValue + (inv.netValue || 0),
      returnQty:   acc.returnQty + (inv.returnQty || 0),
      returnValue: acc.returnValue + (inv.returnValue || 0),
      salesQty:    acc.salesQty + (inv.salesQty || 0),
      salesValue:  acc.salesValue + (inv.salesValue || 0),
    }), { 
      netQty:0, netValue:0, returnQty:0, 
      returnValue:0, salesQty:0, salesValue:0 
    });
  
    // Close on backdrop click
    const handleBackdrop = (e) => {
      if (e.target === e.currentTarget) onClose();
    };
  
    // Close on Escape key
    useEffect(() => {
      const handler = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener(
        'keydown', handler);
    }, [onClose]);
  
    const title = type === 'mr'
      ? row.mrName
      : row.customerName;
  
    const subtitle = type === 'mr'
      ? `${row.supervisor} · ${row.branch}`
      : `${row.customerType} · ${row.branch}`;
  
    return (
      <div
        onClick={handleBackdrop}
        className="fixed inset-0 z-[100] 
                   bg-gray-100 backdrop-blur-md
                   flex flex-col
                   p-2 md:p-4">
  
        <div className="bg-white rounded-3xl 
                        shadow-2xl w-full h-full
                        flex flex-col
                        overflow-hidden border border-gray-200">
  
          {/* ── MODAL HEADER ── */}
          <div className="flex items-start 
                          justify-between 
                          px-6 py-5 
                          border-b border-gray-100
                          shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl
                  ${type === 'mr' 
                    ? 'bg-purple-100' 
                    : 'bg-blue-100'}`}>
                  {type === 'mr'
                    ? <Users size={18} 
                        className="text-purple-600"/>
                    : <Package size={18} 
                        className="text-blue-600"/>
                  }
                </div>
                <div>
                  <h2 className="text-lg font-black 
                                 text-gray-900">
                    {title}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {subtitle}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 
                         hover:text-gray-700
                         hover:bg-gray-100
                         p-2 rounded-xl 
                         transition-all">
              ✕
            </button>
          </div>
  
          {/* ── SUMMARY STRIP ── */}
          <div className="grid grid-cols-2 
                          md:grid-cols-4 
                          gap-0 
                          border-b border-gray-100
                          shrink-0">
            {[
              { label: 'Invoices', 
                value: formatKpiGrouped(invoices?.length || 0),
                color: 'text-gray-900' },
              { label: 'Sales QTY',
                value: formatKpiGrouped(totals.salesQty || totals.netQty),
                color: 'text-emerald-700' },
              { label: 'Sales Value',
                value: formatKpiGrouped(totals.salesValue || totals.netValue),
                color: 'text-gray-900',
                suffix: 'EGP' },
            ].map((s, i) => (
              <div key={s.label}
                className={`px-4 py-3 
                  ${i < 3 
                    ? 'border-r border-gray-100' 
                    : ''}`}>
                <p className="text-xs font-bold 
                              text-gray-400 uppercase 
                              tracking-widest">
                  {s.label}
                </p>
                <p className={`text-base font-black 
                               mt-0.5 ${s.color}`}>
                  {s.value}
                  {s.suffix && (
                    <span className="text-xs 
                                     font-normal 
                                     text-gray-400 
                                     ml-1">
                      {s.suffix}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
  
          {/* ── BODY: INVOICE LIST + DETAIL ── */}
          <div className="flex flex-1 
                          overflow-hidden relative">
  
            {/* LEFT — Invoice List */}
            <div className={`transition-all duration-300 border-r border-gray-100 overflow-y-auto flex flex-col
                            ${viewMode === 'list' ? 'flex-[3]' : viewMode === 'bill' ? 'w-0 opacity-0 overflow-hidden border-r-0' : 'w-[500px] shrink-0 lg:w-[45%]'}`}>
              
              {/* Search bar */}
              <div className="px-3 py-2.5 
                              border-b border-gray-100 
                              bg-white sticky top-0 z-20">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search 
                      size={12} 
                      className="absolute left-2.5 top-1/2 
                                 -translate-y-1/2 
                                 text-gray-300"/>
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={e => 
                        setInvoiceSearch(e.target.value)}
                      placeholder="Search invoices, customers..."
                      className="w-full pl-7 pr-7 py-1.5 
                                 text-xs border border-gray-200 
                                 rounded-lg outline-none
                                 focus:border-blue-400
                                 placeholder:text-gray-300"/>
                    {invoiceSearch && (
                      <button
                        onClick={() => setInvoiceSearch('')}
                        className="absolute right-2 top-1/2 
                                   -translate-y-1/2 
                                   text-gray-300 
                                   hover:text-gray-600">
                        ✕
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => setViewMode(v => v === 'list' ? 'split' : 'list')}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    title={viewMode === 'list' ? 'Restore Split View' : 'Expand List'}>
                    {viewMode === 'list' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
                
                {/* Result count */}
                <div className="flex items-center 
                                justify-between mt-1.5">
                  <p className="text-xs text-gray-400">
                    {invoiceSearch 
                      ? `${visibleInvoices.length} of ${sortedInvoices.length} invoices`
                      : `${sortedInvoices.length} invoices`
                    }
                  </p>
                  {invoiceSearch && 
                   visibleInvoices.length === 0 && (
                    <p className="text-xs 
                                  text-red-400 font-semibold">
                      No results
                    </p>
                  )}
                </div>
              </div>

              {/* Table header */}
              <div className="overflow-x-hidden">
              <table className="w-full text-left table-auto border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="bg-gray-100/80">
                    {[
                      { label: 'Invoice #', key: 'invoiceNo' },
                      { label: type === 'customer' ? 'SR' : 'Customer', key: type === 'customer' ? 'mrName' : 'customerName' },
                      { label: 'Date',      key: 'invoiceDate' },
                      { label: 'Sales Qty',  key: 'salesQty', className: 'text-right' },
                      { label: 'Sales Val',  key: 'salesValue', className: 'text-right' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className={`px-3 py-2
                          text-left text-[11px] md:text-xs 
                          font-black text-gray-500 
                          uppercase tracking-widest
                          cursor-pointer 
                          hover:bg-gray-200
                          select-none
                          whitespace-nowrap border-b border-gray-200 ${col.className || ''}`}>
                        <div className={`flex items-center gap-1 ${col.className?.includes('right') ? 'justify-end' : ''}`}>
                          {col.label}
                          <span className="text-gray-300">
                            {invSort.key === col.key
                              ? invSort.dir === 'asc'
                                ? '↑' : '↓'
                              : '↕'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleInvoices.map((inv, i) => (
                    <tr
                      key={inv.invoiceNo}
                      onClick={() => 
                        setActiveInvoice(
                          activeInvoice?.invoiceNo === 
                          inv.invoiceNo ? null : inv
                        )}
                      className={`border-b border-gray-50 cursor-pointer transition-colors group
                        ${activeInvoice?.invoiceNo === inv.invoiceNo
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : i % 2 === 0 
                            ? 'bg-white hover:bg-blue-50/30'
                            : 'bg-gray-50/30 hover:bg-blue-50/30'
                        }`}>
                      <td className="px-3 py-2.5 font-mono text-gray-900 font-bold text-[11px] md:text-xs whitespace-nowrap tabular-nums">
                        {highlight(inv.invoiceNo, invoiceSearch)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 font-bold text-[11px] md:text-xs whitespace-normal break-words">
                        {highlight(type === 'customer' ? inv.mrName : inv.customerName, invoiceSearch)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 font-medium text-[11px] md:text-xs whitespace-nowrap tabular-nums">
                        {fmt(inv.invoiceDate)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-gray-900 text-[11px] md:text-xs tabular-nums whitespace-nowrap">
                        <FormatNum val={inv.netQty} defaultClass="text-emerald-700" />
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-gray-900 text-[11px] md:text-xs tabular-nums whitespace-nowrap">
                        <FormatNum val={inv.netValue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
  
            {/* RIGHT — Invoice Detail */}
            <div className={`transition-all duration-300 flex-1 overflow-y-auto p-0 flex flex-col bg-gray-50/50
                            ${viewMode === 'bill' ? 'flex-[3]' : viewMode === 'list' ? 'w-0 opacity-0 overflow-hidden' : ''}`}>
              {!activeInvoice ? (
                <div className="h-full flex 
                  items-center justify-center 
                  text-gray-300">
                  <div className="text-center">
                    <p className="text-4xl mb-2">
                      🧾
                    </p>
                    <p className="font-semibold 
                                  text-sm">
                      Click an invoice
                    </p>
                    <p className="text-xs mt-1">
                      to see full product breakdown
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full bg-white">
                  {/* Bill Layout Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
                    <div className="flex items-center gap-3">
                       <button 
                         onClick={() => setViewMode(v => v === 'bill' ? 'split' : 'bill')}
                         className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                         title={viewMode === 'bill' ? 'Restore Split View' : 'Expand Bill Details'}>
                         {viewMode === 'bill' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                       </button>
                       <div>
                         <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Invoice Detail View</h3>
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">#{activeInvoice.invoiceNo} · {fmt(activeInvoice.invoiceDate)}</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setActiveInvoice(null)}
                      className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all">
                      ✕ Close Bill
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Invoice Meta Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                      {[
                        { label: 'Customer', value: activeInvoice.customerName, span: 'md:col-span-2' },
                        { label: 'Customer ID', value: activeInvoice.customerId || '—' },
                        { label: 'Type', value: activeInvoice.customerType },
                        { label: 'SR (Sales Rep)', value: activeInvoice.mrName, color: 'text-blue-600 font-black' },
                        { label: 'Branch', value: activeInvoice.branch },
                        { label: 'Line', value: activeInvoice.lineName },
                        { label: 'Supervisor', value: activeInvoice.supervisor },
                      ].map((item, idx) => (
                        <div key={idx} className={`bg-white p-4 rounded-2xl border border-gray-50 shadow-sm ${item.span || ''}`}>
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{item.label}</p>
                          <p className={`text-xs font-bold ${item.color || 'text-gray-800'}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Detailed Metrics Strip */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Sales Qty', val: activeInvoice.netQty, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Sales Val', val: activeInvoice.netValue, suffix: 'EGP', color: 'text-blue-900', bg: 'bg-blue-100/50' },
                      ].map((m, i) => (
                        <div key={i} className={`${m.bg} p-4 rounded-2xl border border-white/50 flex flex-col justify-between shadow-sm`}>
                          <div className="flex items-center justify-between mb-2">
                             <p className="text-xs font-black uppercase text-gray-400 tracking-widest">{m.label}</p>
                             {m.icon && <m.icon size={12} className={m.color} />}
                          </div>
                          <p className={`text-lg font-black tabular-nums ${m.color}`}>
                            <FormatNum val={m.val} showColor={false} />
                            {m.suffix && <span className="text-xs ml-1 font-bold text-gray-400">{m.suffix}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
  
                    {/* Products Breakdown */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div>
                          <h4 className="font-black text-gray-900 uppercase tracking-tight">Products Breakdown</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">{activeInvoice.products.length} unique items</p>
                        </div>
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                          <input
                            type="text"
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            placeholder="Filter products..."
                            className="pl-10 pr-4 py-2 border border-gray-100 rounded-xl text-xs outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all w-64"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-hidden">
                        <table className="w-full text-left font-sans">
                          <thead className="bg-gray-100/50">
                            <tr className="text-[11px] md:text-[12px] font-black text-gray-500 uppercase tracking-widest">
                              <th className="px-3 py-2">#</th>
                              <th className="px-3 py-2">Product Name</th>
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2 text-right">Sales Qty</th>
                              <th className="px-3 py-2 text-right">Sales Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleProducts.map((p, i) => (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-gray-300 font-mono text-[11px] md:text-[12px] tabular-nums">{i + 1}</td>
                                <td className="px-3 py-2">
                                  <p className="text-[11px] md:text-[12px] font-black text-gray-800 uppercase tracking-tight">{highlight(p.productName, productSearch)}</p>
                                </td>
                                <td className="px-3 py-2 font-mono text-[11px] md:text-[12px] text-gray-500 tabular-nums">{highlight(p.productCode, productSearch)}</td>
                                <td className="px-3 py-2 text-right font-black text-gray-900 text-[11px] md:text-[12px] tabular-nums">
                                  <FormatNum val={p.netQty} defaultClass="text-emerald-700" />
                                </td>
                                <td className="px-3 py-2 text-right font-black text-gray-900 text-[11px] md:text-[12px] tabular-nums border-l border-gray-50 bg-blue-50/20">
                                  <FormatNum val={p.netValue} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100/80 font-black">
                            <tr className="border-t-2 border-gray-200">
                               <td colSpan={3} className="px-3 py-2 text-gray-900 uppercase tracking-widest text-[11px] md:text-[12px]">Grand Totals</td>
                               <td className="px-3 py-2 text-right text-emerald-700 text-[11px] md:text-[12px] tabular-nums">
                                 {formatKpiGrouped(activeInvoice.netQty)}
                               </td>
                               <td className="px-3 py-2 text-right text-blue-900 text-[11px] md:text-[12px] tabular-nums bg-blue-100/30">
                                 {formatKpiGrouped(activeInvoice.netValue)}
                               </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
    


  const byBranch = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const map = {};
    filteredData.forEach(row => {
        if (!map[row.branch]) {
            map[row.branch] = { 
              branch: row.branch, 
              salesQty: 0, salesValue: 0,
              returnQty: 0, returnValue: 0,
              netQty: 0, netValue: 0, 
              mrs: new Set(), customers: new Set(), invoices: new Set() 
            };
        }
        const b = map[row.branch];
        b.salesQty += row.salesQty;
        b.salesValue += row.salesValue;
        b.returnQty += Math.abs(row.returnQty);
        b.returnValue += Math.abs(row.returnValue);
        b.netQty += row.netQty;
        b.netValue += row.netValue;
        b.mrs.add(row.mrName);
        b.customers.add(row.customerName);
        b.invoices.add(row.invoiceNo);
    });
    const total = Object.values(map).reduce((s,r) => s + r.netValue, 0);
    return Object.values(map).map(r => ({ ...r, mrCount: r.mrs.size, customerCount: r.customers.size, invoiceCount: r.invoices.size, pct: total > 0 ? formatKpiPercent((r.netValue/total)*100) : '0.00' }));
  }, [filteredData]);

  const filteredByBranch = useMemo(() => {
    if (!branchSearch.trim()) return byBranch;
    const q = branchSearch.toLowerCase().trim();
    return byBranch.filter(b => b.branch.toLowerCase().includes(q));
  }, [byBranch, branchSearch]);

  const { sorted: sortedBranch, sortKey: branchSortKey, sortDir: branchSortDir, toggle: branchToggle } = useSortableTable(filteredByBranch, 'netQty', 'desc');

  const trendData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
      const map = {};
      filteredData.forEach(row => {
          const d = row.invoiceDate;
          if (!(d instanceof Date) || isNaN(d)) return;
          const key = trendGroup === 'monthly' ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          if (!map[key]) map[key] = { period: key, netQty: 0, netValue: 0, salesQty: 0, salesValue: 0, invoices: new Set() };
          map[key].netQty += row.netQty;
          map[key].netValue += row.netValue;
          map[key].salesQty += row.salesQty || 0;
          map[key].salesValue += row.salesValue || 0;
          map[key].invoices.add(row.invoiceNo);
      });
      return Object.values(map).map(r => ({ ...r, invoiceCount: r.invoices.size })).sort((a,b) => a.period.localeCompare(b.period));
  }, [filteredData, trendGroup]);


  const handleReset = async () => { 
    await clearStorage(); 
    setData([]); 
    setCsvMeta(null); 
    setDataSources([]); 
    setFilters({branch: [], supervisor: [], mrName: [], line: [], customerType: [], product: [], customer: [], fromDate: '', toDate: ''}); 
  };

  if (parsing) return <div className="flex flex-col items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" /><h3 className="text-xl font-black">{progress}</h3></div>;

   if (data.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl mt-12 pb-20">
           <div className="mb-12 text-center px-4">
             <div className="inline-flex p-4 bg-[#F5C518]/10 rounded-2xl text-[#F5C518] mb-4 shadow-sm"><BarChart3 size={48} /></div>
             <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter uppercase italic">ATR SALES ANALYZER</h2>
             <p className="text-gray-500 text-xs sm:text-sm font-medium uppercase tracking-[0.2em] mt-2">v{APP_VERSION.version}</p>
          </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Choice Modal */}
        {showUploadChoice && (
          <UploadChoiceModal
            existingCount={data.length}
            onChoose={handleUploadChoice}
            onCancel={() => setShowUploadChoice(false)}
          />
        )}


<div className="p-12 bg-white border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 transition-colors" onClick={handleUploadClick}>
    <Upload size={48} className="text-gray-400 mb-4" />
    <h3 className="text-lg font-bold text-gray-700">Drop XLSX or CSV file here</h3>
    <p className="text-gray-400 text-sm mt-1">or click to browse</p>
</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Choice Modal */}
      {showUploadChoice && (
        <UploadChoiceModal
          existingCount={data.length}
          onChoose={handleUploadChoice}
          onCancel={() => setShowUploadChoice(false)}
        />
      )}

      {/* Smart Load Alert Toast */}
      {smartLoadAlert && (
        <div className="fixed bottom-6 right-6 z-[120] animate-in slide-in-from-bottom-5">
          <div className={`bg-white border-l-4 rounded-2xl shadow-2xl overflow-hidden w-[360px] ${smartLoadAlert.type === 'error' ? 'border-red-500' : smartLoadAlert.type === 'warning' ? 'border-amber-500' : 'border-emerald-500'}`}>
            <div className={`p-4 ${smartLoadAlert.type === 'error' ? 'bg-red-50' : smartLoadAlert.type === 'warning' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {smartLoadAlert.type === 'error' && <X size={18} className="text-red-600" />}
                  {smartLoadAlert.type === 'warning' && <Filter size={18} className="text-amber-600" />}
                  {smartLoadAlert.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600" />}
                  <h4 className={`text-sm font-black uppercase tracking-tight ${smartLoadAlert.type === 'error' ? 'text-red-700' : smartLoadAlert.type === 'warning' ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {smartLoadAlert.title}
                  </h4>
                </div>
                <button onClick={() => setSmartLoadAlert(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                {smartLoadAlert.message}
              </p>
            </div>
            
            {smartLoadAlert.missing && smartLoadAlert.missing.length > 0 && (
              <div className="p-4 bg-white max-h-[200px] overflow-y-auto">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Missing Filter Values:
                </p>
                <div className="space-y-1.5">
                  {smartLoadAlert.missing.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-500 font-medium">
                      <span className="text-red-400 mt-1 shrink-0">•</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="px-4 py-2 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSmartLoadAlert(null)}
                className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">
                Dismiss (Auto-close in 8s)
              </button>
            </div>
          </div>
        </div>
      )}

      {drillModal.open && (
        <DrilldownModal
          type={drillModal.type}
          row={drillModal.data}
          invoices={drillInvoices}
          onClose={closeDrill}
          fmt={fmt}
        />
      )}
      {/* Upload Toast */}
      {appendResult && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-start gap-4 max-w-sm">
            <div className="bg-emerald-500/20 p-2 rounded-xl shrink-0 mt-0.5">
              <span className="text-emerald-400 text-lg font-bold">✓</span>
            </div>
            <div>
              <p className="font-bold text-sm">
                {appendResult.mode === 'append' ? 'Data Appended' : 'Data Loaded'}
              </p>
              <div className="text-xs text-gray-300 mt-1 space-y-0.5">
                <p>Added: <span className="font-bold text-white">{formatKpiGrouped(appendResult.added)}</span> rows</p>
                {appendResult.mode === 'append' && (
                  <p>Skipped (dupes): <span className="text-gray-400">{formatKpiGrouped(appendResult.skipped)}</span></p>
                )}
                <p>Total: <span className="font-bold text-white">{formatKpiGrouped(appendResult.total)}</span> rows</p>
              </div>
            </div>
            <button 
              onClick={() => setAppendResult(null)}
              className="text-gray-400 hover:text-white transition-colors ml-auto">
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-200 shrink-0 gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight truncate italic">ATR Sales Analysis</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold uppercase tracking-wider border border-blue-100">
              <History size={10} /> {formatKpiGrouped(data.length)} Invoices
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold uppercase tracking-wider border border-purple-100">
              <Package size={10} /> {totalProducts} Products
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold uppercase tracking-wider border border-emerald-100">
              <Users size={10} /> {totalMRs} SRs
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-bold uppercase tracking-wider border border-amber-100">
              <Calendar size={10} /> {formatDate(startDate)} → {formatDate(endDate)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterButton
            onClick={() => setIsSidebarOpen(true)}
            isActive={isSidebarOpen}
            className="shrink-0 !px-2.5"
            title="Open Filters Sidebar"
            variant="filter"
          >
            <Filter size={14} />
          </FilterButton>
          {/* Always visible upload button */}
          <button
            onClick={handleUploadClick}
            disabled={isLoading}
            className="flex items-center gap-2 
                       bg-blue-600 hover:bg-blue-700
                       disabled:bg-blue-300
                       text-white text-xs font-black 
                       uppercase tracking-widest
                       px-3 py-2 rounded-xl 
                       transition-all shadow-sm
                       shrink-0">
            {isLoading 
              ? <span className="animate-spin">⏳</span>
              : <Upload size={13}/>
            }
            {isLoading 
              ? 'Processing...'
              : data.length > 0 
                ? '' 
                : 'Upload'
            }
          </button>
          <FilterButton 
            onClick={handleReset} 
            className="!px-2.5"
            title="Reset All Information (Delete Cache)"
          >
            <RefreshCw size={13}/>
          </FilterButton>
        </div>
      </div>

      {dataSources.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100 shrink-0 overflow-x-hidden rounded-3xl mt-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm shrink-0"
          >
            <Filter size={12} />
            Filters
          </button>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">
            Files:
          </span>
          {dataSources.map((src, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-full shrink-0 text-xs shadow-sm">
              <span>{src.mode === 'append' ? '➕' : '📄'}</span>
              <span className="font-semibold text-gray-700 max-w-[100px] truncate" title={src.fileName}>
                {src.fileName.replace(/\.(xlsx|xls|csv)$/i, '')}
              </span>
              {src.dateFrom && src.dateTo && (
                <span className="text-gray-400">
                  {src.dateFrom.toLocaleDateString('en-GB', { month:'short', year:'2-digit' })} → {src.dateTo.toLocaleDateString('en-GB', { month:'short', year:'2-digit' })}
                </span>
              )}
            </span>
          ))}
          {dataSources.length > 1 && (
            <span className="text-xs font-black text-emerald-600 ml-2">
              {formatKpiGrouped(data.length)} total rows
            </span>
          )}
        </div>
      )}


      
<div className="flex flex-1 min-w-0 overflow-x-hidden">
  <SideFiltersPanel 
    isOpen={isSidebarOpen}
    onClose={() => setIsSidebarOpen(false)}
    filters={filters} 
    setFilters={setFilters} 
    filterOptions={filterOptions} 
    activeFilterCount={activeFilterCount}
    onManageProfiles={() => setShowProfileManager(true)}
    profiles={filterProfiles}
  />
  <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden">
          <ActiveFiltersBar filters={filters} setFilters={setFilters} />
          
          <FilterProfilesManager 
            isOpen={showProfileManager}
            onClose={() => setShowProfileManager(false)}
            profiles={filterProfiles}
            onSave={saveProfile}
            onDelete={deleteProfile}
            onLoad={loadProfile}
            currentFilters={filters}
          />
          <div className="px-4 py-2">
            <button 
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="md:hidden w-full flex items-center justify-between text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isSummaryExpanded ? 'Hide Summary & Tools' : 'Show Summary & Tools'}
              <ChevronDown size={14} className={`transition-transform ${isSummaryExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className={`space-y-3 ${isSummaryExpanded ? 'block' : 'hidden md:block'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                {[
                  { label: 'Sales Units', value: formatKpiGrouped(kpis.salesQty), suffix: 'U', sub: formatKpiGrouped(kpis.salesValue) + ' EGP', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', negative: false },
                  { label: 'Return Units', value: formatKpiGrouped(kpis.returnsQty), suffix: 'U', sub: formatKpiGrouped(kpis.returnsValue) + ' EGP', icon: Package, color: 'text-red-600', bg: 'bg-red-50', negative: true },
                  { label: 'Sales Value', value: formatKpiGrouped(kpis.salesValue), suffix: 'EGP', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', negative: false },
                  { label: 'Products', value: kpis.uniqueProducts, suffix: 'P', sub: formatKpiGrouped(filteredData.length) + ' Invs', icon: Grid, color: 'text-purple-600', bg: 'bg-purple-50', negative: false },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2.5 flex items-center gap-2.5 min-w-0">
                  <div className={`${card.bg} p-1.5 rounded-md shrink-0`}><card.icon size={14} className={card.color}/></div>
                  <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5 truncate">{card.label}</p>
                      <p className={`text-[15px] font-black leading-tight truncate ${card.negative ? 'text-red-600' : 'text-gray-900'}`}>{card.value}<span className="text-xs font-semibold text-gray-400 ml-0.5">{card.suffix}</span></p>
                      {card.sub && <p className="text-xs text-gray-400 mt-0.5 truncate font-medium">{card.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pb-3 shrink-0 flex-wrap">
              {['Overview','By Product','By SR','By Customer','By Branch','Trend', 'Compare', 'Reports'].map(tab => (
                <FilterButton 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  isActive={activeTab === tab}
                  label={tab}
                />
              ))}
            </div>
            </div>
          </div>

<div className="flex-1 px-3 md:px-4 pb-16 min-w-0 overflow-x-hidden">
          <div className="bg-white p-3 md:p-4 rounded-3xl border border-gray-200">
              {activeTab === 'Overview' && (
                <FullscreenWrapper title="Overview">
                  <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="h-[300px]">
                              <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Sales Value)</h4>
                              <ResponsiveContainer><BarChart data={topProductsByVal}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="val" fill="#3B82F6" /></BarChart></ResponsiveContainer>
                          </div>
                          <div className="h-[300px]">
                              <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Net Units)</h4>
                              <ResponsiveContainer><BarChart data={topProductsByQty}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="val" fill="#10B981" /></BarChart></ResponsiveContainer>
                          </div>
                      </div>
                  </div>
                </FullscreenWrapper>
              )}
                      {activeTab === 'By Product' && (
                  <FullscreenWrapper 
                    title="By Product"
                    isFullscreen={prodFullscreen}
                    onToggleFullscreen={setProdFullscreen}
                    showButton={false}
                  >
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="shrink-0">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Product Breakdown</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">{filteredData.length} records</p>
                              </div>
                              <div className="flex flex-1 items-center gap-3 max-w-3xl">
                                <div className="relative flex-1 group">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                                  <input 
                                    value={productSearch} 
                                    onChange={e=>setProductSearch(e.target.value)} 
                                    placeholder="Search product..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all font-sans" 
                                  />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={() => setProdFullscreen(true)} 
                                    className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black text-gray-700 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-2xl transition-all active:scale-95 uppercase tracking-widest shadow-sm"
                                  >
                                    <Maximize2 size={12} className="text-gray-400" />
                                    Fullscreen
                                  </button>
                                  <ColumnSelectionMenu 
                                    columns={[
                                        { id: 'netQty', label: 'Sales Qty' },
                                        { id: 'netValue', label: 'Sales Val' },
                                        { id: 'pct', label: '%' },
                                    ]}
                                    hiddenCols={hiddenCols['By Product']}
                                    toggleColumn={(colId) => toggleColumn('By Product', colId)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        
<div className="overflow-x-auto w-full max-w-full no-scrollbar">
  <div className="max-h-[60vh] overflow-y-auto">
    <table className={`${TABLE_BASE} table-auto w-full`}>
                                 <thead className={`sticky top-0 z-10 ${THEAD_ROW} bg-gray-50`}>
                                   <tr>
                                     <th className={`${TH_BASE} w-8`}>#</th>
                                     <th className={`${TH_BASE} min-w-[120px] cursor-pointer hover:bg-gray-200`} onClick={() => prodToggle('productName')}>Product {prodSortKey === 'productName' ? (prodSortDir === 'desc' ? '↓' : '↑') : ''}</th>
                                     {!hiddenCols['By Product'].includes('netQty') && <th className={`${TH_BASE} text-right min-w-[70px] cursor-pointer hover:bg-gray-200`} onClick={() => prodToggle('netQty')}>Sales QTY</th>}
                                     {!hiddenCols['By Product'].includes('netValue') && <th className={`${TH_BASE} text-right min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => prodToggle('netValue')}>Sales VAL</th>}
                                     {!hiddenCols['By Product'].includes('pct') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => prodToggle('pct')}>%</th>}
                                   </tr>
                                 </thead>
                                 <tbody>{sortedProducts.map((p, i) => <tr key={p.productName} className={`border-b ${i<3 ? (i===0?'border-l-4 border-l-yellow-400':i===1?'border-l-4 border-l-gray-400':'border-l-4 border-l-orange-400'):''} hover:bg-blue-50/50 transition-colors`}>
                                     <td className={`${TD_BASE} w-8`}>{i+1}</td>
                                     <td className={`${TD_TEXT} min-w-[120px]`} title={p.productName}>{p.productName}</td>
                                     {!hiddenCols['By Product'].includes('netQty') && <td className={`${TD_NUM}`}><FormatNum val={p.salesQty || p.netQty} defaultClass="text-emerald-700" /></td>}
                                     {!hiddenCols['By Product'].includes('netValue') && <td className={`${TD_NUM}`}><FormatNum val={p.salesValue || p.netValue} defaultClass="text-blue-700" /></td>}
                                     {!hiddenCols['By Product'].includes('pct') && <td className={`${TD_NUM}`}>{p.pct}%</td>}
                                   </tr>)}</tbody>
                             </table>
  </div>
</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Sales Qty)</h4><ResponsiveContainer height={260}><BarChart data={sortedProducts.slice(0,10)} layout="vertical" margin={{left: 40}}><XAxis type="number" fontSize={10} /><YAxis dataKey="productName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="salesQty" fill="#10B981" /></BarChart></ResponsiveContainer></div>
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Sales Value)</h4><ResponsiveContainer height={260}><BarChart data={sortedProducts.slice(0,10)} layout="vertical" margin={{left: 40}}><XAxis type="number" fontSize={10} /><YAxis dataKey="productName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="salesValue" fill="#3B82F6" /></BarChart></ResponsiveContainer></div>
                      </div>
                    </div>
                  </FullscreenWrapper>
                )}
                {activeTab === 'By SR' && (
                  <FullscreenWrapper 
                    title="By SR"
                    isFullscreen={mrFullscreen}
                    onToggleFullscreen={setMrFullscreen}
                    showButton={false}
                  >
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="shrink-0">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">SR Breakdown</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">{filteredData.length} records</p>
                              </div>
                              <div className="flex flex-1 items-center gap-3 max-w-3xl">
                                <div className="relative flex-1 group">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                                  <input 
                                    value={mrSearch} 
                                    onChange={e=>setMrSearch(e.target.value)} 
                                    placeholder="Search SR, supervisor or branch..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all font-sans" 
                                  />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={() => setMrFullscreen(true)} 
                                    className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black text-gray-700 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-2xl transition-all active:scale-95 uppercase tracking-widest shadow-sm"
                                  >
                                    <Maximize2 size={12} className="text-gray-400" />
                                    Fullscreen
                                  </button>
                                  <ColumnSelectionMenu 
                                    columns={[
                                        { id: 'mrName', label: 'SR' },
                                        { id: 'supervisor', label: 'Supervisor' },
                                        { id: 'branch', label: 'Branch' },
                                        { id: 'customerCount', label: 'Cust' },
                                        { id: 'invoiceCount', label: 'Inv' },
                                        { id: 'netQty', label: 'Sales QTY' },
                                        { id: 'netValue', label: 'Sales VAL' },
                                        { id: 'pct', label: '%' },
                                    ]}
                                    hiddenCols={hiddenCols['By SR']}
                                    toggleColumn={(colId) => toggleColumn('By SR', colId)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          
<div className="w-full max-w-full overflow-x-auto no-scrollbar">
  <div className="max-h-[60vh] overflow-y-auto">
    <table className={`${TABLE_BASE} table-auto w-full`}>
      <thead className={`sticky top-0 z-10 ${THEAD_ROW} bg-gray-50`}>
                                <tr>
                                  <th className={`${TH_BASE} w-8`}>#</th>
                                  <th className={`${TH_BASE} min-w-[120px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('mrName')}>SR {mrSortKey === 'mrName' ? (mrSortDir === 'desc' ? '↓' : '↑') : ''}</th>
                                  {!hiddenCols['By SR'].includes('supervisor') && <th className={`${TH_BASE} min-w-[100px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('supervisor')}>Supervisor</th>}
                                  {!hiddenCols['By SR'].includes('branch') && <th className={`${TH_BASE} min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('branch')}>Branch</th>}
                                  {!hiddenCols['By SR'].includes('customerCount') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('customerCount')}>Cust</th>}
                                  {!hiddenCols['By SR'].includes('invoiceCount') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('invoiceCount')}>Inv</th>}
                                  {!hiddenCols['By SR'].includes('netQty') && <th className={`${TH_BASE} text-right min-w-[70px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('netQty')}>Sales QTY</th>}
                                  {!hiddenCols['By SR'].includes('netValue') && <th className={`${TH_BASE} text-right min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('netValue')}>Sales VAL</th>}
                                  {!hiddenCols['By SR'].includes('pct') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => mrToggle('pct')}>%</th>}
                                </tr>
                              </thead>
                              <tbody>{sortedMR.map((m, i) => (
                                <tr key={m.mrName} 
                                  onClick={() => setDrillModal({ open: true, type: 'mr', data: m })}
                                  className="border-b hover:bg-blue-50/50 cursor-pointer transition-colors">
                                  <td className={`${TD_BASE} w-8`}>{i+1}</td>
                                  <td className={`${TD_TEXT} min-w-[120px]`} title={m.mrName}>{m.mrName}</td>
                                  {!hiddenCols['By SR'].includes('supervisor') && <td className={`${TD_TEXT} min-w-[100px]`} title={m.supervisor}>{m.supervisor}</td>}
                                  {!hiddenCols['By SR'].includes('branch') && <td className={`${TD_TEXT} min-w-[80px]`} title={m.branch}>{m.branch}</td>}
                                  {!hiddenCols['By SR'].includes('customerCount') && <td className={`${TD_NUM}`}>{m.customerCount}</td>}
                                  {!hiddenCols['By SR'].includes('invoiceCount') && <td className={`${TD_NUM}`}>{m.invoiceCount}</td>}
                                  {!hiddenCols['By SR'].includes('netQty') && <td className={`${TD_NUM}`}><FormatNum val={m.salesQty || m.netQty} defaultClass="text-emerald-700" /></td>}
                                  {!hiddenCols['By SR'].includes('netValue') && <td className={`${TD_NUM}`}><FormatNum val={m.salesValue || m.netValue} defaultClass="text-blue-700" /></td>}
                                  {!hiddenCols['By SR'].includes('pct') && <td className={`${TD_NUM}`}>{m.pct}%</td>}
                                </tr>
                              ))}</tbody>
                  
    </table>
  </div>
</div>

                      </div>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                          <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 SRs (Sales Qty)</h4>
                          <ResponsiveContainer height={260}>
                              <BarChart data={sortedMR.slice(0,10)} layout="vertical" margin={{left: 60}}>
                                  <XAxis type="number" fontSize={10} />
                                  <YAxis dataKey="mrName" type="category" fontSize={10} />
                                  <Tooltip />
                                  <Bar dataKey="netQty" fill="#8B5CF6" />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                    </div>
                  </FullscreenWrapper>
                )}
              {activeTab === 'By Customer' && (
                  <FullscreenWrapper 
                    title="By Customer"
                    isFullscreen={custFullscreen}
                    onToggleFullscreen={setCustFullscreen}
                    showButton={false}
                  >
                    <div className="space-y-6 w-full">
                      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="shrink-0">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Customer Breakdown</h3>
                              </div>
                              <div className="flex flex-1 items-center gap-3 max-w-3xl">
                                <div className="relative flex-1 group">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                                  <input 
                                    value={customerSearch} 
                                    onChange={e=>setCustomerSearch(e.target.value)} 
                                    placeholder="Search customer..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all font-sans" 
                                  />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={() => setCustFullscreen(true)} 
                                    className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black text-gray-700 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-2xl transition-all active:scale-95 uppercase tracking-widest shadow-sm"
                                  >
                                    <Maximize2 size={12} className="text-gray-400" />
                                    Fullscreen
                                  </button>
                                  <ColumnSelectionMenu 
                                    columns={[
                                        { id: 'customerType', label: 'Type' },
                                        { id: 'branch', label: 'Branch' },
                                        { id: 'invoiceCount', label: 'Invoices' },
                                        { id: 'firstDate', label: 'First Date' },
                                        { id: 'lastDate', label: 'Last Date' },
                                        { id: 'productCount', label: 'Products' },
                                        { id: 'netQty', label: 'Sales Qty' },
                                        { id: 'netValue', label: 'Sales Val' },
                                        { id: 'mrName', label: 'SR' },
                                    ]}
                                    hiddenCols={hiddenCols['By Customer']}
                                    toggleColumn={(colId) => toggleColumn('By Customer', colId)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                            <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                                    <table className={`${TABLE_BASE} table-auto w-full`}>
                                      <thead className={`sticky top-0 z-10 ${THEAD_ROW} bg-gray-50`}>
                                        <tr>
                                          <th className={`${TH_BASE} w-8`}>#</th>
                                          <th className={`${TH_BASE} min-w-[150px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('customerName')}>Customer Name {custSortKey === 'customerName' ? (custSortDir === 'desc' ? '↓' : '↑') : ''}</th>
                                          {!hiddenCols['By Customer'].includes('customerType') && <th className={`${TH_BASE} min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('customerType')}>Type</th>}
                                          {!hiddenCols['By Customer'].includes('branch') && <th className={`${TH_BASE} min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('branch')}>Branch</th>}
                                          {!hiddenCols['By Customer'].includes('invoiceCount') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('invoiceCount')}>Invs</th>}
                                          {!hiddenCols['By Customer'].includes('firstDate') && <th className={`${TH_BASE} min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('firstDate')}>First Seen</th>}
                                          {!hiddenCols['By Customer'].includes('lastDate') && <th className={`${TH_BASE} min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('lastDate')}>Last Seen</th>}
                                          {!hiddenCols['By Customer'].includes('productCount') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('productCount')}>Prods</th>}
                                          {!hiddenCols['By Customer'].includes('netQty') && <th className={`${TH_BASE} text-right min-w-[70px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('netQty')}>Sales QTY</th>}
                                          {!hiddenCols['By Customer'].includes('netValue') && <th className={`${TH_BASE} text-right min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('netValue')}>Sales VAL</th>}
                                          {!hiddenCols['By Customer'].includes('mrName') && <th className={`${TH_BASE} min-w-[120px] cursor-pointer hover:bg-gray-200`} onClick={() => custToggle('mrName')}>SR {custSortKey === 'mrName' ? (custSortDir === 'desc' ? '↓' : '↑') : ''}</th>}
                                        </tr>
                                      </thead>
                              <tbody>
                                {(sortedCustomers || []).slice(0, 50).map((c, i) => (
                                  <tr key={c.customerName || i} 
                                    onClick={() => setDrillModal({ open: true, type: 'customer', data: c })}
                                    className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors">
                                    <td className={`${TD_BASE} w-8`}>{i+1}</td>
                                    <td className={`${TD_TEXT} min-w-[150px]`} title={c.customerName}>{c.customerName || '—'}</td>
                                    {!hiddenCols['By Customer'].includes('customerType') && <td className={`${TD_TEXT} min-w-[80px]`} title={c.customerType}>{c.customerType || '—'}</td>}
                                    {!hiddenCols['By Customer'].includes('branch') && <td className={`${TD_TEXT} min-w-[80px]`} title={c.branch}>{c.branch || '—'}</td>}
                                    {!hiddenCols['By Customer'].includes('invoiceCount') && <td className={`${TD_NUM}`}><FormatNum val={c.invoiceCount} /></td>}
                                    {!hiddenCols['By Customer'].includes('firstDate') && <td className={`${TD_NUM} min-w-[80px]`}>{fmt(c.firstDate)}</td>}
                                    {!hiddenCols['By Customer'].includes('lastDate') && <td className={`${TD_NUM} min-w-[80px]`}>{fmt(c.lastDate)}</td>}
                                    {!hiddenCols['By Customer'].includes('productCount') && <td className={`${TD_NUM}`}>{c.productCount}</td>}
                                    {!hiddenCols['By Customer'].includes('netQty') && <td className={`${TD_NUM}`}><FormatNum val={c.salesQty || c.netQty} defaultClass="text-emerald-700" /></td>}
                                    {!hiddenCols['By Customer'].includes('netValue') && <td className={`${TD_NUM}`}><FormatNum val={c.salesValue || c.netValue} defaultClass="text-blue-700" /></td>}
                                    {!hiddenCols['By Customer'].includes('mrName') && <td className={`${TD_TEXT} min-w-[120px]`} title={c.mrName}>{c.mrName || '—'}</td>}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </FullscreenWrapper>
                )}
                {activeTab === 'By Branch' && (
                  <FullscreenWrapper 
                    title="By Branch"
                    isFullscreen={branchFullscreen}
                    onToggleFullscreen={setBranchFullscreen}
                    showButton={false}
                  >
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="shrink-0">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Branch Breakdown</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">{filteredData.length} records</p>
                              </div>
                              <div className="flex flex-1 items-center gap-3 max-w-3xl">
                                <div className="relative flex-1 group">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                                  <input 
                                    value={branchSearch} 
                                    onChange={e=>setBranchSearch(e.target.value)} 
                                    placeholder="Search branch..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all font-sans" 
                                  />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={() => setBranchFullscreen(true)} 
                                    className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black text-gray-700 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-2xl transition-all active:scale-95 uppercase tracking-widest shadow-sm"
                                  >
                                    <Maximize2 size={12} className="text-gray-400" />
                                    Fullscreen
                                  </button>
                                  <ColumnSelectionMenu 
                                    columns={[
                                        { id: 'mrCount', label: 'SRs' },
                                        { id: 'customerCount', label: 'Customers' },
                                        { id: 'invoiceCount', label: 'Invoices' },
                                        { id: 'netQty', label: 'Sales Qty' },
                                        { id: 'netValue', label: 'Sales Val' },
                                        { id: 'pct', label: '%' },
                                    ]}
                                    hiddenCols={hiddenCols['By Branch']}
                                    toggleColumn={(colId) => toggleColumn('By Branch', colId)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                         
<div className="w-full max-w-full overflow-x-auto no-scrollbar">
  <div className="max-h-[60vh] overflow-y-auto">
  <table className={`${TABLE_BASE} table-auto w-full`}>
      <thead className={`sticky top-0 z-10 ${THEAD_ROW} bg-gray-50`}>
 
                                <tr className="text-xs text-gray-500 uppercase font-black tracking-widest">
                                  <th className={`${TH_BASE} min-w-[100px] cursor-pointer hover:bg-gray-200`} onClick={() => branchToggle('branch')}>Branch</th>
                                  {!hiddenCols['By Branch'].includes('mrCount') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => branchToggle('mrCount')}>SRs</th>}
                                  {!hiddenCols['By Branch'].includes('customerCount') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => branchToggle('customerCount')}>Cust</th>}
                                  {!hiddenCols['By Branch'].includes('invoiceCount') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => branchToggle('invoiceCount')}>Inv</th>}
                                  {!hiddenCols['By Branch'].includes('netQty') && <th className={`${TH_BASE} text-right min-w-[70px] cursor-pointer hover:bg-gray-200`} onClick={() => branchToggle('netQty')}>Sales Qty</th>}
                                  {!hiddenCols['By Branch'].includes('netValue') && <th className={`${TH_BASE} text-right min-w-[80px] cursor-pointer hover:bg-gray-200`} onClick={() => branchToggle('netValue')}>Sales Val</th>}
                                  {!hiddenCols['By Branch'].includes('pct') && <th className={`${TH_BASE} text-right min-w-[50px] cursor-pointer hover:bg-gray-200`} onClick={() => branchToggle('pct')}>%</th>}
                                </tr>
                              </thead>
                              <tbody>{sortedBranch.map(b => (
                                <tr key={b.branch} className="border-b hover:bg-blue-50/50 cursor-pointer transition-colors">
                                  <td className={`${TD_BASE} font-black text-gray-800 tracking-tight min-w-[100px]`}>{b.branch}</td>
                                  {!hiddenCols['By Branch'].includes('mrCount') && <td className={`${TD_NUM}`}><FormatNum val={b.mrCount} /></td>}
                                  {!hiddenCols['By Branch'].includes('customerCount') && <td className={`${TD_NUM}`}><FormatNum val={b.customerCount} /></td>}
                                  {!hiddenCols['By Branch'].includes('invoiceCount') && <td className={`${TD_NUM}`}><FormatNum val={b.invoiceCount} /></td>}
                                  {!hiddenCols['By Branch'].includes('netQty') && <td className={`${TD_NUM}`}><FormatNum val={b.salesQty || b.netQty} defaultClass="text-emerald-700" /></td>}
                                  {!hiddenCols['By Branch'].includes('netValue') && <td className={`${TD_NUM}`}><FormatNum val={b.salesValue || b.netValue} defaultClass="text-blue-700" /></td>}
                                  {!hiddenCols['By Branch'].includes('pct') && <td className={`${TD_NUM}`}>{b.pct}%</td>}
                                </tr>
                              ))}</tbody>
                    
    </table>
  </div>
</div></div>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Branch vs Sales Qty</h4><ResponsiveContainer height={260}><BarChart data={sortedBranch} layout="vertical" margin={{left: 60}}><XAxis type="number" fontSize={10} /><YAxis dataKey="branch" type="category" fontSize={10} /><Tooltip /><Bar dataKey="salesQty" fill="#F59E0B" /></BarChart></ResponsiveContainer></div>
                    </div>
                  </FullscreenWrapper>
                )}
              {activeTab === 'Trend' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Trend Data</h3><div className="flex gap-2 mt-2"><button onClick={()=>setTrendGroup('daily')} className={`px-3 py-1 rounded text-xs ${trendGroup==='daily'?'bg-blue-600 text-white':'bg-gray-200'}`}>Daily</button><button onClick={()=>setTrendGroup('monthly')} className={`px-3 py-1 rounded text-xs ${trendGroup==='monthly'?'bg-blue-600 text-white':'bg-gray-200'}`}>Monthly</button></div></div>
                        <div className="overflow-x-hidden w-full"><table className="w-full text-left table-auto text-[11px] md:text-xs">
                            <thead className="sticky top-0 bg-gray-50 z-10"><tr className="text-xs text-gray-500 uppercase"><th className="p-2 text-left">Period</th><th className="p-2 text-right">Invoices</th><th className="p-2 text-right">Sales Qty</th><th className="p-2 text-right">Sales Value</th></tr></thead>
                            <tbody>{trendData.map(t => <tr key={t.period} className="border-b hover:bg-blue-50"><td className="p-2 font-semibold whitespace-nowrap">{t.period}</td><td className="p-2 text-right tabular-nums whitespace-nowrap">{formatKpiGrouped(t.invoiceCount)}</td><td className="p-2 text-right tabular-nums whitespace-nowrap"><FormatNum val={t.salesQty || t.netQty} defaultClass="text-emerald-700" /></td><td className="p-2 text-right tabular-nums whitespace-nowrap"><FormatNum val={t.salesValue || t.netValue} /></td></tr>)}</tbody>
                        </table></div>
                    </div>
                    <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8"><h4 className="text-sm font-black uppercase text-gray-900 tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="text-blue-600" size={18} /> Sales Trend Analysis</h4><ResponsiveContainer height={350}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                          <XAxis 
                            dataKey="period" 
                            fontSize={10} 
                            axisLine={false} 
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontWeight: 'bold' }}
                          />
                          <YAxis 
                            fontSize={10} 
                            axisLine={false} 
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontWeight: 'bold' }}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }} 
                            itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                          <Line 
                            type="monotone" 
                            dataKey="netQty" 
                            name="Quantity"
                            stroke="#10B981" 
                            strokeWidth={4} 
                            dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="netValue" 
                            name="Value"
                            stroke="#3B82F6" 
                            strokeWidth={4} 
                            dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer></div>
                  </div>
              )}
            
{activeTab === 'Compare' && (
  <FullscreenWrapper title="Compare" showButton={false}>
    <div className={compareFullscreen ? "fixed inset-0 z-50 bg-gray-50 overflow-y-auto" : "space-y-2.5"}>
      {compareFullscreen && (
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 shadow-sm mb-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-xs font-black text-gray-900 border-r border-gray-200 pr-3 mr-1 uppercase shrink-0">
              ⚖️ Compare Tool
            </span>
            <div className="flex gap-1 overflow-x-hidden no-scrollbar scroll-smooth active:cursor-grabbing">
              {periods.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-100 bg-gray-50/50 shadow-sm whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || '#CBD5E1' }} />
                  <span className="text-xs font-black text-gray-600 uppercase">{p.label}</span>
                </div>
              ))}

              {(filters.branch?.length > 0 || filters.supervisor?.length > 0 || filters.mrName?.length > 0 || filters.line?.length > 0 || filters.customer?.length > 0 || filters.product?.length > 0 || filters.customerType?.length > 0) && (
                <div className="w-px h-4 bg-gray-200 mx-1 self-center shrink-0" />
              )}

              {[
                { key: 'branch', label: 'Branches', icon: '🏢' },
                { key: 'supervisor', label: 'Supervisors', icon: '👮' },
                { key: 'mrName', label: 'MRs', icon: '👨‍💼' },
                { key: 'line', label: 'Lines', icon: '🛣️' },
                { key: 'customer', label: 'Customers', icon: '👤' },
                { key: 'product', label: 'Products', icon: '📦' },
                { key: 'customerType', label: 'Types', icon: '🏷️' }
              ].map(f => {
                if (!filters[f.key] || filters[f.key].length === 0) return null;
                return (
                  <div key={f.key} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-blue-50 bg-blue-50/30 whitespace-nowrap">
                    <span className="text-xs">{f.icon}</span>
                    <span className="text-xs font-black text-blue-600 uppercase">
                      {filters[f.key].length === 1 ? filters[f.key][0] : `${filters[f.key].length} ${f.label}`}
                    </span>
                  </div>
                );
              })}

              {(filters.fromDate || filters.toDate) && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-50 bg-emerald-50/30 whitespace-nowrap">
                  <Calendar size={10} className="text-emerald-600" />
                  <span className="text-xs font-black text-emerald-600 uppercase">
                    {filters.fromDate ? new Date(filters.fromDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short'}) : '...'} - {filters.toDate ? new Date(filters.toDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short'}) : '...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setCompareFullscreen(false)}
            className="px-3 py-1.5 text-xs font-black bg-gray-900 text-white hover:bg-red-600 rounded-xl transition-all shadow-md active:scale-95 uppercase shrink-0"
          >
            ✕ Exit Fullscreen
          </button>
        </div>
      )}

      <div className={compareFullscreen ? "p-3 space-y-2.5" : "space-y-2.5"}>
                      
                      {/* Quick Month Picker Section */}
                    <div className="bg-white rounded-[24px] p-3 md:p-4 border border-amber-100 shadow-sm bg-gradient-to-br from-white to-amber-50/20 max-w-full overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                        <div className="min-w-0">
                          <h3 className="text-base md:text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2 truncate">
                             <Calendar size={18} className="text-amber-500 shrink-0" />
                             <span className="truncate">Quick Month Picker</span>
                          </h3>
                          <p className="text-xs md:text-xs text-gray-400 font-bold uppercase mt-1 leading-tight break-words pr-2">Select months to add as comparison periods instantly</p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 max-w-full">
                          {!compareFullscreen && (
                            <button
                              onClick={() => setCompareFullscreen(true)}
                              className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 bg-white border border-gray-100 shadow-sm hover:bg-gray-50 rounded-2xl transition-all active:scale-95"
                            >
                              <Maximize2 size={12} />
                              Fullscreen
                            </button>
                          )}
                          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                             <button 
                               onClick={() => setSelectedYear(prev => Math.max(2020, prev - 1))}
                               disabled={selectedYear <= 2020}
                               className="p-1 md:p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-900 disabled:opacity-20 shrink-0">
                               <ChevronLeft size={16} />
                             </button>
                             <span className="text-xs sm:text-xs font-black text-gray-900 w-12 sm:w-16 text-center tabular-nums shrink-0">{selectedYear}</span>
                             <button 
                               onClick={() => setSelectedYear(prev => Math.min(2030, prev + 1))}
                               disabled={selectedYear >= 2030}
                               className="p-1 md:p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-900 disabled:opacity-20 shrink-0">
                               <ChevronRight size={16} />
                             </button>
                          </div>
                        </div>
                      </div>

                      <div className="w-full mb-4 md:mb-6">
                        {(() => {
                          const monthsArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const renderedCards = [];
                          
                          monthsArray.forEach((name, idx) => {
                            const monthNum = idx + 1;
                            const key = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
                            const isAvailable = availableMonths.has(key);
                            const alreadyExists = periods.some(p => {
                              if (!p.from || !p.to) return false;
                              const d = new Date(p.from);
                              return d.getFullYear() === selectedYear && (d.getMonth() + 1) === monthNum;
                            });

                            if (alreadyExists) return;

                            renderedCards.push(
                              <button
                                key={name}
                                disabled={!isAvailable}
                                title={!isAvailable ? "Inactive month (no data)" : ""}
                                onClick={() => {
                                  if (periods.length >= 12) return;
                                  
                                  const fromDateStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}-01`;
                                  const lastDayNum = new Date(selectedYear, monthNum, 0).getDate();
                                  const toDateStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
                                  
                                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#F43F5E', '#84CC16', '#A855F7', '#EAB308', '#6366F1'];
                                  const nextColor = colors[periods.length % colors.length];
                                  const newPeriods = [...periods, {
                                    id: `month-${selectedYear}-${monthNum}-${Date.now()}`,
                                    label: `${name} ${selectedYear}`,
                                    description: "",
                                    from: fromDateStr,
                                    to: toDateStr,
                                    color: nextColor,
                                    type: 'month'
                                  }];
                                  saveComparePreset(newPeriods);
                                }}
                                className={`
                                  flex-1 min-w-[36px] sm:min-w-[42px] max-w-[60px] h-8 sm:h-10 rounded uppercase text-xs sm:text-xs font-black border transition-all flex items-center justify-center shrink-0
                                  ${!isAvailable 
                                    ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-600 cursor-pointer'}
                                `}
                              >
                                {name}
                              </button>
                            );
                          });

                          return renderedCards.length === 0 ? (
                            <div className="w-full py-4 text-center bg-gray-50 rounded-xl border border-gray-100 text-xs font-black uppercase text-gray-500 tracking-widest">
                               ✅ All months of {selectedYear} already added
                            </div>
                          ) : (
                            <div className="w-full">
                              <div className="flex flex-wrap gap-1 sm:gap-1.5 w-full">{renderedCards}</div>
                              <div className="w-full text-xs sm:text-xs font-semibold text-gray-400 uppercase mt-2 text-right">
                                * Inactive months have no data
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Period Management Card */}
                    <div className="bg-white rounded-[24px] p-3 md:p-4 border border-gray-100 shadow-sm max-w-full overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                        <div className="min-w-0 mb-2 sm:mb-0">
                          <h3 className="text-base md:text-2xl font-black text-gray-900 uppercase tracking-tighter truncate">Period Management</h3>
                          <p className="text-xs md:text-xs text-gray-400 font-medium mt-1 leading-tight break-words pr-2">Manage up to 12 date ranges for deep comparative analysis</p>
                        </div>
                        <div className="flex flex-wrap gap-2 relative items-center self-start sm:self-auto shrink-0 max-w-full pb-1 sm:pb-0">
                          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-1.5 md:px-2 py-1 md:py-1.5 shadow-sm shrink-0">
                            <Type size={14} className="text-gray-400 ml-1" />
                            <select 
                              value={compareFontSize} 
                              onChange={(e) => setCompareFontSize(e.target.value)}
                              className="bg-transparent text-gray-700 text-xs md:text-xs font-bold uppercase outline-none cursor-pointer"
                            >
                              {FONT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              const isAnyOpen = Object.values(compareCollapsed).some(v => v === false);
                              const newState = isAnyOpen; // If any open, collapse all. If all closed, expand all.
                              setCompareCollapsed({
                                metrics: newState,
                                popShift: newState,
                                insights: newState,
                                volumeChart: newState,
                                trendChart: newState,
                                perfAnalysis: newState
                              });
                            }}
                            title={Object.values(compareCollapsed).some(v => v === false) ? "Collapse All" : "Expand All"}
                            className="bg-gray-50 border border-gray-200 text-gray-700 p-1.5 md:p-2 rounded-xl hover:bg-gray-100 transition-colors shadow-sm flex items-center justify-center shrink-0"
                          >
                            <ChevronsUpDown size={16} />
                          </button>

                          <div className="w-[1px] h-6 bg-gray-200 mx-0.5 md:mx-1 shrink-0"></div>
                          <button
                            onClick={() => setShowLoadModal(!showLoadModal)}
                            className="flex items-center gap-1 md:gap-2 bg-white text-gray-700 border border-gray-200 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-xs font-black uppercase hover:bg-gray-50 transition-colors shadow-sm shrink-0"
                          >
                            <Download size={14} /> Load
                          </button>
                          {showLoadModal && (
                            <div className="absolute top-10 right-24 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden p-2 flex flex-col gap-1">
                               <h4 className="text-xs font-black uppercase text-gray-400 p-1 mb-1">Load Preset</h4>
                               {savedConfigs.length === 0 ? (
                                   <div className="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-lg">No saved presets</div>
                               ) : (
                                   savedConfigs.map(cfg => (
                                     <button 
                                       key={cfg.id} 
                                       onClick={() => handleLoadConfig(cfg)}
                                       className="w-full text-left p-2 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 rounded-lg group flex justify-between"
                                     >
                                         <span>{cfg.name}</span>
                                         <span className="text-xs text-gray-400 group-hover:text-blue-400">{cfg.periods?.length} periods</span>
                                     </button>
                                   ))
                               )}
                            </div>
                          )}
                          <button
                            onClick={() => setShowSaveModal(!showSaveModal)}
                            className="flex items-center gap-1 md:gap-2 bg-white text-gray-700 border border-gray-200 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-xs font-black uppercase hover:bg-gray-50 transition-colors shadow-sm shrink-0"
                          >
                            <Save size={14} /> Save
                          </button>
                          {showSaveModal && (
                            <div className="absolute top-10 right-0 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3 flex flex-col gap-2">
                               <h4 className="text-xs font-black uppercase text-gray-400 mb-1">Save Current Periods</h4>
                               <input 
                                 type="text" 
                                 placeholder="Preset name..." 
                                 value={newConfigName} 
                                 onChange={e => setNewConfigName(e.target.value)}
                                 className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                               />
                               <button 
                                 onClick={handleSaveConfig}
                                 disabled={!newConfigName.trim()}
                                 className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 hover:bg-blue-600 transition-colors w-full"
                               >
                                  Save Preset
                               </button>
                            </div>
                          )}
                          <button 
                             onClick={() => {
                               saveComparePreset([]);
                               setSelectedMonths([]);
                             }}
                             disabled={periods.length === 0}
                             className="flex items-center gap-1 md:gap-2 bg-red-50 text-red-600 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-xs font-black uppercase hover:bg-red-100 transition-colors shadow-sm disabled:opacity-30 shrink-0">
                            <Trash2 size={14} /> Clear All
                          </button>
                          <button 
                             onClick={() => {
                               if (periods.length < 12) {
                                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#F43F5E', '#84CC16', '#A855F7', '#EAB308', '#6366F1'];
                                  const nextColor = colors[periods.length % colors.length];
                                  const newPeriods = [...periods, { 
                                    id: Date.now().toString(), 
                                    label: `Period ${String.fromCharCode(65 + periods.length)}`, 
                                    description: "",
                                    from: '', to: '', 
                                    color: nextColor,
                                    type: 'custom'
                                  }];
                                  saveComparePreset(newPeriods);
                               }
                             }}
                             disabled={periods.length >= 12}
                             className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md disabled:opacity-30">
                            <Plus size={16} />
                            Add Period
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pb-4 justify-center">
                        {periods.map((p, idx) => {
                          const isMonth = p.type === 'month';
                          const hasNoDates = !p.from || !p.to;
                        const fromDate = hasNoDates ? null : (() => { const x = p.from.split('-'); return new Date(+x[0], +x[1]-1, +x[2], 0, 0, 0); })();
const toDate = hasNoDates ? null : (() => { const x = p.to.split('-'); return new Date(+x[0], +x[1]-1, +x[2], 23, 59, 59); })();
                          
                          const hasData = hasNoDates ? false : filteredData.some(r => r.invoiceDate >= fromDate && r.invoiceDate <= toDate);
                          const isCompact = periods.length > 6;

                          return (
                            <div key={p.id} className={`
                              rounded-[24px] border relative group animate-in zoom-in-95 duration-200 transition-all
                              ${!hasData && !hasNoDates ? 'bg-gray-100 border-gray-200 border-dashed opacity-80' : 'bg-gray-50/50 border-gray-100'}
                              w-full sm:w-[220px] p-2.5
                            `}>
                               <div className="flex items-center justify-between mb-2">
                                 <div className="flex items-center gap-2 relative">
                                   <div 
                                     onClick={() => isCompact && setColorPopoverIdx(colorPopoverIdx === idx ? null : idx)}
                                     className={`w-6 h-6 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md ${isCompact ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300' : ''}`}
                                     style={{ backgroundColor: p.color }}
                                   >
                                     {idx + 1}
                                   </div>
                                   {isCompact && colorPopoverIdx === idx && (
                                     <div className="absolute top-8 left-0 z-50 bg-white border border-gray-100 rounded-xl shadow-xl p-2 grid grid-cols-3 gap-1">
                                       {['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'].map(c => (
                                         <button 
                                           key={c}
                                           onClick={() => {
                                             const up = [...periods];
                                             up[idx].color = c;
                                             saveComparePreset(up);
                                             setColorPopoverIdx(null);
                                           }}
                                           className="w-4 h-4 rounded-full"
                                           style={{ backgroundColor: c }}
                                         />
                                       ))}
                                     </div>
                                   )}
                                   <div className="flex flex-col">
                                      <input 
                                        type="text" 
                                        value={p.label || ''}
                                        placeholder="Title..."
                                        onChange={e => {
                                           const up = [...periods];
                                           up[idx].label = e.target.value;
                                           saveComparePreset(up);
                                        }}
                                        className={`bg-transparent border-none font-black text-gray-900 uppercase tracking-tight text-xs focus:outline-none ${isCompact ? 'w-20' : 'w-24'}`}
                                      />
                                      <input 
                                        type="text" 
                                        value={p.description || ''}
                                        placeholder="Description..."
                                        onChange={e => {
                                           const up = [...periods];
                                           up[idx].description = e.target.value;
                                           saveComparePreset(up);
                                        }}
                                        className={`bg-transparent border-none font-medium text-gray-500 tracking-tight text-xs mt-0.5 focus:outline-none ${isCompact ? 'w-20' : 'w-24'}`}
                                      />
                                      {!isCompact && (
                                          <div className="flex gap-1 mt-1">
                                            <span className={`text-xs font-black uppercase px-1 rounded-sm ${isMonth ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                              {isMonth ? '📅 Month' : '✏️ Custom'}
                                            </span>
                                            {!hasData && !hasNoDates && (
                                              <span className="text-xs font-black uppercase px-1 rounded-sm bg-red-100 text-red-600 flex items-center gap-0.5">
                                                <AlertCircle size={8} /> No Data
                                              </span>
                                            )}
                                          </div>
                                      )}
                                   </div>
                                 </div>
                                 {periods.length > 2 && (
                                   <button 
                                     onClick={() => {
                                        const up = periods.filter(item => item.id !== p.id);
                                        saveComparePreset(up);
                                     }}
                                     className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all">
                                     <Trash2 size={14} />
                                   </button>
                                 )}
                               </div>

                               <div className={isCompact ? "flex flex-col gap-1 mt-2" : "space-y-3"}>
                                 <div className={isCompact ? "flex flex-col" : ""}>
                                   {!isCompact && <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Start Date</label>}
                                   <input 
                                     type="date" 
                                     value={p.from}
                                     onChange={e => {
                                        const up = [...periods];
                                        up[idx].from = e.target.value;
                                        saveComparePreset(up);
                                     }}
                                     className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-semibold focus:border-blue-500 outline-none"
                                   />
                                 </div>
                                 <div className={isCompact ? "flex flex-col" : ""}>
                                   {!isCompact && <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">End Date</label>}
                                   <input 
                                     type="date" 
                                     value={p.to}
                                     onChange={e => {
                                        const up = [...periods];
                                        up[idx].to = e.target.value;
                                        saveComparePreset(up);
                                     }}
                                     className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-semibold focus:border-blue-500 outline-none"
                                   />
                                 </div>
                                 {!isCompact ? (
                                   <div className="flex gap-2 pt-2">
                                     {['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#F43F5E', '#84CC16', '#A855F7', '#EAB308', '#6366F1'].slice(0, 8).map(c => (
                                       <button 
                                         key={c}
                                         onClick={() => {
                                           const up = [...periods];
                                           up[idx].color = c;
                                           saveComparePreset(up);
                                         }}
                                         className={`w-3 h-3 rounded-full transition-transform hover:scale-125 ${p.color === c ? 'ring-2 ring-gray-900 ring-offset-2' : ''}`}
                                         style={{ backgroundColor: c }}
                                       />
                                     ))}
                                   </div>
                                 ) : null}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Multi-Period Metrics Logic Implementation */}
                    {(() => {
                        const periodsWithDates = periods.filter(p => p.from && p.to);
                        
                        if (periods.length === 0 || periodsWithDates.length === 0) {
                          return (
                            <div className="py-20 text-center bg-white border border-gray-100 rounded-[32px]">
                               <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                               <p className="font-black text-gray-900 uppercase text-lg tracking-widest">No periods selected yet</p>
                               <p className="text-sm text-gray-400 mt-2 font-medium">Use the Quick Month Picker or "+ Add Period" to get started</p>
                               <p className="text-xs font-black text-gray-500 bg-gray-100 inline-block px-4 py-1.5 rounded-full mt-4 uppercase tracking-widest">You need at least 2 periods to begin comparison</p>
                            </div>
                          );
                        }
                        
                        if (periodsWithDates.length === 1) {
                          return (
                            <div className="py-4 px-6 text-center bg-amber-50 border border-amber-200 rounded-[24px]">
                               <p className="font-black text-amber-800 text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                 <AlertCircle size={16} /> 
                                 ⚠️ Add at least 1 more period with data to start comparison
                               </p>
                            </div>
                          );
                        }

                        const rawCalculations = periods.map(p => {
                          if (!p.from || !p.to) return { ...p, metrics: null, empty: true };
                       const fp = p.from.split('-');
const tp = p.to.split('-');
const from = new Date(+fp[0], +fp[1]-1, +fp[2], 0, 0, 0);
const to = new Date(+tp[0], +tp[1]-1, +tp[2], 23, 59, 59);
                          
                          const pData = filteredData.filter(r => r.invoiceDate >= from && r.invoiceDate <= to);
                          
                          if (pData.length === 0) return { ...p, metrics: null, empty: true };
                          
                          const invoices = new Set(pData.map(r => r.invoiceNo)).size;
                          return {
                            ...p,
                            data: pData,
                            empty: false,
                            metrics: {
                              salesQty:    pData.reduce((s,r) => s + (r.salesQty || 0), 0),
                              salesValue:  pData.reduce((s,r) => s + (r.salesValue || 0), 0),
                              invoices:    invoices,
                              customers:   new Set(pData.map(r => r.customerName)).size,
                              mrs:         new Set(pData.map(r => r.mrName)).size,
                              returnQty:   pData.reduce((s,r) => s + Math.abs(r.returnQty || 0), 0),
                              returnValue: pData.reduce((s,r) => s + Math.abs(r.returnValue || 0), 0),
                              avgInvoice:  invoices > 0 ? pData.reduce((s,r) => s + (r.salesValue || 0), 0) / invoices : 0
                            }
                          };
                        });

                        const periodCalculations = rawCalculations.filter(pc => !pc.empty);
                        const emptyPeriods = rawCalculations.filter(pc => pc.empty && (pc.from && pc.to));

                        if (periodCalculations.length === 0) {
                          return (
                            <div className="py-20 text-center bg-white border border-gray-100 rounded-[32px]">
                               <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                               <p className="font-black text-gray-900 uppercase text-lg tracking-widest">No periods found with data</p>
                               <p className="text-sm text-gray-400 mt-2 font-medium">The selected periods yielded no results</p>
                            </div>
                          );
                        }
                        
                        if (periodCalculations.length === 1) {
                          return (
                            <div className="py-4 px-6 text-center bg-amber-50 border border-amber-200 rounded-[24px]">
                               <p className="font-black text-amber-800 text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                 <AlertCircle size={16} /> 
                                 ⚠️ Add at least 1 more period with data to start comparison (only 1 valid period found)
                               </p>
                            </div>
                          );
                        }

                        const metricsList = [
                          { key: 'salesQty', label: 'Sales Quantity', format: 'num' },
                          { key: 'salesValue', label: 'Sales Value (EGP)', format: 'val' },
                          { key: 'invoices', label: 'Total Invoices', format: 'num' },
                          { key: 'customers', label: 'Active Customers', format: 'num' },
                          { key: 'mrs', label: 'Active SRs', format: 'num' },
                          { key: 'avgInvoice', label: 'Avg Invoice Value', format: 'val' },
                        ];

                        return (
                          <div className="space-y-2.5">
                            {emptyPeriods.length > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-3 flex items-center gap-3 animate-in slide-in-from-top-2">
                                 <AlertCircle size={18} className="text-amber-600" />
                                 <p className="text-xs font-bold text-amber-700">
                                   ⚠️ {emptyPeriods.length} of {rawCalculations.length} periods have no data and are excluded: 
                                   <span className="ml-2 font-black uppercase tracking-tight">{emptyPeriods.map(p => p.label).join(', ')}</span>
                                 </p>
                              </div>
                            )}

                            {/* Comparison Matrix */}
                            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                               <div 
                                 className="px-8 py-5 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                                 onClick={() => toggleCompareCollapse('metrics')}
                               >
                                 <div className="flex items-center justify-between w-full">
                                   <div className="flex flex-col">
                                     <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Metrics Comparison</h4>
                                     {compareCollapsed.metrics && (
                                       <p className="text-xs text-gray-500 font-bold uppercase tracking-tight mt-1">Summary view across {periodCalculations.length} periods</p>
                                     )}
                                   </div>
                                   <div className="flex items-center gap-4">
                                     {!compareCollapsed.metrics && (
                                       <>
                                         <div className="flex items-center gap-1.5 hidden md:flex">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Highest</span>
                                         </div>
                                         <div className="flex items-center gap-1.5 hidden md:flex">
                                            <div className="w-2 h-2 bg-red-400 rounded-full" />
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lowest</span>
                                         </div>
                                       </>
                                     )}
                                     <button className="flex items-center justify-center p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                                        <ChevronDown size={18} className={`transition-transform duration-300 ${compareCollapsed.metrics ? '-rotate-90' : 'rotate-0'}`} />
                                     </button>
                                   </div>
                                 </div>
                               </div>

                               {!compareCollapsed.metrics && (
                               <div className="overflow-x-hidden">
                             <table className={`w-full ${compareFontSize} border-collapse min-w-full`}>
                                   <thead>
                                     <tr className="bg-gray-50">
                                       <th className="px-6 py-3 text-left font-black text-gray-400 uppercase tracking-[0.2em] sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-gray-100">Metric</th>
                                       {periodCalculations.map(p => (
                                         <th key={p.id} className="px-4 py-3 text-center border-r border-gray-50 last:border-0 min-w-[140px]">
                                           <div className="flex flex-col items-center">
                                             <span className="font-black text-gray-900 uppercase tracking-tighter" style={{ color: p?.color || '#3B82F6' }}>{p?.label || '—'}</span>
                                             <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{p?.from ? new Date(p.from).toLocaleDateString('en-GB', { month:'short', year:'2-digit' }) : '...'} → {p?.to ? new Date(p.to).toLocaleDateString('en-GB', { month:'short', year:'2-digit' }) : '...'}</span>
                                           </div>
                                         </th>
                                       ))}
                                       <th className="px-4 py-3 text-center font-black text-gray-900 uppercase tracking-widest border-l border-gray-100">Best</th>
                                       <th className="px-4 py-3 text-center font-black text-gray-900 uppercase tracking-widest">Trend</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {metricsList.map(m => {
                                        const values = periodCalculations.map(pc => pc?.metrics ? pc.metrics[m.key] : 0);
                                        const hasValues = values.some(v => v !== 0 && !isNaN(v));
                                        const maxVal = hasValues ? Math.max(...values) : 0;
                                        const minVal = hasValues ? Math.min(...values) : 0;
                                        const bestIdx = hasValues ? values.indexOf(maxVal) : -1;
                                        const trend = values[0] < values[values.length - 1] ? 'up' : values[0] > values[values.length - 1] ? 'down' : 'stable';
                                        const pctTotalChange = values[0] === 0 ? 0 : ((values[values.length-1] - values[0]) / values[0]) * 100;

                                        return (
                                          <tr key={m.key} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                                            <td className={`px-6 py-2.5 font-black text-gray-900 uppercase tracking-tight bg-white sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]`}>
                                              {m.label}
                                            </td>
                                            {values.map((v, i) => {
                                              const isBest = v === maxVal && values.some(val => val !== maxVal);
                                              const isWorst = v === minVal && values.some(val => val !== minVal);
                                              return (
                                                <td key={i} className={`px-4 py-2.5 text-center font-bold font-mono transition-all duration-300 border-r border-gray-50 last:border-0 ${isBest ? 'bg-emerald-50/50 text-emerald-700' : isWorst ? 'bg-red-50/50 text-red-600' : 'text-gray-600'}`}>
                                                  {v ? (m.format === 'val' ? formatKpiGrouped(v) : formatKpiGrouped(v)) : '0.00'}
                                                </td>
                                              );
                                            })}
                                            <td className="px-4 py-2.5 text-center border-l border-gray-100">
                                              {bestIdx !== -1 ? (
                                                <span className="inline-block text-white text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-tighter whitespace-nowrap" style={{ backgroundColor: periodCalculations[bestIdx]?.color || '#ccc' }}>
                                                  {periodCalculations[bestIdx]?.label || '—'}
                                                </span>
                                              ) : (
                                                <span className="text-gray-300 font-bold">—</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center min-w-[100px]">
                                              <div className="flex flex-col items-center">
                                                <span className={`text-xs font-bold leading-none ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                                                  {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                                                </span>
                                                <span className={`text-xs font-black ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                                                  {pctTotalChange > 0 ? '+' : ''}{formatKpiPercent(pctTotalChange)}
                                                </span>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                     })}
                                   </tbody>
                                 </table>
                               </div>
                               )}
                            </div>

                            {/* PoP Change Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div 
                                  className="px-6 py-4 border-b border-gray-100 bg-gray-50/20 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                                  onClick={() => toggleCompareCollapse('popShift')}
                                >
                                  <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Period-over-Period Shift</h4>
                                    {compareCollapsed.popShift && (
                                      <p className="text-xs text-gray-500 font-bold uppercase tracking-tight mt-1">Growth rates between adjacent periods</p>
                                    )}
                                  </div>
                                  <button className="flex items-center justify-center p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                                     <ChevronDown size={16} className={`transition-transform duration-300 ${compareCollapsed.popShift ? '-rotate-90' : 'rotate-0'}`} />
                                  </button>
                                </div>
                                {!compareCollapsed.popShift && (
                                <div className="p-4 space-y-2">
                                  {metricsList.slice(0, 4).map(m => (
                                    <div key={m.key} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50 hover:bg-gray-50 transition-colors">
                                       <p className={`font-black text-gray-900 uppercase tracking-tight mb-3 ${compareFontSize}`}>{m.label}</p>
                                       <div className="flex gap-4">
                                          {periodCalculations.slice(0, -1).map((p, i) => {
                                             const v1 = p?.metrics?.[m.key] || 0;
                                             const v2 = periodCalculations[i+1]?.metrics?.[m.key] || 0;
                                             const chg = v1 === 0 ? 0 : ((v2 - v1) / v1) * 100;
                                             return (
                                               <div key={i} className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 shadow-sm transition-colors">
                                                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 truncate max-w-[80px] text-center">{p?.label || '—'} → {periodCalculations[i+1]?.label || '—'}</span>
                                                  <span className={`font-black font-mono tracking-tight ${compareFontSize} ${chg >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {chg >= 0 ? '+' : ''}{formatKpiPercent(chg)}
                                                  </span>
                                               </div>
                                             );
                                          })}
                                       </div>
                                    </div>
                                  ))}
                                </div>
                                )}
                              </div>

                              <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div 
                                  className="px-6 py-4 border-b border-gray-100 bg-gray-50/20 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                                  onClick={() => toggleCompareCollapse('insights')}
                                >
                                  <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Multi-Period Insights</h4>
                                    {compareCollapsed.insights && (
                                      <p className="text-xs text-gray-500 font-bold uppercase tracking-tight mt-1">Auto-generated performance analysis</p>
                                    )}
                                  </div>
                                  <button className="flex items-center justify-center p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                                     <ChevronDown size={16} className={`transition-transform duration-300 ${compareCollapsed.insights ? '-rotate-90' : 'rotate-0'}`} />
                                  </button>
                                </div>
                                
                                {!compareCollapsed.insights && (
                                <div className="p-4 flex-1 space-y-3 bg-white">
                                   {(() => {
                                      const insights = [];
                                      const netValM = metricsList.find(m => m.key === 'netValue');
                                      const netQtyM = metricsList.find(m => m.key === 'netQty');
                                      const values = periodCalculations.map(pc => pc?.metrics?.netValue || 0);
                                      const qtyValues = periodCalculations.map(pc => pc?.metrics?.netQty || 0);
                                      
                                      const totalGrowth = values[0] === 0 ? 0 : ((values[values.length-1] - values[0]) / values[0]) * 100;
                                      if (values.every((v, i) => i === 0 || v >= values[i-1]) && values.some(v => v > 0)) {
                                        insights.push({ icon: '📈', text: `Net Value grew consistently across all periods (+${formatKpiPercent(totalGrowth)} total)`, type: 'success' });
                                      } else if (values.every((v, i) => i === 0 || v <= values[i-1]) && values.some(v => v > 0)) {
                                        insights.push({ icon: '📉', text: `Net Value declined steadily across all periods (${formatKpiPercent(totalGrowth)} total drop)`, type: 'danger' });
                                      } else if (values.some(v => v !== 0)) {
                                        insights.push({ icon: '📊', text: `Overall value trend is ${totalGrowth >= 0 ? 'Positive' : 'Negative'} with a ${formatKpiPercent(totalGrowth)} shift from start to end.`, type: 'info' });
                                      }

                                      const maxV = values.length > 0 ? Math.max(...values) : 0;
                                      const bestIdx = values.length > 0 ? values.indexOf(maxV) : -1;
                                      const maxP = bestIdx !== -1 ? periodCalculations[bestIdx] : null;
                                      if (maxP && maxV > 0) {
                                        insights.push({ icon: '🏆', text: `Highest performing period is ${maxP.label} with ${formatKpiGrouped(maxV)} EGP in Net Value.`, type: 'success' });
                                      }

                                      const custValues = periodCalculations.map(pc => pc?.metrics?.customers || 0);
                                      const custGrowth = custValues[0] === 0 ? 0 : ((custValues[custValues.length-1] - custValues[0]) / custValues[0]) * 100;
                                      if (custValues.some(v => v > 0)) {
                                        insights.push({ icon: '👥', text: `Customer base ${custGrowth >= 0 ? 'expanded' : 'contracted'} from ${custValues[0]} to ${custValues[custValues.length-1]} total active customers.`, type: 'info' });
                                      }

                                      return insights.map((ins, i) => (
                                        <div key={i} className="flex gap-2 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:scale-[1.02] transition-all group">
                                           <span className="text-xl group-hover:scale-125 transition-transform">{ins.icon}</span>
                                           <p className="text-xs font-bold text-gray-700 leading-relaxed self-center">{ins.text}</p>
                                        </div>
                                      ));
                                   })()}
                                </div>
                                )}
                              </div>
                            </div>

                            {/* Charts Wrapper */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div 
                                  className="px-6 py-4 border-b border-gray-100 bg-gray-50/20 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                                  onClick={() => toggleCompareCollapse('volumeChart')}
                                >
                                  <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Metric Volume Comparison</h4>
                                    {compareCollapsed.volumeChart && (
                                      <p className="text-xs text-gray-500 font-bold uppercase tracking-tight mt-1">Bar chart view of key metrics</p>
                                    )}
                                  </div>
                                  <button className="flex items-center justify-center p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                                     <ChevronDown size={16} className={`transition-transform duration-300 ${compareCollapsed.volumeChart ? '-rotate-90' : 'rotate-0'}`} />
                                  </button>
                                </div>
                                {!compareCollapsed.volumeChart && (
                                <div className="h-[350px] p-4">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                      { metric: 'Sales Qty', ...periodCalculations.reduce((acc, p) => ({ ...acc, [p?.label || p.id]: p.metrics?.salesQty || 0 }), {}) },
                                    ]}>
                                      <XAxis dataKey="metric" fontSize={10} axisLine={false} tickLine={false} />
                                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                      <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                                        itemStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                      />
                                      <Legend iconType="circle" />
                                      {periodCalculations.map(p => (
                                        <Bar key={p.id} dataKey={p.label} fill={p.color} radius={[6, 6, 0, 0]} barSize={40} />
                                      ))}
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                                )}
                              </div>

                              <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div 
                                  className="px-6 py-4 border-b border-gray-100 bg-gray-50/20 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                                  onClick={() => toggleCompareCollapse('trendChart')}
                                >
                                  <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Value Trend Across Periods</h4>
                                    {compareCollapsed.trendChart && (
                                      <p className="text-xs text-gray-500 font-bold uppercase tracking-tight mt-1">Line chart of net value progression</p>
                                    )}
                                  </div>
                                  <button className="flex items-center justify-center p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                                     <ChevronDown size={16} className={`transition-transform duration-300 ${compareCollapsed.trendChart ? '-rotate-90' : 'rotate-0'}`} />
                                  </button>
                                </div>
                                {!compareCollapsed.trendChart && (
                                <div className="h-[350px] p-4">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={periodCalculations.map(p => ({ period: p?.label || '—', value: p?.metrics?.netValue || 0 }))}>
                                      <XAxis dataKey="period" fontSize={10} axisLine={false} tickLine={false} />
                                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                      <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                      />
                                      <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={4} dot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                                )}
                              </div>
                            </div>

                            {/* Performance Analysis Section */}
                            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                               <div 
                                 className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/20 cursor-pointer hover:bg-gray-50/60 transition-colors"
                                 onClick={() => toggleCompareCollapse('perfAnalysis')}
                               >
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Performance Analysis</h4>
                                      {compareCollapsed.perfAnalysis && (
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-tight mt-1">Cross-period breakdown table by {perfDimension}</p>
                                      )}
                                      {!compareCollapsed.perfAnalysis && (
                                        <p className="text-xs text-gray-400 font-bold uppercase mt-1">Cross-period breakdown by {perfDimension}</p>
                                      )}
                                    </div>
                                    <button className="flex items-center justify-center p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                                       <ChevronDown size={18} className={`transition-transform duration-300 ${compareCollapsed.perfAnalysis ? '-rotate-90' : 'rotate-0'}`} />
                                    </button>
                                  </div>
                               </div>

                               {!compareCollapsed.perfAnalysis && (
                               <div className="p-8 space-y-2.5">
                                  {/* Selectors Row */}
                                  <div className="flex flex-wrap items-center justify-between gap-6">
                                     <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Analyze By Dimension</label>
                                        <div className="flex p-1 bg-gray-100 rounded-2xl">
                                           {Object.keys(DIMENSIONS).map(d => (
                                             <button 
                                               key={d}
                                               onClick={() => {
                                                 setPerfDimension(d);
                                                 setPerfSortKey('total');
                                                 setPerfSortDir('desc');
                                               }}
                                               className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${perfDimension === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                             >
                                               {d}
                                             </button>
                                           ))}
                                        </div>
                                     </div>

                                     <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Metric Visualization</label>
                                        <div className="flex p-1 bg-gray-100 rounded-2xl">
                                           {[
                                             { key: 'netQty', label: 'Units' },
                                             { key: 'netValue', label: 'Value' },
                                             { key: 'invoices', label: 'Invoices' }
                                           ].map(m => (
                                             <button 
                                               key={m.key}
                                               onClick={() => {
                                                 setPerfMetric(m.key);
                                                 setPerfSortKey('total');
                                                 setPerfSortDir('desc');
                                               }}
                                               className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${perfMetric === m.key ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                             >
                                               {m.label}
                                             </button>
                                           ))}
                                        </div>
                                     </div>

                                     <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Chart Type</label>
                                        <div className="flex p-1 bg-gray-100 rounded-2xl">
                                           {[
                                             { key: 'bar', icon: BarChart3, label: 'Bar' },
                                             { key: 'line', icon: TrendingUp, label: 'Line' }
                                           ].map(t => (
                                             <button 
                                               key={t.key}
                                               onClick={() => setPerfChartType(t.key)}
                                               className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 ${perfChartType === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                             >
                                               <t.icon size={14} />
                                               <span className="text-xs font-black uppercase">{t.label}</span>
                                             </button>
                                           ))}
                                        </div>
                                     </div>

                                     <div className="flex-1 min-w-[200px] h-full flex items-end gap-2">
                                        <div className="relative flex-1">
                                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                           <input 
                                             type="text" 
                                             placeholder={`Search ${perfDimension}...`}
                                             value={perfSearch}
                                             onChange={e => setPerfSearch(e.target.value)}
                                             className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:border-blue-300 focus:bg-white transition-all"
                                           />
                                        </div>
                                        <div className="flex gap-1">
                                          <button 
                                            onClick={() => setPerfSelectedItems(rows.map(r => r.name))}
                                            className="px-3 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-black uppercase text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all shadow-sm"
                                            title="Select All Visible"
                                          >
                                            Select All
                                          </button>
                                          <button 
                                            onClick={() => setPerfSelectedItems([])}
                                            className="px-3 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-black uppercase text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all shadow-sm"
                                            title="Deselect All"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                     </div>
                                  </div>

                                  {(() => {
                                    const dimKey = DIMENSIONS[perfDimension];
                                    const agg = {};
                                    
                                    periodCalculations.forEach(pc => {
                                      pc.data.forEach(row => {
                                        const val = row[dimKey] || 'N/A';
                                        if (!agg[val]) {
                                          agg[val] = { name: val, periods: {}, total: 0 };
                                        }
                                        if (!agg[val].periods[pc.id]) {
                                          agg[val].periods[pc.id] = { netQty: 0, netValue: 0, invoices: new Set() };
                                        }
                                        agg[val].periods[pc.id].netQty += row.netQty;
                                        agg[val].periods[pc.id].netValue += row.netValue;
                                        agg[val].periods[pc.id].invoices.add(row.invoiceNo);
                                      });
                                    });

                                    let rows = Object.values(agg).map(item => {
                                      const pValues = periodCalculations.map(pc => {
                                        const pData = item.periods[pc.id];
                                        if (!pData) return 0;
                                        if (perfMetric === 'invoices') return pData.invoices.size;
                                        if (perfMetric === 'returnQty') return 0;
                                        return pData[perfMetric] || 0;
                                      });

                                      const total = pValues.reduce((s,v) => s + v, 0);
                                      const avg = total / periodCalculations.length;
                                      
                                      const maxV = Math.max(...pValues);
                                      const bestIdx = pValues.indexOf(maxV);
                                      const bestPeriod = pValues.some(v => v > 0) ? periodCalculations[bestIdx] : null;

                                      const vStart = pValues[0];
                                      const vEnd = pValues[pValues.length-1];
                                      const trendPct = vStart === 0 ? (vEnd > 0 ? 100 : 0) : ((vEnd - vStart)/vStart)*100;

                                      const rowObj = {
                                        name: item.name,
                                        total,
                                        avg,
                                        bestPeriod,
                                        trendPct,
                                        pValues: periodCalculations.map((pc, i) => ({ id: pc.id, val: pValues[i] }))
                                      };
                                      
                                      periodCalculations.forEach((pc, i) => {
                                        rowObj[`p-${pc.id}`] = pValues[i];
                                      });

                                      return rowObj;
                                    });

                                    if (perfSearch) {
                                      rows = rows.filter(r => r.name.toLowerCase().includes(perfSearch.toLowerCase()));
                                    }

                                    rows.sort((a,b) => {
                                      let vA = a[perfSortKey];
                                      let vB = b[perfSortKey];
                                      if (typeof vA === 'string') {
                                        return perfSortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
                                      }
                                      return perfSortDir === 'asc' ? vA - vB : vB - vA;
                                    });

                                    return (
                                      <>
                                        {rows.length > 0 && (
                                          <div className="h-[300px] mb-6 border border-gray-100 rounded-[24px] p-4 bg-gray-50/20 shadow-sm relative">
                                            <div className="flex justify-between items-center mb-4">
                                               <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                  {perfSelectedItems.length > 0 ? `Selected items (${perfSelectedItems.length})` : 'Top 10 Performance Chart'}
                                               </h4>
                                               {perfSelectedItems.length > 0 && (
                                                  <button 
                                                    onClick={() => setPerfSelectedItems([])}
                                                    className="text-xs font-black text-emerald-600 uppercase hover:underline"
                                                  >
                                                     Reset to Top 10
                                                  </button>
                                               )}
                                            </div>
                                            <ResponsiveContainer width="100%" height="100%">
                                              {perfChartType === 'bar' ? (
                                                <BarChart data={perfSelectedItems.length > 0 ? rows.filter(r => perfSelectedItems.includes(r.name)) : rows.slice(0, 10)}>
                                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                                                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                                  <Tooltip 
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                                    cursor={{ fill: '#F3F4F6' }}
                                                  />
                                                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                                  {periodCalculations.map(p => (
                                                    <Bar key={p.id} dataKey={`p-${p.id}`} name={p.label} fill={p.color} radius={[4, 4, 0, 0]} />
                                                  ))}
                                                </BarChart>
                                              ) : (
                                                <LineChart data={periodCalculations.map(pc => {
                                                  const dataPoint = { name: pc.label };
                                                  const sourceRows = perfSelectedItems.length > 0 ? rows.filter(r => perfSelectedItems.includes(r.name)) : rows.slice(0, 5);
                                                  sourceRows.forEach(r => {
                                                    dataPoint[r.name] = r[`p-${pc.id}`];
                                                  });
                                                  return dataPoint;
                                                })}>
                                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                                  <Tooltip 
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                                  />
                                                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                                  {(perfSelectedItems.length > 0 ? rows.filter(r => perfSelectedItems.includes(r.name)) : rows.slice(0, 5)).map((r, i) => {
                                                    const colors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#14B8A6', '#F97316', '#A855F7'];
                                                    return (
                                                      <Line 
                                                        key={r.name} 
                                                        type="monotone" 
                                                        dataKey={r.name} 
                                                        name={r.name.length > 20 ? r.name.substring(0, 20) + '...' : r.name} 
                                                        stroke={colors[i % colors.length]} 
                                                        strokeWidth={3} 
                                                        dot={{ r: 4 }} 
                                                        activeDot={{ r: 6 }} 
                                                      />
                                                    );
                                                  })}
                                                </LineChart>
                                              )}
                                            </ResponsiveContainer>
                                          </div>
                                        )}
                                        
                                        <div className="overflow-x-hidden rounded-3xl border border-gray-100">
                                           <table className="w-full text-xs text-left border-collapse">
                                              <thead className="bg-gray-50">
                                                 <tr>
                                                    <th className="px-6 py-4 font-black uppercase text-gray-400 text-xs w-12 bg-gray-50 sticky left-0 z-20 border-r border-gray-100">
                                                       <input 
                                                          type="checkbox"
                                                          checked={perfSelectedItems.length === rows.length && rows.length > 0}
                                                          onChange={() => {
                                                            if (perfSelectedItems.length === rows.length) setPerfSelectedItems([]);
                                                            else setPerfSelectedItems(rows.map(r => r.name));
                                                          }}
                                                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                       />
                                                    </th>
                                                    <SortableTH 
                                                      label={perfDimension} 
                                                      sortKey="name" 
                                                      currentKey={perfSortKey} 
                                                      dir={perfSortDir} 
                                                      onSort={(k,d) => { setPerfSortKey(k); setPerfSortDir(d); }}
                                                      className="px-6 py-4 font-black uppercase text-gray-900 text-xs sticky left-12 bg-gray-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] border-r border-gray-100"
                                                    />
                                                    {periodCalculations.map(p => (
                                                      <SortableTH 
                                                        key={p.id}
                                                        label={p.label}
                                                        sortKey={`p-${p.id}`}
                                                        currentKey={perfSortKey} 
                                                        dir={perfSortDir} 
                                                        onSort={(k,d) => { setPerfSortKey(k); setPerfSortDir(d); }}
                                                        className="px-6 py-4 text-right"
                                                      />
                                                    ))}
                                                    <SortableTH 
                                                      label="Total" 
                                                      sortKey="total" 
                                                      currentKey={perfSortKey} 
                                                      dir={perfSortDir} 
                                                      onSort={(k,d) => { setPerfSortKey(k); setPerfSortDir(d); }}
                                                      className="px-6 py-4 text-right bg-blue-50/50"
                                                    />
                                                    <th className="px-6 py-4 text-right font-black uppercase text-gray-400 text-xs">Avg</th>
                                                    <th className="px-6 py-4 text-center font-black uppercase text-gray-400 text-xs">Best</th>
                                                    <th className="px-6 py-4 text-center font-black uppercase text-gray-400 text-xs">Trend</th>
                                                 </tr>
                                              </thead>
                                              <tbody>
                                                {rows.length === 0 ? (
                                                  <tr>
                                                      <td colSpan={100} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No matching results found</td>
                                                  </tr>
                                                ) : (
                                                  rows.map((row, idx) => {
                                                    const rank = idx + 1;
                                                    const maxInRow = Math.max(...row.pValues.map(p => p.val));
                                                    const minInRow = Math.min(...row.pValues.filter(p => p.val > 0).map(p => p.val) || [0]);

                                                    return (
                                                       <tr 
                                                          key={row.name} 
                                                          onClick={() => {
                                                            setPerfSelectedItems(prev => 
                                                              prev.includes(row.name) ? prev.filter(i => i !== row.name) : [...prev, row.name]
                                                            );
                                                          }}
                                                          className={`border-b border-gray-50 transition-colors group cursor-pointer ${perfSelectedItems.includes(row.name) ? 'bg-emerald-50/20' : 'hover:bg-yellow-50/40'}`}
                                                       >
                                                          <td className="px-6 py-2.5 font-black uppercase text-gray-400 text-xs w-12 bg-white sticky left-0 z-10 border-r border-gray-100 group-hover:bg-yellow-50/60">
                                                            <div className="flex items-center gap-2">
                                                              {rank}
                                                              {rank === 1 && '🥇'}
                                                              {rank === 2 && '🥈'}
                                                              {rank === 3 && '🥉'}
                                                            </div>
                                                          </td>
                                                          <td className={`px-6 py-2.5 font-black text-gray-900 uppercase tracking-tight ${compareFontSize} bg-white sticky left-12 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] border-r border-gray-100 group-hover:bg-yellow-50/60 truncate max-w-[200px]`}>
                                                            {row.name}
                                                          </td>
                                                          {row.pValues.map((pv, i) => {
                                                            const isBest = pv.val === maxInRow && maxInRow > 0;
                                                            const isWorst = pv.val === minInRow && minInRow > 0 && maxInRow !== minInRow;
                                                            return (
                                                              <td key={pv.id} className={`px-6 py-2.5 text-right font-mono font-bold ${compareFontSize} ${isBest ? 'bg-emerald-50/40 border-l-2 border-emerald-400 text-emerald-700' : isWorst ? 'bg-red-50/40 text-red-600' : 'text-gray-600'}`}>
                                                                {pv.val > 0 ? (perfMetric === 'netValue' ? formatKpiGrouped(pv.val) : formatKpiGrouped(pv.val)) : '—'}
                                                              </td>
                                                            );
                                                          })}
                                                          <td className={`px-6 py-2.5 text-right bg-blue-50/30 font-black text-blue-800 font-mono ${compareFontSize}`}>
                                                            {formatKpiGrouped(row.total)}
                                                          </td>
                                                          <td className={`px-6 py-2.5 text-right bg-gray-50/30 font-bold text-gray-600 font-mono ${compareFontSize}`}>
                                                            {formatKpiGrouped(row.avg)}
                                                          </td>
                                                          <td className="px-6 py-2.5 text-center">
                                                            {row.bestPeriod ? (
                                                              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-tighter" style={{ backgroundColor: (row.bestPeriod.color || '#ccc') + '20', color: row.bestPeriod.color || '#666' }}>
                                                                {row.bestPeriod.label || '—'}
                                                              </span>
                                                            ) : '—'}
                                                          </td>
                                                          <td className="px-6 py-2.5 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black ${row.trendPct > 0 ? 'bg-emerald-100 text-emerald-700' : row.trendPct < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                              {row.trendPct > 0 ? '▲' : row.trendPct < 0 ? '▼' : '—'}
                                                              {formatKpi(Math.abs(row.trendPct))}%
                                                            </span>
                                                          </td>
                                                      </tr>
                                                    );
                                                  })
                                                )}
                                              </tbody>
                                           </table>
                                        </div>
                                        <div className="flex justify-between items-center px-2">
                                           <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Showing sorted breakdown by {perfSortKey === 'total' ? 'Overall Total' : perfSortKey} {perfSortDir}</p>
                                           <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Scroll horizontally to view all periods</p>
                                        </div>
                                      </>
                                    );
                                  })()}
                               </div>
                               )}
                            </div>

                          </div>
                        );
                    })()}
                    </div>
                  </div>
                </FullscreenWrapper>
              )}
              {activeTab === 'Reports' && (
                <ReportsTab data={filteredData} filterOptions={filterOptions} filters={filters} />
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="px-6 py-4 bg-white border-t border-gray-100 shrink-0 text-center">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
          ATR Sales Analyzer • v{APP_VERSION.version} • {APP_VERSION.label}
        </p>
      </footer>
    </div>
  );
};

export default SalesAnalyzer;
