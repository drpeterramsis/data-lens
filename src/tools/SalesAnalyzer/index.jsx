import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, DollarSign, Package, RotateCcw, 
  Grid, Upload, RefreshCw, Calendar, Filter, Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

const STORAGE_KEY = 'datalens_atr_sales_v1';

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

const SALES_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

const SalesAnalyzer = () => {
  const [data, setData] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [persistenceInfo, setPersistenceInfo] = useState(null);
  const fileInputRef = useRef(null);

  // Filters State
  const [filters, setFilters] = useState({
      branch: 'All', supervisor: 'All', mrName: 'All', 
      line: 'All', customerType: 'All', product: 'All',
      fromDate: '', toDate: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { uploadedAt, fileName, rows } = JSON.parse(saved);
        setData(rows.map(item => ({ ...item, invoiceDate: new Date(item.invoiceDate) })));
        setPersistenceInfo({ uploadedAt, fileName });
      } catch (e) {
        console.error("Failed to load cached data", e);
      }
    }
  }, []);

  const filteredData = useMemo(() => {
      let filtered = data;
      if (filters.branch !== 'All') filtered = filtered.filter(f => f.branch === filters.branch);
      if (filters.supervisor !== 'All') filtered = filtered.filter(f => f.supervisor === filters.supervisor);
      if (filters.mrName !== 'All') filtered = filtered.filter(f => f.mrName === filters.mrName);
      if (filters.line !== 'All') filtered = filtered.filter(f => f.lineName === filters.line);
      if (filters.customerType !== 'All') filtered = filtered.filter(f => f.customerType === filters.customerType);
      if (filters.product !== 'All') filtered = filtered.filter(f => f.productName === filters.product);
      if (filters.fromDate) filtered = filtered.filter(f => f.invoiceDate >= new Date(filters.fromDate));
      if (filters.toDate) filtered = filtered.filter(f => f.invoiceDate <= new Date(filters.toDate));
      return filtered;
  }, [data, filters]);

  const kpis = useMemo(() => {
    const netValue = filteredData.reduce((acc, row) => acc + row.netValue, 0);
    const netQty = filteredData.reduce((acc, row) => acc + row.netQty, 0);
    const returnsValue = filteredData.reduce((acc, row) => acc + Math.abs(row.returnValue), 0);
    const returnsQty = filteredData.reduce((acc, row) => acc + Math.abs(row.returnQty), 0);
    const uniqueProducts = new Set(filteredData.map(d => d.productName)).size;
    return { netValue, netQty, returnsValue, returnsQty, uniqueProducts };
  }, [filteredData]);

  const activeFilterCount = useMemo(() => Object.values(filters).filter(v => v !== 'All' && v !== '').length, [filters]);

  const startDate = useMemo(() => data.length > 0 ? new Date(Math.min(...data.map(d => d.invoiceDate))) : new Date(), [data]);
  const endDate = useMemo(() => data.length > 0 ? new Date(Math.max(...data.map(d => d.invoiceDate))) : new Date(), [data]);

  const topProducts = useMemo(() => [...new Set(filteredData.map(d=>d.productName))].map(p => ({name: p.substring(0,20), val: filteredData.filter(d=>d.productName===p).reduce((acc,f)=>acc+f.netValue,0)})).sort((a,b)=>b.val-a.val).slice(0,10), [filteredData]);
  const customerTypeData = useMemo(() => [...new Set(filteredData.map(d=>d.customerType))].map(t => ({name: t, val: filteredData.filter(d=>d.customerType===t).reduce((acc,f)=>acc+f.netValue,0)})), [filteredData]);
  const customerTypeCells = useMemo(() => SALES_COLORS, []);

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
        const headerRowIndex = rawData.findIndex(row => 
            row.includes("اسم الصنف") && 
            row.includes("المندوب") && 
            row.includes("رقم الفاتورة")
        );
        if (headerRowIndex === -1) {
            alert("Could not detect valid headers.");
            setParsing(false); return;
        }
        const headers = rawData[headerRowIndex];
        const rows = rawData.slice(headerRowIndex + 1);
        setProgress(`Processing ${rows.length} rows...`);
        const parsedRows = rows
          .map(row => {
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
        const saveObj = { uploadedAt: new Date().toISOString(), fileName: file.name, rows: parsedRows };
        const jsonStr = JSON.stringify(saveObj);
        if (jsonStr.length < 4500000) localStorage.setItem(STORAGE_KEY, jsonStr);
      } catch (err) {
        console.error(err);
        alert("Error parsing file.");
        setParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };
  const handleReset = () => {
    setData([]);
    localStorage.removeItem(STORAGE_KEY);
    setPersistenceInfo(null);
  };

  if (parsing) return <div className="flex flex-col items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" /><h3 className="text-xl font-black">{progress}</h3></div>;
  if (data.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl mt-12">
        <div className="mb-12 text-center">
           <div className="inline-flex p-4 bg-[#F5C518]/10 rounded-2xl text-[#F5C518] mb-4 shadow-sm"><BarChart3 size={48} /></div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">ATR SALES ANALYZER</h2>
           <p className="text-gray-500 text-sm font-medium uppercase tracking-[0.2em] mt-2">DETAILED SALES INTELLIGENCE PLATFORM</p>
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
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">ATR Sales Analysis</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                {data.length.toLocaleString()} INVOICES · {kpis.uniqueProducts.toLocaleString()} PRODUCTS · {new Set(data.map(d=>d.mrName)).size} MRs
                 · {startDate.toLocaleDateString('en-EG', {day:'numeric', month:'short', year:'numeric'})} → {endDate.toLocaleDateString('en-EG', {day:'numeric', month:'short', year:'numeric'})}
            </p>
          </div>
          <button onClick={handleReset} className="text-xs font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2">
            <RefreshCw size={14} /> Reset
          </button>
       </div>

       {persistenceInfo && (<div className="text-xs p-2 bg-green-50 text-green-700 rounded-md">Loaded from cache: {persistenceInfo.fileName} ({new Date(persistenceInfo.uploadedAt).toLocaleString()})</div>)}

       <div className="bg-white p-4 rounded-xl shadow-soft grid grid-cols-2 md:grid-cols-4 gap-4 items-center sticky top-[84px] z-10 border border-gray-200">
           {['branch','supervisor','mrName','line','customerType','product'].map(f => (
               <select key={f} value={filters[f]} onChange={(e)=>setFilters({...filters, [f]: e.target.value})} className="text-xs p-2 border rounded-lg border-gray-200 uppercase font-bold">
                   <option value="All">All {f}</option>
                   {[...new Set(data.map(d => d[f === 'line' ? 'lineName' : f]))].sort().map(val => <option key={val} value={val}>{val}</option>)}
               </select>
           ))}
           <input type="date" onChange={e => setFilters({...filters, fromDate: e.target.value})} className="text-xs p-2 border rounded-lg border-gray-200" />
           <input type="date" onChange={e => setFilters({...filters, toDate: e.target.value})} className="text-xs p-2 border rounded-lg border-gray-200" />
           <button onClick={() => setFilters({branch:'All', supervisor:'All', mrName:'All', line:'All', customerType:'All', product:'All', fromDate:'', toDate:''})} className="text-xs bg-red-50 text-red-600 font-black p-2 rounded-lg flex items-center justify-center gap-1">
                Clear All {activeFilterCount > 0 && <span className="bg-red-200 px-1 rounded">{activeFilterCount}</span>}
           </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[ 
            { label: 'Net Value', val: `${kpis.netValue.toLocaleString('en-EG')} EGP`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Net Quantity', val: `${kpis.netQty.toLocaleString('en-EG')} units`, icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Returns', val: `${kpis.returnsValue.toLocaleString('en-EG')} EGP`, icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50', sub: `${kpis.returnsQty.toLocaleString('en-EG')} units returned` },
            { label: 'Unique Products', val: kpis.uniqueProducts.toLocaleString('en-EG'), icon: Grid, color: 'text-purple-600', bg: 'bg-purple-50' }
          ].map((card, i) => (
            <div key={i} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-soft">
               <div className={`p-3 rounded-xl mb-4 inline-block ${card.bg} ${card.color}`}><card.icon size={24} /></div>
               <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">{card.label}</p>
               <p className="text-xl font-black text-gray-900 tracking-tight">{card.val}</p>
               {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
            </div>
          ))}
       </div>

       <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
           {['Overview','By Product','By MR','By Customer','By Branch','Trend'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 text-xs font-black uppercase p-3 rounded-lg transition-all ${activeTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>{tab}</button>
           ))}
       </div>

       <div className="bg-white p-6 rounded-3xl border border-gray-200">
          {activeTab === 'Overview' && (
              <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="h-[300px]">
                          <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Top 10 Products (Net Value)</h4>
                          <ResponsiveContainer><BarChart data={topProducts}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="val" fill="#3B82F6" /></BarChart></ResponsiveContainer>
                      </div>
                      <div className="h-[300px]">
                          <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Net Value by Customer Type</h4>
                          <ResponsiveContainer><PieChart><Pie data={customerTypeData} dataKey="val" nameKey="name" cx="50%" cy="50%" outerRadius={80}>{customerTypeCells}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                      </div>
                  </div>
              </div>
          )}
          {activeTab !== 'Overview' && <div className="text-center py-12 text-gray-400">Analysis module "{activeTab}" is in progress.</div>}
       </div>
    </div>
  );
};

export default SalesAnalyzer;
