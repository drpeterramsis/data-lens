import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Search, GraduationCap, Hospital, Pill, Users, TrendingUp, SearchIcon, Upload } from 'lucide-react';
import { 
  toNumberSafe, formatKpi, formatKpiGrouped, formatKpiPercent 
} from '../../utils/formatNumber';
import CSVUploader from '../../components/shared/CSVUploader';
import AutoInsights from '../../components/shared/AutoInsights.jsx';
import VirtualTable from '../../components/shared/VirtualTable';
import { generateInsights } from '../../utils/insightGenerator';
import { calculateMRStats, calculateKPICards } from '../../utils/mrCalculations';
import { safeFormatDate, safeGetDayName } from '../../utils/dateHelpers';
import { FilterButton } from '../../components/ui/FilterButton';

// Sub-components
import TargetSettingsPanel from './TargetSettingsPanel';
import MRCardsGrid from './MRCardsGrid';
import ForecastTool from './ForecastTool';
import TeamOverviewTable from './TeamOverviewTable';
import InteractionAnalysis from './InteractionAnalysis';
import CoachingAnalysis from './CoachingAnalysis';
import CoachingSection from './CoachingSection';
import InlineCalendar from './InlineCalendar';
import MRFullscreenModal from './MRFullscreenModal';
import MrDropdown from '../../components/MrDropdown';

const APP_VERSION = {
  version: '1.0.542',
  releaseDate: 'May 2026',
  label: 'Enhanced Analytics Navigation'
};

