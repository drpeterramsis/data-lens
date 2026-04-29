import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, DollarSign, Package, RotateCcw, 
  Grid, Upload, RefreshCw, ChevronLeft, ChevronRight, 
  ChevronDown, Filter
} from 'lucide-react';

import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';

const STORAGE_KEY = 'datalens_atr_sales_v1';
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

const formatDate = (d) => d.toLocaleDateString('en-EG', {day:'numeric', month:'short', year:'numeric'});

const SideFilterSection = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(true);

  const toggle = (val) => {
    if (selected.includes(val))
      onChange(selected.filter(s => s !== val));
    else
      onChange([...selected, val]);
  };

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
            {label}
          </span>
          {selected.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </div>
        <ChevronDown 
          size={12} 
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="pb-1 max-h-[200px] overflow-y-auto">
          <div className="flex gap-3 px-4 py-1">
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

          {options.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-blue-50 cursor-pointer transition-colors">
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
          ))}
        </div>
      )}
    </div>
  );
};

const SideFiltersPanel = ({ filters, setFilters, filterOptions, activeFilterCount }) => {
  const [collapsed, setCollapsed] = useState(false);

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
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
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
              onClick={() => setFilters({ branch:[], supervisor:[], mrName:[], line:[], customerType:[], product:[], fromDate:'', toDate:'' })}
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

      {[ { label: 'Branch', key: 'branch', options: filterOptions.branches }, { label: 'Supervisor', key: 'supervisor', options: filterOptions.supervisors }, { label: 'MR', key: 'mrName', options: filterOptions.mrNames }, { label: 'Line', key: 'line', options: filterOptions.lines }, { label: 'Customer Type', key: 'customerType', options: filterOptions.customerTypes }, { label: 'Product', key: 'product', options: filterOptions.products } ].map(({ label, key, options }) => (
        <SideFilterSection key={key} label={label} options={options} selected={filters[key]} onChange={v => setFilters(f => ({...f, [key]: v}))} />
      ))}
    </div>
  );
};

