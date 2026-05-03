import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Upload, Trash2, Filter, 
  ChevronRight, ChevronDown, Check, X,
  LayoutDashboard, BarChart3, Target, AlertTriangle, 
  Search, Download, ArrowLeft, MoreHorizontal,
  ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, ReferenceLine, Legend,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { FilterButton } from '../../components/ui/FilterButton';

// Utilities
import { formatKpi, formatKpiGrouped, formatKpiPercent } from '../../utils/formatNumber';
import { 
  cleanValue, 
  parseNameAndArea, 
  calculatePeriodProgress, 
  projectValue, 
  getStatusDetails, 
  getDifficultyDetails,
  getQuadrant
} from '../../utils/salesForecastLogic';

// Sub-components
import OverviewTab from './OverviewTab';
import ForecastTab from './ForecastTab';
import RankingsTab from './RankingsTab';
import GapAnalysisTab from './GapAnalysisTab';
import AtRiskAnalysisTab from './AtRiskAnalysisTab';
import DrillDownTab from './DrillDownTab';

const SalesForecastTool = () => {
  // ════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════
  const [rawData, setRawData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [drillPath, setDrillPath] = useState([]); // Array of { level, id, name }
  
  const [filters, setFilters] = useState({
    lines: [],
    dms: [],
    mrs: [],
    products: [],
    achievementRange: 'all',
    atRiskOnly: false
  });

  const [periodProgress, setPeriodProgress] = useState({
    currentDay: new Date().getDate() > 30 ? 30 : new Date().getDate(),
    totalDays: 30
  });

  // ════════════════════════════════════════════
  // FILE PARSING
  // ════════════════════════════════════════════
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      processParsedData(json);
    };
    reader.readAsBinaryString(file);
  };

  const processParsedData = (rows) => {
    // Expected structure has headers. Let's find them or assuming they start at index 0/1
    // Headers: Line Name | DM ID | DM Name (District Name) | MR ID | MR Name (Area Name) | Product Code | Product Name | Sales Unit | Sales Value | Target Unit | Target Value | Ratio | Sales Points | Target Points | Ratio.1
    
    const parsedData = [];
    // Basic heuristic: find row that looks like headers or just skip first if we know fixed format
    // For now, let's assume row 0 or 1 is header.
    
    // Skip subtotal rows ("Total" in first cell) or empty rows
    rows.forEach((row, idx) => {
      if (idx === 0) return; // Skip headers for now or use them to map
      if (!row || row.length === 0) return;
      const firstCell = row[0]?.toString().trim();
      if (!firstCell || firstCell === 'Total' || firstCell === 'Line Name') return;

      const dmInfo = parseNameAndArea(row[2]);
      const mrInfo = parseNameAndArea(row[4]);

      parsedData.push({
        lineName: row[0],
        dmId: row[1],
        dmName: dmInfo.name,
        districtName: dmInfo.sub,
        mrId: row[3],
        mrName: mrInfo.name,
        areaName: mrInfo.sub,
        productCode: row[5],
        productName: row[6],
        salesUnit: cleanValue(row[7]),
        salesValue: cleanValue(row[8]),
        targetUnit: cleanValue(row[9]),
        targetValue: cleanValue(row[10]),
        achievementRatio: cleanValue(row[11]), // Already as percentage (e.g. 42.98)
        salesPoints: cleanValue(row[12]),
        targetPoints: cleanValue(row[13]),
        pointsRatio: cleanValue(row[14]) // Ratio.1
      });
    });

    setRawData(parsedData);
    setIsLoading(false);
  };

  const clearData = () => {
    setRawData([]);
    setFileName('');
    setFilters({
      lines: [], dms: [], mrs: [], products: [],
      achievementRange: 'all', atRiskOnly: false
    });
  };

  // ════════════════════════════════════════════
  // COMPUTED / FILTERED DATA
  // ════════════════════════════════════════════
  const uniqueDimensions = useMemo(() => {
    const dims = {
      lines: new Set(),
      dms: new Set(),
      mrs: new Set(),
      products: new Set()
    };
    rawData.forEach(r => {
      if (r.lineName) dims.lines.add(r.lineName);
      if (r.dmName) dims.dms.add(r.dmName);
      if (r.mrName) dims.mrs.add(r.mrName);
      if (r.productName) dims.products.add(r.productName);
    });
    return {
      lines: Array.from(dims.lines).sort(),
      dms: Array.from(dims.dms).sort(),
      mrs: Array.from(dims.mrs).sort(),
      products: Array.from(dims.products).sort()
    };
  }, [rawData]);

  const filteredData = useMemo(() => {
    let data = rawData;

    if (filters.lines.length > 0) data = data.filter(r => filters.lines.includes(r.lineName));
    if (filters.dms.length > 0) data = data.filter(r => filters.dms.includes(r.dmName));
    if (filters.mrs.length > 0) data = data.filter(r => filters.mrs.includes(r.mrName));
    if (filters.products.length > 0) data = data.filter(r => filters.products.includes(r.productName));

    // Achievement Range Filter
    const progress = (periodProgress.currentDay / periodProgress.totalDays) * 100;

    data = data.filter(r => {
      const ach = r.targetUnit > 0 ? (r.salesUnit / r.targetUnit) * 100 : 0;
      const projAch = r.targetUnit > 0 ? (projectValue(r.salesUnit, progress) / r.targetUnit) * 100 : 0;
      
      // achievementRange filter
      let passRange = true;
      if (filters.achievementRange === '<50%') passRange = ach < 50;
      else if (filters.achievementRange === '50-75%') passRange = ach >= 50 && ach < 75;
      else if (filters.achievementRange === '75-100%') passRange = ach >= 75 && ach < 100;
      else if (filters.achievementRange === '>100%') passRange = ach >= 100;

      // At Risk Only
      const passRisk = !filters.atRiskOnly || projAch < 95;

      return passRange && passRisk;
    });

    return data;
  }, [rawData, filters, periodProgress]);

  const summary = useMemo(() => {
    if (filteredData.length === 0) return null;
    const mrCount = new Set(filteredData.map(r => r.mrName)).size;
    const lineCount = new Set(filteredData.map(r => r.lineName)).size;
    const totalSales = filteredData.reduce((sum, r) => sum + r.salesUnit, 0);
    const totalTarget = filteredData.reduce((sum, r) => sum + r.targetUnit, 0);
    const avgAchievement = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;

    const progress = (periodProgress.currentDay / periodProgress.totalDays) * 100;
    const atRiskCount = new Set(
      filteredData
        .filter(r => {
          const projAch = r.targetUnit > 0 ? (projectValue(r.salesUnit, progress) / r.targetUnit) * 100 : 0;
          return projAch < 95;
        })
        .map(r => r.mrName)
    ).size;

    return {
      records: filteredData.length,
      mrs: mrCount,
      lines: lineCount,
      avgAchievement: formatKpiPercent(avgAchievement),
      atRisk: atRiskCount
    };
  }, [filteredData, periodProgress]);

  // ════════════════════════════════════════════
  // UI COMPONENTS
  // ════════════════════════════════════════════

  if (rawData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 min-h-[calc(100vh-140px)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
            <TrendingUp size={40} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Sales Forecast Tool</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Upload your sales data file (.xlsx or .csv) to generate projections, gap analysis, and performance rankings.
          </p>
          
          <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            <div className="flex flex-col items-center">
              <Upload size={32} className="text-gray-400 group-hover:text-blue-500 transition-colors mb-4" />
              <span className="text-sm font-bold text-gray-600">Drag & Drop or Click to Upload</span>
              <span className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-black">Excel / CSV Supported</span>
            </div>
          </label>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full min-w-0">
      {/* SIDEBAR FILTERS */}
      <div className="absolute top-0 bottom-0 left-0 w-64 flex flex-col bg-white border-r border-gray-200 overflow-hidden shadow-2xl z-50 transform -translate-x-full transition-transform duration-300 md:translate-x-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900 font-black uppercase tracking-widest text-xs">
            <Filter size={14} className="text-blue-600" />
            Filters
          </div>
          <button className="md:hidden p-1 text-gray-400">
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <FilterGroup 
            label="Line Name" 
            options={uniqueDimensions.lines} 
            selected={filters.lines} 
            onChange={(val) => setFilters(prev => ({ ...prev, lines: val }))} 
          />
          <FilterGroup 
            label="DM / District" 
            options={uniqueDimensions.dms} 
            selected={filters.dms} 
            onChange={(val) => setFilters(prev => ({ ...prev, dms: val }))} 
          />
          <FilterGroup 
            label="MR" 
            options={uniqueDimensions.mrs} 
            selected={filters.mrs} 
            onChange={(val) => setFilters(prev => ({ ...prev, mrs: val }))} 
          />
          <FilterGroup 
            label="Product" 
            options={uniqueDimensions.products} 
            selected={filters.products} 
            onChange={(val) => setFilters(prev => ({ ...prev, products: val }))} 
          />
        </div>

        <div className="p-4 border-t border-gray-100 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Achievement Range</label>
            <div className="grid grid-cols-1 gap-1">
              {['all', '<50%', '50-75%', '75-100%', '>100%'].map(range => (
                <FilterButton
                  key={range}
                  isActive={filters.achievementRange === range}
                  onClick={() => setFilters(prev => ({ ...prev, achievementRange: range }))}
                  label={range === 'all' ? 'All ranges' : range}
                  className="w-full text-left"
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div 
              onClick={() => setFilters(prev => ({ ...prev, atRiskOnly: !prev.atRiskOnly }))}
              className={`w-10 h-6 rounded-full transition-all relative ${filters.atRiskOnly ? 'bg-red-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${filters.atRiskOnly ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">At Risk Only</span>
          </label>

          <FilterButton 
            onClick={() => setFilters({ lines: [], dms: [], mrs: [], products: [], achievementRange: 'all', atRiskOnly: false })}
            label="Clear All"
            className="w-full"
          />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <span className="text-2xl">📈</span> Sales Forecast
            </h2>
            {fileName && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                <span className="max-w-[150px] truncate">{fileName}</span>
                <Check size={14} className="text-blue-500" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={clearData}
              className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Trash2 size={16} />
              Clear Data
            </button>
            <label className="cursor-pointer px-4 py-2 bg-gray-900 text-white hover:bg-blue-600 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2">
              <Upload size={16} />
              Upload Again
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </label>
          </div>
        </header>

        {/* Summary Mini Bar */}
        {summary && (
          <div className="h-12 bg-gray-900 flex items-center gap-4 px-6 shrink-0 overflow-x-auto no-scrollbar">
            <StatBadge label="Records" value={formatKpiGrouped(summary.records)} />
            <StatBadge label="MRs" value={formatKpiGrouped(summary.mrs)} />
            <StatBadge label="Lines" value={formatKpiGrouped(summary.lines)} />
            <StatBadge label="Avg Achievement" value={`${summary.avgAchievement}%`} highlight={parseFloat(summary.avgAchievement) >= 100 ? 'text-emerald-400' : 'text-amber-400'} />
            <StatBadge label="At Risk" value={formatKpiGrouped(summary.atRisk)} highlight={summary.atRisk > 0 ? 'text-red-400' : 'text-emerald-400'} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 shrink-0 z-10 sticky top-0">
          <div className="flex overflow-x-auto no-scrollbar gap-8">
            <TabButton active={activeTab === 'overview'} label="Performance Overview" icon={<LayoutDashboard size={16} />} onClick={() => setActiveTab('overview')} />
            <TabButton active={activeTab === 'forecast'} label="Forecast & Projection" icon={<TrendingUp size={16} />} onClick={() => setActiveTab('forecast')} />
            <TabButton active={activeTab === 'rankings'} label="Rankings" icon={<MoreHorizontal size={16} />} onClick={() => setActiveTab('rankings')} />
            <TabButton active={activeTab === 'gap'} label="Gap Analysis" icon={<Target size={16} />} onClick={() => setActiveTab('gap')} />
            <TabButton active={activeTab === 'risk'} label="At Risk Analysis" icon={<AlertTriangle size={16} />} onClick={() => setActiveTab('risk')} />
            <TabButton active={activeTab === 'drill'} label="Drill Down" icon={<Search size={16} />} onClick={() => setActiveTab('drill')} />
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -10 }}
               transition={{ duration: 0.2 }}
               className="h-full"
             >
               <TabContent 
                 tab={activeTab} 
                 data={filteredData} 
                 periodProgress={periodProgress} 
                 setPeriodProgress={setPeriodProgress} 
                 drillPath={drillPath}
                 setDrillPath={setDrillPath}
                 setActiveTab={setActiveTab}
               />
             </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════

const FilterGroup = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded-lg transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
          {selected.length > 0 && (
            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
              {selected.length}
            </span>
          )}
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-4 pt-1">
              {options.length > 5 && (
                <div className="relative mb-3">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder={`Search ${label}...`}
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg pl-8 pr-3 py-1.5 text-[11px] focus:bg-white focus:border-blue-300 outline-none transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              )}
              <div className="max-h-[200px] overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div className="py-4 text-center text-[10px] text-gray-400 uppercase font-black">No results</div>
                ) : (
                  filteredOptions.map(opt => (
                    <FilterButton
                      key={opt}
                      isActive={selected.includes(opt)}
                      onClick={() => {
                        if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
                        else onChange([...selected, opt]);
                      }}
                      label={opt}
                      className="w-full text-left truncate justify-start"
                    />
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatBadge = ({ label, value, highlight = 'text-white' }) => (
  <div className="flex items-center gap-1.5 whitespace-nowrap">
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}:</span>
    <span className={`text-xs font-black ${highlight}`}>{value}</span>
    <div className="w-1.5 h-1.5 rounded-full bg-gray-700 mx-2" />
  </div>
);

const TabButton = ({ active, label, icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 py-4 border-b-2 transition-all whitespace-nowrap ${
      active 
      ? 'border-blue-600 text-blue-600 font-black' 
      : 'border-transparent text-gray-400 font-bold hover:text-gray-600'
    }`}
  >
    {icon}
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const TabContent = ({ tab, data, periodProgress, setPeriodProgress, drillPath, setDrillPath, setActiveTab }) => {
  switch (tab) {
    case 'overview':
      return <OverviewTab data={data} />;
    case 'forecast':
      return (
        <ForecastTab 
          data={data} 
          periodProgress={periodProgress} 
          setPeriodProgress={setPeriodProgress} 
        />
      );
    case 'rankings':
      return <RankingsTab data={data} />;
    case 'gap':
      return <GapAnalysisTab data={data} periodProgress={periodProgress} />;
    case 'risk':
      return <AtRiskAnalysisTab data={data} periodProgress={periodProgress} />;
    case 'drill':
      return (
        <DrillDownTab 
          data={data} 
          drillPath={drillPath} 
          setDrillPath={setDrillPath} 
        />
      );
    default:
      return <OverviewTab data={data} />;
  }
};

export default SalesForecastTool;
