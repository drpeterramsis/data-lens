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
import { FilterButton } from '../../components/ui/FilterButton';

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

const KPICard = ({ title, value, subtext, icon: Icon, colorClass = "text-blue-600" }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-gray-50 ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{title}</p>
      <h3 className="text-xl font-black text-gray-900 leading-none truncate">{value}</h3>
      {subtext && <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tight">{subtext}</p>}
    </div>
  </div>
);

// ── MAIN TOOL COMPONENT ──
const PerCustomerAnalyzer = () => {
  const [data, setData] = useState([]);
  const [fileMeta, setFileMeta] = useState({ name: '', reportMonthLabel: 'Unknown Month' });
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ stage: '', rows: 0 });
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepProgress, setPrepProgress] = useState({ stage: '', processed: 0, total: 0 });
  const [prepared, setPrepared] = useState(null);
  const [prepError, setPrepError] = useState('');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  
  const workerRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
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
    customerCode: '',
    minValue: '',
    maxValue: '',
    minQty: '',
    maxQty: '',
    arabicOnly: false
  });

  const isCsvMode = !!prepared;

  // 1) File Handling
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    
    // Reset state
    setPrepared(null);
    setData([]); // Clear legacy row-level data
    setPrepError('');
    setSelectedCustomer(null);
    setFilters({
      products: [],
      evaBricks: [],
      disBricks: [],
      distributors: [],
      customers: [],
      customerCode: '',
      minValue: '',
      maxValue: '',
      minQty: '',
      maxQty: '',
      arabicOnly: false
    });
    setPage(1);

    if (file.name.endsWith('.csv')) {
      setIsPreparing(true);
      setPrepProgress({ stage: 'Reading file...', processed: 0, total: 0 });
      
      try {
        const csvText = await file.text();
        
        if (workerRef.current) workerRef.current.terminate();
        workerRef.current = new Worker(new URL('../../workers/perCustomerWorker.js', import.meta.url), { type: 'module' });
        
        workerRef.current.onmessage = (e) => {
          const { type, stage, processed, total, payload, message } = e.data;
          if (type === 'progress') {
            setPrepProgress({ stage, processed, total });
          } else if (type === 'done') {
            // SUCCESS: Do not set row-level data for large CSVs
            setPrepared(payload);
            setIsPreparing(false);
            
            // Clear search cache
            setFilterSearch({ product: '', distributor: '', evaBrick: '', disBrick: '', customer: '' });
            
            // Month detection
            const lowerName = file.name.toLowerCase();
            const nameKeywords = [
              'January', 'February', 'March', 'April', 'May', 'June', 
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const foundMonth = nameKeywords.find(m => lowerName.includes(m.toLowerCase()));
            let detectedMonth = "Unknown Month";
            if (foundMonth) {
              const yearMatch = file.name.match(/\d{4}/);
              detectedMonth = `${foundMonth} ${yearMatch ? yearMatch[0] : ''}`;
            }
            setFileMeta({ name: file.name, reportMonthLabel: detectedMonth });
          } else if (type === 'error') {
            setPrepError(message);
            setIsPreparing(false);
          }
        };

        workerRef.current.postMessage({ csvText });
      } catch (err) {
        console.error("Worker setup failed", err);
        setPrepError("Failed to start data preparation.");
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

  // 2) Filtering & Aggregation
  const filterOptions = useMemo(() => {
    if (prepared) return prepared.filterOptions;
    if (!data.length) return { products: [], evaBricks: [], disBricks: [], distributors: [], customers: [] };
    return {
      products: [...new Set(data.map(d => d.product))].filter(Boolean).sort(),
      evaBricks: [...new Set(data.map(d => d.evaBrick))].filter(Boolean).sort(),
      disBricks: [...new Set(data.map(d => d.disBrick))].filter(Boolean).sort(),
      distributors: [...new Set(data.map(d => d.distributor))].filter(Boolean).sort(),
      customers: [...new Set(data.map(d => d.clientName))].filter(Boolean).sort(),
    };
  }, [data, prepared]);

  const searchedOptions = useMemo(() => {
    const filterBySearch = (list, search) => {
      const q = (search || '').trim().toLowerCase();
      if (!q) return list;
      return list.filter(item => String(item).toLowerCase().includes(q));
    };

    return {
      products: filterBySearch(filterOptions.products, filterSearch.product),
      distributors: filterBySearch(filterOptions.distributors, filterSearch.distributor),
      evaBricks: filterBySearch(filterOptions.evaBricks, filterSearch.evaBrick),
      disBricks: filterBySearch(filterOptions.disBricks, filterSearch.disBrick),
      customers: filterBySearch(filterOptions.customers, filterSearch.customer)
    };
  }, [filterOptions, filterSearch]);

  const filteredRows = useMemo(() => {
    let res = data;
    if (filters.products.length) res = res.filter(r => filters.products.includes(r.product));
    if (filters.evaBricks.length) res = res.filter(r => filters.evaBricks.includes(r.evaBrick));
    if (filters.disBricks.length) res = res.filter(r => filters.disBricks.includes(r.disBrick));
    if (filters.distributors.length) res = res.filter(r => filters.distributors.includes(r.distributor));
    if (filters.customers.length) res = res.filter(r => filters.customers.includes(r.clientName));
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
    if (prepared) {
      const hasFilters = filters.products.length || filters.evaBricks.length || filters.disBricks.length || 
                         filters.distributors.length || filters.customers.length || filters.customerCode || 
                         filters.minValue || filters.maxValue || filters.arabicOnly;
      
      if (!hasFilters) {
        return {
          ...prepared.globalTotals,
          avgPerCust: prepared.globalTotals.customerCount > 0 ? prepared.globalTotals.totalValue / prepared.globalTotals.customerCount : 0,
          avgQtyPerCust: prepared.globalTotals.customerCount > 0 ? prepared.globalTotals.totalQty / prepared.globalTotals.customerCount : 0,
          uniqueCust: prepared.globalTotals.customerCount,
          uniqueProd: prepared.globalTotals.productCount
        };
      }
      
      const filtered = prepared.customers.filter(c => {
        if (filters.distributors.length && !filters.distributors.includes(c.distributor)) return false;
        if (filters.evaBricks.length && !filters.evaBricks.includes(c.evaBrick)) return false;
        if (filters.disBricks.length && !filters.disBricks.includes(c.disBrick)) return false;
        if (filters.customers.length && !filters.customers.includes(c.clientName)) return false;
        if (filters.customerCode && !c.clientCode.includes(filters.customerCode)) return false;
        if (filters.minValue && c.totalValue < parseFloat(filters.minValue)) return false;
        if (filters.maxValue && c.totalValue > parseFloat(filters.maxValue)) return false;
        if (filters.products.length) {
          if (!c.productIds.some(pId => filters.products.includes(pId))) return false;
        }
        if (filters.arabicOnly && !/[\u0600-\u06FF]/.test(c.clientName)) return false;
        return true;
      });

      let totalVal = 0;
      let totalQty = 0;
      const seenProds = new Set();
      
      filtered.forEach(c => {
        const details = prepared.customerDetails[c.clientCode === 'N/A' ? c.clientName : (c.clientCode || c.clientName)];
        if (!details) {
          totalVal += c.totalValue;
          totalQty += c.totalQty;
          return;
        }

        if (filters.products.length || filters.distributors.length) {
          // If we have specific products/distributors filtered, we should only sum their specific contributions
          // for absolute accuracy, but typically in these dashboards "Sales of Segment" means total sales of those customers.
          // However, user usually wants the sales of the filtered products ONLY.
          
          if (filters.products.length) {
            details.byProduct.forEach(bp => {
              if (filters.products.includes(bp.product)) {
                totalVal += bp.value;
                totalQty += bp.qty;
                seenProds.add(bp.product);
              }
            });
          } else {
            // No product filter, but maybe other filters. Use customer total.
            totalVal += c.totalValue;
            totalQty += c.totalQty;
          }
        } else {
          totalVal += c.totalValue;
          totalQty += c.totalQty;
        }
      });

      return {
        totalValue: totalVal,
        totalQty: totalQty,
        uniqueCust: filtered.length,
        uniqueProd: filters.products.length ? seenProds.size : prepared.globalTotals.productCount, 
        avgPerCust: filtered.length > 0 ? totalVal / filtered.length : 0,
        avgQtyPerCust: filtered.length > 0 ? totalQty / filtered.length : 0
      };
    }
    const totalValue = filteredRows.reduce((acc, r) => acc + r.netSalesValue, 0);
    const totalQty = filteredRows.reduce((acc, r) => acc + r.netSalesQty, 0);
    const uniqueCust = new Set(filteredRows.map(r => r.clientCode)).size;
    const uniqueProd = new Set(filteredRows.map(r => r.product)).size;
    return {
      totalValue,
      totalQty,
      uniqueCust,
      uniqueProd,
      avgPerCust: uniqueCust > 0 ? totalValue / uniqueCust : 0,
      avgQtyPerCust: uniqueCust > 0 ? totalQty / uniqueCust : 0
    };
  }, [filteredRows, prepared, filters]);

  const aggregates = useMemo(() => {
    if (prepared) {
      const filtered = prepared.customers.filter(c => {
        if (filters.distributors.length && !filters.distributors.includes(c.distributor)) return false;
        if (filters.evaBricks.length && !filters.evaBricks.includes(c.evaBrick)) return false;
        if (filters.disBricks.length && !filters.disBricks.includes(c.disBrick)) return false;
        if (filters.customers.length && !filters.customers.includes(c.clientName)) return false;
        if (filters.customerCode && !c.clientCode.includes(filters.customerCode)) return false;
        if (filters.minValue && c.totalValue < parseFloat(filters.minValue)) return false;
        if (filters.maxValue && c.totalValue > parseFloat(filters.maxValue)) return false;
        if (filters.products.length) {
          if (!c.productIds.some(pId => filters.products.includes(pId))) return false;
        }
        if (filters.arabicOnly && !/[\u0600-\u06FF]/.test(c.clientName)) return false;
        return true;
      });

      const totalValForPct = filtered.reduce((acc, c) => acc + c.totalValue, 0);

      return {
        customers: filtered.map(c => ({...c, pct: totalValForPct > 0 ? (c.totalValue / totalValForPct) * 100 : 0})),
        products: prepared.products,
        distributors: prepared.distributors,
        evaBricks: prepared.evaBricks,
        disBricks: prepared.disBricks || []
      };
    }
    const byCust = {};
    const byProd = {};
    const byDis = {};
    const byEva = {};
    const byDisBrick = {};

    filteredRows.forEach(r => {
      // By Customer
      if (!byCust[r.clientCode]) {
        byCust[r.clientCode] = { 
          clientCode: r.clientCode, 
          clientName: r.clientName, 
          distributor: r.distributor,
          evaBrick: r.evaBrick,
          disBrick: r.disBrick,
          totalQty: 0, 
          totalValue: 0, 
          products: new Set() 
        };
      }
      byCust[r.clientCode].totalQty += r.netSalesQty;
      byCust[r.clientCode].totalValue += r.netSalesValue;
      byCust[r.clientCode].products.add(r.product);

      // By Product
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
      distributors: Object.values(byDis).map(d => ({...d, customerCount: d.customers.size, productCount: d.products.size})),
      evaBricks: Object.values(byEva).map(e => ({...e, customerCount: e.customers.size, productCount: e.products.size})),
      disBricks: Object.values(byDisBrick).map(b => ({...b, customerCount: b.customers.size, productCount: b.products.size}))
    };
  }, [filteredRows, kpis.totalValue]);

  const dataTags = useMemo(() => {
    if (!data.length) return [];
    const tags = [];
    
    const topProd = aggregates.products.sort((a,b) => b.totalValue - a.totalValue).slice(0, 3);
    topProd.forEach(p => tags.push({ label: `Top: ${p.product}`, onClick: () => setFilters(f => ({...f, products: [p.product]})) }));

    const topEva = aggregates.evaBricks.sort((a,b) => b.totalValue - a.totalValue).slice(0, 1);
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

  const { sorted: sortedProd, sortKey: prodSortKey, sortDir: prodSortDir, toggle: prodToggle } = useSortableTable(aggregates.products, 'totalValue', 'desc');

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
            accept=".xlsx, .csv" 
            onChange={e => handleUpload(e.target.files[0])} 
          />
          <button 
            onClick={() => document.getElementById('file-upload').click()}
            className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Choose File to Analysis
          </button>
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
        <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Per Customer Analyzer</h2>
              <p className="text-[10px] text-violet-600 font-bold uppercase tracking-widest">{fileMeta.reportMonthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-tighter hover:bg-violet-600 hover:text-white transition-all">
              <Filter size={14} /> Filters
            </button>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* KPI TIER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard title="Total Net Sales (Qty)" value={formatKpiGrouped(kpis.totalQty)} icon={Package} />
            <KPICard title="Total Value (EGP)" value={formatKpiGrouped(kpis.totalValue)} icon={DollarSign} colorClass="text-emerald-600" />
            <KPICard title="Unique Customers" value={kpis.uniqueCust} icon={Users} colorClass="text-violet-600" />
            <KPICard title="Unique Products" value={kpis.uniqueProd} icon={Grid} colorClass="text-amber-600" />
            <KPICard title="Avg Value / Cust" value={formatKpiGrouped(kpis.avgPerCust)} icon={TrendingUp} colorClass="text-blue-600" />
            <KPICard title="Avg Qty / Cust" value={formatKpiGrouped(kpis.avgQtyPerCust)} icon={Activity} colorClass="text-indigo-600" />
          </div>

          {/* TABS SELECTOR */}
          <div className="flex items-center gap-2 border-b border-gray-200">
            {['overview', 'customers', 'products', 'distributors', 'matrix', 'insights'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all relative
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
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
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
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
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
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top Eva Bricks</h5>
                  <div className="space-y-2">
                    {aggregates.evaBricks.sort((a,b)=>b.totalValue-a.totalValue).slice(0,5).map((e, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all">
                        <span className="text-[11px] font-bold text-gray-700 truncate max-w-[150px]">{e.evaBrick}</span>
                        <span className="text-[11px] font-black text-gray-900">{formatKpiGrouped(e.totalValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top Distributors</h5>
                  <div className="space-y-2">
                    {aggregates.distributors.sort((a,b)=>b.totalValue-a.totalValue).slice(0,5).map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all">
                        <span className="text-[11px] font-bold text-gray-700 truncate max-w-[150px]">{d.distributor}</span>
                        <span className="text-[11px] font-black text-gray-900">{formatKpiGrouped(d.totalValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
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
                {prepared && (
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="p-2 bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30 hover:bg-violet-600 hover:text-white transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="text-[10px] font-black uppercase text-gray-400">
                      Page <span className="text-violet-600">{page}</span> of {Math.ceil(filteredCustomers.length / pageSize)}
                    </div>
                    <button 
                      disabled={page >= Math.ceil(filteredCustomers.length / pageSize)}
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
              <div className="flex-1 overflow-auto">
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
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-80">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top 15 Products by Value</h4>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aggregates.products.sort((a,b)=>b.totalValue-a.totalValue).slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="product" type="category" width={120} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius:'12px'}} formatter={(v)=>formatKpiGrouped(v)} />
                      <Bar dataKey="totalValue" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className={TABLE_BASE}>
                  <thead className={THEAD_ROW}>
                    <tr>
                      <SortableTH label="Product" sortKey="product" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} />
                      <SortableTH label="Total Qty" sortKey="totalQty" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                      <SortableTH label="Total Value" sortKey="totalValue" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                      <SortableTH label="Cust Count" sortKey="customerCount" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                      <SortableTH label="Avg / Cust" sortKey="avgValue" currentKey={prodSortKey} dir={prodSortDir} onSort={prodToggle} className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProd.map(p => (
                      <tr key={p.product} className="hover:bg-gray-50">
                        <td className={TD_TEXT}>{p.product}</td>
                        <td className={TD_NUM}>{formatKpiGrouped(p.totalQty)}</td>
                        <td className={TD_NUM}>{formatKpiGrouped(p.totalValue)}</td>
                        <td className={TD_NUM}>{p.customerCount}</td>
                        <td className={TD_NUM}>{formatKpiGrouped(p.avgValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'distributors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Distributors', data: aggregates.distributors, label: 'distributor' },
                { title: 'Eva Bricks', data: aggregates.evaBricks, label: 'evaBrick' },
                { title: 'DIS Bricks', data: aggregates.disBricks, label: 'disBrick' }
              ].map((sec, idx) => (
                <div key={idx} className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-96">
                  <div className="p-4 border-b border-gray-50">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sec.title}</h4>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className={TABLE_BASE}>
                      <thead className="sticky top-0 bg-white">
                        <tr className={THEAD_ROW}>
                          <th className={TH_BASE}>{sec.title}</th>
                          <th className={`${TH_BASE} text-right`}>Value</th>
                          <th className={`${TH_BASE} text-right`}>Cust</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec.data.sort((a,b)=>b.totalValue-a.totalValue).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className={TD_TEXT}>{row[sec.label]}</td>
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

        {/* CUST DRILL DRAWER */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center font-black">
                      {selectedCustomer.clientName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase leading-none mb-1">{selectedCustomer.clientName}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedCustomer.clientCode}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                    <X size={20} />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
                       <p className="text-lg font-black text-gray-900 leading-none">{formatKpiGrouped(selectedCustomer.totalValue)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Qty</p>
                       <p className="text-lg font-black text-gray-900 leading-none">{formatKpiGrouped(selectedCustomer.totalQty)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Product Breakdown</h4>
                    <div className="border rounded-2xl overflow-hidden">
                       <table className="w-full text-[10px]">
                          <thead className="bg-gray-50">
                             <tr>
                                <th className="px-3 py-2 text-left font-black uppercase">Product</th>
                                <th className="px-3 py-2 text-right font-black uppercase">Qty</th>
                                <th className="px-3 py-2 text-right font-black uppercase">Value</th>
                             </tr>
                          </thead>
                          <tbody>
                             {prepared && prepared.customerDetails[selectedCustomer.clientCode] ? (
                               prepared.customerDetails[selectedCustomer.clientCode].byProduct.map((p, i) => (
                                 <tr key={i} className="border-t border-gray-50">
                                    <td className="px-3 py-2 font-bold">{p.product}</td>
                                    <td className="px-3 py-2 text-right font-mono">{formatKpiGrouped(p.qty)}</td>
                                    <td className="px-3 py-2 text-right font-mono">{formatKpiGrouped(p.value)}</td>
                                 </tr>
                               ))
                             ) : (
                               filteredRows.filter(r => r.clientCode === selectedCustomer.clientCode).map((r, i) => (
                                 <tr key={i} className="border-t border-gray-50">
                                    <td className="px-3 py-2 font-bold">{r.product}</td>
                                    <td className="px-3 py-2 text-right font-mono">{formatKpiGrouped(r.netSalesQty)}</td>
                                    <td className="px-3 py-2 text-right font-mono">{formatKpiGrouped(r.netSalesValue)}</td>
                                 </tr>
                               ))
                             )}
                          </tbody>
                       </table>
                    </div>
                  </div>

                  <div>
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Location & Distributor</h4>
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MapIcon size={14}/></div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase">Brick</p>
                              <p className="text-xs font-bold text-gray-900">{selectedCustomer.evaBrick}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={14}/></div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase">Primary Distributor</p>
                              <p className="text-xs font-bold text-gray-900">{selectedCustomer.distributor}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="p-6 border-t border-gray-100 bg-gray-50">
                  <button className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-600 transition-all">
                    Full Customer Statement
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
                  <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={18} /></button>
               </div>
               <div className="flex-1 overflow-auto p-4 space-y-6">
                  {/* Filter Sections */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</label>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        value={filterSearch.product}
                        onChange={e => setFilterSearch(prev => ({...prev, product: e.target.value}))}
                        className="text-[9px] bg-gray-50 border-none outline-none px-2 py-0.5 rounded-lg w-24"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-xl p-1 bg-gray-50">
                       {searchedOptions.products.map(p => (
                         <button 
                            key={p} 
                            onClick={() => setFilters(f => ({...f, products: f.products.includes(p) ? f.products.filter(x=>x!==p) : [...f.products, p]}))}
                            className={`w-full text-left p-1.5 rounded-lg text-[10px] font-bold mb-0.5 transition-all
                              ${filters.products.includes(p) ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}
                            `}
                          >
                           {p}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Eva Brick</label>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        value={filterSearch.evaBrick}
                        onChange={e => setFilterSearch(prev => ({...prev, evaBrick: e.target.value}))}
                        className="text-[9px] bg-gray-50 border-none outline-none px-2 py-0.5 rounded-lg w-24"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-xl p-1 bg-gray-50">
                       {searchedOptions.evaBricks.map(b => (
                         <button 
                            key={b} 
                            onClick={() => setFilters(f => ({...f, evaBricks: f.evaBricks.includes(b) ? f.evaBricks.filter(x=>x!==b) : [...f.evaBricks, b]}))}
                            className={`w-full text-left p-1.5 rounded-lg text-[10px] font-bold mb-0.5 transition-all
                              ${filters.evaBricks.includes(b) ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}
                            `}
                          >
                           {b}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DIS Brick</label>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        value={filterSearch.disBrick}
                        onChange={e => setFilterSearch(prev => ({...prev, disBrick: e.target.value}))}
                        className="text-[9px] bg-gray-50 border-none outline-none px-2 py-0.5 rounded-lg w-24"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-xl p-1 bg-gray-50">
                       {searchedOptions.disBricks.map(b => (
                         <button 
                            key={b} 
                            onClick={() => setFilters(f => ({...f, disBricks: f.disBricks.includes(b) ? f.disBricks.filter(x=>x!==b) : [...f.disBricks, b]}))}
                            className={`w-full text-left p-1.5 rounded-lg text-[10px] font-bold mb-0.5 transition-all
                              ${filters.disBricks.includes(b) ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}
                            `}
                          >
                           {b}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distributor</label>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        value={filterSearch.distributor}
                        onChange={e => setFilterSearch(prev => ({...prev, distributor: e.target.value}))}
                        className="text-[9px] bg-gray-50 border-none outline-none px-2 py-0.5 rounded-lg w-24"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-xl p-1 bg-gray-50">
                       {searchedOptions.distributors.map(d => (
                         <button 
                            key={d} 
                            onClick={() => setFilters(f => ({...f, distributors: f.distributors.includes(d) ? f.distributors.filter(x=>x!==d) : [...f.distributors, d]}))}
                            className={`w-full text-left p-1.5 rounded-lg text-[10px] font-bold mb-0.5 transition-all
                              ${filters.distributors.includes(d) ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}
                            `}
                          >
                           {d}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</label>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        value={filterSearch.customer}
                        onChange={e => setFilterSearch(prev => ({...prev, customer: e.target.value}))}
                        className="text-[9px] bg-gray-50 border-none outline-none px-2 py-0.5 rounded-lg w-24"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-xl p-1 bg-gray-50">
                       {searchedOptions.customers.map(c => (
                         <button 
                            key={c} 
                            onClick={() => setFilters(f => ({...f, customers: f.customers.includes(c) ? f.customers.filter(x=>x!==c) : [...f.customers, c]}))}
                            className={`w-full text-left p-1.5 rounded-lg text-[10px] font-bold mb-0.5 transition-all
                              ${filters.customers.includes(c) ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}
                            `}
                          >
                           {c}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ranges</label>
                    <div className="grid grid-cols-2 gap-2">
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
               <div className="p-4 border-t border-gray-100 flex gap-2">
                  <button 
                    onClick={() => setFilters({products:[], evaBricks:[], disBricks:[], distributors:[], customers:[], customerCode:'', minValue:'', maxValue:'', minQty:'', maxQty:'', arabicOnly:false})}
                    className="flex-1 py-2 text-[10px] font-black uppercase text-gray-400 hover:text-red-500"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex-[2] py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Apply Filters
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
