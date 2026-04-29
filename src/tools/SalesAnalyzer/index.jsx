import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Package, RotateCcw, 
  Grid, Upload, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

const SalesAnalyzer = () => {
  const [data, setData] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [activeTab, setActiveTab] = useState('By Product');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Revive date objects
        setData(parsed.map(item => ({ ...item, invoiceDate: new Date(item.invoiceDate) })));
      } catch (e) {
        console.error("Failed to load cached data", e);
      }
    }
  }, []);

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
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Find header row
        const headerRowIndex = rawData.findIndex(row => 
            row.includes("اسم الصنف") && 
            row.includes("المندوب") && 
            row.includes("رقم الفاتورة")
        );

        if (headerRowIndex === -1) {
            alert("Could not detect valid headers. Ensure file has columns: 'اسم الصنف', 'المندوب', 'رقم الفاتورة'");
            setParsing(false);
            return;
        }

        const headers = rawData[headerRowIndex];
        const rows = rawData.slice(headerRowIndex + 1);

        setProgress(`Processing ${rows.length} rows...`);

        const parsedData = rows
          .map(row => {
            const rowObj = {};
            headers.forEach((h, i) => {
                if (COLUMN_MAP[h]) {
                    rowObj[COLUMN_MAP[h]] = row[i];
                }
            });
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

        setData(parsedData);
        setParsing(false);
        
        // Save to localStorage (if < 5MB)
        const jsonStr = JSON.stringify(parsedData);
        if (jsonStr.length < 5000000) {
            localStorage.setItem(STORAGE_KEY, jsonStr);
        }
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
  };

  if (parsing) {
      return (
          <div className="flex flex-col items-center justify-center h-screen">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <h3 className="text-xl font-black">{progress}</h3>
          </div>
      )
  }

  if (data.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl mt-12">
        <div className="mb-12 text-center">
           <div className="inline-flex p-4 bg-[#F5C518]/10 rounded-2xl text-[#F5C518] mb-4 shadow-sm">
             <BarChart3 size={48} />
           </div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
             ATR SALES ANALYZER
           </h2>
           <p className="text-gray-500 text-sm font-medium uppercase tracking-[0.2em] mt-2">DETAILED SALES INTELLIGENCE PLATFORM</p>
        </div>
        
        <div 
            className="p-12 bg-white border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current.click()}
        >
            <Upload size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">Drop XLSX or CSV file here</h3>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            <p className="text-gray-300 text-xs mt-6">Supports Excel (.xlsx) & CSV · Up to 100,000 rows supported</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.csv" className="hidden" />
        </div>
      </div>
    );
  }

  // --- ANALYSIS LOGIC ---
  const totalNetValue = data.reduce((acc, row) => acc + row.netValue, 0);
  const totalNetQty = data.reduce((acc, row) => acc + row.netQty, 0);
  const totalReturnValue = data.reduce((acc, row) => acc + row.returnValue, 0);
  const totalReturnQty = data.reduce((acc, row) => acc + row.returnQty, 0);
  const uniqueProducts = new Set(data.map(d => d.productName)).size;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">ATR Sales Analysis</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                {data.length} invoices · {uniqueProducts} products
            </p>
          </div>
          <button onClick={handleReset} className="text-xs font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2">
            <RefreshCw size={14} /> Reset
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Net Value', val: totalNetValue.toLocaleString(), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'EGP' },
            { label: 'Net Quantity', val: totalNetQty.toLocaleString(), icon: Package, color: 'text-green-600', bg: 'bg-green-50', sub: 'units' },
            { label: 'Total Returns', val: totalReturnValue.toLocaleString(), icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50', sub: `${totalReturnQty} units` },
            { label: 'Unique Products', val: uniqueProducts.toLocaleString(), icon: Grid, color: 'text-purple-600', bg: 'bg-purple-50', sub: 'across catalogue' }
          ].map((card, i) => (
            <div key={i} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-soft">
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                     <card.icon size={24} />
                  </div>
               </div>
               <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">{card.label}</p>
               <p className="text-2xl font-black text-gray-900 tracking-tight">{card.val}</p>
               <p className="text-xs text-gray-400">{card.sub}</p>
            </div>
          ))}
       </div>
       
       <div className="mt-8 text-center py-20 bg-white rounded-3xl border border-gray-200">
          <p className="text-gray-400">Dashboard modules under development for {activeTab}</p>
       </div>
    </div>
  );
};

export default SalesAnalyzer;
