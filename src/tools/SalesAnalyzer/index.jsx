import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, DollarSign, Package, RotateCcw, 
  Grid, Upload, RefreshCw, ChevronLeft, ChevronRight, 
  ChevronDown, Filter, Users, Search, X
} from 'lucide-react';

import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';

import ReportsTab from '../reports/ReportsTab';

const APP_VERSION = {
  version: '1.0.447',
  releaseDate: 'Jun 2025',
  label: 'Multi-File Upload Fixed'
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

const SortableTH = ({ label, sortKey, currentKey, dir, onSort, className='' }) => (
  <th onClick={() => onSort(sortKey)} className={`px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap ${className}`}>
    <div className="flex items-center gap-1">{label}<span className="text-gray-300">{currentKey === sortKey ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span></div>
  </th>
);

const fmt = (date) => (!date || !(date instanceof Date)) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const DrilldownPanel = ({ invoices, type }) => {
  const total = invoices.reduce((acc, inv) => ({
    netQty:      acc.netQty + inv.netQty,
    netValue:    acc.netValue + inv.netValue,
    returnQty:   acc.returnQty + inv.returnQty,
    returnValue: acc.returnValue + inv.returnValue,
  }), { netQty:0, netValue:0, returnQty:0, returnValue:0 });

  return (
    <div className="px-6 py-4 border-t-2 border-blue-200">
      <div className="flex gap-6 mb-3 flex-wrap">
        <div className="text-xs"><span className="text-gray-400">Invoices: </span><span className="font-bold text-gray-800 ml-1">{(invoices || []).length}</span></div>
        <div className="text-xs"><span className="text-gray-400">Net Qty: </span><span className="font-bold text-emerald-700 ml-1"><FormatNum val={total.netQty} defaultClass="text-emerald-700" /></span></div>
        <div className="text-xs"><span className="text-gray-400">Net Value: </span><span className="font-bold text-gray-800 ml-1"><FormatNum val={total.netValue} suffix="EGP" defaultClass="text-gray-800" /></span></div>
        <div className="text-xs"><span className="text-gray-400">Returns: </span><span className="font-bold text-red-500 ml-1"><FormatNum val={total.returnQty} suffix="units" defaultClass="text-red-500" /></span></div>
      </div>
      <div className="overflow-x-auto max-h-[280px] overflow-y-auto rounded-lg border border-blue-100">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-blue-100">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-blue-700 uppercase">Invoice #</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-blue-700 uppercase">Date</th>
              {type === 'mr' && (<th className="px-3 py-2 text-left text-[10px] font-bold text-blue-700 uppercase">Customer</th>)}
              {type === 'customer' && (<th className="px-3 py-2 text-left text-[10px] font-bold text-blue-700 uppercase">Line</th>)}
              <th className="px-3 py-2 text-right text-[10px] font-bold text-blue-700 uppercase">Products</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold text-blue-700 uppercase">Net Qty</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold text-blue-700 uppercase">Net Value</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold text-blue-700 uppercase">Return Qty</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv.invoiceNo} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                <td className="px-3 py-1.5 font-mono text-gray-700">{inv.invoiceNo}</td>
                <td className="px-3 py-1.5 text-gray-500">{fmt(inv.invoiceDate)}</td>
                {type === 'mr' && (<td className="px-3 py-1.5 text-gray-700 max-w-[180px] truncate">{inv.customerName}</td>)}
                {type === 'customer' && (<td className="px-3 py-1.5 text-gray-700">{inv.lineName}</td>)}
                <td className="px-3 py-1.5 text-right text-gray-500">{inv.productCount}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-emerald-700"><FormatNum val={inv.netQty} defaultClass="text-emerald-700 font-semibold" /></td>
                <td className="px-3 py-1.5 text-right text-gray-700"><FormatNum val={inv.netValue} defaultClass="text-gray-700" /></td>
                <td className="px-3 py-1.5 text-right text-red-500">{inv.returnQty > 0 ? <FormatNum val={inv.returnQty} defaultClass="text-red-500" /> : '—'}</td>
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
  const num = parseFloat(val);
  const isNeg = num < 0;
  const cls = isNeg ? `text-[#8b0000] bg-[#ffe6e6] px-1 rounded font-bold inline-block` : defaultClass;
  return (
    <span className={cls}>
      {prefix}{num.toLocaleString()}{suffix && ` ${suffix}`}
    </span>
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
              invoiceDate: r.invoiceDate ? new Date(r.invoiceDate) : null
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
          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
            {label}
          </span>
          {(selected || []).length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
                <button
                onClick={() => onChange(options)}
                className="text-[10px] text-blue-600 font-semibold hover:underline">
                All
                </button>
                <button
                onClick={() => onChange([])}
                className="text-[10px] text-gray-400 font-semibold hover:underline">
                None
                </button>
            </div>

            <div className="max-h-[180px] overflow-y-auto">
                {(visibleOptions || []).length === 0 ? (
                    <p className="text-[11px] text-gray-300 py-2 text-center">No results</p>
                ) : (
                    visibleOptions.map(opt => (
                        <label key={opt}
                            className="flex items-center gap-2.5 py-1.5 hover:bg-blue-50 cursor-pointer transition-colors rounded-lg px-1">
                            <input
                                type="checkbox"
                                checked={selected.includes(opt)}
                                onChange={() => toggle(opt)}
                                className="accent-blue-600 w-3.5 h-3.5 shrink-0"
                            />
                            <span className="text-xs text-gray-700 truncate leading-tight" title={opt}>
                                {opt}
                            </span>
                        </label>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
};

const ActiveFiltersBar = ({ filters, setFilters }) => {
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
    { key: 'mrName',       label: 'MR'        },
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
    <div className="flex items-center gap-2 flex-wrap px-6 py-2.5 bg-blue-50 border-b border-blue-100 shrink-0">
      
      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest shrink-0">
        Filtered by:
      </span>

      <div className="flex flex-wrap gap-1.5 flex-1">
        {tags.map(tag => (
          <div
            key={tag.id}
            className="flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm max-w-[220px]">
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

      {/* Clear All */}
      {tags.length > 1 && (
        <button
          onClick={() => setFilters({
            branch:[], supervisor:[],
            mrName:[], line:[],
            customerType:[], product:[],
            customer:[], 
            fromDate:'', toDate:''
          })}
          className="text-[10px] text-red-500 font-bold hover:underline uppercase tracking-wide shrink-0 ml-auto">
          Clear All
        </button>
      )}
    </div>
  );
};

const SideFiltersPanel = ({ filters, setFilters, filterOptions, activeFilterCount }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-10 bg-white border-r border-gray-200 py-4 shrink-0 gap-3">
        <button 
          onClick={() => setCollapsed(false)}
          className="text-gray-400 hover:text-blue-600 transition-colors"
          title="Expand Filters">
          <ChevronRight size={18}/>
        </button>
        {activeFilterCount > 0 && <div className="w-2 h-2 rounded-full bg-blue-600"/>}
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 mt-2">
          Filters
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 overflow-y-auto shrink-0 pb-[200px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500"/>
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
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
              className="text-[10px] text-red-500 font-bold hover:text-red-700 uppercase tracking-wide">
              Clear
            </button>
          )}
          <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={16}/>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Date Range</p>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">From</label>
            <input type="date" value={filters.fromDate} onChange={e => setFilters(f => ({...f, fromDate: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"/>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">To</label>
            <input type="date" value={filters.toDate} onChange={e => setFilters(f => ({...f, toDate: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"/>
          </div>
        </div>
      </div>

      {[ { label: 'Branch', key: 'branch', options: filterOptions.branches }, { label: 'Supervisor', key: 'supervisor', options: filterOptions.supervisors }, { label: 'MR', key: 'mrName', options: filterOptions.mrNames }, { label: 'Line', key: 'line', options: filterOptions.lines }, { label: 'Customer Type', key: 'customerType', options: filterOptions.customerTypes }, { label: 'Customer', key: 'customer', options: filterOptions.customers }, { label: 'Product', key: 'product', options: filterOptions.products } ].map(({ label, key, options }) => (
        <SideFilterSection key={key} label={label} options={options} selected={filters[key]} onChange={v => setFilters(f => ({...f, [key]: v}))} />
      ))}
    </div>
  );
};

const MRCompareTable = ({ 
  periodAData, periodBData, labelA, labelB 
}) => {

  const buildMRMap = (rows) => {
    const map = {};
    rows.forEach(r => {
      if (!map[r.mrName]) map[r.mrName] = {
        netQty: 0, netValue: 0, 
        customers: new Set()
      };
      map[r.mrName].netQty    += r.netQty;
      map[r.mrName].netValue  += r.netValue;
      map[r.mrName].customers.add(r.customerName);
    });
    return map;
  };

  const mapA = buildMRMap(periodAData);
  const mapB = buildMRMap(periodBData);

  const allMRs = [...new Set([
    ...Object.keys(mapA), 
    ...Object.keys(mapB)
  ])].sort();

  const rows = allMRs.map(mr => {
    const a = mapA[mr] || 
      { netQty: 0, netValue: 0, customers: new Set() };
    const b = mapB[mr] || 
      { netQty: 0, netValue: 0, customers: new Set() };
    const pct = a.netQty === 0 ? null
      : (((b.netQty - a.netQty) / 
          Math.abs(a.netQty)) * 100).toFixed(1);
    return {
      mr,
      aQty:   a.netQty,
      bQty:   b.netQty,
      aValue: a.netValue,
      bValue: b.netValue,
      aCust:  a.customers.size,
      bCust:  b.customers.size,
      pct:    pct,
    };
  }).sort((a,b) => b.bQty - a.bQty);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">
          MR Performance Comparison
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {allMRs.length} MRs · 
          sorted by {labelB} Net Qty
        </p>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">MR Name</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-blue-500 uppercase tracking-wider">{labelA} Qty</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-purple-500 uppercase tracking-wider">{labelB} Qty</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Change</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">{labelA} Val</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">{labelB} Val</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">{labelA} Cust</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">{labelB} Cust</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const change = parseFloat(row.pct);
              const isNew  = row.aQty === 0 && row.bQty > 0;
              const isGone = row.bQty === 0 && row.aQty > 0;
              return (
                <tr key={row.mr} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-semibold text-gray-800">
                    {row.mr}
                    {isNew && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                    {isGone && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">GONE</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-700 font-mono"><FormatNum val={row.aQty} defaultClass="text-blue-700" /></td>
                  <td className="px-3 py-2 text-right text-purple-700 font-mono"><FormatNum val={row.bQty} defaultClass="text-purple-700" /></td>
                  <td className="px-3 py-2 text-right">
                    {row.pct === null ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {change >= 0 ? '▲' : '▼'}{Math.abs(change)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600"><FormatNum val={row.aValue} defaultClass="text-gray-600" /></td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600"><FormatNum val={row.bValue} defaultClass="text-gray-600" /></td>
                  <td className="px-3 py-2 text-right text-gray-500">{row.aCust}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{row.bCust}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
        You already have <strong className="text-gray-800">{existingCount.toLocaleString()}</strong> rows loaded.
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


  // Period Compare states
  const [periodA, setPeriodA] = useState({from: '', to: '', label: 'Period A'});
  const [periodB, setPeriodB] = useState({from: '', to: '', label: 'Period B'});

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
    
    if (filters.fromDate) 
      filtered = filtered.filter(f => 
        f.invoiceDate >= new Date(filters.fromDate));
    
    if (filters.toDate) 
      filtered = filtered.filter(f => 
        f.invoiceDate <= new Date(filters.toDate));
    
    return filtered;
  }, [data, filters]);

  const valColor = (n) => (n < 0 ? 'text-red-600' : 'text-gray-900');
  const kpis = useMemo(() => {
    const netValue = filteredData.reduce((acc, row) => acc + row.netValue, 0);
    const netQty = filteredData.reduce((acc, row) => acc + row.netQty, 0);
    const returnsValue = filteredData.reduce((acc, row) => acc + Math.abs(row.returnValue), 0);
    const returnsQty = filteredData.reduce((acc, row) => acc + Math.abs(row.returnQty), 0);
    const uniqueProducts = new Set(filteredData.map(d => d.productName)).size;
    return { netValue, netQty, returnsValue, returnsQty, uniqueProducts };
  }, [filteredData]);

  const [trendGroup, setTrendGroup] = useState('monthly');
  const [customerSearch, setCustomerSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([k, v]) => Array.isArray(v) ? v.length > 0 : v !== '').length, [filters]);
  const startDate = useMemo(() => data.length > 0 ? new Date(Math.min(...data.map(d => d.invoiceDate))) : new Date(), [data]);
  const endDate = useMemo(() => data.length > 0 ? new Date(Math.max(...data.map(d => d.invoiceDate))) : new Date(), [data]);

  const byProduct = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const map = {};
    filteredData.forEach(row => {
      if (!map[row.productName]) {
        map[row.productName] = { productName: row.productName, netQty: 0, netValue: 0, returnQty: 0, returnValue: 0, invoices: new Set() };
      }
      map[row.productName].netQty += row.netQty;
      map[row.productName].netValue += row.netValue;
      map[row.productName].returnQty += Math.abs(row.returnQty);
      map[row.productName].returnValue += Math.abs(row.returnValue);
      map[row.productName].invoices.add(row.invoiceNo);
    });
    const total = Object.values(map).reduce((s,r) => s + r.netValue, 0);
    return Object.values(map).map(r => ({ ...r, invoiceCount: r.invoices.size, pct: total > 0 ? ((r.netValue/total)*100).toFixed(1) : '0.0' }));
  }, [filteredData]);

  const { sorted: sortedProducts, sortKey: prodSortKey, sortDir: prodSortDir, toggle: prodToggle } = useSortableTable(byProduct, 'netQty', 'desc');

  const topProductsByVal = useMemo(() => byProduct.slice(0, 10).map(p => ({name: p.productName.substring(0,20), val: p.netValue})), [byProduct]);
  const topProductsByQty = useMemo(() => byProduct.slice(0, 10).map(p => ({name: p.productName.substring(0,20), val: p.netQty})), [byProduct]);
  const customerTypeData = useMemo(() => [...new Set(filteredData.map(d=>d.customerType))].map(t => ({name: t, val: filteredData.filter(d=>d.customerType===t).reduce((acc,f)=>acc+f.netValue,0)})), [filteredData]);

  const byMR = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const map = {};
    filteredData.forEach(row => {
        if (!map[row.mrName]) {
            map[row.mrName] = { mrName: row.mrName, supervisor: row.supervisor, branch: row.branch, netQty: 0, netValue: 0, returnQty: 0, returnValue: 0, customers: new Set(), invoices: new Set() };
        }
        const m = map[row.mrName];
        m.netQty += row.netQty;
        m.netValue += row.netValue;
        m.returnQty += Math.abs(row.returnQty);
        m.returnValue += Math.abs(row.returnValue);
        m.customers.add(row.customerName);
        m.invoices.add(row.invoiceNo);
    });
    const total = Object.values(map).reduce((s,r) => s + r.netValue, 0);
    return Object.values(map).map(r => ({ ...r, customerCount: r.customers.size, invoiceCount: r.invoices.size, pct: total > 0 ? ((r.netValue/total)*100).toFixed(1) : '0.0' }));
  }, [filteredData]);

  const { sorted: sortedMR, sortKey: mrSortKey, sortDir: mrSortDir, toggle: mrToggle } = useSortableTable(byMR, 'netQty', 'desc');

  const byCustomer = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const map = {};
    filteredData.forEach(row => {
        const key = row.customerId || row.customerName;
        if (!map[key]) {
            map[key] = { customerName: row.customerName, customerType: row.customerType, mrName: row.mrName, branch: row.branch, netQty: 0, netValue: 0, returnQty: 0, returnValue: 0, products: new Set(), invoices: new Set(), dates: [] };
        }
        const c = map[key];
        c.netQty += row.netQty;
        c.netValue += row.netValue;
        c.returnQty += Math.abs(row.returnQty);
        c.returnValue += Math.abs(row.returnValue);
        c.products.add(row.productName);
        c.invoices.add(row.invoiceNo);
        if (row.invoiceDate instanceof Date && !isNaN(row.invoiceDate)) c.dates.push(row.invoiceDate.getTime());
    });
    return Object.values(map).map(r => ({ ...r, productCount: r.products.size, invoiceCount: r.invoices.size, firstDate: r.dates.length > 0 ? new Date(Math.min(...r.dates)) : null, lastDate: r.dates.length > 0 ? new Date(Math.max(...r.dates)) : null }));
  }, [filteredData]);

  const { sorted: sortedCustomers, sortKey: custSortKey, sortDir: custSortDir, toggle: custToggle } = useSortableTable(byCustomer, 'netQty', 'desc');

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
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      setProgress('Detecting headers...');
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
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
      .map(row => ({
          ...row,
          salesQty: parseFloat(row.salesQty) || 0,
          salesValue: parseFloat(row.salesValue) || 0,
          discountQty: parseFloat(row.discountQty) || 0,
          discountValue: parseFloat(row.discountValue) || 0,
          returnQty: parseFloat(row.returnQty) || 0,
          returnValue: parseFloat(row.returnValue) || 0,
          netQty: parseFloat(row.netQty) || 0,
          netValue: parseFloat(row.netValue) || 0,
          invoiceDate: row.invoiceDate instanceof Date ? row.invoiceDate : new Date(row.invoiceDate)
      })).filter(r => r.invoiceNo);

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
          dateFrom: fileDates.length ? new Date(Math.min(...fileDates)) : null,
          dateTo:   fileDates.length ? new Date(Math.max(...fileDates)) : null,
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
          <div className="grid grid-cols-3 
                          md:grid-cols-6 
                          gap-0 
                          border-b border-gray-100
                          shrink-0">
            {[
              { label: 'Invoices', 
                value: invoices?.length || 0,
                color: 'text-gray-900' },
              { label: 'Sales Qty',
                value: totals.salesQty
                        .toLocaleString(),
                color: 'text-blue-700' },
              { label: 'Net Qty',
                value: totals.netQty
                        .toLocaleString(),
                color: 'text-emerald-700' },
              { label: 'Net Value',
                value: totals.netValue
                        .toLocaleString(),
                color: 'text-gray-900',
                suffix: 'EGP' },
              { label: 'Return Qty',
                value: totals.returnQty
                        .toLocaleString(),
                color: 'text-red-600' },
              { label: 'Return Value',
                value: totals.returnValue
                        .toLocaleString(),
                color: 'text-red-500',
                suffix: 'EGP' },
            ].map((s, i) => (
              <div key={s.label}
                className={`px-4 py-3 
                  ${i < 5 
                    ? 'border-r border-gray-100' 
                    : ''}`}>
                <p className="text-[9px] font-bold 
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
                          overflow-hidden">
  
            {/* LEFT — Invoice List */}
            <div className="w-[600px] shrink-0 lg:w-[50%]
                            border-r border-gray-100
                            overflow-y-auto">
              
              {/* Search bar */}
              <div className="px-3 py-2.5 
                              border-b border-gray-100 
                              bg-white sticky top-0 z-20">
                <div className="relative">
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
                
                {/* Result count */}
                <div className="flex items-center 
                                justify-between mt-1.5">
                  <p className="text-[10px] text-gray-400">
                    {invoiceSearch 
                      ? `${visibleInvoices.length} of ${sortedInvoices.length} invoices`
                      : `${sortedInvoices.length} invoices`
                    }
                  </p>
                  {invoiceSearch && 
                   visibleInvoices.length === 0 && (
                    <p className="text-[10px] 
                                  text-red-400 font-semibold">
                      No results
                    </p>
                  )}
                </div>
              </div>

              {/* Table header */}
              <table className="w-full text-xs 
                                border-collapse">
                <thead className="sticky top-0 
                                  bg-gray-50 z-10">
                  <tr>
                    {[
                      { label: 'Invoice #', 
                        key: 'invoiceNo' },
                      { label: 'Date',      
                        key: 'invoiceDate' },
                      type === 'mr'
                        ? { label: 'Customer',  
                            key: 'customerName' }
                        : { label: 'MR',        
                            key: 'mrName' },
                      { label: 'Net Qty',   
                        key: 'netQty' },
                      { label: 'Net Val',   
                        key: 'netValue' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => 
                          toggleSort(col.key)}
                        className="px-3 py-2.5 
                          text-left text-[10px] 
                          font-bold text-gray-500 
                          uppercase tracking-wider
                          cursor-pointer 
                          hover:bg-gray-100
                          select-none
                          whitespace-nowrap">
                        <div className="flex 
                          items-center gap-1">
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
                      className={`border-b 
                        border-gray-50 
                        cursor-pointer 
                        transition-colors
                        ${activeInvoice?.invoiceNo === 
                          inv.invoiceNo
                          ? 'bg-blue-50 border-l-2 border-l-blue-500'
                          : i % 2 === 0 
                            ? 'bg-white hover:bg-blue-50/50'
                            : 'bg-gray-50/50 hover:bg-blue-50/50'
                        }`}>
                      <td className="px-3 py-2 
                                     font-mono 
                                     text-gray-700
                                     whitespace-nowrap">
                        {highlight(inv.invoiceNo, invoiceSearch)}
                      </td>
                      <td className="px-3 py-2 
                                     text-gray-500
                                     whitespace-nowrap">
                        {fmt(inv.invoiceDate)}
                      </td>
                      <td className="px-3 py-2 
                                     text-gray-700 
                                     max-w-[130px] 
                                     truncate">
                        {highlight(
                          type === 'mr' 
                            ? inv.customerName 
                            : inv.mrName,
                          invoiceSearch
                        )}
                      </td>
                      <td className="px-3 py-2 
                                     text-right 
                                     font-semibold 
                                     text-emerald-700">
                        {inv.netQty.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 
                                     text-right 
                                     text-gray-700">
                        {inv.netValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
  
            {/* RIGHT — Invoice Detail */}
            <div className="flex-1 overflow-y-auto 
                            p-5">
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
                <div className="flex flex-col gap-4">
  
                  {/* Invoice Meta */}
                  <div className="bg-gray-50 
                                  rounded-2xl p-4">
                    <div className="flex items-center 
                      justify-between mb-3">
                      <h3 className="font-black 
                                     text-gray-900">
                        Invoice {activeInvoice.invoiceNo}
                      </h3>
                      <span className="text-xs 
                        text-gray-500 bg-white 
                        px-3 py-1 rounded-full 
                        border border-gray-200">
                        {fmt(activeInvoice.invoiceDate)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 
                                    gap-2">
                      {[
                        { label: 'Customer', 
                          value: activeInvoice
                                  .customerName },
                        { label: 'Customer ID', 
                          value: activeInvoice
                                  .customerId || '—' },
                        { label: 'Type', 
                          value: activeInvoice
                                  .customerType },
                        { label: 'MR', 
                          value: activeInvoice
                                  .mrName },
                        { label: 'Branch', 
                          value: activeInvoice
                                  .branch },
                        { label: 'Line', 
                          value: activeInvoice
                                  .lineName },
                        { label: 'Address', 
                          value: activeInvoice
                                  .address || '—' },
                        { label: 'Supervisor', 
                          value: activeInvoice
                                  .supervisor },
                      ].map(item => (
                        <div key={item.label}
                          className="bg-white 
                                     rounded-xl 
                                     px-3 py-2">
                          <p className="text-[9px] 
                            font-bold text-gray-400 
                            uppercase tracking-widest">
                            {item.label}
                          </p>
                          <p className="text-xs 
                            font-semibold 
                            text-gray-800 mt-0.5">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
  
                  {/* Products Breakdown */}
                  <div className="bg-white rounded-2xl 
                                  border border-gray-100 
                                  overflow-hidden">
                    <div className="px-4 py-3 
                                    border-b 
                                    border-gray-100">
                      <h4 className="font-bold 
                                     text-sm 
                                     text-gray-800">
                        Products Breakdown
                      </h4>
                      <p className="text-[10px] 
                                    text-gray-400">
                        {activeInvoice.products.length} 
                        products in this invoice
                      </p>
                    </div>

                    {/* Product Search */}
                    <div className="px-4 py-2.5 
                                    border-b border-gray-100">
                      <div className="relative">
                        <Search 
                          size={12} 
                          className="absolute left-2.5 top-1/2 
                                     -translate-y-1/2 
                                     text-gray-300"/>
                        <input
                          type="text"
                          value={productSearch}
                          onChange={e => 
                            setProductSearch(e.target.value)}
                          placeholder="Search products..."
                          className="w-full pl-7 pr-7 py-1.5 
                                     text-xs border border-gray-200 
                                     rounded-lg outline-none
                                     focus:border-blue-400
                                     placeholder:text-gray-300"/>
                        {productSearch && (
                          <button
                            onClick={() => setProductSearch('')}
                            className="absolute right-2 top-1/2 
                                       -translate-y-1/2 
                                       text-gray-300 
                                       hover:text-gray-600">
                            ✕
                          </button>
                        )}
                      </div>
                      {productSearch && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {visibleProducts.length} of{' '}
                          {(activeInvoice?.products ?? []).length} 
                          {' '}products
                        </p>
                      )}
                    </div>

                    <table className="w-full text-xs 
                                      border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Product','Code',
                            'Sales Qty','Net Qty',
                            'Net Value','Return Qty']
                            .map(h => (
                            <th key={h}
                              className="px-3 py-2 
                                text-left text-[10px] 
                                font-bold text-gray-500 
                                uppercase tracking-wider
                                whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleProducts.length === 0 && (
                          <tr>
                            <td colSpan={6}
                              className="text-center py-6 
                                         text-gray-300 text-xs">
                              No products match "{productSearch}"
                            </td>
                          </tr>
                        )}
                        {visibleProducts
                          .map((p, i) => (
                          <tr key={i}
                            className={i % 2 === 0
                              ? 'bg-white'
                              : 'bg-gray-50'}>
                            <td className="px-3 py-2 
                              text-gray-800 font-medium
                              max-w-[160px] truncate"
                              title={p.productName}>
                              {highlight(p.productName, productSearch)}
                            </td>
                            <td className="px-3 py-2 
                              font-mono text-gray-500 
                              text-[10px]">
                              {highlight(p.productCode, productSearch)}
                            </td>
                            <td className="px-3 py-2 
                              text-right text-blue-700 
                              font-semibold">
                              {p.salesQty
                                .toLocaleString()}
                            </td>
                            <td className="px-3 py-2 
                              text-right 
                              text-emerald-700 
                              font-semibold">
                              {p.netQty.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 
                              text-right text-gray-700">
                              {p.netValue
                                .toLocaleString()}
                            </td>
                            <td className="px-3 py-2 
                              text-right text-red-500">
                              {p.returnQty > 0
                                ? p.returnQty
                                    .toLocaleString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals row */}
                      <tfoot className="bg-gray-100 
                                        font-bold 
                                        border-t-2 
                                        border-gray-200">
                        <tr>
                          <td className="px-3 py-2 
                            font-black text-gray-700" 
                            colSpan={2}>
                            TOTAL
                          </td>
                          <td className="px-3 py-2 
                            text-right text-blue-700">
                            {activeInvoice.salesQty
                              .toLocaleString()}
                          </td>
                          <td className="px-3 py-2 
                            text-right 
                            text-emerald-700">
                            {activeInvoice.netQty
                              .toLocaleString()}
                          </td>
                          <td className="px-3 py-2 
                            text-right text-gray-800">
                            {activeInvoice.netValue
                              .toLocaleString()}
                          </td>
                          <td className="px-3 py-2 
                            text-right text-red-500">
                            {activeInvoice.returnQty > 0
                              ? activeInvoice.returnQty
                                  .toLocaleString()
                              : '—'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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
            map[row.branch] = { branch: row.branch, netQty: 0, netValue: 0, returnQty: 0, mrs: new Set(), customers: new Set(), invoices: new Set() };
        }
        const b = map[row.branch];
        b.netQty += row.netQty;
        b.netValue += row.netValue;
        b.returnQty += Math.abs(row.returnQty);
        b.mrs.add(row.mrName);
        b.customers.add(row.customerName);
        b.invoices.add(row.invoiceNo);
    });
    const total = Object.values(map).reduce((s,r) => s + r.netValue, 0);
    return Object.values(map).map(r => ({ ...r, mrCount: r.mrs.size, customerCount: r.customers.size, invoiceCount: r.invoices.size, pct: total > 0 ? ((r.netValue/total)*100).toFixed(1) : '0.0' }));
  }, [filteredData]);

  const { sorted: sortedBranch, sortKey: branchSortKey, sortDir: branchSortDir, toggle: branchToggle } = useSortableTable(byBranch, 'netQty', 'desc');

  // Comparison Logic
  const periodAData = useMemo(() => {
    if (!periodA.from || !periodA.to) return [];
    const from = new Date(periodA.from);
    const to   = new Date(periodA.to);
    to.setHours(23,59,59);
    return filteredData.filter(r => r.invoiceDate >= from && r.invoiceDate <= to);
  }, [filteredData, periodA]);

  const periodBData = useMemo(() => {
    if (!periodB.from || !periodB.to) return [];
    const from = new Date(periodB.from);
    const to   = new Date(periodB.to);
    to.setHours(23,59,59);
    return filteredData.filter(r => r.invoiceDate >= from && r.invoiceDate <= to);
  }, [filteredData, periodB]);

  const compareMetrics = useMemo(() => {
    if (!periodAData.length && !periodBData.length) return null;

    const calc = (rows) => ({
      invoices: new Set(rows.map(r => r.invoiceNo)).size,
      netQty:    rows.reduce((s,r) => s + r.netQty, 0),
      netValue:  rows.reduce((s,r) => s + r.netValue, 0),
      returnQty: rows.reduce((s,r) => s + Math.abs(r.returnQty), 0),
      customers: new Set(rows.map(r => r.customerName)).size,
      mrs:       new Set(rows.map(r => r.mrName)).size,
      products:  new Set(rows.map(r => r.productName)).size,
    });

    const a = calc(periodAData);
    const b = calc(periodBData);
    const pct = (a, b) => { if (a === 0) return b > 0 ? 100 : 0; return (((b - a) / Math.abs(a)) * 100).toFixed(1); };

    return { a, b, changes: {
      invoices:  pct(a.invoices,  b.invoices),
      netQty:    pct(a.netQty,    b.netQty),
      netValue:  pct(a.netValue,  b.netValue),
      returnQty: pct(a.returnQty, b.returnQty),
      customers: pct(a.customers, b.customers),
      mrs:       pct(a.mrs,       b.mrs),
    }};
  }, [periodAData, periodBData]);

  const trendData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
      const map = {};
      filteredData.forEach(row => {
          const d = row.invoiceDate;
          if (!(d instanceof Date) || isNaN(d)) return;
          const key = trendGroup === 'monthly' ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          if (!map[key]) map[key] = { period: key, netQty: 0, netValue: 0, invoices: new Set() };
          map[key].netQty += row.netQty;
          map[key].netValue += row.netValue;
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
        <div className="mb-12 text-center">
           <div className="inline-flex p-4 bg-[#F5C518]/10 rounded-2xl text-[#F5C518] mb-4 shadow-sm"><BarChart3 size={48} /></div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">ATR SALES ANALYZER</h2>
           <p className="text-gray-500 text-sm font-medium uppercase tracking-[0.2em] mt-2">v{APP_VERSION.version}</p>
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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
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
                <p>Added: <span className="font-bold text-white">{appendResult.added.toLocaleString()}</span> rows</p>
                {appendResult.mode === 'append' && (
                  <p>Skipped (dupes): <span className="text-gray-400">{appendResult.skipped.toLocaleString()}</span></p>
                )}
                <p>Total: <span className="font-bold text-white">{appendResult.total.toLocaleString()}</span> rows</p>
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
      
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">ATR Sales Analysis</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            {data.length.toLocaleString()} INVOICES · {totalProducts} PRODUCTS · {totalMRs} MRs · {formatDate(startDate)} → {formatDate(endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Always visible upload button */}
          <button
            onClick={handleUploadClick}
            disabled={isLoading}
            className="flex items-center gap-2 
                       bg-blue-600 hover:bg-blue-700
                       disabled:bg-blue-300
                       text-white text-xs font-black 
                       uppercase tracking-widest
                       px-4 py-2.5 rounded-xl 
                       transition-all shadow-sm
                       shrink-0">
            {isLoading 
              ? <span className="animate-spin">⏳</span>
              : <Upload size={13}/>
            }
            {isLoading 
              ? 'Processing...'
              : data.length > 0 
                ? 'Add / Replace' 
                : 'Upload File'
            }
          </button>
          <button onClick={() => setFilters(f=>({...f, fromDate:'', toDate:''}))} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all font-semibold">📅 Full Period</button>
          <button onClick={handleReset} className="text-xs font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2"><RefreshCw size={12}/> Reset</button>
        </div>
      </div>

      {dataSources.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100 shrink-0 overflow-x-auto rounded-3xl mt-4">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
            Files:
          </span>
          {dataSources.map((src, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-full shrink-0 text-[11px] shadow-sm">
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
            <span className="text-[11px] font-black text-emerald-600 ml-2">
              {data.length.toLocaleString()} total rows
            </span>
          )}
        </div>
      )}


      <div className="flex flex-1 overflow-hidden h-[calc(100vh-theme(spacing.24))]">
        <SideFiltersPanel filters={filters} setFilters={setFilters} filterOptions={filterOptions} activeFilterCount={activeFilterCount} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <ActiveFiltersBar filters={filters} setFilters={setFilters} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 pt-3 pb-2 shrink-0">
            {[
              { label: 'Net Quantity', value: kpis.netQty.toLocaleString(), suffix: 'units', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', negative: kpis.netQty < 0 },
              { label: 'Net Value', value: kpis.netValue.toLocaleString(), suffix: 'EGP', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', negative: kpis.netValue < 0 },
              { label: 'Total Returns', value: Math.abs(kpis.returnsQty).toLocaleString(), suffix: 'units', sub: Math.abs(kpis.returnsValue).toLocaleString() + ' EGP', icon: RotateCcw, color: 'text-red-500', bg: 'bg-red-50', negative: false },
              { label: 'Unique Products', value: kpis.uniqueProducts, suffix: 'products', sub: filteredData.length.toLocaleString() + ' rows', icon: Grid, color: 'text-purple-600', bg: 'bg-purple-50', negative: false },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className={`${card.bg} p-2 rounded-lg shrink-0`}><card.icon size={16} className={card.color}/></div>
                <div className="min-w-0">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 truncate">{card.label}</p>
                    <p className={`text-lg font-black leading-none truncate ${card.negative ? 'text-red-600' : 'text-gray-900'}`}>{card.value}<span className="text-xs font-semibold text-gray-400 ml-1">{card.suffix}</span></p>
                    {card.sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{card.sub}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 px-6 pb-3 shrink-0 flex-wrap">
            {['Overview','By Product','By MR','By Customer','By Branch','Trend', 'Compare', 'Reports'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}>{tab}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-[200px]">
            <div className="bg-white p-6 rounded-3xl border border-gray-200">
              {activeTab === 'Overview' && (
                  <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="h-[300px]">
                              <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Net Value)</h4>
                              <ResponsiveContainer><BarChart data={topProductsByVal}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="val" fill="#3B82F6" /></BarChart></ResponsiveContainer>
                          </div>
                          <div className="h-[300px]">
                              <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Net Units)</h4>
                              <ResponsiveContainer><BarChart data={topProductsByQty}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="val" fill="#10B981" /></BarChart></ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              )}
                      {activeTab === 'By Product' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Product Breakdown</h3><p className="text-xs text-gray-400 mt-0.5">{filteredData.length} records</p></div>
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto"><table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50 z-10">
                              <tr className="text-xs text-gray-500 uppercase">
                                <th className="p-2 text-left">#</th>
                                <SortableTH label="Product" sortKey="productName" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} />
                                <SortableTH label="Qty" sortKey="netQty" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                                <SortableTH label="Value" sortKey="netValue" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                                <SortableTH label="%" sortKey="pct" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                              </tr>
                            </thead>
                            <tbody>{sortedProducts.map((p, i) => <tr key={p.productName} className={`border-b ${i<3 ? (i===0?'border-l-4 border-l-yellow-400':i===1?'border-l-4 border-l-gray-400':'border-l-4 border-l-orange-400'):''} hover:bg-blue-50`}>
                                <td className="p-2">{i+1}</td><td className="p-2 font-semibold">{p.productName}</td><td className="p-2 text-right"><FormatNum val={p.netQty} /></td><td className="p-2 text-right"><FormatNum val={p.netValue} /></td><td className="p-2 text-right">{p.pct}%</td></tr>)}</tbody>
                        </table></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Qty)</h4><ResponsiveContainer height={260}><BarChart data={sortedProducts.slice(0,10)} layout="vertical" margin={{left: 40}}><XAxis type="number" fontSize={10} /><YAxis dataKey="productName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netQty" fill="#10B981" /></BarChart></ResponsiveContainer></div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Value)</h4><ResponsiveContainer height={260}><BarChart data={sortedProducts.slice(0,10)} layout="vertical" margin={{left: 40}}><XAxis type="number" fontSize={10} /><YAxis dataKey="productName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netValue" fill="#3B82F6" /></BarChart></ResponsiveContainer></div>
                    </div>
                  </div>
              )}
              {activeTab === 'By MR' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">MR Breakdown</h3><p className="text-xs text-gray-400 mt-0.5">{filteredData.length} records</p></div>
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto"><table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50 z-10">
                              <tr className="text-xs text-gray-500 uppercase">
                                <th className="p-2 text-left">#</th>
                                <SortableTH label="MR" sortKey="mrName" currentKey={mrSortKey} dir={mrSortDir} onSort={mrToggle} />
                                <SortableTH label="Qty" sortKey="netQty" currentKey={mrSortKey} dir={mrSortDir} onSort={mrToggle} className="text-right" />
                                <SortableTH label="Value" sortKey="netValue" currentKey={mrSortKey} dir={mrSortDir} onSort={mrToggle} className="text-right" />
                                <SortableTH label="%" sortKey="pct" currentKey={mrSortKey} dir={mrSortDir} onSort={mrToggle} className="text-right" />
                              </tr>
                            </thead>
                            <tbody>{sortedMR.map((m, i) => (
                              <tr key={m.mrName} 
                                onClick={() => setDrillModal({ open: true, type: 'mr', data: m })}
                                className="border-b hover:bg-blue-50 cursor-pointer">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-300 text-xs">⊕</span>
                                    {i+1}
                                  </div>
                                </td>
                                <td className="p-2 font-semibold">{m.mrName}</td>
                                <td className="p-2 text-right"><FormatNum val={m.netQty} /></td>
                                <td className="p-2 text-right"><FormatNum val={m.netValue} /></td>
                                <td className="p-2 text-right">{m.pct}%</td>
                              </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 MRs (Net Qty)</h4><ResponsiveContainer height={260}><BarChart data={sortedMR.slice(0,10)} layout="vertical" margin={{left: 60}}><XAxis type="number" fontSize={10} /><YAxis dataKey="mrName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netQty" fill="#8B5CF6" /></BarChart></ResponsiveContainer></div>
                  </div>
              )}
              {activeTab === 'By Customer' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Customer Breakdown</h3><input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Search customer..." className="p-2 border rounded-lg w-full text-xs mt-2" /></div>
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto"><table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50 z-10">
                              <tr className="text-xs text-gray-500 uppercase">
                                <th className="p-2 text-left">#</th>
                                <SortableTH label="Name" sortKey="customerName" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                                <SortableTH label="Type" sortKey="customerType" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                                <SortableTH label="MR" sortKey="mrName" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                                <SortableTH label="Branch" sortKey="branch" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                                <SortableTH label="Invoices" sortKey="invoiceCount" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                                <SortableTH label="First" sortKey="firstDate" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                                <SortableTH label="Last" sortKey="lastDate" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} />
                                <SortableTH label="Prods" sortKey="productCount" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                                <SortableTH label="Qty" sortKey="netQty" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                                <SortableTH label="Value" sortKey="netValue" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                                <SortableTH label="Ret.Qty" sortKey="returnQty" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                                <SortableTH label="Ret.Val" sortKey="returnValue" currentKey={custSortKey} dir={custSortDir} onSort={custToggle} className="text-right" />
                              </tr>
                            </thead>
                            <tbody>{(sortedCustomers || []).filter(c=>c.customerName?.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 50).map((c, i) => (
                              <tr key={i}
                                onClick={() => setDrillModal({ open: true, type: 'customer', data: c })}
                                className="border-b hover:bg-blue-50 cursor-pointer">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-300 text-xs">⊕</span>
                                    {i+1}
                                  </div>
                                </td>
                                <td className="p-2">{c.customerName}</td>
                                <td className="p-2">{c.customerType}</td>
                                <td className="p-2">{c.mrName}</td>
                                <td className="p-2">{c.branch}</td>
                                <td className="p-2 text-right font-mono">{c.invoiceCount.toLocaleString()}</td>
                                <td className="p-2">{fmt(c.firstDate)}</td>
                                <td className="p-2">{fmt(c.lastDate)}</td>
                                <td className="p-2 text-right font-mono">{c.productCount}</td>
                                <td className="p-2 text-right font-mono font-semibold"><FormatNum val={c.netQty} defaultClass="text-emerald-700" /></td>
                                <td className="p-2 text-right font-mono"><FormatNum val={c.netValue} /></td>
                                <td className="p-2 text-right font-mono text-red-500"><FormatNum val={c.returnQty} defaultClass="text-red-500" /></td>
                                <td className="p-2 text-right font-mono text-red-400"><FormatNum val={c.returnValue} defaultClass="text-red-400" /></td>
                              </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                  </div>
              )}
              {activeTab === 'By Branch' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Branch Breakdown</h3><p className="text-xs text-gray-400 mt-0.5">{filteredData.length} records</p></div>
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto"><table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50 z-10">
                              <tr className="text-xs text-gray-500 uppercase">
                                <SortableTH label="Branch" sortKey="branch" currentKey={branchSortKey} dir={branchSortDir} onSort={branchToggle} />
                                <SortableTH label="Qty" sortKey="netQty" currentKey={branchSortKey} dir={branchSortDir} onSort={branchToggle} className="text-right" />
                                <SortableTH label="%" sortKey="pct" currentKey={branchSortKey} dir={branchSortDir} onSort={branchToggle} className="text-right" />
                              </tr>
                            </thead>
                            <tbody>{sortedBranch.map(b => <tr key={b.branch} className="border-b hover:bg-blue-50"><td className="p-2 font-semibold">{b.branch}</td><td className="p-2 text-right"><FormatNum val={b.netQty} /></td><td className="p-2 text-right">{b.pct}%</td></tr>)}</tbody>
                        </table></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Branch vs Net Qty</h4><ResponsiveContainer height={260}><BarChart data={sortedBranch} layout="vertical" margin={{left: 60}}><XAxis type="number" fontSize={10} /><YAxis dataKey="branch" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netQty" fill="#F59E0B" /></BarChart></ResponsiveContainer></div>
                  </div>
              )}
              {activeTab === 'Trend' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Trend Data</h3><div className="flex gap-2 mt-2"><button onClick={()=>setTrendGroup('daily')} className={`px-3 py-1 rounded text-xs ${trendGroup==='daily'?'bg-blue-600 text-white':'bg-gray-200'}`}>Daily</button><button onClick={()=>setTrendGroup('monthly')} className={`px-3 py-1 rounded text-xs ${trendGroup==='monthly'?'bg-blue-600 text-white':'bg-gray-200'}`}>Monthly</button></div></div>
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto"><table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-50 z-10"><tr className="text-xs text-gray-500 uppercase"><th className="p-2 text-left">Period</th><th className="p-2 text-right">Invoices</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Value</th></tr></thead>
                            <tbody>{trendData.map(t => <tr key={t.period} className="border-b hover:bg-blue-50"><td className="p-2 font-semibold">{t.period}</td><td className="p-2 text-right">{t.invoiceCount.toLocaleString()}</td><td className="p-2 text-right"><FormatNum val={t.netQty} /></td><td className="p-2 text-right"><FormatNum val={t.netValue} /></td></tr>)}</tbody>
                        </table></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Trend Chart</h4><ResponsiveContainer height={300}><LineChart data={trendData}><XAxis dataKey="period" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Line type="monotone" dataKey="netQty" stroke="#10B981" /><Line type="monotone" dataKey="netValue" stroke="#3B82F6" /></LineChart></ResponsiveContainer></div>
                  </div>
              )}
              {activeTab === 'Compare' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Set Comparison Periods</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Period A</label>
                                <div className="flex gap-2">
                                    <input type="date" value={periodA.from} onChange={e=>setPeriodA(p=>({...p, from:e.target.value}))} className="w-full border rounded-lg p-2 text-xs" />
                                    <input type="date" value={periodA.to} onChange={e=>setPeriodA(p=>({...p, to:e.target.value}))} className="w-full border rounded-lg p-2 text-xs" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Period B</label>
                                <div className="flex gap-2">
                                    <input type="date" value={periodB.from} onChange={e=>setPeriodB(p=>({...p, from:e.target.value}))} className="w-full border rounded-lg p-2 text-xs" />
                                    <input type="date" value={periodB.to} onChange={e=>setPeriodB(p=>({...p, to:e.target.value}))} className="w-full border rounded-lg p-2 text-xs" />
                                </div>
                            </div>
                        </div>
                    </div>
                    {compareMetrics && (
                        <div className="grid grid-cols-6 gap-3">
                            {[ {l:'Invoices',v:compareMetrics.changes.invoices, unit:'%'}, {l:'Net Qty',v:compareMetrics.changes.netQty, unit:'%'}, {l:'Net Value',v:compareMetrics.changes.netValue, unit:'%'}, {l:'Returns',v:compareMetrics.changes.returnQty, unit:'%'}, {l:'Customers',v:compareMetrics.changes.customers, unit:'%'}, {l:'MRs',v:compareMetrics.changes.mrs, unit:'%'} ].map((m,i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl border shadow-sm text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{m.l}</p>
                                    <p className={`text-lg font-black ${parseFloat(m.v) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {parseFloat(m.v) >= 0 ? '+' : ''}{m.v}{m.unit}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {periodAData.length > 0 && periodBData.length > 0 && (
                        <MRCompareTable periodAData={periodAData} periodBData={periodBData} labelA="Period A" labelB="Period B" />
                    )}
                  </div>
              )}
              {activeTab === 'Reports' && (
                <ReportsTab data={filteredData} filterOptions={filterOptions} filters={filters} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalyzer;
