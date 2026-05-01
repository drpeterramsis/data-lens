
import React, { useState, useRef, useMemo } from 'react';
import {
  ChevronDown, X, BarChart3, Table2,
  Palette, Settings2, Download, Maximize2, Minimize2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart,
  Line, CartesianGrid,
} from 'recharts';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const QUARTERS = {
  Q1: [0, 1, 2],   // Jan Feb Mar
  Q2: [3, 4, 5],   // Apr May Jun
  Q3: [6, 7, 8],   // Jul Aug Sep
  Q4: [9, 10, 11], // Oct Nov Dec
};

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

const getMonthKey   = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const getQuarterKey = (d) => {
  const m = d.getMonth();
  const q = m < 3 ? 'Q1' : m < 6 ? 'Q2' : m < 9 ? 'Q3' : 'Q4';
  return `${d.getFullYear()}-${q}`;
};

const getMonthLabel = (key) => {
  // key = "2025-03"
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m)-1]} ${y}`;
};

const getQuarterLabel = (key) => key; // "2025-Q1"

// ─────────────────────────────────────────────
// MULTI-SELECT DROPDOWN
// ─────────────────────────────────────────────
const MultiSelect = ({ label, options, selected, onChange, placeholder }) => {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val) =>
    onChange(selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:border-blue-300 transition-all"
      >
        <span className="truncate">
          {selected.length === 0
            ? placeholder || `All ${label}`
            : selected.length === options.length
            ? `All ${label} (${options.length})`
            : `${selected.length} ${label} selected`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${label}...`}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-blue-400 outline-none"
            />
          </div>
          {/* All / None */}
          <div className="flex gap-2 px-3 py-1.5 border-b border-gray-100">
            <button onClick={() => onChange(options)} className="text-[10px] font-bold text-blue-600 hover:underline">All</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => onChange([])} className="text-[10px] font-bold text-gray-400 hover:underline">None</button>
          </div>
          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(opt => (
              <label key={opt} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${selected.includes(opt) ? 'bg-blue-50' : ''}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected.includes(opt) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {selected.includes(opt) && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <input type="checkbox" className="hidden" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                <span className="text-xs text-gray-700 truncate">{opt}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// COLOR PICKER ROW
// ─────────────────────────────────────────────
const DEFAULT_COLORS = [
  '#F59E0B','#3B82F6','#10B981','#8B5CF6',
  '#EF4444','#06B6D4','#F97316','#84CC16',
  '#EC4899','#6366F1',
];

const ColorPicker = ({ colors, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {colors.map((c, i) => (
      <div key={i} className="flex items-center gap-1">
        <input
          type="color"
          value={c}
          onChange={e => {
            const next = [...colors];
            next[i] = e.target.value;
            onChange(next);
          }}
          className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// CHART SETTINGS PANEL
// ─────────────────────────────────────────────
const ChartSettings = ({ settings, onChange }) => (
  <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-4">
    <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
      <Palette className="w-3.5 h-3.5" /> Chart Settings
    </h4>

    {/* Chart Type */}
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Chart Type</label>
      <div className="flex gap-2">
        {['bar','line'].map(t => (
          <button
            key={t}
            onClick={() => onChange({ ...settings, chartType: t })}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${settings.chartType === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
          >
            {t === 'bar' ? '📊 Bar' : '📈 Line'}
          </button>
        ))}
      </div>
    </div>

    {/* Colors */}
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Series Colors</label>
      <ColorPicker
        colors={settings.colors}
        onChange={c => onChange({ ...settings, colors: c })}
      />
    </div>

    {/* Font Size */}
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
        Label Size: {settings.fontSize}px
      </label>
      <input
        type="range" min="8" max="18" value={settings.fontSize}
        onChange={e => onChange({ ...settings, fontSize: parseInt(e.target.value) })}
        className="w-full accent-blue-500"
      />
    </div>

    {/* Show Values on bars */}
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Show Values</label>
      <button
        onClick={() => onChange({ ...settings, showValues: !settings.showValues })}
        className={`w-10 h-5 rounded-full transition-all relative ${settings.showValues ? 'bg-blue-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.showValues ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>

    {/* Show Legend */}
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Show Legend</label>
      <button
        onClick={() => onChange({ ...settings, showLegend: !settings.showLegend })}
        className={`w-10 h-5 rounded-full transition-all relative ${settings.showLegend ? 'bg-blue-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.showLegend ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>

    {/* Chart Height */}
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
        Chart Height: {settings.chartHeight}px
      </label>
      <input
        type="range" min="200" max="600" step="20" value={settings.chartHeight}
        onChange={e => onChange({ ...settings, chartHeight: parseInt(e.target.value) })}
        className="w-full accent-blue-500"
      />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// REPORT 1 — CHAIN × PRODUCT MATRIX
// ─────────────────────────────────────────────
const Report1 = ({ data, filterOptions }) => {

  // ── Config State ──
  const [rowDim,       setRowDim]       = useState('productName');   // rows
  const [colDim,       setColDim]       = useState('customerName');  // columns (chains)
  const [selProducts,  setSelProducts]  = useState([]);
  const [selColumns,   setSelColumns]   = useState([]);
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [metric,       setMetric]       = useState('qty');           // qty | value | both
  const [groupBy,      setGroupBy]      = useState('month');         // month | quarter
  const [showChart,    setShowChart]    = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfig,   setShowConfig]   = useState(true);
  const [activeView,   setActiveView]   = useState('table');         // table | chart

  const [chartSettings, setChartSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('reports_chart_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      chartType:   'bar',
      colors:      [...DEFAULT_COLORS],
      fontSize:    11,
      showValues:  true,
      showLegend:  true,
      chartHeight: 320,
    };
  });

  React.useEffect(() => {
    localStorage.setItem('reports_chart_settings', JSON.stringify(chartSettings));
  }, [chartSettings]);

  // ── Dimension options ──
  const dimOptions = [
    { value: 'productName',   label: 'Product' },
    { value: 'customerName',  label: 'Customer' },
    { value: 'lineName',      label: 'Line / Chain' },
    { value: 'mrName',        label: 'MR Name' },
    { value: 'branch',        label: 'Branch' },
  ];

  const colOptions = useMemo(() =>
    [...new Set(data.map(r => r[colDim]))].filter(Boolean).sort(),
    [data, colDim]
  );

  const rowOptions = useMemo(() =>
    [...new Set(data.map(r => r[rowDim]))].filter(Boolean).sort(),
    [data, rowDim]
  );

  // Auto-select all when dim changes
  const prevColDim = useRef(colDim);
  const prevRowDim = useRef(rowDim);
  React.useEffect(() => {
    if (prevColDim.current !== colDim) {
      setSelColumns([]);
      prevColDim.current = colDim;
    }
  }, [colDim]);
  React.useEffect(() => {
    if (prevRowDim.current !== rowDim) {
      setSelProducts([]);
      prevRowDim.current = rowDim;
    }
  }, [rowDim]);

  // ── Filtered base data ──
  const baseData = useMemo(() => {
    let d = [...data];
    if (fromDate) d = d.filter(r => r.invoiceDate >= new Date(fromDate));
    if (toDate)   d = d.filter(r => r.invoiceDate <= new Date(toDate));
    return d;
  }, [data, fromDate, toDate]);

  // ── Active rows & cols ──
  const activeRows = selProducts.length > 0 ? selProducts : rowOptions;
  const activeCols = selColumns.length  > 0 ? selColumns  : colOptions;

  // ── Period keys ──
  const periodKeys = useMemo(() => {
    const keys = new Set();
    baseData.forEach(r => {
      if (!(r.invoiceDate instanceof Date)) return;
      keys.add(groupBy === 'month'
        ? getMonthKey(r.invoiceDate)
        : getQuarterKey(r.invoiceDate)
      );
    });
    return [...keys].sort();
  }, [baseData, groupBy]);

  // ── Matrix data ──
  // structure: { [rowVal]: { [period]: { [colVal]: { qty, value, returnQty, returnValue } } } }
  const matrix = useMemo(() => {
    const m = {};
    baseData.forEach(r => {
      const rowVal = r[rowDim];
      const colVal = r[colDim];
      if (!activeRows.includes(rowVal)) return;
      if (!activeCols.includes(colVal)) return;
      if (!(r.invoiceDate instanceof Date)) return;

      const period = groupBy === 'month'
        ? getMonthKey(r.invoiceDate)
        : getQuarterKey(r.invoiceDate);

      if (!m[rowVal])             m[rowVal] = {};
      if (!m[rowVal][period])     m[rowVal][period] = {};
      if (!m[rowVal][period][colVal])
        m[rowVal][period][colVal] = { qty: 0, value: 0, returnQty: 0, returnValue: 0 };

      m[rowVal][period][colVal].qty   += r.netQty;
      m[rowVal][period][colVal].value += r.netValue;
      m[rowVal][period][colVal].returnQty   += r.returnQty || 0;
      m[rowVal][period][colVal].returnValue += r.returnValue || 0;
    });
    return m;
  }, [baseData, rowDim, colDim, activeRows, activeCols, groupBy]);

  // ── Cell value getter ──
  const getCell = (rowVal, period, colVal) => {
    const cell = matrix[rowVal]?.[period]?.[colVal];
    if (!cell) return { qty: 0, value: 0, returnQty: 0, returnValue: 0 };
    return cell;
  };

  // ── Row totals per period ──
  const getRowPeriodTotal = (rowVal, period) => {
    return activeCols.reduce((acc, col) => {
      const c = getCell(rowVal, period, col);
      return { 
        qty: acc.qty + c.qty, 
        value: acc.value + c.value,
        returnQty: acc.returnQty + c.returnQty,
        returnValue: acc.returnValue + c.returnValue
      };
    }, { qty: 0, value: 0, returnQty: 0, returnValue: 0 });
  };

  const periodHasReturns = useMemo(() => {
    const map = {};
    periodKeys.forEach(p => {
      map[p] = false;
      for (const r of activeRows) {
        for (const c of activeCols) {
          const cell = getCell(r, p, c);
          if (cell.returnQty !== 0 || cell.returnValue !== 0) {
            map[p] = true;
            break;
          }
        }
        if (map[p]) break;
      }
    });
    return map;
  }, [matrix, periodKeys, activeRows, activeCols]);

  const isSingleColMonthly = activeCols.length === 1 && groupBy === 'month';

  // ── Grand row total (all periods) ──
  const getRowGrandTotal = (rowVal) => {
    return periodKeys.reduce((acc, p) => {
      const t = getRowPeriodTotal(rowVal, p);
      return { qty: acc.qty + t.qty, value: acc.value + t.value };
    }, { qty: 0, value: 0 });
  };

  // ── Average per month (grand total / number of periods) ──
  const getRowAvg = (rowVal) => {
    const grand = getRowGrandTotal(rowVal);
    const n     = periodKeys.length || 1;
    return { qty: grand.qty / n, value: grand.value / n };
  };

  // ── Format number ──
  const fmtN = (n) => Math.round(n).toLocaleString();

  // Negative styles
  const negStyle = "text-[#8b0000] bg-[#ffe6e6] px-1 rounded inline-block";

  // ── Cell renderer ──
  const renderCell = (qty, value) => {
    if (metric === 'qty')   return <span className={`font-bold ${qty < 0 ? negStyle : ''}`}>{fmtN(qty)}</span>;
    if (metric === 'value') return <span className={`font-bold ${value < 0 ? negStyle.replace('inline-block','inline') : ''}`}>{fmtN(value)}</span>;
    return (
      <div className="text-center leading-tight">
        <div className={`font-black ${qty < 0 ? negStyle : 'text-gray-800'}`}>{fmtN(qty)}</div>
        <div className={`text-[9px] font-bold mt-0.5 ${value < 0 ? negStyle : 'text-blue-600'}`}>{fmtN(value)}</div>
      </div>
    );
  };

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;
  
  React.useEffect(() => {
    setPage(1);
  }, [activeRows, activeCols, periodKeys, metric, groupBy]);
  
  const paginatedRows = useMemo(() => {
    return activeRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  }, [activeRows, page, rowsPerPage]);
  
  const totalPages = Math.ceil(activeRows.length / rowsPerPage);

  // ── Chart data ──
  // For chart: x = period, series = columns (chains)
  // One chart per row (product)
  const chartData = useMemo(() => {
    return periodKeys.map(period => {
      const point = {
        period: groupBy === 'month'
          ? getMonthLabel(period)
          : getQuarterLabel(period),
      };
      // Add total per selected column
      activeCols.forEach(col => {
        let qty = 0, value = 0;
        activeRows.forEach(row => {
          const c = getCell(row, period, col);
          qty   += c.qty;
          value += c.value;
        });
        point[col] = metric === 'value' ? value : qty;
      });
      // Total
      let total = 0;
      activeCols.forEach(col => { total += point[col] || 0; });
      point['__total'] = total;
      return point;
    });
  }, [matrix, periodKeys, activeCols, activeRows, metric, groupBy]);

  // ── Export CSV ──
  const handleExport = () => {
    const rows = [];
    // Header
    const header = ['Product/Row'];
    periodKeys.forEach(p => {
      const label = groupBy === 'month' ? getMonthLabel(p) : p;
      activeCols.forEach(col => header.push(`${label} - ${col}`));
      header.push(`${label} - Total`);
      if (groupBy !== 'month') {
        header.push(`${label} - Avg/Month`);
      }
    });
    rows.push(header);

    activeRows.forEach(rowVal => {
      const row = [rowVal];
      periodKeys.forEach(period => {
        activeCols.forEach(col => {
          const c = getCell(rowVal, period, col);
          row.push(metric === 'value' ? c.value : c.qty);
        });
        const t = getRowPeriodTotal(rowVal, period);
        row.push(metric === 'value' ? t.value : t.qty);
        if (groupBy !== 'month') {
          row.push(metric === 'value'
            ? (t.value / (periodKeys.length || 1)).toFixed(0)
            : (t.qty   / (periodKeys.length || 1)).toFixed(0));
        }
      });
      rows.push(row);
    });

    const csv  = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Report1_${groupBy}_${metric}.csv`);
  };

  const isDataExcessive = activeRows.length > 20 || activeCols.length > 20;

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Config Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Report Configuration</h3>
            {!showConfig && (
              <span className="ml-3 text-[10px] font-medium text-gray-500 normal-case tracking-normal">
                {dimOptions.find(o => o.value === rowDim)?.label} ({activeRows.length}) × {dimOptions.find(o => o.value === colDim)?.label} ({activeCols.length}) • {metric.toUpperCase()} • {groupBy}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
        </button>

        {showConfig && (
          <div className="p-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

              {/* Row Dimension */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Rows (Y-axis)</label>
            <select
              value={rowDim}
              onChange={e => setRowDim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white focus:border-blue-400 outline-none"
            >
              {dimOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Column Dimension */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Columns (Chains)</label>
            <select
              value={colDim}
              onChange={e => setColDim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white focus:border-blue-400 outline-none"
            >
              {dimOptions.filter(o => o.value !== rowDim).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">From Date</label>
            <input
              type="date" value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white focus:border-blue-400 outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">To Date</label>
            <input
              type="date" value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white focus:border-blue-400 outline-none"
            />
          </div>

          {/* Metric */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Metric</label>
            <div className="flex gap-1.5">
              {[
                { id: 'qty',   label: 'Units' },
                { id: 'value', label: 'Value' },
                { id: 'both',  label: 'Both' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMetric(m.id)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${metric === m.id ? 'bg-amber-400 text-black border-amber-400' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-200'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group By */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Group By</label>
            <div className="flex gap-1.5">
              {[
                { id: 'month',   label: '📅 Monthly' },
                { id: 'quarter', label: '📆 Quarterly' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGroupBy(g.id)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${groupBy === g.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row filter */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Filter {dimOptions.find(o => o.value === rowDim)?.label}
            </label>
            <MultiSelect
              label={dimOptions.find(o => o.value === rowDim)?.label}
              options={rowOptions}
              selected={selProducts}
              onChange={setSelProducts}
            />
          </div>

          {/* Column filter */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Filter {dimOptions.find(o => o.value === colDim)?.label}
            </label>
            <MultiSelect
              label={dimOptions.find(o => o.value === colDim)?.label}
              options={colOptions}
              selected={selColumns}
              onChange={setSelColumns}
            />
          </div>
        </div>
        </div>
        )}
      </div>

      {/* ── Active Filters Summary Label ── */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Active Filters:</span>
        <div className="flex flex-wrap gap-2 text-xs">
          {selProducts.length === 0 ? (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-bold border border-blue-100">
              Row: {dimOptions.find(o => o.value === rowDim)?.label} (All)
            </span>
          ) : (
            selProducts.map(p => (
              <span key={`row_${p}`} className="group flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-bold border border-blue-100 pr-1">
                Row: {p}
                <button onClick={() => setSelProducts(selProducts.filter(x => x !== p))} className="hover:bg-blue-200 p-0.5 rounded text-blue-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}

          {selColumns.length === 0 ? (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-bold border border-purple-100">
              Col: {dimOptions.find(o => o.value === colDim)?.label} (All)
            </span>
          ) : (
            selColumns.map(c => (
              <span key={`col_${c}`} className="group flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-bold border border-purple-100 pr-1">
                Col: {c}
                <button onClick={() => setSelColumns(selColumns.filter(x => x !== c))} className="hover:bg-purple-200 p-0.5 rounded text-purple-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}

          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md font-bold border border-amber-100">
            Metric: {metric.toUpperCase()}
          </span>
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-bold border border-emerald-100">
            Group: {groupBy.toUpperCase()}
          </span>
        </div>
      </div>

      {isDataExcessive && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 mt-4 max-w-2xl mx-auto">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-xl">⚠️</span>
          </div>
          <h4 className="text-red-800 font-bold text-lg">Too Much Data to Render</h4>
          <p className="text-red-600 text-sm max-w-md">
            You currently have <strong>{activeRows.length}</strong> {dimOptions.find(o => o.value === rowDim)?.label}s and <strong>{activeCols.length}</strong> {dimOptions.find(o => o.value === colDim)?.label}s selected. 
            Generating a matrix with all this data will freeze your browser.
          </p>
          <p className="text-red-700 text-sm font-semibold pt-2">
            Please use the configuration above to select a maximum of 20 items per dimension.
          </p>
        </div>
      )}

      {/* ── View Toggle + Export ── */}
      {!isDataExcessive && (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">View:</span>
          {[
            { id: 'table', label: '📋 Table',  icon: Table2 },
            { id: 'chart', label: '📊 Chart',  icon: BarChart3 },
            { id: 'both',  label: '🔀 Both' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${activeView === v.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Settings toggle */}
          {(activeView === 'chart' || activeView === 'both') && (
            <button
              onClick={() => setShowSettings(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${showSettings ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
            >
              <Palette className="w-3.5 h-3.5" /> Chart Style
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-500 text-white border border-emerald-500 hover:bg-emerald-600 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>
      )}

      {/* ── Chart Settings Panel ── */}
      {!isDataExcessive && showSettings && (activeView === 'chart' || activeView === 'both') && (
        <ChartSettings settings={chartSettings} onChange={setChartSettings} />
      )}

      {/* ── CHART ── */}
      {!isDataExcessive && (activeView === 'chart' || activeView === 'both') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-4">
            {groupBy === 'quarter' ? 'Quarterly' : 'Monthly'} Trend —{' '}
            {metric === 'qty' ? 'Units' : metric === 'value' ? 'Value (EGP)' : 'Units & Value'}
          </h4>
          <ResponsiveContainer width="100%" height={chartSettings.chartHeight}>
            {chartSettings.chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: chartSettings.fontSize, fontWeight: 600 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: chartSettings.fontSize }} />
                <Tooltip
                  contentStyle={{ fontSize: chartSettings.fontSize, borderRadius: 12, border: '1px solid #e5e7eb' }}
                  formatter={(val) => [val.toLocaleString(), '']}
                />
                {chartSettings.showLegend && <Legend wrapperStyle={{ fontSize: chartSettings.fontSize }} />}
                {activeCols.map((col, i) => (
                  <Bar
                    key={col}
                    dataKey={col}
                    fill={chartSettings.colors[i % chartSettings.colors.length]}
                    radius={[4, 4, 0, 0]}
                    label={chartSettings.showValues
                      ? { position: 'top', fontSize: chartSettings.fontSize - 1, formatter: v => v > 0 ? v.toLocaleString() : '' }
                      : false
                    }
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: chartSettings.fontSize, fontWeight: 600 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: chartSettings.fontSize }} />
                <Tooltip
                  contentStyle={{ fontSize: chartSettings.fontSize, borderRadius: 12, border: '1px solid #e5e7eb' }}
                  formatter={(val) => [val.toLocaleString(), '']}
                />
                {chartSettings.showLegend && <Legend wrapperStyle={{ fontSize: chartSettings.fontSize }} />}
                {activeCols.map((col, i) => (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={chartSettings.colors[i % chartSettings.colors.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    label={chartSettings.showValues
                      ? { position: 'top', fontSize: chartSettings.fontSize - 1, formatter: v => v > 0 ? v.toLocaleString() : '' }
                      : false
                    }
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* ── TABLE ── */}
      {!isDataExcessive && (activeView === 'table' || activeView === 'both') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${400 + periodKeys.length * activeCols.length * 80}px` }}>
              <thead>

                {/* ── Row 1: Period groups ── */}
                <tr>
                  {/* Product column header */}
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-20 bg-amber-400 text-black px-4 py-3 text-left text-xs font-black border border-amber-300 min-w-[160px]"
                  >
                    {dimOptions.find(o => o.value === rowDim)?.label} /{' '}
                    {dimOptions.find(o => o.value === colDim)?.label}
                  </th>

                  {periodKeys.map(period => {
                    const hideTotal = isSingleColMonthly && !periodHasReturns[period];
                    let colSpan = activeCols.length;
                    if (!hideTotal) colSpan++; // Total column
                    if (groupBy !== 'month') colSpan++; // Avg column
                    if (isSingleColMonthly && periodHasReturns[period]) colSpan++; // Returns column

                    return (
                      <th
                        key={period}
                        colSpan={colSpan}
                        className="bg-amber-300 text-black px-3 py-2 text-center text-xs font-black border border-amber-200 uppercase tracking-wide"
                      >
                        {groupBy === 'month' ? getMonthLabel(period) : getQuarterLabel(period)}
                      </th>
                    );
                  })}

                  {/* Grand Total */}
                  <th
                    colSpan={2}
                    className="bg-blue-600 text-white px-3 py-2 text-center text-xs font-black border border-blue-500"
                  >
                    Grand Total
                  </th>
                </tr>

                {/* ── Row 2: Column names ── */}
                <tr>
                  {periodKeys.map(period => {
                    const hideTotal = isSingleColMonthly && !periodHasReturns[period];
                    const hasReturnsCol = isSingleColMonthly && periodHasReturns[period];
                    
                    let colsToRender = [...activeCols];
                    if (hasReturnsCol) colsToRender.push('__returns');
                    if (!hideTotal) colsToRender.push('__total');
                    if (groupBy !== 'month') colsToRender.push('__avg');

                    return colsToRender.map((col, ci) => {
                      const isTotal = col === '__total';
                      const isAvg   = col === '__avg';
                      const isReturns = col === '__returns';
                      return (
                        <th
                          key={`${period}_${col}`}
                          className={`px-2 py-2 text-center text-[10px] font-black border whitespace-nowrap
                            ${isTotal ? 'bg-amber-500 text-black border-amber-400' :
                              isAvg   ? 'bg-blue-400 text-white border-blue-300' :
                              isReturns ? 'bg-red-400 text-white border-red-300' :
                                        'bg-amber-100 text-amber-900 border-amber-200'}`}
                        >
                          {isTotal ? 'Net Total' : isAvg ? 'Avg/Mo' : isReturns ? 'Returns' : col}
                        </th>
                      );
                    });
                  })}
                  {/* Grand total sub-headers */}
                  <th className="bg-blue-500 text-white px-2 py-2 text-center text-[10px] font-black border border-blue-400">Total</th>
                  <th className="bg-blue-400 text-white px-2 py-2 text-center text-[10px] font-black border border-blue-300">Avg/Mo</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((rowVal, ri) => {
                  const grand = getRowGrandTotal(rowVal);
                  const avg   = getRowAvg(rowVal);
                  return (
                    <tr
                      key={rowVal}
                      className={`${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-yellow-50/40 transition-colors`}
                    >
                      {/* Row label */}
                      <td className="sticky left-0 z-10 bg-white px-4 py-2 font-bold text-gray-800 border-b border-gray-100 border-r border-gray-200 text-xs whitespace-nowrap max-w-[200px] truncate">
                        {rowVal}
                      </td>

                      {/* Period cells */}
                      {periodKeys.map(period => {
                        const hideTotal = isSingleColMonthly && !periodHasReturns[period];
                        const hasReturnsCol = isSingleColMonthly && periodHasReturns[period];
                        const periodTotal = getRowPeriodTotal(rowVal, period);
                        const periodAvg   = {
                          qty:   periodTotal.qty   / (periodKeys.length || 1),
                          value: periodTotal.value / (periodKeys.length || 1),
                        };

                        let colsToRender = [...activeCols];
                        if (hasReturnsCol) colsToRender.push('__returns');
                        if (!hideTotal) colsToRender.push('__total');
                        if (groupBy !== 'month') colsToRender.push('__avg');

                        return colsToRender.map(col => {
                          if (col === '__total') {
                            return (
                              <td
                                key={`${period}__total`}
                                className="px-2 py-2 text-center border-b border-gray-100 border-r border-amber-100 bg-amber-50 text-xs font-black text-amber-800"
                              >
                                {renderCell(periodTotal.qty, periodTotal.value)}
                              </td>
                            );
                          }
                          if (col === '__avg') {
                            return (
                              <td
                                key={`${period}__avg`}
                                className="px-2 py-2 text-center border-b border-gray-100 border-r border-blue-100 bg-blue-50 text-xs font-black text-blue-700"
                              >
                                {renderCell(periodAvg.qty, periodAvg.value)}
                              </td>
                            );
                          }
                          if (col === '__returns') {
                            return (
                              <td
                                key={`${period}__returns`}
                                className="px-2 py-2 text-center border-b border-gray-100 border-r border-red-100 bg-red-50 text-xs font-black text-red-800"
                              >
                                {renderCell(periodTotal.returnQty, periodTotal.returnValue)}
                              </td>
                            );
                          }
                          const c = getCell(rowVal, period, col);
                          return (
                            <td
                              key={`${period}_${col}`}
                              className="px-2 py-2 text-center border-b border-gray-100 border-r border-gray-50 text-xs"
                            >
                              {renderCell(c.qty, c.value)}
                            </td>
                          );
                        });
                      })}

                      {/* Grand Total */}
                      <td className="px-3 py-2 text-center border-b border-gray-100 border-r border-blue-100 bg-blue-50 text-xs font-black text-blue-800">
                        {renderCell(grand.qty, grand.value)}
                      </td>
                      {/* Grand Avg */}
                      <td className="px-3 py-2 text-center border-b border-gray-100 bg-blue-50/60 text-xs font-black text-blue-600">
                        {renderCell(avg.qty, avg.value)}
                      </td>
                    </tr>
                  );
                })}

                {/* ── Grand Total Row ── */}
                <tr className="bg-gray-900 text-white">
                  <td className="sticky left-0 z-10 bg-gray-900 px-4 py-2.5 font-black text-xs border-t border-gray-700">
                    TOTAL
                  </td>
                  {periodKeys.map(period => {
                    const hideTotal = isSingleColMonthly && !periodHasReturns[period];
                    const hasReturnsCol = isSingleColMonthly && periodHasReturns[period];

                    const colTotals = activeCols.map(col => {
                      return activeRows.reduce((acc, rowVal) => {
                        const c = getCell(rowVal, period, col);
                        return { qty: acc.qty + c.qty, value: acc.value + c.value, returnQty: acc.returnQty + c.returnQty, returnValue: acc.returnValue + c.returnValue };
                      }, { qty: 0, value: 0, returnQty: 0, returnValue: 0 });
                    });
                    
                    const periodGrand = colTotals.reduce(
                      (acc, c) => ({ qty: acc.qty + c.qty, value: acc.value + c.value, returnQty: acc.returnQty + c.returnQty, returnValue: acc.returnValue + c.returnValue }),
                      { qty: 0, value: 0, returnQty: 0, returnValue: 0 }
                    );

                    let colsToRender = [...activeCols];
                    if (hasReturnsCol) colsToRender.push('__returns');
                    if (!hideTotal) colsToRender.push('__total');
                    if (groupBy !== 'month') colsToRender.push('__avg');

                    return colsToRender.map((col, ci) => {
                      if (col === '__total') {
                        return (
                          <td key={`tot_${period}__total`} className="px-2 py-2.5 text-center text-xs font-black border-t border-gray-700 border-r border-gray-700 bg-amber-500 text-black">
                            {fmtN(metric === 'value' ? periodGrand.value : periodGrand.qty)}
                          </td>
                        );
                      }
                      if (col === '__avg') {
                        return (
                          <td key={`tot_${period}__avg`} className="px-2 py-2.5 text-center text-xs font-black border-t border-gray-700 border-r border-gray-700 bg-blue-500 text-white">
                            {fmtN(metric === 'value'
                              ? periodGrand.value / (periodKeys.length || 1)
                              : periodGrand.qty   / (periodKeys.length || 1)
                            )}
                          </td>
                        );
                      }
                      if (col === '__returns') {
                        return (
                          <td key={`tot_${period}__returns`} className="px-2 py-2.5 text-center text-xs font-black border-t border-gray-700 border-r border-gray-700 bg-red-500 text-white">
                            {fmtN(metric === 'value' ? periodGrand.returnValue : periodGrand.returnQty)}
                          </td>
                        );
                      }
                      return (
                        <td key={`tot_${period}_${col}`} className="px-2 py-2.5 text-center text-xs font-bold border-t border-gray-700 border-r border-gray-700">
                          {fmtN(metric === 'value' ? colTotals[ci].value : colTotals[ci].qty)}
                        </td>
                      );
                    });
                  })}
                  {/* Grand totals */}
                  {(() => {
                    const allTotal = activeRows.reduce((acc, rowVal) => {
                      const g = getRowGrandTotal(rowVal);
                      return { qty: acc.qty + g.qty, value: acc.value + g.value };
                    }, { qty: 0, value: 0 });
                    return (
                      <>
                        <td className="px-3 py-2.5 text-center text-xs font-black border-t border-gray-700 bg-blue-600">
                          {fmtN(metric === 'value' ? allTotal.value : allTotal.qty)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs font-black border-t border-gray-700 bg-blue-500">
                          {fmtN((metric === 'value' ? allTotal.value : allTotal.qty) / (periodKeys.length || 1))}
                        </td>
                      </>
                    );
                  })()}
                </tr>
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500 font-medium tracking-wide">
                Showing {((page - 1) * rowsPerPage) + 1} - {Math.min(page * rowsPerPage, activeRows.length)} of {activeRows.length} rows
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {periodKeys.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm font-bold text-gray-500">No data for selected period</p>
          <p className="text-xs text-gray-400 mt-1">Adjust the date range or filters</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// REPORTS TAB — CONTAINER
// ─────────────────────────────────────────────
const ReportsTab = ({ data, filterOptions }) => {
  const [activeReport, setActiveReport] = useState('report1');
  const [isFullscreen, setIsFullscreen]   = useState(false);

  const reports = [
    { id: 'report1', label: '📊 Chain × Product Matrix', desc: 'Compare chains/customers by product across periods' },
    // Future reports go here
  ];

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-[200] bg-gray-50 flex flex-col p-4 w-screen h-screen' : 'flex flex-col h-full'}>
      {/* Report selector */}
      <div className={`flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 bg-white border-gray-100 overflow-x-auto ${isFullscreen ? 'rounded-t-2xl border shadow-sm' : 'border-b'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0">Reports:</span>
          {reports.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              title={r.desc}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${activeReport === r.id ? 'bg-amber-400 text-black border-amber-400 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-700'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 transition-all bg-white ml-auto"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* Report content */}
      <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'bg-white border-x border-b border-gray-100 rounded-b-2xl shadow-sm p-4' : 'p-4'}`}>
        {activeReport === 'report1' && (
          <Report1 data={data} filterOptions={filterOptions} />
        )}
      </div>
    </div>
  );
};

export default ReportsTab;