const StickyToolbar = ({
  activeTab, setActiveTab, tabs,
  periodFrom, periodTo,
  selectedMonths, availableMonths,
  filteredRowCount,
}) => {
  const [showMore, setShowMore] = useState(false);

  const periodLabel = useMemo(() => {
    if (!periodFrom || !periodTo) return "";
    const fmtShort = (d) => {
      try {
        return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
          day:   "numeric",
          month: "short",
          year:  "numeric",
        });
      } catch { return d; }
    };
    const fmtMonthYear = (d) => {
      try {
        return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
          month: "short",
          year:  "numeric",
        });
      } catch { return d; }
    };

    const fromYM = periodFrom.substring(0, 7);
    const toYM   = periodTo.substring(0, 7);

    if (fromYM === toYM) {
      const fromDay = parseInt(periodFrom.split("-")[2], 10);
      const toDay = parseInt(periodTo.split("-")[2], 10);
      const monthYear = fmtMonthYear(periodFrom);
      return `${fromDay}–${toDay} ${monthYear}`;
    }
    return `${fmtShort(periodFrom)} → ${fmtShort(periodTo)}`;
  }, [periodFrom, periodTo]);

  const monthFilterLabel = useMemo(() => {
    if (!selectedMonths || selectedMonths.size === 0 || selectedMonths.size === availableMonths.length) {
      return "All Months";
    }
    if (selectedMonths.size === 1) {
      const ym = [...selectedMonths][0];
      const [y, m] = ym.split("-").map(Number);
      return new Date(y, m-1, 1).toLocaleDateString("en-GB", {
        month: "long", year: "numeric"
      });
    }
    const sorted = [...selectedMonths].sort();
    const months = sorted.map(ym => {
      const [y, m] = ym.split("-").map(Number);
      return new Date(y, m-1, 1).toLocaleDateString("en-GB", {
        month: "short"
      });
    });
    const lastYM = sorted[sorted.length - 1];
    const year = lastYM.split("-")[0];
    return `${months.join(" · ")} ${year}`;
  }, [selectedMonths, availableMonths]);

  // Primary tabs to always show
  const primaryTabs = tabs.slice(0, 4);
  const secondaryTabs = tabs.slice(4);

  return (
    <div className="sticky top-0 z-30 bg-white border-b shadow-sm -mx-4 px-0">
      <div className="flex items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-1 py-1.5 overflow-visible">
          {/* Mobile primary tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {primaryTabs.map(tab => (
              <FilterButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                isActive={activeTab === tab.id}
                className="flex-shrink-0 !py-1.5 !px-3"
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="hidden xs:inline text-[11px] font-bold uppercase tracking-tight">{tab.label}</span>
              </FilterButton>
            ))}
          </div>

          {/* More menu for mobile / remaining tabs for desktop */}
          <div className="relative">
            <div className="hidden md:flex gap-1">
              {secondaryTabs.map(tab => (
                <FilterButton
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  isActive={activeTab === tab.id}
                  className="flex-shrink-0 !py-1.5 !px-3"
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-tight">{tab.label}</span>
                </FilterButton>
              ))}
            </div>

            <div className="md:hidden">
              <button 
                onClick={() => setShowMore(!showMore)}
                className={`flex items-center justify-center p-1.5 rounded-lg border transition-all ${
                  showMore || secondaryTabs.some(t => t.id === activeTab)
                    ? "bg-accent text-black border-accent" 
                    : "bg-gray-50 text-gray-500 border-gray-200"
                }`}
              >
                <Search size={16} className={showMore ? "rotate-45 transition-transform" : "transition-transform"}/>
              </button>
              
              {showMore && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMore(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 z-50 flex flex-col gap-1 min-w-[120px] animate-in fade-in slide-in-from-top-2">
                    {secondaryTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setShowMore(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-colors ${
                          activeTab === tab.id 
                            ? "bg-accent text-black" 
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {periodLabel && (
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 ml-3">
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1">
              <span className="text-yellow-600 text-xs">📅</span>
              <span className="text-xs font-semibold text-yellow-800">{monthFilterLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1">
              <span className="text-xs font-medium text-gray-700">{periodLabel}</span>
              <span className="text-[10px] text-gray-400 border-l border-gray-300 pl-1.5">
                {formatKpiGrouped(filteredRowCount)} rows
              </span>
            </div>
          </div>
        )}
      </div>

      {periodLabel && (
        <div className="sm:hidden flex items-center gap-2 px-3 pb-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1 flex-shrink-0">
            <span className="text-yellow-600 text-[10px]">📅</span>
            <span className="text-[10px] font-semibold text-yellow-800">{monthFilterLabel}</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 flex-shrink-0">
            <span className="text-[10px] font-medium text-gray-700">{periodLabel}</span>
          </div>
          <div className="text-[10px] text-gray-400 flex-shrink-0">
            {formatKpiGrouped(filteredRowCount)} rows
          </div>
        </div>
      )}
    </div>
  );
};


const KPICard = ({ title, value, unit, sub, icon, color }) => (
  <div
    className="bg-white rounded-3xl border shadow-sm p-4 flex flex-col gap-1 transition-all hover:shadow-lg hover:-translate-y-1"
    style={{ borderTop: `6px solid ${color}` }}
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
        {title}
      </span>
      <span className="text-xl leading-none">
        {icon}
      </span>
    </div>
    <div className="flex items-baseline gap-1 mt-1">
      <span className="text-3xl font-black text-gray-900 leading-none tracking-tight">
        {formatKpiGrouped(value)}
      </span>
      {unit && (
        <span className="text-[10px] font-black uppercase text-gray-400">
          {unit}
        </span>
      )}
    </div>
    {sub && (
      <p className="text-[10px] font-bold text-gray-400 leading-tight mt-1 uppercase tracking-tighter">
        {sub}
      </p>
    )}
  </div>
);

const loadRowsFromStorage = () => {
  try {
    const raw = localStorage.getItem("datalens_rows");
    const meta = localStorage.getItem("datalens_meta");
    if (!raw) return { rows: [], meta: null };
    return {
      rows: JSON.parse(raw),
      meta: meta ? JSON.parse(meta) : null,
    };
  } catch {
    return { rows: [], meta: null };
  }
};

const saveRowsToStorage = (rows, fileName) => {
  try {
    localStorage.setItem("datalens_rows", JSON.stringify(rows));
    localStorage.setItem(
      "datalens_meta",
      JSON.stringify({
        fileName: fileName || "report.csv",
        uploadedAt: new Date().toISOString(),
        rowCount: rows.length,
      })
    );
  } catch (e) {
    console.warn("Storage quota exceeded:", e);
    const slim = rows.map(r => ({
      InteractionId:           r.InteractionId,
      MrName:                  r.MrName,
      MrId:                    r.MrId,
      LineName:                r.LineName,
      CustomerName:            r.CustomerName,
      CustomerId:              r.CustomerId,
      InteractionType:         r.InteractionType,
      CustomerGrade:           r.CustomerGrade,
      Specialty:               r.Specialty,
      ReportDate:              r.ReportDate,
      IsMRCoachingSubmitted:   r.IsMRCoachingSubmitted,
      IsManagerCoachingSubmitted: r.IsManagerCoachingSubmitted,
      CoachingType:            r.CoachingType,
      InteractionVisitedSite:  r.InteractionVisitedSite,
    }));
    localStorage.setItem("datalens_rows", JSON.stringify(slim));
    localStorage.setItem(
      "datalens_meta",
      JSON.stringify({
        fileName: fileName || "report.csv",
        uploadedAt: new Date().toISOString(),
        rowCount: rows.length,
      })
    );
  }
};

import * as XLSX from 'xlsx';
import Papa from "papaparse";
import { cleanRows } from '../../utils/safeCSV';

const CACHE_KEY = 'call_detailing_v1';

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

const CallDetailingAnalyzer = () => {
  const fileInputRef = React.useRef(null);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [currentUploadMode, setCurrentUploadMode] = useState('replace');
  const [appendResult, setAppendResult] = useState(null);
  const [dataSources, setDataSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState('');

  const [rawData, setRawData] = useState([]);
  const [csvMeta, setCsvMeta] = useState(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [selectedMonths, setSelectedMonths] = useState(null); // null = ALL
  const [targets, setTargets] = useState({ hcpPerDay: 0, hcoPerDay: 0, phPerDay: 0 });
  const [selectedMRForFullscreen, setSelectedMRForFullscreen] = useState(null);
  const [activeTab, setActiveTab] = useState('performance');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedMR, setSelectedMR] = useState('');
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("All");

  const mrList = useMemo(() => {
    if (!Array.isArray(rawData) || rawData.length === 0) return [];
    return [...new Set(rawData.map(r => r.MrName))].filter(Boolean).sort();
  }, [rawData]);
  const [onlyCoached, setOnlyCoached] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const handleUploadClick = () => {
    if (rawData.length > 0) {
      setShowUploadChoice(true);
    } else {
      setCurrentUploadMode('replace');
      fileInputRef.current?.click();
    }
  };

  const handleUploadChoice = (mode) => {
    setCurrentUploadMode(mode);
    setShowUploadChoice(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processFile(file, currentUploadMode);
  };

  const processFile = async (file, mode) => {
    setIsLoading(true);
    setParsing(true);
    try {
      setProgress('Reading file...');
      
      const fileText = await file.text();
      setProgress('Parsing data...');
      
      Papa.parse(fileText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.replace(/^\uFEFF/, "").replace(/\r/g, "").trim(),
        complete: (results) => {
          const cleaned = cleanRows(results.data);
          
          if (cleaned.length === 0) {
            alert('No valid data found in file.');
            setParsing(false);
            setIsLoading(false);
            return;
          }

          let finalRows;
          let resultInfo;

          if (mode === 'append' && rawData.length > 0) {
            const existingKeys = new Set(rawData.map(r => String(r.InteractionId)));
            const newRows = cleaned.filter(r => !existingKeys.has(String(r.InteractionId)));
            finalRows = [...rawData, ...newRows];
            resultInfo = {
              mode:    'append',
              file:    file.name,
              added:   newRows.length,
              skipped: cleaned.length - newRows.length,
              total:   finalRows.length,
            };
          } else {
            finalRows = cleaned;
            resultInfo = {
              mode:  'replace',
              file:  file.name,
              added: cleaned.length,
              total: cleaned.length,
            };
            setDataSources([]);
          }

          setRawData(finalRows);
          setAppendResult(resultInfo);

          const fileDates = cleaned
            .map(r => r.ReportDate)
            .filter(d => Boolean(d))
            .map(d => new Date(d).getTime())
            .filter(t => !isNaN(t));

          setDataSources(prev => {
            const base = mode === 'replace' ? [] : prev;
            return [...base, {
              fileName: file.name,
              rowCount: cleaned.length,
              mode:     mode,
              dateFrom: fileDates.length ? new Date(Math.min(...fileDates)) : null,
              dateTo:   fileDates.length ? new Date(Math.max(...fileDates)) : null,
            }];
          });

          saveRowsToStorage(finalRows, file.name);
          setLoadedFromCache(true);
          
          setParsing(false);
          setIsLoading(false);
        },
        error: (err) => {
          console.error("CSV Error:", err);
          alert('Error parsing file: ' + err.message);
          setParsing(false);
          setIsLoading(false);
        }
      });
      
    } catch (err) {
      console.error('processFile error:', err);
      alert('Error reading file: ' + err.message);
      setIsLoading(false);
      setParsing(false);
    }
  };

  useEffect(() => {
    if (!appendResult) return;
    const t = setTimeout(() => setAppendResult(null), 6000);
    return () => clearTimeout(t);
  }, [appendResult]);

  // Auto-load on mount
  useEffect(() => {
    const { rows, meta } = loadRowsFromStorage();
    if (rows.length > 0) {
      setRawData(rows);
      setCsvMeta(meta);
      setLoadedFromCache(true);
      console.log(`Auto-loaded ${rows.length} rows from cache`);
    }
  }, []);

  // Period extraction
  const { minDate, maxDate } = useMemo(() => {
    if (!rawData.length)
      return { minDate: "", maxDate: "" };

    const dates = rawData
      .map(r => r.ReportDate)
      .filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    return {
      minDate: dates[0] ?? "",
      maxDate: dates[dates.length - 1] ?? "",
    };
  }, [rawData]);

  const formatMonthLabel = (ym) => {
    try {
      const [y, m] = ym.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
        month: "long",
        year:  "numeric",
      });
    } catch {
      return ym;
    }
  };

  const availableMonths = useMemo(() => {
    if (!rawData || !rawData.length) return [];

    const monthMap = {};

    rawData.forEach(row => {
      const d = row.ReportDate; // "YYYY-MM-DD"
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;

      const ym = d.substring(0, 7); // "YYYY-MM"
      if (!monthMap[ym]) {
        monthMap[ym] = {
          yearMonth: ym,
          count:     0,
          mrSet:     new Set(),
        };
      }
      monthMap[ym].count++;
      monthMap[ym].mrSet.add(row.MrName);
    });

    return Object.values(monthMap)
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
      .map(m => ({
        yearMonth: m.yearMonth,
        label:     formatMonthLabel(m.yearMonth),
        rowCount:  m.count,
        mrCount:   m.mrSet.size,
      }));
  }, [rawData]);

  const toggleMonth = (ym) => {
    setSelectedMonths(prev => {
      if (prev === null) return new Set([ym]);

      const next = new Set(prev);
      if (next.has(ym)) {
        next.delete(ym);
        if (next.size === 0) return null;
      } else {
        next.add(ym);
        if (next.size === availableMonths.length) return null;
      }
      return next;
    });
  };

  const selectAllMonths = () => setSelectedMonths(null);

  const isMonthSelected = (ym) => {
    if (selectedMonths === null) return true;
    return selectedMonths.has(ym);
  };

  const isAllSelected = selectedMonths === null || selectedMonths.size === availableMonths.length;

  useEffect(() => {
    if (selectedMonths === null) {
      localStorage.removeItem("datalens_month_filter");
    } else {
      localStorage.setItem("datalens_month_filter", JSON.stringify([...selectedMonths]));
    }
  }, [selectedMonths]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("datalens_month_filter");
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          setSelectedMonths(new Set(arr));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (minDate && maxDate && !dateFrom) {
      setDateFrom(minDate);
      setDateTo(maxDate);
    }
  }, [minDate, maxDate]);

  const handleClearData = () => {
    if (!window.confirm("Clear all data? This cannot be undone.")) return;

    localStorage.removeItem("datalens_rows");
    localStorage.removeItem("datalens_meta");
    localStorage.removeItem("datalens_month_filter");

    setRawData([]);
    setCsvMeta(null);
    setLoadedFromCache(false);
    setDateFrom("");
    setDateTo("");
    setSelectedMonths(null);
    setSelectedMRForCalendar(null);
    setSelectedMR('');
    setDataSources([]);
    setAppendResult(null);
  };

  const handleDataLoaded = useCallback((data, fileIdentifier) => {
    if (data.length === 0) {
       handleClearData();
       return;
    }

    // 1. Clear old
    localStorage.removeItem("datalens_rows");
    localStorage.removeItem("datalens_meta");
    localStorage.removeItem("datalens_month_filter");
    setRawData([]);
    setDateFrom("");
    setDateTo("");
    setSelectedMonths(null);
    setSelectedMRForCalendar(null);
    setSelectedMR('');

    // 2. Save new
    saveRowsToStorage(data, fileIdentifier);

    // 3. Update state
    setTimeout(() => {
      const meta = localStorage.getItem("datalens_meta");
      setRawData(data);
      setCsvMeta(meta ? JSON.parse(meta) : null);
      setLoadedFromCache(false);
      setIsUploadModalOpen(false);
    }, 10);
  }, []);

  const scrollToSection = (id, extraOffset = 0) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Smooth scroll with offset for header and sticky toolbar
    const headerH = 56;
    const toolbarH = 48;
    const offset = headerH + toolbarH + extraOffset;
    
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = el.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: el.offsetTop - (48 + 16), // toolbar height + some margin
        behavior: 'smooth'
      });
    } else {
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleOpenCalendar = (mrObj) => {
    // mrObj is the full MR object from MRCardsGrid
    setSelectedMRForFullscreen(mrObj);
  };

  const handleCloseCalendar = () => {
    setSelectedMRForFullscreen(null);
  };

  const handleFullPeriod = () => {
    setDateFrom(minDate);
    setDateTo(maxDate);
  };

  const monthFilteredRows = useMemo(() => {
    if (!rawData || !rawData.length) return [];
    if (selectedMonths === null) return rawData;

    return rawData.filter(row => {
      const d = row.ReportDate;
      if (!d) return false;
      const ym = d.substring(0, 7);
      return selectedMonths.has(ym);
    });
  }, [rawData, selectedMonths]);

  const dateFilteredData = useMemo(() => {
    const base = monthFilteredRows || [];
    if (!base.length) return [];

    if (!dateFrom && !dateTo) return base;

    const from = dateFrom || minDate;
    const to   = dateTo   || maxDate;

    return base.filter(d => {
      const date = d.ReportDate;
      if (date && date >= from && date <= to) return true;
      return false;
    });
  }, [monthFilteredRows, dateFrom, dateTo, minDate, maxDate]);

  const filteredData = useMemo(() => {
    const base = dateFilteredData || [];
    if (!selectedMR) return base;
    return base.filter(
      r => r.MrName === selectedMR
    );
  }, [dateFilteredData, selectedMR]);

  const mrStats = useMemo(() => calculateMRStats(filteredData), [filteredData]);
  const metrics = useMemo(() => calculateKPICards(mrStats), [mrStats]);
  const coachingKPI = useMemo(() => {
    
    // Step 1: Filter HCP Coaching rows only
    const rows = filteredData || [];
    const coachingRows = rows
      .filter(r =>
        String(r.IsMRCoachingSubmitted).toUpperCase() === 'TRUE' &&
        String(r.InteractionType).toUpperCase() === 'HCP'
      );

    // Total HCP Coaching Calls
    const totalCoachingCalls = coachingRows.length;

    if (totalCoachingCalls === 0) {
      return {
        totalCoachingCalls: 0,
        approvedDays:       0,
        avg:                0,
        isGood:             false,
      };
    }

    // Step 2: Group by MR + Date
    // Count HCP coaching visits per (MR, Day)
    const dayMap = {};

    coachingRows.forEach(r => {
      const mr = r.MrName ?? 'Unknown';
      
      // Normalize date to day only (no time)
      const d = r.ReportDate instanceof Date 
        ? r.ReportDate 
        : new Date(r.ReportDate);
      
      if (isNaN(d)) return;
      
      const day = d.toISOString().slice(0, 10);
      const key = `${mr}__${day}`;

      if (!dayMap[key]) dayMap[key] = 0;
      dayMap[key]++;
    });

    // Step 3: Count approved days 
    // (>= 4 HCP coaching visits that day)
    const approvedDays = Object.values(dayMap)
      .filter(count => count >= 4)
      .length;

    // Step 4: Calculate average
    const avg = approvedDays === 0 
      ? 0 
      : totalCoachingCalls / approvedDays;

    return {
      totalCoachingCalls,
      approvedDays,
      avg:    Math.round(avg * 10) / 10,
      isGood: avg >= 4,
    };

  }, [filteredData]);

  const insights = useMemo(() => generateInsights(filteredData, targets), [filteredData, targets]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim() && searchFilter === 'All' && !onlyCoached) return [];
    const q = globalSearch.toLowerCase();
    
    return filteredData.filter(d => {
      if (searchFilter !== 'All' && d.InteractionType !== searchFilter) return false;
      if (onlyCoached && d.IsMRCoachingSubmitted.toUpperCase() !== "TRUE") return false;
      
      if (q) {
        return [d.CustomerName, d.CustomerId, d.MrName, d.InteractionVisitedSite].some(v => 
          (v || "").toLowerCase().includes(q)
        );
      }
      return true;
    }).slice(0, 500);
  }, [filteredData, globalSearch, searchFilter, onlyCoached]);

  const tabs = useMemo(() => [
    { id: 'performance', label: 'Performance', icon: '📊', href: '#section-performance' },
    { id: 'forecast', label: 'Forecast', icon: '📈', href: '#section-forecast' },
    { id: 'search', label: 'Search', icon: '🔍', href: '#section-search' },
    { id: 'coaching', label: 'Coaching', icon: '🎓', href: '#section-coaching' },
    { id: 'data', label: 'Data', icon: '📋', href: '#section-datatable' },
    { id: 'insights', label: 'Insights', icon: '🤖', href: '#section-insights' },
  ], []);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);

    const sectionMap = {
      performance: "section-performance",
      forecast:    "section-forecast",
      search:      "section-search",
      coaching:    "section-coaching",
      data:        "section-datatable",
      insights:    "section-insights",
    };

    const sectionId = sectionMap[tabId];
    if (!sectionId) return;

    if (tabId === "insights") {
      setInsightsOpen(true);
    }

    // Small timeout to ensure everything is settled
    setTimeout(() => {
      scrollToSection(sectionId);
    }, 100);
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id.replace('section-', ''));
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 }); 

    ['section-performance', 'section-forecast', 'section-search', 'section-coaching', 'section-datatable', 'section-insights'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredData?.length ?? 0]);

  const periodFrom = useMemo(() => {
    const rows = filteredData || [];
    const dates = rows.map(r => r.ReportDate).filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    return dates[0] ?? "";
  }, [filteredData]);

  const periodTo = useMemo(() => {
    const rows = filteredData || [];
    const dates = rows.map(r => r.ReportDate).filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    return dates[dates.length - 1] ?? "";
  }, [filteredData]);

  const formatDateBanner = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const shortLabel = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    const month = new Date(y, m-1, 1).toLocaleDateString("en-GB", { month:"short" });
    return `${month} '${String(y).slice(2)}`;
  };

  const hasData = rawData.length > 0;

  return (
    <div className="space-y-6 pb-24 relative max-w-7xl mx-auto px-4 w-full min-w-0">
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {!hasData ? (
        <div className="py-12 px-4 max-w-2xl mx-auto text-center">
          <div className="mb-8">
             <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Call Detailing Analyzer</h2>
          </div>
          <div className="p-12 bg-white border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors" onClick={handleUploadClick}>
              <Upload size={48} className="text-gray-400 mb-4" />
              <h3 className="text-lg font-bold text-gray-700">Drop CSV file here</h3>
              <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-accent/20 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-2xl">📂</div>
              <div>
                 <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    Call Detailing Data
                 </h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    {formatKpiGrouped(rawData.length)} rows
                 </p>
              </div>
           </div>
           <div className="flex gap-2">
              <button 
                onClick={handleClearData}
                disabled={isLoading}
                className="px-6 py-2.5 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Clear Data
              </button>
              <button 
                onClick={handleUploadClick}
                disabled={isLoading}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <span className="animate-spin">⏳</span> : <Upload size={14}/>}
                {isLoading ? 'Processing...' : 'Add / Replace'}
              </button>
           </div>
        </div>
      )}

      {dataSources.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100 shrink-0 overflow-x-auto rounded-3xl mt-4">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
            Files:
          </span>
          {dataSources.map((src, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-full shrink-0 text-[11px] shadow-sm">
              <span>{src.mode === 'append' ? '➕' : '📄'}</span>
              <span className="font-semibold text-gray-700 max-w-[100px] truncate" title={src.fileName}>
                {src.fileName.replace(/\.(csv)$/i, '')}
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
              {formatKpiGrouped(rawData.length)} total rows
            </span>
          )}
        </div>
      )}

      {showUploadChoice && (
        <UploadChoiceModal 
          onChoose={handleUploadChoice} 
          onCancel={() => setShowUploadChoice(false)} 
          existingCount={rawData.length} 
        />
      )}

      {appendResult && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex gap-3">
          <span className="text-xl shrink-0">
            {appendResult.mode === 'append' ? '✅' : '🔄'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">
              {appendResult.mode === 'append' ? 'Data Appended!' : 'Data Replaced!'}
            </p>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {appendResult.file}
            </p>
            {appendResult.mode === 'append' && (
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                +{formatKpiGrouped(appendResult.added)} new rows
                {appendResult.skipped > 0 && ` · ${formatKpiGrouped(appendResult.skipped)} skipped`}
              </p>
            )}
            <p className="text-[11px] text-gray-300 font-bold mt-0.5">
              Total: {formatKpiGrouped(appendResult.total)} rows
            </p>
          </div>
          <button onClick={() => setAppendResult(null)} className="text-gray-500 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {hasData && (
        <>
          {/* MONTH SELECTOR */}
          {availableMonths.length > 1 && (
            <div className="bg-white border rounded-[2rem] shadow-sm p-6 mb-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black text-gray-600 uppercase tracking-[0.2em]">
                  📅 Month Filter
                </span>
                {!isAllSelected && (
                  <button
                    onClick={selectAllMonths}
                    className="text-[10px] text-yellow-600 hover:text-yellow-800 font-black uppercase tracking-widest px-3 py-1 bg-yellow-50 rounded-full transition-colors">
                    Show All
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 flex-wrap sm:flex-nowrap overflow-x-auto scrollbar-none mb-2">
                <FilterButton
                  onClick={selectAllMonths}
                  isActive={isAllSelected}
                  label="All Months"
                  className="flex-shrink-0"
                >
                  <span className="sm:hidden">All</span>
                  <span className="hidden sm:inline">All Months</span>
                  <span className="ml-1 text-[10px] opacity-70">
                    ({formatKpiGrouped(rawData.length)})
                  </span>
                </FilterButton>

                {availableMonths.map(m => {
                  const active = isMonthSelected(m.yearMonth) && !isAllSelected;
                  return (
                    <FilterButton
                      key={m.yearMonth}
                      onClick={() => toggleMonth(m.yearMonth)}
                      isActive={active}
                      label={m.label}
                      className={`flex-shrink-0 !text-xs !px-2.5 !py-1.5 rounded-lg border font-bold transition-all ${
                        !active && isAllSelected
                          ? "bg-gray-50 border-gray-100 text-gray-600 hover:bg-yellow-50 hover:border-yellow-200"
                          : ""
                      }`}
                    >
                      <span className="sm:hidden">{shortLabel(m.yearMonth)}</span>
                      <span className="hidden sm:inline">{m.label}</span>
                      <span className="ml-1 text-[10px] opacity-70">
                        ({formatKpiGrouped(m.rowCount)})
                      </span>
                    </FilterButton>
                  );
                })}
              </div>

              {!isAllSelected && (
                <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-500 flex items-center gap-2 uppercase tracking-widest font-bold">
                  <span className="text-gray-400">Showing:</span>
                  <span className="font-black text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                    {selectedMonths ? [...selectedMonths].sort().map(ym => formatMonthLabel(ym)).join(" · ") : "All Months"}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-accent font-black">
                    {formatKpiGrouped(filteredData?.length ?? 0)} rows
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. PERIOD BANNER */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute right-0 top-0 w-64 h-64 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-accent/20 transition-all duration-700"></div>
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">📅 Report Period</p>
                   <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                      {(() => {
                        const rows = filteredData || [];
                        const sDates = rows.map(r => r.ReportDate).filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
                        const pFrom = sDates[0] ?? "";
                        const pTo = sDates[sDates.length - 1] ?? "";
                        return (
                           <>{formatDateBanner(pFrom)} <span className="text-accent">→</span> {formatDateBanner(pTo)}
                             {(availableMonths?.length ?? 0) > 1 && (
                               <span className="text-sm ml-3 text-gray-400 lowercase font-medium">
                                 ({isAllSelected ? "All months" : `${selectedMonths?.size || 0} month${(selectedMonths?.size || 0) > 1 ? 's' : ''}`})
                               </span>
                             )}
                           </>
                        );
                      })()}
                   </h2>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/5 text-right">
                   <p className="text-2xl font-black leading-none">
                      {(() => {
                        const rows = filteredData || [];
                        const sDates = rows.map(r => r.ReportDate).filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
                        if (!sDates.length) return 0;
                        return Math.ceil((new Date(sDates[sDates.length - 1]) - new Date(sDates[0])) / (1000*60*60*24)) + 1;
                      })()} <span className="text-xs text-gray-400 uppercase">Days</span>
                   </p>
                   <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">
                      {formatKpiGrouped(filteredData?.length ?? 0)} Interactions
                   </p>
                </div>
             </div>
          </div>

          {/* 4. DATE RANGE FILTER BAR */}
          <div className="flex flex-wrap items-center gap-4 bg-white border border-gray-200 rounded-3xl p-4 shadow-sm animate-in fade-in duration-500">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter:</span>
                <div className="flex items-center gap-2">
                   <input 
                      type="date" 
                      value={dateFrom} 
                      onChange={e => setDateFrom(e.target.value)}
                      className="text-xs font-bold border-2 border-gray-100 rounded-xl px-3 py-2 outline-none focus:border-accent transition-all bg-gray-50/50"
                   />
                   <span className="text-gray-300">→</span>
                   <input 
                      type="date" 
                      value={dateTo} 
                      onChange={e => setDateTo(e.target.value)}
                      className="text-xs font-bold border-2 border-gray-100 rounded-xl px-3 py-2 outline-none focus:border-accent transition-all bg-gray-50/50"
                   />
                </div>
             </div>
             <div className="flex gap-2 ml-auto">
                <FilterButton 
                   onClick={handleFullPeriod}
                   label="Full Period"
                />
             </div>
          </div>

          <div className="flex items-center gap-3 p-[10px_16px] bg-white border border-[#F1F5F9] rounded-xl">
            <span className="text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-[0.05em] whitespace-nowrap">
              VIEW MR:
            </span>
            <MrDropdown 
              mrList={mrList}
              selected={selectedMR}
              onChange={setSelectedMR}
            />
            {selectedMR && (
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-left-2">
                <span className="text-sm">👤</span>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-tight leading-none">Selected MR Performance</p>
                  <p className="text-[9px] text-blue-400 font-bold mt-0.5">Filtering all analytics for {selectedMR}</p>
                </div>
                <button 
                  onClick={() => setSelectedMR('')}
                  className="ml-auto w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          <StickyToolbar
            activeTab={activeTab}
            setActiveTab={handleTabClick}
            tabs={tabs}
            periodFrom={periodFrom}
            periodTo={periodTo}
            selectedMonths={selectedMonths}
            availableMonths={availableMonths || []}
            filteredRowCount={filteredData?.length ?? 0}
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard title="Coaching Days" value={metrics.coachingDays} sub={`${metrics.coachingMRs} active coaches`} icon={<GraduationCap size={20}/>} color="#F5C518" />
            
            {/* New KPI Card: Avg HCP Coaching / Day */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 transition-all hover:shadow-lg hover:-translate-y-1" style={{ borderTop: '6px solid #8B5CF6' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="bg-purple-100 p-1.5 rounded-xl">
                  <span className="text-sm">🎓</span>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${coachingKPI.isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {coachingKPI.isGood ? '✓ On Target' : '✗ Below Target'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className={`text-2xl font-black ${coachingKPI.isGood ? 'text-emerald-600' : coachingKPI.avg > 0 ? 'text-amber-500' : 'text-gray-300'}`}>
                  {coachingKPI.avg > 0 ? formatKpi(coachingKPI.avg) : '—'}
                </p>
                <span className="text-[10px] font-black uppercase text-gray-400">/ D</span>
              </div>
              <p className="text-[10px] font-black text-gray-700 leading-tight">Avg HCP Coaching / Day</p>
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-400">Calls:</span>
                  <span className="font-bold text-gray-700">{formatKpiGrouped(coachingKPI.totalCoachingCalls)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-400">Appr. Days:</span>
                  <span className="font-bold text-gray-700">{formatKpiGrouped(coachingKPI.approvedDays)}</span>
                </div>
                <div className="mt-2">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${coachingKPI.isGood ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min((coachingKPI.avg / 8) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <KPICard title="HCO Rate" value={metrics.avgHCORate} unit="/d" sub={`Across ${metrics.hcoMRCount} MRs`} icon={<Hospital size={20}/>} color="#10B981" />
            <KPICard title="HCP Rate" value={metrics.avgHCPRate} unit="/d" sub={`Across ${metrics.hcpMRCount} MRs`} icon={<Users size={20}/>} color="#3B82F6" />
            <KPICard title="PH Rate" value={metrics.avgPHRate} unit="/d" sub={`Across ${metrics.phMRCount} MRs`} icon={<Pill size={20}/>} color="#8B5CF6" />
            <KPICard title="Active MRs" value={metrics.activeMRs} sub="Unique field force" icon={<Users size={20}/>} color="#F59E0B" />
          </div>

          {/* 7. TARGET PANEL */}
          <TargetSettingsPanel data={rawData} dateFrom={dateFrom} dateTo={dateTo} onTargetsChange={setTargets} />

          {/* 8-9. PERFORMANCE SECTION */}
          <div id="section-performance" className="scroll-mt-32 pt-8">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Performance <span className="text-accent underline decoration-accent/20">Analysis</span></h2>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Field force efficiency & call rates</p>
                </div>
             </div>
             <MRCardsGrid 
                mrStats={mrStats} 
                targets={targets} 
                onSelectMRForCalendar={handleOpenCalendar} 
             />
          </div>

          <div id="section-forecast" className="scroll-mt-32 pt-8">
             <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Growth <span className="text-accent underline decoration-accent/20">Forecast</span></h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Predictive achievement modeling</p>
             </div>
             <ForecastTool data={filteredData} targets={targets} mrStats={mrStats} />
          </div>

          {/* 13. GLOBAL SEARCH SECTION */}
          <div id="section-search" className="scroll-mt-32 pt-8">
             <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="mb-8">
                   <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Global <span className="text-accent underline decoration-accent/20">Discovery</span></h2>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Instant visit lookup across entire team</p>
                </div>

                <div className="flex flex-col gap-6">
                   <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                         <SearchIcon size={24} />
                      </div>
                      <input 
                         type="text"
                         placeholder="Search any customer, ID, or HCO..."
                         value={globalSearch}
                         onChange={e => setGlobalSearch(e.target.value)}
                         className="w-full text-lg font-bold border-4 border-gray-50 rounded-3xl pl-16 pr-8 py-5 outline-none focus:border-accent transition-all bg-gray-50/30 shadow-inner"
                      />
                   </div>

                   <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filters:</span>
                      {['All', 'HCP', 'HCO', 'Pharmacy'].map(f => (
                        <FilterButton
                          key={f}
                          onClick={() => setSearchFilter(f)}
                          isActive={searchFilter === f}
                          label={f}
                        />
                      ))}
                      <div className="w-[2px] h-6 bg-gray-100 mx-2"></div>
                      <FilterButton
                        onClick={() => setOnlyCoached(!onlyCoached)}
                        isActive={onlyCoached}
                        label="🎓 Coached Only"
                      />
                   </div>
                </div>

                {globalSearchResults.length > 0 ? (
                  <div className="mt-8 border-2 border-gray-50 rounded-[2rem] overflow-hidden">
                     <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{globalSearchResults.length} Results found</span>
                        <FilterButton onClick={() => {setGlobalSearch(""); setOnlyCoached(false); setSearchFilter("All")}} label="Reset All" />
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                           <thead className="bg-white border-b border-gray-100 uppercase font-black text-[10px] text-gray-400 tracking-tighter">
                              <tr>
                                 <th className="px-6 py-4">MR Name</th>
                                 <th className="px-6 py-4">Visit Date</th>
                                 <th className="px-6 py-4">Customer Name</th>
                                 <th className="px-6 py-4">ID</th>
                                 <th className="px-6 py-4">Type</th>
                                 <th className="px-6 py-4">Grade</th>
                                 <th className="px-6 py-4">Specialty</th>
                                 <th className="px-6 py-4">Coached?</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {globalSearchResults.map((r, i) => {
                                 const isCoached = r.IsMRCoachingSubmitted.toUpperCase() === "TRUE";
                                 let bg = "bg-white hover:bg-gray-50";
                                 if (isCoached) bg = "bg-yellow-50 hover:bg-yellow-100";
                                 else if (r.InteractionType === 'HCO') bg = "bg-green-50/50 hover:bg-green-50";
                                 else if (r.InteractionType === 'Pharmacy') bg = "bg-purple-50/50 hover:bg-purple-50";
                                 else if (r.InteractionType === 'HCP') bg = "bg-blue-50/50 hover:bg-blue-50";

                                 return (
                                   <tr key={i} className={`transition-colors font-medium border-l-[6px] ${bg} ${
                                      r.InteractionType === 'HCO' ? 'border-l-green-400' :
                                      r.InteractionType === 'Pharmacy' ? 'border-l-purple-400' :
                                      r.InteractionType === 'HCP' ? 'border-l-blue-400' : ''
                                   }`}>
                                      <td className="px-6 py-4 font-black">{r.MrName}</td>
                                      <td className="px-6 py-4 text-gray-500">{safeFormatDate(r.ReportDate, { day: 'numeric', month: '2-digit', year: 'numeric' })}</td>
                                      <td className="px-6 py-4 font-black text-gray-900">{r.CustomerName}</td>
                                      <td className="px-6 py-4 text-gray-400 font-bold">{r.InteractionId}</td>
                                      <td className="px-6 py-4">
                                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                           r.InteractionType === 'HCO' ? 'bg-green-100 text-green-700' :
                                           r.InteractionType === 'Pharmacy' ? 'bg-purple-100 text-purple-700' :
                                           'bg-blue-100 text-blue-700'
                                         }`}>{r.InteractionType}</span>
                                      </td>
                                      <td className="px-6 py-4 font-black text-gray-400">{r.CustomerGrade || '—'}</td>
                                      <td className="px-6 py-4 text-gray-500">{r.Specialty || '—'}</td>
                                      <td className="px-6 py-4 text-center">
                                         {isCoached ? <span className="text-yellow-600">🎓</span> : <span className="text-gray-200">—</span>}
                                      </td>
                                   </tr>
                                 )
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
                ) : globalSearch && (
                  <div className="mt-8 py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                     <p className="text-lg font-bold text-gray-400 italic">No results found for "{globalSearch}"</p>
                  </div>
                )}
             </div>
          </div>

          <div id="section-coaching" className="scroll-mt-32 pt-8 space-y-12">
             <div className="mb-4">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Coaching <span className="text-accent underline decoration-accent/20">Analysis</span></h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Field visit coaching & feedback reviews</p>
             </div>
             <CoachingAnalysis data={filteredData} />
             <CoachingSection data={filteredData} />
          </div>

          {/* 14-18. DATA SECTION */}
          <div id="section-datatable" className="scroll-mt-32 pt-8 space-y-12">

             {/* Raw Data Table */}
             <details className="mt-12 bg-white border border-gray-200 shadow-sm rounded-[2.5rem] overflow-hidden group">
                <summary className="p-8 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors list-none">
                  <div className="flex items-center gap-4">
                     <span className="text-3xl">📋</span>
                     <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Raw Source Data</h3>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">High-performance virtualized rendering ({formatKpiGrouped(filteredData?.length ?? 0)} rows)</p>
                     </div>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-8 border-t border-gray-100">
                  <VirtualTable 
                    data={filteredData} 
                    columns={[
                      { header: 'ID', accessorKey: 'InteractionId', size: 100 },
                      { header: 'MR Name', accessorKey: 'MrName', size: 180 },
                      { header: 'Customer', accessorKey: 'CustomerName', size: 220 },
                      { header: 'Type', accessorKey: 'InteractionType', size: 100 },
                      { header: 'Date', accessorKey: 'ReportDate', size: 120 },
                      { header: 'Grade', accessorKey: 'CustomerGrade', size: 80 },
                      { header: 'Coached', accessorKey: 'IsMRCoachingSubmitted', size: 100 },
                      { header: 'Specialty', accessorKey: 'Specialty', size: 150 },
                    ]} 
                  />
                </div>
             </details>
          </div>

          <section id="section-insights" className="bg-white rounded-2xl border shadow-sm overflow-hidden scroll-mt-24 mt-8">
            <button
              type="button"
              onClick={() => setInsightsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">🤖</span>
                <div className="text-left">
                  <h2 className="font-bold text-base sm:text-lg text-gray-900">
                    Auto Insights
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {insightsOpen
                      ? "Click to collapse"
                      : `${insights.length} insights generated · Click to expand`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!insightsOpen && (
                  <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full">
                    {insights.length}
                  </span>
                )}
                <span className={`text-gray-400 text-sm transition-transform duration-200 ${insightsOpen ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </div>
            </button>

            {insightsOpen && (
              <div className="border-t border-gray-100 px-4 sm:px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.map((insight, i) => (
                    <div key={i}
                      className={`rounded-xl border p-4 ${
                        insight.type === "positive"
                          ? "bg-green-50 border-green-200"
                          : insight.type === "warning"
                            ? "bg-yellow-50 border-yellow-200"
                            : insight.type === "negative"
                              ? "bg-red-50 border-red-200"
                              : "bg-blue-50 border-blue-200"
                      }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">
                          {insight.icon || "💡"}
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-gray-800">
                            {insight.title}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {insight.body}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {insights.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No insights available yet. Upload data to generate insights.
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {selectedMRForFullscreen && (
        <MRFullscreenModal 
          mr={selectedMRForFullscreen}
          targets={targets}
          onClose={handleCloseCalendar}
        />
      )}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-12 right-6 z-[60] w-14 h-14 rounded-full bg-accent shadow-2xl flex items-center justify-center hover:bg-accent-hover transition-all text-2xl font-black text-black group border-4 border-white"
          title="Scroll to Top"
        >
          <span className="group-hover:-translate-y-1 transition-transform">↑</span>
        </button>
      )}
    </div>
  );
};

export default CallDetailingAnalyzer;