const SalesAnalyzer = () => {
  const [data, setData] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [persistenceInfo, setPersistenceInfo] = useState(null);
  const fileInputRef = useRef(null);
  const [filters, setFilters] = useState({
      branch: [], supervisor: [], mrName: [], 
      line: [], customerType: [], product: [],
      fromDate: '', toDate: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const cache = JSON.parse(saved);
      if (cache.tooLarge || !cache.rows || cache.rows.length === 0) {
        setPersistenceInfo({ ...cache.meta, fileName: cache.fileName, uploadedAt: cache.uploadedAt, tooLarge: true });
        return;
      }
      const rows = cache.rows.map(r => ({ supervisor: r.sup, mrName: r.mr, customerType: r.ct, customerId: r.cid, customerName: r.cn, lineName: r.ln, invoiceNo: r.inv, invoiceDate: new Date(r.dt), productCode: r.pc, productName: r.pn, salesQty: r.sq, salesValue: r.sv, returnQty: r.rq, returnValue: r.rv, netQty: r.nq, netValue: r.nv, branch: r.br }));
      setData(rows);
      setPersistenceInfo({ fileName: cache.fileName, uploadedAt: cache.uploadedAt, tooLarge: false });
    } catch (e) {
      console.error("Failed to load cached data", e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const totalProducts = useMemo(() => new Set(data.map(d => d.productName)).size, [data]);
  const totalMRs = useMemo(() => new Set(data.map(d => d.mrName)).size, [data]);
  const filterOptions = useMemo(() => {
      return {
          branches: [...new Set(data.map(d => d.branch))].sort(),
          supervisors: [...new Set(data.map(d => d.supervisor))].sort(),
          mrNames: [...new Set(data.map(d => d.mrName))].sort(),
          lines: [...new Set(data.map(d => d.lineName))].sort(),
          customerTypes: [...new Set(data.map(d => d.customerType))].sort(),
          products: [...new Set(data.map(d => d.productName))].sort()
      };
  }, [data]);

  const filteredData = useMemo(() => {
      let filtered = data;
      if (filters.branch.length > 0) filtered = filtered.filter(f => filters.branch.includes(f.branch));
      if (filters.supervisor.length > 0) filtered = filtered.filter(f => filters.supervisor.includes(f.supervisor));
      if (filters.mrName.length > 0) filtered = filtered.filter(f => filters.mrName.includes(f.mrName));
      if (filters.line.length > 0) filtered = filtered.filter(f => filters.line.includes(f.lineName));
      if (filters.customerType.length > 0) filtered = filtered.filter(f => filters.customerType.includes(f.customerType));
      if (filters.product.length > 0) filtered = filtered.filter(f => filters.product.includes(f.productName));
      if (filters.fromDate) filtered = filtered.filter(f => f.invoiceDate >= new Date(filters.fromDate));
      if (filters.toDate) filtered = filtered.filter(f => f.invoiceDate <= new Date(filters.toDate));
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
  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([k, v]) => Array.isArray(v) ? v.length > 0 : v !== '').length, [filters]);
  const startDate = useMemo(() => data.length > 0 ? new Date(Math.min(...data.map(d => d.invoiceDate))) : new Date(), [data]);
  const endDate = useMemo(() => data.length > 0 ? new Date(Math.max(...data.map(d => d.invoiceDate))) : new Date(), [data]);

  const byProduct = useMemo(() => {
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
    return Object.values(map).map(r => ({ ...r, invoiceCount: r.invoices.size, pct: total > 0 ? ((r.netValue/total)*100).toFixed(1) : '0.0' })).sort((a,b) => b.netQty - a.netQty);
  }, [filteredData]);

  const topProductsByVal = useMemo(() => byProduct.slice(0, 10).map(p => ({name: p.productName.substring(0,20), val: p.netValue})), [byProduct]);
  const topProductsByQty = useMemo(() => byProduct.slice(0, 10).map(p => ({name: p.productName.substring(0,20), val: p.netQty})), [byProduct]);
  const customerTypeData = useMemo(() => [...new Set(filteredData.map(d=>d.customerType))].map(t => ({name: t, val: filteredData.filter(d=>d.customerType===t).reduce((acc,f)=>acc+f.netValue,0)})), [filteredData]);

  const byMR = useMemo(() => {
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
    return Object.values(map).map(r => ({ ...r, customerCount: r.customers.size, invoiceCount: r.invoices.size, pct: total > 0 ? ((r.netValue/total)*100).toFixed(1) : '0.0' })).sort((a,b) => b.netQty - a.netQty);
  }, [filteredData]);

  const byCustomer = useMemo(() => {
    const map = {};
    filteredData.forEach(row => {
        const key = row.customerId || row.customerName;
        if (!map[key]) {
            map[key] = { customerName: row.customerName, customerType: row.customerType, mrName: row.mrName, branch: row.branch, netQty: 0, netValue: 0, returnQty: 0, returnValue: 0, products: new Set(), invoices: new Set() };
        }
        const c = map[key];
        c.netQty += row.netQty;
        c.netValue += row.netValue;
        c.returnQty += Math.abs(row.returnQty);
        c.returnValue += Math.abs(row.returnValue);
        c.products.add(row.productName);
        c.invoices.add(row.invoiceNo);
    });
    return Object.values(map).map(r => ({ ...r, productCount: r.products.size, invoiceCount: r.invoices.size })).sort((a,b) => b.netQty - a.netQty);
  }, [filteredData]);

  const byBranch = useMemo(() => {
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
    return Object.values(map).map(r => ({ ...r, mrCount: r.mrs.size, customerCount: r.customers.size, invoiceCount: r.invoices.size, pct: total > 0 ? ((r.netValue/total)*100).toFixed(1) : '0.0' })).sort((a,b) => b.netQty - a.netQty);
  }, [filteredData]);

  const trendData = useMemo(() => {
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    setProgress('Reading file...');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        setProgress('Detecting headers...');
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headerRowIndex = rawData.findIndex(row => row.includes("اسم الصنف") && row.includes("المندوب") && row.includes("رقم الفاتورة"));
        if (headerRowIndex === -1) { alert("Could not detect valid headers."); setParsing(false); return; }
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
        }));
        setData(parsedRows);
        setParsing(false);
        const cacheObject = {
            uploadedAt: new Date().toISOString(),
            fileName: file.name,
            meta: { totalInvoices: parsedRows.length, dateRange: { from: Math.min(...parsedRows.map(r => r.invoiceDate.getTime())), to: Math.max(...parsedRows.map(r => r.invoiceDate.getTime())) } },
            rows: parsedRows.map(r => ({ sup: r.supervisor, mr: r.mrName, ct: r.customerType, cid: r.customerId, cn: r.customerName, ln: r.lineName, inv: r.invoiceNo, dt: r.invoiceDate.getTime(), pc: r.productCode, pn: r.productName, sq: r.salesQty, sv: r.salesValue, rq: r.returnQty, rv: r.returnValue, nq: r.netQty, nv: r.netValue, br: r.branch }))
        };
        saveToStorage(cacheObject);
      } catch (err) { console.error(err); alert("Error parsing file."); setParsing(false); }
    };
    reader.readAsBinaryString(file);
  };
  const handleReset = () => { localStorage.removeItem(STORAGE_KEY); setData([]); setPersistenceInfo(null); };

  if (parsing) return <div className="flex flex-col items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" /><h3 className="text-xl font-black">{progress}</h3></div>;

   if (data.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl mt-12">
        <div className="mb-12 text-center">
           <div className="inline-flex p-4 bg-[#F5C518]/10 rounded-2xl text-[#F5C518] mb-4 shadow-sm"><BarChart3 size={48} /></div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">ATR SALES ANALYZER</h2>
           <p className="text-gray-500 text-sm font-medium uppercase tracking-[0.2em] mt-2">v1.0.005</p>
        </div>
        <div className="p-12 bg-white border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 transition-colors" onClick={() => fileInputRef.current.click()}>
            <Upload size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">Drop XLSX or CSV file here</h3>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.csv" className="hidden" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">ATR Sales Analysis</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            {data.length.toLocaleString()} INVOICES · {totalProducts} PRODUCTS · {totalMRs} MRs · {formatDate(startDate)} → {formatDate(endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFilters(f=>({...f, fromDate:'', toDate:''}))} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all font-semibold">📅 Full Period</button>
          <button onClick={handleReset} className="text-xs font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2"><RefreshCw size={12}/> Reset</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <SideFiltersPanel filters={filters} setFilters={setFilters} filterOptions={filterOptions} activeFilterCount={activeFilterCount} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="grid grid-cols-4 gap-3 px-6 pt-4 pb-3 shrink-0">
            {[
              { label: 'Net Quantity', value: kpis.netQty.toLocaleString(), suffix: 'units', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', negative: kpis.netQty < 0 },
              { label: 'Net Value', value: kpis.netValue.toLocaleString(), suffix: 'EGP', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', negative: kpis.netValue < 0 },
              { label: 'Total Returns', value: Math.abs(kpis.returnsQty).toLocaleString(), suffix: 'units', sub: Math.abs(kpis.returnsValue).toLocaleString() + ' EGP', icon: RotateCcw, color: 'text-red-500', bg: 'bg-red-50', negative: false },
              { label: 'Unique Products', value: kpis.uniqueProducts, suffix: 'products', sub: filteredData.length.toLocaleString() + ' rows', icon: Grid, color: 'text-purple-600', bg: 'bg-purple-50', negative: false },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between mb-3"><div className={`${card.bg} p-2 rounded-xl`}><card.icon size={18} className={card.color}/></div></div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className={`text-2xl font-black leading-none ${card.negative ? 'text-red-600' : 'text-gray-900'}`}>{card.value}<span className="text-sm font-semibold text-gray-400 ml-1">{card.suffix}</span></p>
                {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
              </div>
            ))}
          </div>

          <div className="flex gap-2 px-6 pb-3 shrink-0 flex-wrap">
            {['Overview','By Product','By MR','By Customer','By Branch','Trend'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}>{tab}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-[280px]"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Qty)</h4><ResponsiveContainer><BarChart data={byProduct.slice(0,10)} layout="vertical" margin={{left: 40}}><XAxis type="number" fontSize={10} /><YAxis dataKey="productName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netQty" fill="#10B981" /></BarChart></ResponsiveContainer></div>
                        <div className="h-[280px]"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Value)</h4><ResponsiveContainer><BarChart data={byProduct.slice(0,10)} layout="vertical" margin={{left: 40}}><XAxis type="number" fontSize={10} /><YAxis dataKey="productName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netValue" fill="#3B82F6" /></BarChart></ResponsiveContainer></div>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto"><table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 z-10"><tr className="text-xs text-gray-500 uppercase"><th className="p-2 text-left">#</th><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Value</th><th className="p-2 text-right">%</th></tr></thead>
                        <tbody>{byProduct.map((p, i) => <tr key={p.productName} className={`border-b ${i<3 ? (i===0?'border-l-4 border-l-yellow-400':i===1?'border-l-4 border-l-gray-400':'border-l-4 border-l-orange-400'):''} hover:bg-blue-50`}>
                            <td className="p-2">{i+1}</td><td className="p-2 font-semibold">{p.productName}</td><td className="p-2 text-right">{p.netQty.toLocaleString()}</td><td className="p-2 text-right">{p.netValue.toLocaleString()}</td><td className="p-2 text-right">{p.pct}%</td></tr>)}</tbody>
                    </table></div>
                  </div>
              )}
              {activeTab === 'By MR' && (
                  <div className="space-y-6">
                    <div className="h-[280px]"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 MRs (Net Qty)</h4><ResponsiveContainer><BarChart data={byMR.slice(0,10)} layout="vertical" margin={{left: 60}}><XAxis type="number" fontSize={10} /><YAxis dataKey="mrName" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netQty" fill="#8B5CF6" /></BarChart></ResponsiveContainer></div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto"><table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 z-10"><tr className="text-xs text-gray-500 uppercase"><th className="p-2 text-left">#</th><th className="p-2 text-left">MR</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Value</th><th className="p-2 text-right">%</th></tr></thead>
                        <tbody>{byMR.map((m, i) => <tr key={m.mrName} className="border-b hover:bg-blue-50"><td className="p-2">{i+1}</td><td className="p-2 font-semibold">{m.mrName}</td><td className="p-2 text-right">{m.netQty.toLocaleString()}</td><td className="p-2 text-right">{m.netValue.toLocaleString()}</td><td className="p-2 text-right">{m.pct}%</td></tr>)}</tbody>
                    </table></div>
                  </div>
              )}
              {activeTab === 'By Customer' && (
                  <div className="space-y-6">
                    <input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Search customer..." className="p-2 border rounded-lg w-full text-sm" />
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto"><table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 z-10"><tr className="text-xs text-gray-500 uppercase"><th className="p-2 text-left">#</th><th className="p-2 text-left">Customer</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Value</th></tr></thead>
                        <tbody>{byCustomer.filter(c=>c.customerName?.toLowerCase().includes(customerSearch.toLowerCase())).map((c, i) => <tr key={i} className="border-b hover:bg-blue-50"><td className="p-2">{i+1}</td><td className="p-2">{c.customerName}</td><td className="p-2 text-right">{c.netQty.toLocaleString()}</td><td className="p-2 text-right">{c.netValue.toLocaleString()}</td></tr>)}</tbody>
                    </table></div>
                  </div>
              )}
              {activeTab === 'By Branch' && (
                  <div className="space-y-6">
                    <div className="h-[280px]"><h4 className="text-xs font-black uppercase text-gray-400 mb-4">Branch vs Net Qty</h4><ResponsiveContainer><BarChart data={byBranch} layout="vertical" margin={{left: 60}}><XAxis type="number" fontSize={10} /><YAxis dataKey="branch" type="category" fontSize={10} /><Tooltip /><Bar dataKey="netQty" fill="#F59E0B" /></BarChart></ResponsiveContainer></div>
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto"><table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-50 z-10"><tr className="text-xs text-gray-500 uppercase"><th className="p-2 text-left">Branch</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">%</th></tr></thead>
                          <tbody>{byBranch.map(b => <tr key={b.branch} className="border-b hover:bg-blue-50"><td className="p-2 font-semibold">{b.branch}</td><td className="p-2 text-right">{b.netQty.toLocaleString()}</td><td className="p-2 text-right">{b.pct}%</td></tr>)}</tbody>
                      </table></div>
                  </div>
              )}
              {activeTab === 'Trend' && (
                  <div className="space-y-6">
                    <div className="flex gap-2"><button onClick={()=>setTrendGroup('daily')} className={`px-3 py-1 rounded text-xs ${trendGroup==='daily'?'bg-blue-600 text-white':'bg-gray-200'}`}>Daily</button><button onClick={()=>setTrendGroup('monthly')} className={`px-3 py-1 rounded text-xs ${trendGroup==='monthly'?'bg-blue-600 text-white':'bg-gray-200'}`}>Monthly</button></div>
                    <div className="h-[300px]"><ResponsiveContainer><LineChart data={trendData}><XAxis dataKey="period" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Line type="monotone" dataKey="netQty" stroke="#10B981" /><Line type="monotone" dataKey="netValue" stroke="#3B82F6" /></LineChart></ResponsiveContainer></div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalyzer;
