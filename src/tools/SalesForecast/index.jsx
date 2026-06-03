import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle,
         AlertCircle, Loader2, ChevronLeft, Download, X,
         Calendar, Plus, ChevronUp, ChevronDown, ChevronRight, Search,
         SlidersHorizontal, TrendingUp, Eye, EyeOff, Edit2 } from 'lucide-react';
import { LineChart, Line, CartesianGrid, Legend, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx'; // SheetJS — must already be in the project

// ── INDEXEDDB HELPERS FOR FORECAST PERSISTENCE ──
const FORECAST_DB_NAME    = 'dataLens_forecast';
const FORECAST_DB_VERSION = 1;
const FORECAST_STORE      = 'forecastPeriods';

const openForecastDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(FORECAST_DB_NAME, FORECAST_DB_VERSION);
  req.onupgradeneeded = e => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(FORECAST_STORE)) {
      const store = db.createObjectStore(FORECAST_STORE, { keyPath: 'id' });
      store.createIndex('dateFrom', 'dateFrom', { unique: false });
    }
  };
  req.onsuccess = e => resolve(e.target.result);
  req.onerror   = e => reject(e.target.error);
});

const saveForecastPeriod = async (periodObj) => {
  const db    = await openForecastDB();
  const tx    = db.transaction(FORECAST_STORE, 'readwrite');
  tx.objectStore(FORECAST_STORE).put(periodObj);
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror    = e => rej(e.target.error);
  });
};

const loadForecastPeriods = async () => {
  const db    = await openForecastDB();
  const tx    = db.transaction(FORECAST_STORE, 'readonly');
  const store = tx.objectStore(FORECAST_STORE);
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror   = e => rej(e.target.error);
  });
};

const deleteForecastPeriod = async (id) => {
  const db    = await openForecastDB();
  const tx    = db.transaction(FORECAST_STORE, 'readwrite');
  tx.objectStore(FORECAST_STORE).delete(id);
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror    = e => rej(e.target.error);
  });
};

const clearAllForecastPeriods = async () => {
  const db    = await openForecastDB();
  const tx    = db.transaction(FORECAST_STORE, 'readwrite');
  tx.objectStore(FORECAST_STORE).clear();
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror    = e => rej(e.target.error);
  });
};

const QUARTER_BOUNDS = {
  Q1: { from: 'YYYY-01-01', to: 'YYYY-03-31', days: 90  },
  Q2: { from: 'YYYY-04-01', to: 'YYYY-06-30', days: 91  },
  Q3: { from: 'YYYY-07-01', to: 'YYYY-09-30', days: 92  },
  Q4: { from: 'YYYY-10-01', to: 'YYYY-12-31', days: 92  },
};

const getQuarterBounds = (quarter, year) => {
  const y = year || new Date().getFullYear();
  const bounds = {
    Q1: { from: `${y}-01-01`, to: `${y}-03-31` },
    Q2: { from: `${y}-04-01`, to: `${y}-06-30` },
    Q3: { from: `${y}-07-01`, to: `${y}-09-30` },
    Q4: { from: `${y}-10-01`, to: `${y}-12-31` },
  };
  return bounds[quarter] || bounds.Q1;
};

// Get correct months from the ACTUAL quarter start date
const getQuarterMonths = (quarterFrom) => {
  if (!quarterFrom) return [];
  const qStart = new Date(quarterFrom);
  const months = [];
  for (let m = 0; m < 3; m++) {
    const mDate = new Date(
      qStart.getFullYear(),
      qStart.getMonth() + m,
      1
    );
    months.push({
      label: mDate.toLocaleString('default', { month: 'short' }).toUpperCase(),
      monthIndex: mDate.getMonth(),
      year: mDate.getFullYear(),
    });
  }
  return months;
};

const SalesForecastTool = () => {
  // ── FORECAST TOOL STATE ──
  const [forecastFile, setForecastFile]         = useState(null);
  const [forecastData, setForecastData]         = useState(null);
  const [forecastLoading, setForecastLoading]   = useState(false);
  const [forecastError, setForecastError]       = useState('');
  const [forecastStep, setForecastStep]         = useState('upload');
  // steps: 'upload' | 'review' | 'forecast'

  const [forecastScenario, setForecastScenario] = useState({
    targetPct:   100,
    growthPct:   10,
    selectedMRs: [],
    selectedProducts: []
  });

  const [forecastPeriods, setForecastPeriods]       = useState([]);  // all saved periods
  const [activePeriodId,  setActivePeriodId]         = useState(null);
  const [uploadDateFrom,  setUploadDateFrom]          = useState('');
  const [uploadDateTo,    setUploadDateTo]            = useState('');
  const [showDateModal,   setShowDateModal]           = useState(false);
  const [pendingFile,     setPendingFile]             = useState(null);
  const [forecastSearch,  setForecastSearch]          = useState('');
  const [sortDMBy,        setSortDMBy]                = useState('name'); // 'name'|'ach_value'|'ach_points'
  const [sortDMDir,       setSortDMDir]               = useState('asc');
  const [sortMRBy,        setSortMRBy]                = useState('name');
  const [sortMRDir,       setSortMRDir]               = useState('asc');
  const [expandedDMs,     setExpandedDMs]             = useState({});
  const [expandedMRs,     setExpandedMRs]             = useState({});
  const [forecastShowFilters, setForecastShowFilters] = useState(false);

  // Forecast step 3 settings
  const [forecastQuarter,    setForecastQuarter]    = useState('Q1');
  const [forecastTargetPct,  setForecastTargetPct]  = useState(100);
  const [forecastMode,       setForecastMode]        = useState('units'); // 'units'|'percentage'
  const [forecastPeriodIdx,  setForecastPeriodIdx]  = useState(0); // which 10-day period (0-8)

  // Manual forecast overrides: { [productCode]: { units?: number, pct?: number } }
  const [manualForecast, setManualForecast] = useState({});
  const [showManualEditor, setShowManualEditor] = useState(false);

  // Product cards UI settings
  const [productCardsCollapsed, setProductCardsCollapsed] = useState(false);
  const [productCardSort,       setProductCardSort]       = useState('name'); // 'name'|'ach_asc'|'ach_desc'

  // Filter Panel visibility and search inputs
  const [showForecastFilters, setShowForecastFilters] = useState(false);
  const [filterSearchDM,      setFilterSearchDM]      = useState('');
  const [filterSearchMR,      setFilterSearchMR]      = useState('');
  const [filterSearchProduct, setFilterSearchProduct] = useState('');

  // Column Visibility settings (Value & Points — default hidden)
  const [showValueCols,  setShowValueCols]  = useState(false);
  const [showPointsCols, setShowPointsCols] = useState(false);

  // ── NEW STATE AND EFFECT HANDLERS FOR DROPDOWN FILTER & COLLAPSIBILITY ──
  const filterDropdownRef = useRef(null);
  const [forecastExpandedMRs, setForecastExpandedMRs] = useState({});

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setShowForecastFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleForecastMR = (mrKey) => {
    setForecastExpandedMRs(prev => ({ ...prev, [mrKey]: !prev[mrKey] }));
  };

  const handleForecastExport = () => {
    if (!forecastData || !quarterInfo) return;
    const selectedMRObjs = forecastData.allMRs.filter(mr =>
      forecastScenario.selectedMRs.includes(mr.mrId || mr.mrName)
    );
    const remainingPeriods = Math.max(1, quarterInfo.remaining10Periods || 1);

    const headers = [
      'DM', 'MR', 'Product Code', 'Product Name', 'Target Units', 'Current Actual Units',
      'Forecast Added Units', 'Forecast Total Units', 'Forecast Value (EGP)', 'Forecast Points',
      'Gap (Total vs Target)', 'Gap Value (EGP)', 'Current Ach%', 'Projected Ach%'
    ].join(',');

    const rows = [];
    selectedMRObjs.forEach(mr => {
      const dmLabel = mr.dmName.split('(')[0].trim();
      const mrLabel = mr.mrName.split('(')[0].trim();
      
      forecastScenario.selectedProducts.forEach(code => {
        const p = mr.products[code];
        if (!p) return;

        const manual = manualForecast[p.productCode];
        let unitsPerPeriod = 0;

        if (manual) {
          if (forecastMode === 'units' && manual.units !== undefined) {
            unitsPerPeriod = manual.units;
          } else if (forecastMode === 'percentage' && manual.pct !== undefined) {
            const avgActual = quarterInfo.covered10Periods > 0
              ? p.salesUnit / quarterInfo.covered10Periods : 0;
            unitsPerPeriod = avgActual * (manual.pct / 100);
          }
        } else {
          const goalUnits = p.targetUnit * (forecastTargetPct / 100);
          const needed    = Math.max(0, goalUnits - p.salesUnit);
          unitsPerPeriod  = remainingPeriods > 0 ? needed / remainingPeriods : 0;
        }

        const periodUnits = Array.from({ length: remainingPeriods }).map((_, pi) => {
          const perPeriodOverride = manualForecast[`${p.productCode}_p${pi}`];
          return perPeriodOverride !== undefined ? perPeriodOverride : unitsPerPeriod;
        });

        const forecastAddedUnits = periodUnits.reduce((s, v) => s + v, 0);
        const totalUnits         = p.salesUnit + forecastAddedUnits;
        const forecastValue      = totalUnits * (p.unitPrice || 0);
        const forecastPoints     = totalUnits * (p.pointRate || 0);
        
        const gap                = totalUnits - p.targetUnit;
        const gapValue           = gap * (p.unitPrice || 0);
        const currentAchPct      = p.targetUnit > 0 ? (p.salesUnit / p.targetUnit) * 100 : 0;
        const projectedAchPct    = p.targetUnit > 0 ? (totalUnits / p.targetUnit) * 100 : 0;

        rows.push([
          `"${dmLabel}"`,
          `"${mrLabel}"`,
          `"${p.productCode}"`,
          `"${p.productName}"`,
          p.targetUnit,
          p.salesUnit,
          forecastAddedUnits.toFixed(0),
          totalUnits.toFixed(0),
          forecastValue.toFixed(0),
          forecastPoints.toFixed(0),
          gap.toFixed(0),
          gapValue.toFixed(0),
          currentAchPct.toFixed(2),
          projectedAchPct.toFixed(2)
        ].join(','));
      });
    });

    const blob = new Blob([headers + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.setAttribute('download', `EVA_Pharma_Forecast_${forecastQuarter}_Interactive.csv`);
    a.click();
  };

  // Trend Chart settings (default hidden)
  const [showTrendChart,  setShowTrendChart]  = useState(false);
  const [trendGroupBy,    setTrendGroupBy]    = useState('product'); // 'product' | 'mr'
  const [trendMetric,     setTrendMetric]     = useState('salesValue'); // 'salesValue'|'salesUnit'|'salesPoints'

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'Clear ALL saved forecast data?\nThis will delete all uploaded periods and cannot be undone.'
    );
    if (!confirmed) return;

    try {
      // Step 1: Open DB
      const db = await openForecastDB();

      // Step 2: Clear object store synchronously via transaction
      await new Promise((resolve, reject) => {
        const tx    = db.transaction(FORECAST_STORE, 'readwrite');
        const store = tx.objectStore(FORECAST_STORE);
        const req   = store.clear();
        req.onsuccess  = () => { /* wait for tx complete */ };
        req.onerror    = (e) => reject(e.target.error);
        tx.oncomplete  = () => resolve();
        tx.onerror     = (e) => reject(e.target.error);
        tx.onabort     = (e) => reject(e.target.error);
      });

      // Step 3: Reset ALL forecast-related state AFTER DB is confirmed cleared
      setForecastPeriods([]);
      setForecastData(null);
      setActivePeriodId(null);
      setForecastStep('upload');
      setForecastError('');
      setForecastSearch('');
      setExpandedDMs({});
      setExpandedMRs({});
      setForecastExpandedMRs({});
      setManualForecast({});
      setShowForecastFilters(false);
      setProductCardsCollapsed(false);
      setProductCardSort('name');

      console.log('✅ Forecast data cleared successfully');
    } catch (err) {
      console.error('❌ Clear failed:', err);
      alert(`Failed to clear forecast data.\nError: ${err?.message || 'Unknown error'}\nPlease refresh the page and try again.`);
    }
  };

  useEffect(() => {
    loadForecastPeriods().then(periods => {
      if (periods.length > 0) {
        // Sort by dateFrom descending — latest first
        const sorted = [...periods].sort((a, b) =>
          new Date(b.dateFrom) - new Date(a.dateFrom)
        );
        setForecastPeriods(sorted);
        // Auto-activate latest period
        const latest = sorted[0];
        setActivePeriodId(latest.id);
        setForecastData(latest.parsedData);
        setForecastScenario(prev => ({
          ...prev,
          selectedMRs:      Object.keys(latest.parsedData.mrMap),
          selectedProducts: Object.keys(latest.parsedData.productSummary)
        }));
        setForecastStep('review');
      }
    }).catch(console.error);
  }, []);

  const activePeriod = useMemo(() =>
    forecastPeriods.find(p => p.id === activePeriodId),
    [forecastPeriods, activePeriodId]
  );

  const sortedProductCards = useMemo(() => {
    if (!forecastData) return [];
    return [...forecastData.allProducts].sort((a, b) => {
      if (productCardSort === 'name') {
        return a.productName.localeCompare(b.productName);
      }
      const achA = a.targetValue > 0 ? (a.salesValue / a.targetValue) * 100 : 0;
      const achB = b.targetValue > 0 ? (b.salesValue / b.targetValue) * 100 : 0;
      return productCardSort === 'ach_asc' ? achA - achB : achB - achA;
    });
  }, [forecastData, productCardSort]);

  // Quarter remaining days calculation
  const quarterInfo = useMemo(() => {
    if (!activePeriod) return null;

    const year       = new Date(activePeriod.dateFrom).getFullYear();
    const qBounds    = getQuarterBounds(activePeriod.quarter || forecastQuarter, year);
    const qStart     = new Date(qBounds.from);
    const qEnd       = new Date(qBounds.to);
    const fileFrom   = new Date(activePeriod.dateFrom);
    const fileTo     = new Date(activePeriod.dateTo);
    const now        = new Date();

    // Total quarter
    const qTotalDays = Math.round((qEnd - qStart) / 86400000) + 1;
    const qTotal10   = Math.ceil(qTotalDays / 10); // typically 9

    // Coverage from all uploaded periods for this quarter
    // (combine multiple uploaded files for same quarter)
    const sameQuarterPeriods = forecastPeriods.filter(p =>
      (p.quarter || '') === (activePeriod.quarter || '') &&
      new Date(p.dateFrom).getFullYear() === year
    );

    // Days covered by uploaded files
    let coveredDays = 0;
    sameQuarterPeriods.forEach(p => {
      const pFrom = new Date(p.dateFrom);
      const pTo   = new Date(p.dateTo);
      const days  = Math.round((pTo - pFrom) / 86400000) + 1;
      coveredDays += days;
    });
    coveredDays = Math.min(coveredDays, qTotalDays);

    const covered10Periods   = Math.floor(coveredDays / 10);
    const remaining10Periods = Math.max(0, qTotal10 - covered10Periods);
    const remainingDays      = remaining10Periods * 10;

    // Days from today to quarter end
    const daysToQEnd = Math.max(0, Math.round((qEnd - now) / 86400000));

    return {
      quarter:          activePeriod.quarter || forecastQuarter,
      year,
      qFrom:            qBounds.from,
      qTo:              qBounds.to,
      fileFrom:         activePeriod.dateFrom,
      fileTo:           activePeriod.dateTo,
      qTotalDays,
      qTotal10Periods:  qTotal10,
      coveredDays,
      covered10Periods,
      remaining10Periods,
      remainingDays,
      daysToQEnd,
      coveragePct:      Math.round((coveredDays / qTotalDays) * 100),
      sameQuarterCount: sameQuarterPeriods.length,

      // compatibility keys for Step 2 UI
      dateFrom:         activePeriod.dateFrom,
      dateTo:           activePeriod.dateTo,
      totalDays:        qTotalDays,
      progressPct:      Math.min(100, Math.round((coveredDays / qTotalDays) * 100)),
      elapsedDays:      coveredDays,
      elapsed10Days:    covered10Periods,
      remaining10Days:  remaining10Periods,
      total10Periods:   qTotal10
    };
  }, [activePeriod, forecastPeriods, forecastQuarter]);

  const semesterInfo = useMemo(() => {
    if (!forecastPeriods.length || !activePeriod) return null;

    const year = new Date(activePeriod.dateFrom).getFullYear();
    const activeQ = activePeriod.quarter || forecastQuarter;

    // H1 = Q1+Q2 , H2 = Q3+Q4
    const isH1 = ['Q1','Q2'].includes(activeQ);
    const semesterQs = isH1 ? ['Q1','Q2'] : ['Q3','Q4'];
    const semLabel   = isH1 ? 'H1' : 'H2';

    // Find all periods for the semester
    const semPeriods = forecastPeriods.filter(p =>
      semesterQs.includes(p.quarter || '') &&
      new Date(p.dateFrom).getFullYear() === year
    );

    if (semPeriods.length < 2) return null; // need both quarters for semester

    // Aggregate totals for previous quarter
    const prevQ   = isH1 ? 'Q1' : 'Q3';
    const currQ   = isH1 ? 'Q2' : 'Q4';
    const prevPeriods = semPeriods.filter(p => (p.quarter || '') === prevQ);
    const currPeriods = semPeriods.filter(p => (p.quarter || '') === currQ);

    const sumData = (periods) => {
      let sv = 0, tv = 0, sp = 0, tp = 0, su = 0, tu = 0;
      periods.forEach(p => {
        const data = p.parsedData;
        data.allProducts?.forEach(prod => {
          sv += prod.salesValue;  tv += prod.targetValue;
          sp += prod.salesPoints; tp += prod.targetPoints;
          su += prod.salesUnit;   tu += prod.targetUnit;
        });
      });
      return { sv, tv, sp, tp, su, tu };
    };

    const prev = sumData(prevPeriods);
    const curr = sumData(currPeriods);

    // Semester target = sum of both quarters' targets
    const semTargetVal = prev.tv + curr.tv;
    const semTargetPts = prev.tp + curr.tp;

    // Achieved so far = prev full + curr partial
    const achievedVal  = prev.sv + curr.sv;
    const achievedPts  = prev.sp + curr.sp;

    // To hit 100% semester
    const neededFor100Val = Math.max(0, semTargetVal - achievedVal);
    const neededFor100Pts = Math.max(0, semTargetPts - achievedPts);

    return {
      semLabel,
      prevQ, currQ,
      semTargetVal, semTargetPts,
      achievedVal, achievedPts,
      achievedValPct: semTargetVal > 0 ? (achievedVal / semTargetVal) * 100 : 0,
      achievedPtsPct: semTargetPts > 0 ? (achievedPts / semTargetPts) * 100 : 0,
      neededFor100Val,
      neededFor100Pts,
      hasPrevQ: prevPeriods.length > 0,
      hasCurrQ: currPeriods.length > 0,
    };
  }, [forecastPeriods, activePeriod, forecastQuarter]);

  const forecastResults = useMemo(() => {
    if (!forecastData || !quarterInfo) return null;

    const remaining10 = quarterInfo.remaining10Periods;
    const results     = {};

    forecastData.allProducts.forEach(p => {
      const code      = p.productCode;
      const manual    = manualForecast[code];
      const goalUnits = p.targetUnit * (forecastTargetPct / 100);
      const needed    = Math.max(0, goalUnits - p.salesUnit);

      let forecastUnitsPerPeriod = remaining10 > 0 ? needed / remaining10 : 0;

      // Manual override
      if (manual) {
        if (forecastMode === 'units' && manual.units !== undefined) {
          forecastUnitsPerPeriod = manual.units;
        } else if (forecastMode === 'percentage' && manual.pct !== undefined) {
          forecastUnitsPerPeriod = p.salesUnit > 0
            ? (p.salesUnit / quarterInfo.covered10Periods) * (manual.pct / 100)
            : 0;
        }
      }

      const forecastAddedUnits = forecastUnitsPerPeriod * remaining10;
      const totalForecastUnits = p.salesUnit + forecastAddedUnits;
      const forecastVal        = totalForecastUnits * (p.unitPrice || 0);
      const forecastPts        = totalForecastUnits * (p.pointRate || 0);
      const forecastAchVal     = p.targetValue  > 0 ? (forecastVal / p.targetValue)  * 100 : 0;
      const forecastAchPts     = p.targetPoints > 0 ? (forecastPts / p.targetPoints) * 100 : 0;

      results[code] = {
        productCode:            code,
        productName:            p.productName,
        currentUnits:           p.salesUnit,
        targetUnits:            p.targetUnit,
        goalUnits,
        needed,
        forecastUnitsPerPeriod,
        forecastAddedUnits,
        totalForecastUnits,
        forecastVal,
        forecastPts,
        forecastAchVal,
        forecastAchPts,
        currentAchVal:  p.targetValue  > 0 ? (p.salesValue  / p.targetValue)  * 100 : 0,
        currentAchPts:  p.targetPoints > 0 ? (p.salesPoints / p.targetPoints) * 100 : 0,
        isManual:       !!manual,
      };
    });

    return results;
  }, [forecastData, quarterInfo, forecastTargetPct, forecastMode, manualForecast]);

  const trendChartData = useMemo(() => {
    if (!forecastPeriods.length) return [];

    // Sort periods by dateFrom
    const sorted = [...forecastPeriods].sort((a,b) =>
      new Date(a.dateFrom) - new Date(b.dateFrom)
    );

    // Build series: each period is a point on X axis
    // Y = metric value per product or per MR
    const labels = sorted.map(p =>
      `${p.quarter || ''} ${p.dateFrom.substring(5)}→${p.dateTo.substring(5)}`
    );

    if (trendGroupBy === 'product') {
      // One line per product
      const productKeys = forecastData
        ? Object.keys(forecastData.productSummary)
        : [];

      const series = productKeys.map(code => {
        const name = forecastData.productSummary[code]?.productName || code;
        const values = sorted.map(period => {
          const prod = period.parsedData?.productSummary?.[code];
          if (!prod) return 0;
          if (trendMetric === 'salesValue')  return prod.salesValue  || 0;
          if (trendMetric === 'salesUnit')   return prod.salesUnit   || 0;
          if (trendMetric === 'salesPoints') return prod.salesPoints || 0;
          return 0;
        });
        return { name: name.substring(0,20), values };
      });
      return { labels, series };
    } else {
      // One line per MR
      const mrKeys = forecastData ? Object.keys(forecastData.mrMap) : [];
      const series = mrKeys.map(mrKey => {
        const mr   = forecastData.mrMap[mrKey];
        const name = mr ? mr.mrName.split('(')[0].trim() : mrKey;
        const values = sorted.map(period => {
          const mrData = period.parsedData?.mrMap?.[mrKey];
          if (!mrData) return 0;
          return Object.values(mrData.products || {}).reduce((s,p) => {
            if (trendMetric === 'salesValue')  return s + (p.salesValue  || 0);
            if (trendMetric === 'salesUnit')   return s + (p.salesUnit   || 0);
            if (trendMetric === 'salesPoints') return s + (p.salesPoints || 0);
            return s;
          }, 0);
        });
        return { name, values };
      });
      return { labels, series };
    }
  }, [forecastPeriods, forecastData, trendGroupBy, trendMetric]);


  // Filtered + sorted DMs
  const sortedFilteredDMs = useMemo(() => {
    if (!forecastData) return [];
    let dms = forecastData.allDMs;

    // Search filter
    if (forecastSearch.trim()) {
      const q = forecastSearch.trim().toLowerCase();
      dms = dms.filter(dm =>
        dm.dmName.toLowerCase().includes(q) ||
        dm.mrs.some(mrId => {
          const mr = forecastData.mrMap[mrId];
          return mr && mr.mrName.toLowerCase().includes(q);
        }) ||
        Object.values(dm.products).some(p =>
          p.productName.toLowerCase().includes(q)
        )
      );
    }

    // Sort
    return [...dms].sort((a, b) => {
      const getVal = (dm) => {
        const totSV = Object.values(dm.products).reduce((s,p) => s + p.salesValue,  0);
        const totTV = Object.values(dm.products).reduce((s,p) => s + p.targetValue, 0);
        const totSP = Object.values(dm.products).reduce((s,p) => s + p.salesPoints,  0);
        const totTP = Object.values(dm.products).reduce((s,p) => s + p.targetPoints, 0);
        if (sortDMBy === 'ach_value')  return totTV > 0 ? (totSV / totTV) * 100 : 0;
        if (sortDMBy === 'ach_points') return totTP > 0 ? (totSP / totTP) * 100 : 0;
        return dm.dmName;
      };
      const va = getVal(a), vb = getVal(b);
      const dir = sortDMDir === 'asc' ? 1 : -1;
      return typeof va === 'string'
        ? va.localeCompare(vb) * dir
        : (va - vb) * dir;
    });
  }, [forecastData, forecastSearch, sortDMBy, sortDMDir]);

  // Sorted MRs for a given DM
  const getSortedMRs = (dmMrIds) => {
    if (!forecastData) return [];
    const mrs = dmMrIds
      .map(id => forecastData.mrMap[id] || forecastData.mrMap[Object.keys(forecastData.mrMap).find(k => forecastData.mrMap[k].mrId === id)])
      .filter(Boolean);

    return [...mrs].sort((a, b) => {
      const getVal = (mr) => {
        const totSV = Object.values(mr.products).reduce((s,p) => s + p.salesValue,  0);
        const totTV = Object.values(mr.products).reduce((s,p) => s + p.targetValue, 0);
        const totSP = Object.values(mr.products).reduce((s,p) => s + p.salesPoints, 0);
        const totTP = Object.values(mr.products).reduce((s,p) => s + p.targetPoints,0);
        if (sortMRBy === 'ach_value')  return totTV > 0 ? (totSV / totTV) * 100 : 0;
        if (sortMRBy === 'ach_points') return totTP > 0 ? (totSP / totTP) * 100 : 0;
        return mr.mrName;
      };
      const va = getVal(a), vb = getVal(b);
      const dir = sortMRDir === 'asc' ? 1 : -1;
      return typeof va === 'string'
        ? va.localeCompare(vb) * dir
        : (va - vb) * dir;
    });
  };

  const AchBadge = ({ pct }) => (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums
      ${pct >= 80 ? 'bg-green-100 text-green-700'
        : pct >= 50 ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'}`}>
      {pct.toFixed(2)}%
    </span>
  );


  const handleForecastFileSelect = (file) => {
    setPendingFile(file);
    setShowDateModal(true);
    setUploadDateFrom('');
    setUploadDateTo('');
    setForecastError('');
    // Dynamically default the quarter name based on the current date
    const month = new Date().getMonth();
    const qNum = Math.floor(month / 3) + 1;
    const year = new Date().getFullYear();
    setForecastQuarter(`Q${qNum}-${year}`);
  };

  const parseForecastFile = async (file, periodMeta = {}) => {
    setForecastLoading(true);
    setForecastError('');

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let rawRows = [];

      // ── PARSE FILE ──
      if (ext === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());

        // Try tab first, then comma
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h =>
          h.trim().replace(/^"|"$/g, '').trim()
        );
        rawRows = lines.slice(1).map(line => {
          const vals = line.split(delimiter);
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = String(vals[i] || '').trim().replace(/^"|"$/g, '').trim();
          });
          return obj;
        });

      } else {
        // XLSX
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // ── SMART HEADER DETECTION ──
        // Find the row that contains "MR ID" or "Product code" or "Line Name"
        // because row 0 might be a title like "Sales Report"
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
        let headerRowIndex = 0;

        const keywordsToFind = [
          'mr id', 'mr name', 'product code', 'product name',
          'line name', 'dm id', 'sales unit', 'target unit'
        ];

        // Scan first 5 rows to find the actual header row
        for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
          const rowValues = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[cellAddr];
            if (cell) {
              rowValues.push(String(cell.v || '').toLowerCase().trim());
            }
          }
          const matchCount = keywordsToFind.filter(kw =>
            rowValues.some(v => v.includes(kw))
          ).length;

          if (matchCount >= 3) {
            headerRowIndex = r;
            break;
          }
        }

        // Parse with detected header row
        rawRows = XLSX.utils.sheet_to_json(ws, {
          defval: '',
          range: headerRowIndex,  // start from detected header row
          raw: false,             // get formatted strings, not raw numbers
        });
      }

      // ── FLEXIBLE COLUMN MATCHER ──
      // Normalize a key: lowercase, remove spaces/dots/brackets/newlines
      const norm = (s) =>
        String(s || '')
          .toLowerCase()
          .replace(/[\s\n\r().]/g, '')
          .replace(/-/g, '')
          .trim();

      // Build a flexible column map from actual headers in the file
      const buildColMap = (sampleRow) => {
        const keys = Object.keys(sampleRow);
        const find = (...candidates) => {
          for (const cand of candidates) {
            const nc = norm(cand);
            const match = keys.find(k => norm(k) === nc || norm(k).includes(nc));
            if (match) return match;
          }
          // Partial match fallback
          for (const cand of candidates) {
            const nc = norm(cand);
            const match = keys.find(k => norm(k).includes(nc.substring(0, 6)));
            if (match) return match;
          }
          return null;
        };

        return {
          lineName:     find('Line Name',     'linename',    'line'),
          dmId:         find('DM ID',         'dmid',        'dm_id'),
          dmName:       find('DM Name ( District Name )', 'DM Name', 'dmname', 'dm_name', 'district'),
          mrId:         find('MR ID',         'mrid',        'mr_id'),
          mrName:       find('MR Name ( Area Name )', 'MR Name', 'mrname', 'mr_name', 'area'),
          productCode:  find('Product code',  'productcode', 'product_code', 'code'),
          productName:  find('Product name',  'productname', 'product_name'),
          salesUnit:    find('Sales unit',    'salesunit',   'sales_unit',   'salesunits'),
          salesValue:   find('Sales value',   'salesvalue',  'sales_value'),
          targetUnit:   find('Target unit',   'targetunit',  'target_unit',  'targetunits'),
          targetValue:  find('Target value',  'targetvalue', 'target_value'),
          salesPoints:  find('Sales points',  'salespoints', 'sales_points'),
          targetPoints: find('Target points', 'targetpoints','target_points'),
          ratio:        find('Ratio',         'ratio'),
        };
      };

      // ── PARSE NUMBER ──
      const parseNum = (v) => {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return v;
        // Remove commas, spaces, % signs
        const cleaned = String(v).replace(/,/g, '').replace(/%/g, '').trim();
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      // ── FILTER & NORMALIZE ROWS ──
      if (rawRows.length === 0) {
        throw new Error('File appears empty. Please check the file content.');
      }

      const colMap = buildColMap(rawRows[0]);

      // Debug: log what columns were found
      console.log('Detected column map:', colMap);
      console.log('Sample raw row:', rawRows[0]);
      console.log('All keys in first row:', Object.keys(rawRows[0]));

      const normalize = (row) => ({
        lineName:     colMap.lineName    ? String(row[colMap.lineName]    || '') : '',
        dmId:         colMap.dmId        ? String(row[colMap.dmId]        || '') : '',
        dmName:       colMap.dmName      ? String(row[colMap.dmName]      || '') : '',
        mrId:         colMap.mrId        ? String(row[colMap.mrId]        || '') : '',
        mrName:       colMap.mrName      ? String(row[colMap.mrName]      || '') : '',
        productCode:  colMap.productCode ? String(row[colMap.productCode] || '') : '',
        productName:  colMap.productName ? String(row[colMap.productName] || '') : '',
        salesUnit:    parseNum(colMap.salesUnit    ? row[colMap.salesUnit]    : 0),
        salesValue:   parseNum(colMap.salesValue   ? row[colMap.salesValue]   : 0),
        targetUnit:   parseNum(colMap.targetUnit   ? row[colMap.targetUnit]   : 0),
        targetValue:  parseNum(colMap.targetValue  ? row[colMap.targetValue]  : 0),
        salesPoints:  parseNum(colMap.salesPoints  ? row[colMap.salesPoints]  : 0),
        targetPoints: parseNum(colMap.targetPoints ? row[colMap.targetPoints] : 0),
      });

      const isDataRow = (row) => {
        const r = normalize(row);
        // Must have a product code AND at least one of: mrId, mrName
        const hasProduct = r.productCode.trim() !== '' &&
          !r.productCode.toLowerCase().includes('total') &&
          !r.productCode.toLowerCase().includes('product code');

        const hasMR = r.mrId.trim() !== '' ||
          (r.mrName.trim() !== '' && !r.mrName.toLowerCase().includes('total'));

        return hasProduct && hasMR;
      };

      const clean = rawRows.filter(isDataRow).map(normalize);

      console.log(`Total raw rows: ${rawRows.length}, Valid data rows: ${clean.length}`);

      if (clean.length === 0) {
        // Provide helpful debug info
        const sampleKeys = rawRows.length > 0 ? Object.keys(rawRows[0]).join(' | ') : 'none';
        throw new Error(
          `No valid data rows found.\n\n` +
          `Detected columns in file: ${sampleKeys}\n\n` +
          `Expected columns: Line Name, DM ID, MR ID, MR Name, Product code, ` +
          `Product name, Sales unit, Sales value, Target unit, Target value, ` +
          `Sales points, Target points.\n\n` +
          `Please make sure the file has the correct headers.`
        );
      }

      // ── DERIVE UNIT PRICE & POINT RATE per product ──
      const productMetrics = {};
      clean.forEach(r => {
        if (!productMetrics[r.productCode]) {
          productMetrics[r.productCode] = {
            totalSalesVal: 0, totalSalesUnits: 0,
            totalTargetPts: 0, totalTargetUnits: 0,
          };
        }
        const pm = productMetrics[r.productCode];
        pm.totalSalesVal    += r.salesValue;
        pm.totalSalesUnits  += r.salesUnit;
        pm.totalTargetPts   += r.targetPoints;
        pm.totalTargetUnits += r.targetUnit;
      });

      const unitPrice = {};
      const pointRate = {};
      Object.entries(productMetrics).forEach(([code, m]) => {
        unitPrice[code] = m.totalSalesUnits  > 0 ? m.totalSalesVal  / m.totalSalesUnits  : 0;
        pointRate[code] = m.totalTargetUnits > 0 ? m.totalTargetPts / m.totalTargetUnits : 0;
      });

      // Second pass for unitPrice fallback using targetValue ÷ targetUnits
      const productTargetMetrics = {};
      clean.forEach(r => {
        if (!productTargetMetrics[r.productCode]) {
          productTargetMetrics[r.productCode] = { totalTargetVal: 0, totalTargetUnits: 0 };
        }
        productTargetMetrics[r.productCode].totalTargetVal   += r.targetValue;
        productTargetMetrics[r.productCode].totalTargetUnits += r.targetUnit;
      });
      Object.entries(productTargetMetrics).forEach(([code, m]) => {
        if (unitPrice[code] === 0 && m.totalTargetUnits > 0) {
          unitPrice[code] = m.totalTargetVal / m.totalTargetUnits;
        }
      });

      // ── BUILD MR MAP ──
      const mrMap = {};
      clean.forEach(r => {
        const key = r.mrId || r.mrName;
        if (!mrMap[key]) {
          mrMap[key] = {
            mrId: r.mrId,
            mrName: r.mrName,
            dmId: r.dmId,
            dmName: r.dmName,
            lineName: r.lineName,
            products: {}
          };
        }
        if (!mrMap[key].products[r.productCode]) {
          mrMap[key].products[r.productCode] = {
            productCode: r.productCode,
            productName: r.productName,
            salesUnit: 0, salesValue: 0,
            targetUnit: 0, targetValue: 0,
            salesPoints: 0, targetPoints: 0,
          };
        }
        const p = mrMap[key].products[r.productCode];
        p.salesUnit    += r.salesUnit;
        p.salesValue   += r.salesValue;
        p.targetUnit   += r.targetUnit;
        p.targetValue  += r.targetValue;
        p.salesPoints  += r.salesPoints;
        p.targetPoints += r.targetPoints;
      });

      // Compute ratios + rates per MR product
      Object.values(mrMap).forEach(mr => {
        Object.values(mr.products).forEach(p => {
          p.valueRatio  = p.targetValue  > 0 ? (p.salesValue  / p.targetValue)  * 100 : 0;
          p.pointsRatio = p.targetPoints > 0 ? (p.salesPoints / p.targetPoints) * 100 : 0;
          p.unitPrice   = unitPrice[p.productCode] || 0;
          p.pointRate   = pointRate[p.productCode] || 0;
        });
      });

      // ── BUILD DM MAP ──
      const dmMap = {};
      Object.values(mrMap).forEach(mr => {
        const dmKey = mr.dmId || mr.dmName || 'unknown';
        if (!dmMap[dmKey]) {
          dmMap[dmKey] = {
            dmId: mr.dmId,
            dmName: mr.dmName || 'Unknown DM',
            lineName: mr.lineName,
            mrs: [],
            products: {}
          };
        }
        if (!dmMap[dmKey].mrs.includes(mr.mrId || mr.mrName)) {
          dmMap[dmKey].mrs.push(mr.mrId || mr.mrName);
        }
        Object.values(mr.products).forEach(p => {
          if (!dmMap[dmKey].products[p.productCode]) {
            dmMap[dmKey].products[p.productCode] = {
              ...p,
              salesUnit: 0, salesValue: 0,
              targetUnit: 0, targetValue: 0,
              salesPoints: 0, targetPoints: 0
            };
          }
          const dp = dmMap[dmKey].products[p.productCode];
          dp.salesUnit    += p.salesUnit;
          dp.salesValue   += p.salesValue;
          dp.targetUnit   += p.targetUnit;
          dp.targetValue  += p.targetValue;
          dp.salesPoints  += p.salesPoints;
          dp.targetPoints += p.targetPoints;
        });
      });

      Object.values(dmMap).forEach(dm => {
        Object.values(dm.products).forEach(p => {
          p.valueRatio  = p.targetValue  > 0 ? (p.salesValue  / p.targetValue)  * 100 : 0;
          p.pointsRatio = p.targetPoints > 0 ? (p.salesPoints / p.targetPoints) * 100 : 0;
        });
      });

      // ── BUILD PRODUCT SUMMARY ──
      const productSummary = {};
      clean.forEach(r => {
        if (!productSummary[r.productCode]) {
          productSummary[r.productCode] = {
            productCode: r.productCode,
            productName: r.productName,
            salesUnit: 0, salesValue: 0,
            targetUnit: 0, targetValue: 0,
            salesPoints: 0, targetPoints: 0,
            unitPrice: unitPrice[r.productCode] || 0,
            pointRate: pointRate[r.productCode] || 0,
          };
        }
        const ps = productSummary[r.productCode];
        ps.salesUnit    += r.salesUnit;
        ps.salesValue   += r.salesValue;
        ps.targetUnit   += r.targetUnit;
        ps.targetValue  += r.targetValue;
        ps.salesPoints  += r.salesPoints;
        ps.targetPoints += r.targetPoints;
      });

      Object.values(productSummary).forEach(p => {
        p.valueRatio  = p.targetValue  > 0 ? (p.salesValue  / p.targetValue)  * 100 : 0;
        p.pointsRatio = p.targetPoints > 0 ? (p.salesPoints / p.targetPoints) * 100 : 0;
      });

      // Save to IndexedDB
      const periodId = `${periodMeta.dateFrom || 'unknown'}_${Date.now()}`;
      const periodObj = {
        id:          periodId,
        fileName:    file.name,
        dateFrom:    periodMeta.dateFrom || '',
        dateTo:      periodMeta.dateTo   || '',
        quarter:     periodMeta.quarter  || '',
        uploadedAt:  new Date().toISOString(),
        parsedData: {
          fileName:       file.name,
          totalRows:      clean.length,
          mrMap,
          dmMap,
          productSummary,
          unitPrice,
          pointRate,
          allMRs:         Object.values(mrMap),
          allDMs:         Object.values(dmMap),
          allProducts:    Object.values(productSummary),
          hasDM:          Object.values(dmMap).some(d => d.dmId && d.dmId.trim() !== ''),
          multiMR:        Object.keys(mrMap).length > 1,
          detectedColumns: colMap,
        }
      };

      await saveForecastPeriod(periodObj);
      setForecastPeriods(prev => {
        const updated = [periodObj, ...prev.filter(p => p.id !== periodId)];
        return updated.sort((a,b) => new Date(b.dateFrom) - new Date(a.dateFrom));
      });
      setActivePeriodId(periodId);

      setForecastData(periodObj.parsedData);
      setForecastScenario(prev => ({
        ...prev,
        selectedMRs:      Object.keys(mrMap),
        selectedProducts: Object.keys(productSummary)
      }));
      setForecastStep('review');

    } catch (err) {
      console.error('Forecast parse error:', err);
      setForecastError(
        err.message ||
        'Failed to parse file. Please check the browser console for details.'
      );
    } finally {
      setForecastLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── STEP INDICATOR ── */}
      <div className="flex items-center gap-2">
        {[
          { key: 'upload',   label: '1. Upload'  },
          { key: 'review',   label: '2. Review'  },
          { key: 'forecast', label: '3. Forecast'},
        ].map((s, i, arr) => (
          <React.Fragment key={s.key}>
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
              ${forecastStep === s.key
                ? 'bg-yellow-400 text-gray-900'
                : forecastData && arr.indexOf(arr.find(x => x.key === forecastStep)) > i
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}>
              {s.label}
            </div>
            {i < arr.length - 1 && (
              <div className="flex-1 h-px bg-gray-200" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ══════════════════════════════════════
          STEP 1 — UPLOAD
      ══════════════════════════════════════ */}
      {forecastStep === 'upload' && (
        <div className="bg-white rounded-3xl border border-gray-100
                        shadow-sm p-10 flex flex-col items-center gap-6">
          <div className="p-5 bg-yellow-50 rounded-3xl">
            <Upload size={36} className="text-yellow-500" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
              Upload Sales Report
            </h3>
            <p className="text-sm text-gray-400 mt-2 max-w-md">
              Upload the EVA Pharma Sales Report in XLSX or CSV format.
              The file must contain the standard columns:
              Line Name, DM ID, DM Name, MR ID, MR Name,
              Product code, Product name, Sales unit, Sales value,
              Target unit, Target value, Sales points, Target points.
            </p>
          </div>

          {forecastError && (
            <div className="w-full max-w-2xl bg-red-50 border border-red-200
                            rounded-2xl px-5 py-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-black text-red-600 mb-1">
                  Failed to parse file
                </p>
                <pre className="text-[10px] font-bold text-red-500
                                whitespace-pre-wrap leading-relaxed font-mono">
                  {forecastError}
                </pre>
              </div>
              <button
                onClick={() => setForecastError('')}
                className="text-red-400 hover:text-red-700 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <label className="cursor-pointer group">
            <input
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setForecastFile(f);
                  handleForecastFileSelect(f);
                }
              }}
            />
            <div className="flex items-center gap-3 px-8 py-4
                            bg-gray-900 text-white rounded-2xl
                            font-black uppercase tracking-widest text-sm
                            hover:bg-yellow-400 hover:text-gray-900
                            group-hover:scale-105
                            transition-all shadow-lg active:scale-95">
              {forecastLoading
                ? <><Loader2 size={18} className="animate-spin" /> Parsing...</>
                : <><FileSpreadsheet size={18} /> Choose File (XLSX / CSV)</>
              }
            </div>
          </label>

          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
            Supported: .xlsx · .csv — Tab or comma separated
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════
          STEP 2 — REVIEW
      ══════════════════════════════════════ */}
      {forecastStep === 'review' && forecastData && (
        <div className="space-y-4">

          {/* ── TOP BAR: Period selector + actions ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">

              {/* Period Pills */}
              <div className="flex-1 flex flex-wrap gap-2">
                {forecastPeriods.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePeriodId(p.id);
                      setForecastData(p.parsedData);
                      setForecastScenario(prev => ({
                        ...prev,
                        selectedMRs:      Object.keys(p.parsedData.mrMap),
                        selectedProducts: Object.keys(p.parsedData.productSummary)
                      }));
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl
                               text-[10px] font-black uppercase tracking-widest
                               transition-all border
                               ${activePeriodId === p.id
                                 ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                                 : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-yellow-300'}`}
                  >
                    <span>{p.quarter || 'Period'}</span>
                    <span className="opacity-70">
                      {p.dateFrom} → {p.dateTo}
                    </span>
                    <span
                      onClick={async e => {
                        e.stopPropagation();
                        if (!window.confirm('Delete this report period?')) return;
                        await deleteForecastPeriod(p.id);
                        setForecastPeriods(prev => prev.filter(x => x.id !== p.id));
                        if (activePeriodId === p.id) {
                          const remaining = forecastPeriods.filter(x => x.id !== p.id);
                          if (remaining.length > 0) {
                            setActivePeriodId(remaining[0].id);
                            setForecastData(remaining[0].parsedData);
                          } else {
                            setForecastData(null);
                            setForecastStep('upload');
                          }
                        }
                      }}
                      className="ml-1 opacity-40 hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">

                {/* Forecast Button — PRIMARY, most prominent */}
                <button
                  onClick={() => setForecastStep('forecast')}
                  disabled={!forecastData}
                  className="flex items-center gap-2 px-5 py-2.5
                             bg-yellow-400 text-gray-900 rounded-xl
                             text-[10px] font-black uppercase tracking-widest
                             hover:bg-yellow-300 transition-all shadow-md
                             disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <TrendingUp size={14} />
                  Forecast →
                </button>

                {/* Add Period */}
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5
                                  bg-gray-900 text-white rounded-xl text-[10px]
                                  font-black uppercase tracking-widest
                                  hover:bg-gray-700 transition-all">
                  <Plus size={12} />
                  Add Period
                  <input
                    type="file" accept=".xlsx,.csv" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleForecastFileSelect(f);
                      e.target.value = '';
                    }}
                  />
                </label>

                {/* Clear All */}
                <button
                  onClick={handleClearAllData}
                  className="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl
                             text-[10px] font-black uppercase tracking-widest
                             hover:bg-red-500 hover:text-white transition-all
                             border border-red-100"
                >
                  Clear All
                </button>

              </div>
            </div>
          </div>

          {/* ── ENHANCED QUARTER PROGRESS BAR ── */}
          {quarterInfo && (
            <div className="bg-gradient-to-r from-gray-900 to-gray-800
                            rounded-2xl p-5 border border-white/10 space-y-4">

              {/* ── Days Counter Strip ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                {[
                  {
                    label:  'Total Days',
                    val:    quarterInfo.qTotalDays,
                    sub:    `${quarterInfo.qFrom} → ${quarterInfo.qTo}`,
                    color:  'text-white',
                    bg:     'bg-white/5',
                  },
                  {
                    label:  'Days Covered',
                    val:    quarterInfo.coveredDays,
                    sub:    `${quarterInfo.covered10Periods} of ${quarterInfo.qTotal10Periods} periods`,
                    color:  'text-green-400',
                    bg:     'bg-green-500/10',
                  },
                  {
                    label:  'Days Remaining',
                    val:    quarterInfo.remainingDays,
                    sub:    `${quarterInfo.remaining10Periods} periods left`,
                    color:  quarterInfo.remainingDays > 30 ? 'text-yellow-400' : 'text-red-400',
                    bg:     quarterInfo.remainingDays > 30 ? 'bg-yellow-500/10' : 'bg-red-500/10',
                  },
                  {
                    label:  'Quarter Progress',
                    val:    `${quarterInfo.coveragePct}%`,
                    sub:    `${quarterInfo.daysToQEnd} days to quarter end`,
                    color:  'text-blue-400',
                    bg:     'bg-blue-500/10',
                  },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-xl px-4 py-3`}>
                    <p className="text-[8px] font-black text-gray-400
                                  uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`font-black text-xl tabular-nums leading-none ${s.color}`}>
                      {s.val}
                    </p>
                    <p className="text-[9px] text-gray-500 font-bold mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center
                              justify-between gap-3">
                <div>
                  <p className="text-gray-400 text-[9px] font-black
                                uppercase tracking-widest mb-1">
                    {quarterInfo.quarter} {quarterInfo.year}
                    · {quarterInfo.qFrom} to {quarterInfo.qTo}
                  </p>
                  <h3 className="text-white font-black text-base">
                    {quarterInfo.remainingDays > 0
                      ? `${quarterInfo.remainingDays} days remaining in quarter`
                      : 'Quarter complete'}
                  </h3>
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    Uploaded: {quarterInfo.fileFrom} → {quarterInfo.fileTo}
                    · Coverage: {quarterInfo.coveragePct}%
                  </p>
                </div>
                <div className="flex items-center gap-3 text-center shrink-0">
                  <div className="bg-green-500/20 rounded-xl px-3 py-2">
                    <p className="text-green-400 font-black text-sm">{quarterInfo.covered10Periods}</p>
                    <p className="text-green-300 text-[8px] font-black uppercase">Covered</p>
                  </div>
                  <div className="bg-yellow-400/20 rounded-xl px-3 py-2">
                    <p className="text-yellow-400 font-black text-sm">{quarterInfo.remaining10Periods}</p>
                    <p className="text-yellow-300 text-[8px] font-black uppercase">Remaining</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-3 py-2">
                    <p className="text-white font-black text-sm">{quarterInfo.qTotal10Periods}</p>
                    <p className="text-gray-400 text-[8px] font-black uppercase">Total</p>
                  </div>
                </div>
              </div>

              {/* Month Labels Row */}
              {(() => {
                const qStart   = new Date(quarterInfo.qFrom);
                const months   = [];
                // Get 3 months of the quarter
                for (let m = 0; m < 3; m++) {
                  const mDate = new Date(qStart.getFullYear(), qStart.getMonth() + m, 1);
                  months.push(mDate.toLocaleString('default', { month: 'short' }));
                }
                return (
                  <div className="grid grid-cols-3 gap-1">
                    {months.map((mon, mi) => (
                      <div key={mi}
                        className="text-center text-[9px] font-black text-gray-400
                                   uppercase tracking-widest pb-1
                                   border-b border-white/10">
                        {mon}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Segmented 10-Day Period Blocks */}
              {(() => {
                const qStart = new Date(quarterInfo.qFrom);
                return (
                  <div className="flex gap-1">
                    {Array.from({ length: quarterInfo.qTotal10Periods }).map((_, i) => {
                      // Calculate date range for this period
                      const pStart = new Date(qStart);
                      pStart.setDate(pStart.getDate() + i * 10);
                      const pEnd   = new Date(qStart);
                      pEnd.setDate(pEnd.getDate() + (i + 1) * 10 - 1);

                      const isCovered    = i < quarterInfo.covered10Periods;
                      const isActive     = i === quarterInfo.covered10Periods;
                      const isForecast   = i > quarterInfo.covered10Periods;

                      // Which month does this period belong to? (for grouping visual)
                      const monthIdx = pStart.getMonth() - qStart.getMonth();
                      const monthColors = ['border-blue-500/30','border-green-500/30','border-orange-500/30'];

                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-lg border-t-2 overflow-hidden
                                     ${monthColors[Math.min(monthIdx, 2)]}
                                     transition-all`}
                          title={`P${i+1}: ${pStart.toLocaleDateString('en-GB')} → ${pEnd.toLocaleDateString('en-GB')}`}
                        >
                          <div className={`h-8 flex flex-col items-center justify-center
                                           relative group cursor-default
                                           ${isCovered
                                             ? 'bg-green-500/80'
                                             : isActive
                                               ? 'bg-yellow-400/90 ring-2 ring-yellow-300'
                                               : 'bg-white/10 hover:bg-white/20'}`}>
                            <span className={`text-[8px] font-black
                              ${isCovered ? 'text-white' : isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              P{i + 1}
                            </span>
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                                            bg-gray-900 text-white text-[8px] font-bold rounded-lg
                                            px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100
                                            transition-opacity pointer-events-none z-10">
                              {isCovered ? '✓ Uploaded' : isActive ? '← Up to here' : 'Forecast'}
                              <br/>
                              {pStart.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                              {' → '}
                              {pEnd.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                            </div>
                          </div>

                          {/* Status indicator below block */}
                          <div className={`h-1 w-full
                            ${isCovered ? 'bg-green-500' : isActive ? 'bg-yellow-400' : 'bg-white/5'}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Legend */}
              <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-gray-400">Uploaded / Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-yellow-400 rounded" />
                  <span className="text-gray-400">Current Position</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-white/20 rounded" />
                  <span className="text-gray-400">Forecastable Periods</span>
                </div>
              </div>
            </div>
          )}

          {/* ── SUMMARY KPI STRIP ── */}
          {(() => {
            const totSV  = forecastData.allProducts.reduce((s,p) => s + p.salesValue,  0);
            const totTV  = forecastData.allProducts.reduce((s,p) => s + p.targetValue,  0);
            const totSU  = forecastData.allProducts.reduce((s,p) => s + p.salesUnit,   0);
            const totTU  = forecastData.allProducts.reduce((s,p) => s + p.targetUnit,  0);
            const totSP  = forecastData.allProducts.reduce((s,p) => s + p.salesPoints,  0);
            const totTP  = forecastData.allProducts.reduce((s,p) => s + p.targetPoints, 0);
            const vRatio = totTV > 0 ? (totSV / totTV) * 100 : 0;
            const pRatio = totTP > 0 ? (totSP / totTP) * 100 : 0;
            const uRatio = totTU > 0 ? (totSU / totTU) * 100 : 0;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                {[
                  { label: 'Sales Units',     val: totSU.toLocaleString(undefined,{maximumFractionDigits:0}),  color: 'text-gray-900' },
                  { label: 'Target Units',    val: totTU.toLocaleString(undefined,{maximumFractionDigits:0}),  color: 'text-gray-500' },
                  { label: 'Units Ach %',     val: `${uRatio.toFixed(2)}%`,   color: uRatio>=80?'text-green-600':uRatio>=50?'text-amber-600':'text-red-600' },
                  { label: 'Sales Value',     val: totSV.toLocaleString(undefined,{maximumFractionDigits:0}),  color: 'text-blue-700' },
                  { label: 'Value Ach %',     val: `${vRatio.toFixed(2)}%`,   color: vRatio>=80?'text-green-600':vRatio>=50?'text-amber-600':'text-red-600' },
                  { label: 'Sales Points',    val: totSP.toLocaleString(undefined,{maximumFractionDigits:0}),  color: 'text-purple-700' },
                  { label: 'Points Ach %',   val: `${pRatio.toFixed(2)}%`,   color: pRatio>=80?'text-green-600':pRatio>=50?'text-amber-600':'text-red-600' },
                ].map((k,i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100
                                          shadow-sm p-4 flex flex-col gap-1">
                    <p className="text-[9px] font-black text-gray-400
                                  uppercase tracking-widest">{k.label}</p>
                    <p className={`text-base font-black ${k.color} tabular-nums leading-none`}>
                      {k.val}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Semester Progress Card */}
          {semesterInfo && (
            <div className="bg-gradient-to-r from-violet-955 to-violet-900 rounded-3xl p-6 border border-violet-800/40 shadow-lg relative overflow-hidden text-white">
              <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-[0.035] select-none pointer-events-none">
                <TrendingUp size={280} />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div className="space-y-1">
                  <span className="bg-violet-800/85 text-violet-200 text-[8px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-full border border-violet-700/20">
                    Semester Integration Engine ({semesterInfo.semLabel})
                  </span>
                  <h3 className="text-white font-extrabold text-xl tracking-tight mt-2.5">
                    Academic Year Achieved Status
                  </h3>
                  <p className="text-violet-300/80 text-[10px]">
                    Aggregate analysis of <strong>{semesterInfo.prevQ}</strong> & <strong>{semesterInfo.currQ}</strong> reports in the current year.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm min-w-[140px]">
                    <p className="text-violet-200 font-extrabold text-lg tabular-nums">
                      {semesterInfo.achievedValPct.toFixed(1)}%
                    </p>
                    <p className="text-violet-400 text-[9px] font-black uppercase tracking-wider mt-1">Value Achieved</p>
                    <p className="text-violet-300/60 font-mono text-[8px] mt-1">Needed: {(semesterInfo.neededFor100Val / 1e6).toFixed(2)}M EGP</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm min-w-[140px]">
                    <p className="text-violet-200 font-extrabold text-lg tabular-nums">
                      {semesterInfo.achievedPtsPct.toFixed(1)}%
                    </p>
                    <p className="text-violet-400 text-[9px] font-black uppercase tracking-wider mt-1">Points Achieved</p>
                    <p className="text-violet-300/60 font-mono text-[8px] mt-1">Needed: {Math.round(semesterInfo.neededFor100Pts).toLocaleString()} Pts</p>
                  </div>
                </div>
              </div>
              {/* Semester Progress Bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-[10px] text-violet-300 font-bold px-1">
                  <span>Semester Progress (Target Sum: {Math.round(semesterInfo.semTargetVal / 1e6).toFixed(1)}M EGP)</span>
                  <span>{Math.round(semesterInfo.achievedVal / 1e6).toFixed(1)}M EGP Cumulative</span>
                </div>
                <div className="h-2.5 bg-violet-950/70 rounded-full overflow-hidden p-[2px] border border-violet-800/30">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                    style={{ width: `${Math.min(100, semesterInfo.achievedValPct)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCT ACHIEVEMENT CARDS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Section Header with collapse + sort controls */}
            <div className="flex items-center justify-between px-5 py-3
                            border-b border-gray-100 flex-wrap gap-3">
              <button
                onClick={() => setProductCardsCollapsed(prev => !prev)}
                className="flex items-center gap-2 font-black text-gray-900
                           uppercase tracking-tight text-sm hover:text-yellow-600
                           transition-colors"
              >
                {productCardsCollapsed
                  ? <ChevronRight size={16} className="text-gray-400" />
                  : <ChevronDown  size={16} className="text-gray-400" />
                }
                Product Achievement Summary
                <span className="text-[10px] font-bold text-gray-400 ml-1 normal-case">
                  ({forecastData?.allProducts?.length || 0} products)
                </span>
              </button>

              {!productCardsCollapsed && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-gray-400
                                   uppercase tracking-widest">Sort:</span>
                  {[
                    { key: 'name',     label: 'Name A→Z' },
                    { key: 'ach_asc',  label: 'Ach % ↑'  },
                    { key: 'ach_desc', label: 'Ach % ↓'  },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setProductCardSort(s.key)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black
                                 uppercase tracking-widest transition-all
                                 ${productCardSort === s.key
                                   ? 'bg-yellow-400 text-gray-900'
                                   : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cards Grid — hidden when collapsed */}
            {!productCardsCollapsed && (
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {sortedProductCards.map(p => {
                    const ach = p.targetValue > 0
                      ? (p.salesValue / p.targetValue) * 100
                      : 0;
                    return (
                      <div key={p.productCode}
                        className="bg-gray-50 rounded-2xl border border-gray-100
                                   p-4 space-y-3 hover:border-yellow-200
                                   hover:shadow-sm transition-all">

                        {/* Product Name + Code */}
                        <div>
                          <p className="font-black text-gray-900 text-xs leading-tight
                                        line-clamp-2 min-h-[2.5rem]">
                            {p.productName}
                          </p>
                          <p className="font-mono text-[9px] text-violet-600
                                        font-bold mt-1">
                            {p.productCode}
                          </p>
                        </div>

                        {/* Sales Pts + Target Pts */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[8px] font-black text-gray-400
                                          uppercase tracking-widest">Sales Pts</p>
                            <p className="font-black text-gray-900 text-sm tabular-nums">
                              {p.salesPoints.toLocaleString(undefined,{maximumFractionDigits:0})}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-gray-400
                                          uppercase tracking-widest">Target Pts</p>
                            <p className="font-black text-gray-500 text-sm tabular-nums">
                              {p.targetPoints.toLocaleString(undefined,{maximumFractionDigits:0})}
                            </p>
                          </div>
                        </div>

                        {/* Single Achievement % */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[8px] font-black text-gray-400
                                          uppercase tracking-widest">Achievement</p>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums
                              ${ach >= 80 ? 'bg-green-100 text-green-700'
                                : ach >= 50 ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'}`}>
                              {ach.toFixed(2)}%
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500
                                ${ach >= 80 ? 'bg-green-500'
                                  : ach >= 50 ? 'bg-amber-400'
                                  : 'bg-red-500'}`}
                              style={{ width: `${Math.min(ach, 100)}%` }}
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── SEARCH + SORT BAR ── */}
          <div className="bg-white rounded-2xl border border-gray-100
                          shadow-sm p-4 flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2
                                           -translate-y-1/2 text-gray-400" />
              <input
                value={forecastSearch}
                onChange={e => setForecastSearch(e.target.value)}
                placeholder="Search DM, MR, or product..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl
                           text-xs font-bold outline-none border border-gray-100
                           focus:border-yellow-300 focus:bg-white transition-all"
              />
              {forecastSearch && (
                <button
                  onClick={() => setForecastSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* DM Sort */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black text-gray-400
                               uppercase tracking-widest">DM Sort:</span>
              {[
                { key: 'name',       label: 'Name'      },
                { key: 'ach_value',  label: 'Value %'   },
                { key: 'ach_points', label: 'Points %'  },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => {
                    if (sortDMBy === s.key) setSortDMDir(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortDMBy(s.key); setSortDMDir('desc'); }
                  }}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black
                             uppercase tracking-widest transition-all
                             flex items-center gap-1
                             ${sortDMBy === s.key
                               ? 'bg-yellow-400 text-gray-900'
                               : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {s.label}
                  {sortDMBy === s.key && (
                    sortDMDir === 'asc'
                      ? <ChevronUp size={10} />
                      : <ChevronDown size={10} />
                  )}
                </button>
              ))}
            </div>

            {/* MR Sort */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black text-gray-400
                               uppercase tracking-widest">MR Sort:</span>
              {[
                { key: 'name',       label: 'Name'      },
                { key: 'ach_value',  label: 'Value %'   },
                { key: 'ach_points', label: 'Points %'  },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => {
                    if (sortMRBy === s.key) setSortMRDir(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortMRBy(s.key); setSortMRDir('desc'); }
                  }}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black
                             uppercase tracking-widest transition-all
                             flex items-center gap-1
                             ${sortMRBy === s.key
                               ? 'bg-yellow-400 text-gray-900'
                               : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {s.label}
                  {sortMRBy === s.key && (
                    sortMRDir === 'asc'
                      ? <ChevronUp size={10} />
                      : <ChevronDown size={10} />
                  )}
                </button>
              ))}
            </div>

            {/* Forecast Button */}
            <button
              onClick={() => {
                setForecastQuarter(quarterInfo?.quarter || 'Q1');
                setForecastStep('forecast');
              }}
              className="px-5 py-2.5 bg-yellow-400 text-gray-900 rounded-xl
                         text-[10px] font-black uppercase tracking-widest
                         hover:bg-yellow-300 transition-all shrink-0"
            >
              Forecast →
            </button>
          </div>

          {/* ── DM / MR ACCORDION TABLE ── */}
          <div className="space-y-3">
            {sortedFilteredDMs.map(dm => {
              const dmTotSV  = Object.values(dm.products).reduce((s,p) => s + p.salesValue,  0);
              const dmTotTV  = Object.values(dm.products).reduce((s,p) => s + p.targetValue,  0);
              const dmTotSU  = Object.values(dm.products).reduce((s,p) => s + p.salesUnit,   0);
              const dmTotTU  = Object.values(dm.products).reduce((s,p) => s + p.targetUnit,  0);
              const dmTotSP  = Object.values(dm.products).reduce((s,p) => s + p.salesPoints,  0);
              const dmTotTP  = Object.values(dm.products).reduce((s,p) => s + p.targetPoints, 0);
              const dmVRatio = dmTotTV > 0 ? (dmTotSV / dmTotTV) * 100 : 0;
              const dmPRatio = dmTotTP > 0 ? (dmTotSP / dmTotTP) * 100 : 0;
              const dmURatio = dmTotTU > 0 ? (dmTotSU / dmTotTU) * 100 : 0;
              const isDMOpen = expandedDMs[dm.dmId || dm.dmName];
              const dmMRs    = getSortedMRs(dm.mrs);

              return (
                <div key={dm.dmId || dm.dmName}
                  className="bg-white rounded-2xl border border-gray-100
                             shadow-sm overflow-hidden">

                  {/* DM Header Row */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4
                               hover:bg-gray-50 transition-colors text-left"
                    onClick={() => setExpandedDMs(prev => ({
                      ...prev,
                      [dm.dmId || dm.dmName]: !prev[dm.dmId || dm.dmName]
                    }))}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      {isDMOpen
                        ? <ChevronDown size={16} className="text-gray-400" />
                        : <ChevronRight size={16} className="text-gray-400" />
                      }
                      <div className="w-8 h-8 bg-yellow-100 rounded-xl
                                      flex items-center justify-center">
                        <span className="text-yellow-700 font-black text-xs">DM</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">
                        {dm.dmName.split('(')[0].trim()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {dm.dmName.match(/\(([^)]+)\)/)?.[1] || ''} · {dm.mrs.length} MR{dm.mrs.length > 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* DM Summary Stats */}
                    <div className="hidden md:grid grid-cols-6 gap-4 text-right shrink-0">
                      {[
                        { label: 'Sales Units',   val: dmTotSU.toLocaleString(undefined,{maximumFractionDigits:0}), cls: 'text-gray-900' },
                        { label: 'Target Units',  val: dmTotTU.toLocaleString(undefined,{maximumFractionDigits:0}), cls: 'text-gray-500' },
                        { label: 'Units %',       val: `${dmURatio.toFixed(2)}%`, cls: dmURatio>=80?'text-green-600':dmURatio>=50?'text-amber-600':'text-red-600' },
                        { label: 'Value Ach',     val: `${dmVRatio.toFixed(2)}%`, cls: dmVRatio>=80?'text-green-600':dmVRatio>=50?'text-amber-600':'text-red-600' },
                        { label: 'Sales Pts',     val: dmTotSP.toLocaleString(undefined,{maximumFractionDigits:0}), cls: 'text-purple-700' },
                        { label: 'Points Ach',    val: `${dmPRatio.toFixed(2)}%`, cls: dmPRatio>=80?'text-green-600':dmPRatio>=50?'text-amber-600':'text-red-600' },
                      ].map((s,i) => (
                        <div key={i}>
                          <p className="text-[8px] font-black text-gray-400
                                        uppercase tracking-widest">{s.label}</p>
                          <p className={`font-black text-xs tabular-nums ${s.cls}`}>{s.val}</p>
                        </div>
                      ))}
                    </div>
                  </button>

                  {/* DM Expanded: MR Rows */}
                  {isDMOpen && (
                    <div className="border-t border-gray-100 bg-white">
                      {dmMRs.map((mr, mrIdx) => {
                        const mrTotSV  = Object.values(mr.products).reduce((s,p) => s + p.salesValue,  0);
                        const mrTotTV  = Object.values(mr.products).reduce((s,p) => s + p.targetValue,  0);
                        const mrTotSU  = Object.values(mr.products).reduce((s,p) => s + p.salesUnit,   0);
                        const mrTotTU  = Object.values(mr.products).reduce((s,p) => s + p.targetUnit,  0);
                        const mrTotSP  = Object.values(mr.products).reduce((s,p) => s + p.salesPoints,  0);
                        const mrTotTP  = Object.values(mr.products).reduce((s,p) => s + p.targetPoints, 0);
                        const mrVRatio = mrTotTV > 0 ? (mrTotSV / mrTotTV) * 100 : 0;
                        const mrPRatio = mrTotTP > 0 ? (mrTotSP / mrTotTP) * 100 : 0;
                        const mrURatio = mrTotTU > 0 ? (mrTotSU / mrTotTU) * 100 : 0;
                        const mrKey    = mr.mrId || mr.mrName;
                        const isMROpen = expandedMRs[mrKey];
                        const mrProducts = Object.values(mr.products);

                        return (
                          <div key={mrKey}
                            className={mrIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>

                            {/* MR Row */}
                            <button
                              className="w-full flex items-center gap-4 px-5 py-3
                                         hover:bg-blue-50/30 transition-colors text-left"
                              onClick={() => setExpandedMRs(prev => ({
                                ...prev, [mrKey]: !prev[mrKey]
                              }))}
                            >
                              <div className="flex items-center gap-2 shrink-0 pl-8">
                                {isMROpen
                                  ? <ChevronDown size={14} className="text-gray-400" />
                                  : <ChevronRight size={14} className="text-gray-400" />
                                }
                                <div className="w-7 h-7 bg-blue-100 rounded-lg
                                                flex items-center justify-center">
                                  <span className="text-blue-700 font-black text-[9px]">MR</span>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-black text-gray-800 text-xs truncate">
                                  {mr.mrName.split('(')[0].trim()}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold">
                                  {mr.mrName.match(/\(([^)]+)\)/)?.[1] || ''} · {mrProducts.length} products
                                </p>
                              </div>

                              {/* MR Stats */}
                              <div className="hidden md:grid grid-cols-6 gap-4 text-right shrink-0">
                                {[
                                  { val: mrTotSU.toLocaleString(undefined,{maximumFractionDigits:0}), cls: 'text-gray-900' },
                                  { val: mrTotTU.toLocaleString(undefined,{maximumFractionDigits:0}), cls: 'text-gray-500' },
                                  { val: `${mrURatio.toFixed(2)}%`, cls: mrURatio>=80?'text-green-600':mrURatio>=50?'text-amber-600':'text-red-600' },
                                  { val: `${mrVRatio.toFixed(2)}%`, cls: mrVRatio>=80?'text-green-600':mrVRatio>=50?'text-amber-600':'text-red-600' },
                                  { val: mrTotSP.toLocaleString(undefined,{maximumFractionDigits:0}), cls: 'text-purple-700' },
                                  { val: `${mrPRatio.toFixed(2)}%`, cls: mrPRatio>=80?'text-green-600':mrPRatio>=50?'text-amber-600':'text-red-600' },
                                ].map((s,i) => (
                                  <p key={i} className={`font-black text-xs tabular-nums h-full flex items-center justify-end ${s.cls}`}>
                                    {s.val}
                                  </p>
                                ))}
                              </div>
                            </button>

                            {/* MR Expanded: Product Table */}
                            {isMROpen && (
                              <div className="px-5 pb-4 overflow-x-auto bg-white">
                                <table className="w-full text-xs mt-2">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      {['#','Product','Sales Units','Target Units',
                                        'Units Ach %','Sales Value','Target Value',
                                        'Value Ach %','Sales Points','Target Points',
                                        'Points Ach %'
                                      ].map((h,i) => (
                                        <th key={h}
                                          className={`pb-2 text-[8px] font-black text-gray-400
                                                     uppercase tracking-widest whitespace-nowrap
                                                     ${i > 1 ? 'text-right' : 'text-left'}`}>
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {mrProducts.map((p, pi) => {
                                      const vR = p.targetValue  > 0 ? (p.salesValue  / p.targetValue)  * 100 : 0;
                                      const pR = p.targetPoints > 0 ? (p.salesPoints / p.targetPoints) * 100 : 0;
                                      const uR = p.targetUnit   > 0 ? (p.salesUnit   / p.targetUnit)   * 100 : 0;
                                      return (
                                        <tr key={p.productCode}
                                          className={`${pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                                                     border-b border-gray-50
                                                     hover:bg-yellow-50/30 transition-colors`}>
                                          <td className="py-2 pr-2 text-gray-300 font-mono text-[9px]">
                                            {pi + 1}
                                          </td>
                                          <td className="py-2 pr-4 font-bold text-gray-800
                                                         text-[10px] min-w-[160px] leading-tight">
                                            {p.productName}
                                          </td>
                                          <td className="py-2 px-2 text-right font-bold
                                                         tabular-nums text-gray-900">
                                            {p.salesUnit.toLocaleString(undefined,{maximumFractionDigits:0})}
                                          </td>
                                          <td className="py-2 px-2 text-right font-bold
                                                         tabular-nums text-gray-500">
                                            {p.targetUnit.toLocaleString(undefined,{maximumFractionDigits:0})}
                                          </td>
                                          <td className="py-2 px-2 text-right">
                                            <AchBadge pct={uR} />
                                          </td>
                                          <td className="py-2 px-2 text-right font-bold
                                                         tabular-nums text-gray-900">
                                            {p.salesValue.toLocaleString(undefined,{maximumFractionDigits:0})}
                                          </td>
                                          <td className="py-2 px-2 text-right font-bold
                                                         tabular-nums text-gray-500">
                                            {p.targetValue.toLocaleString(undefined,{maximumFractionDigits:0})}
                                          </td>
                                          <td className="py-2 px-2 text-right">
                                            <AchBadge pct={vR} />
                                          </td>
                                          <td className="py-2 px-2 text-right font-bold
                                                         tabular-nums text-purple-700">
                                            {p.salesPoints.toLocaleString(undefined,{maximumFractionDigits:0})}
                                          </td>
                                          <td className="py-2 px-2 text-right font-bold
                                                         tabular-nums text-gray-500">
                                            {p.targetPoints.toLocaleString(undefined,{maximumFractionDigits:0})}
                                          </td>
                                          <td className="py-2 px-2 text-right">
                                            <AchBadge pct={pR} />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trend Analysis Section */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-gray-950 uppercase tracking-tight text-xs flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-yellow-600" />
                  Performance Trend Intelligence
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Historical period analysis over all uploaded report files</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Metric Selector */}
                <select
                  value={trendMetric}
                  onChange={e => setTrendMetric(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none focus:border-yellow-400"
                >
                  <option value="salesValue">Value (EGP)</option>
                  <option value="salesUnit">Units</option>
                  <option value="salesPoints">Points</option>
                </select>

                {/* GroupBy Selector */}
                <select
                  value={trendGroupBy}
                  onChange={e => setTrendGroupBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none focus:border-yellow-400"
                >
                  <option value="product">By Product</option>
                  <option value="mr">By Representative</option>
                </select>

                <button
                  onClick={() => setShowTrendChart(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer
                             ${showTrendChart
                               ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                               : 'bg-white text-gray-400 border-gray-200 hover:border-yellow-300'}`}
                >
                  {showTrendChart ? 'Hide Chart' : 'Show Chart'}
                </button>
              </div>
            </div>

            {showTrendChart && trendChartData ? (
              <div className="h-80 w-full bg-gray-50/50 rounded-2xl border border-gray-100 p-4 relative">
                {trendChartData.series && trendChartData.series.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendChartData.labels.map((label, labelIdx) => {
                        const point = { name: label };
                        trendChartData.series.forEach(serie => {
                          point[serie.name] = serie.values[labelIdx] || 0;
                        });
                        return point;
                      })}
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={8} fontWeight="bold" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                        iconType="circle"
                      />
                      {trendChartData.series.map((serie, sIdx) => {
                        const colors = [
                          '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
                          '#ec4899', '#06b6d4', '#14b8a6', '#6366f1',
                        ];
                        const color = colors[sIdx % colors.length];
                        return (
                          <Line
                            key={serie.name}
                            type="monotone"
                            dataKey={serie.name}
                            stroke={color}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 1, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[10px] font-bold text-gray-400">No data available to display</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

        </div>
      )}

      {/* ── STEP 3 — FORECAST ── */}
      {forecastStep === 'forecast' && forecastData && (
        <div className="space-y-4">

          {/* Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setForecastStep('review')}
              className="flex items-center gap-2 text-[10px] font-black
                         uppercase tracking-widest text-gray-400
                         hover:text-gray-950 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} /> Back to Review
            </button>
          </div>

          {/* Sliding Filter Panel Toggle Button */}
          <button
            onClick={() => setShowForecastFilters(prev => !prev)}
            className="fixed top-1/2 -translate-y-1/2 z-[300] transition-all duration-300 flex items-center justify-center w-8 h-10 bg-gray-950 text-white rounded-r-xl hover:bg-yellow-400 hover:text-gray-950 shadow-md cursor-pointer"
            style={{ left: showForecastFilters ? '288px' : '0px' }}
          >
            {showForecastFilters ? <ChevronLeft size={16} /> : <SlidersHorizontal size={16} />}
          </button>

          {/* Left-Right Split Panel Layout */}
          <div className="flex gap-4 items-start relative select-none w-full">

            {/* LEFT PANEL: Sliding Drawer Control Panel */}
            <div className={`transition-all duration-300 shrink-0 overflow-y-auto no-scrollbar
                             ${showForecastFilters ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
                 style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-5 space-y-5">
                <div>
                  <h4 className="font-extrabold text-gray-950 text-xs uppercase tracking-tight flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-yellow-600" />
                    Forecast Controls
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5"> Adjust parameters and constraints instantly </p>
                </div>

                {/* Quarter Selection */}
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">
                    Forecast Target Quarter
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                      <button
                        key={q}
                        onClick={() => setForecastQuarter(q)}
                        className={`py-2 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer
                          ${forecastQuarter === q
                            ? 'bg-yellow-400 border-yellow-400 text-gray-900 font-extrabold'
                            : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Achievement Goal Input */}
                <div className="space-y-1.5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-0.5">
                      Achievement Goal %
                    </label>
                    <span className="font-mono text-xs font-black text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                      {forecastTargetPct}%
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={150} step={5}
                    value={forecastTargetPct}
                    onChange={e => setForecastTargetPct(+e.target.value)}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                  />
                  <div className="flex justify-between text-[8px] text-gray-400 font-bold px-0.5">
                    <span onClick={() => setForecastTargetPct(80)} className="cursor-pointer hover:text-gray-900">80%</span>
                    <span onClick={() => setForecastTargetPct(100)} className="cursor-pointer hover:text-gray-900 font-black font-extrabold">100% (Full)</span>
                    <span onClick={() => setForecastTargetPct(120)} className="cursor-pointer hover:text-gray-950 font-bold">120%</span>
                  </div>
                </div>

                {/* Target Mode Toggle */}
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">
                    Forecast Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {[
                      { key: 'units',      label: 'Units-Based' },
                      { key: 'percentage', label: 'Value-Based' },
                    ].map(m => (
                      <button
                        key={m.key}
                        onClick={() => setForecastMode(m.key)}
                        className={`py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer
                          ${forecastMode === m.key
                            ? 'bg-white text-gray-950 shadow-sm border border-gray-100 font-extrabold'
                            : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus Period Simulation Selection */}
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block pl-0.5">
                    Focus Period (Simulation)
                  </label>
                  <select
                    value={forecastPeriodIdx}
                    onChange={e => setForecastPeriodIdx(+e.target.value)}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 outline-none focus:border-yellow-300 transition-all cursor-pointer"
                  >
                    {Array.from({ length: 9 }).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Period {idx + 1} (Days {idx * 10 + 1}-{Math.min((idx + 1) * 10, 90)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Ten 10-Day Period Pills */}
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">
                    Interactive 10-Day Blocks
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 9 }).map((_, idx) => {
                      const isPast = quarterInfo ? (idx < quarterInfo.elapsed10Days) : false;
                      const isCurrent = quarterInfo ? (idx === quarterInfo.elapsed10Days) : false;
                      const isSelected = forecastPeriodIdx === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setForecastPeriodIdx(idx)}
                          className={`py-1 text-[9px] font-black rounded-lg transition-all flex flex-col items-center justify-center border cursor-pointer
                            ${isSelected
                              ? 'bg-yellow-400 border-yellow-400 text-gray-900 font-extrabold shadow-sm'
                              : isCurrent
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-extrabold animate-pulse'
                                : isPast
                                  ? 'bg-green-50/50 border-green-100 text-green-600 opacity-60 font-medium'
                                  : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                          <span>P{idx+1}</span>
                          <span className="text-[6.5px] font-normal leading-tight opacity-75">
                            {idx*10+1}-{Math.min((idx+1)*10, 90)}d
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── MANUAL OVERRIDES SECTION ── */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => setShowManualEditor(prev => !prev)}
                    className="w-full flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-700 transition-colors cursor-pointer pl-0.5"
                  >
                    <span>Manual Forecast overrides</span>
                    {showManualEditor ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showManualEditor && (
                    <div className="mt-3 space-y-3 bg-gray-50/25 border border-gray-100 rounded-2xl p-3 max-h-56 overflow-y-auto no-scrollbar">
                      {forecastData.allProducts.map(p => {
                        const mVal = manualForecast[p.productCode];
                        const ph = forecastResults?.[p.productCode]?.forecastUnitsPerPeriod?.toFixed(0) || '0';
                        return (
                          <div key={p.productCode} className="space-y-1">
                            <span className="text-[8px] font-black text-gray-700 leading-tight block truncate" title={p.productName}>
                              {p.productName}
                            </span>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={`Ph: ${ph}`}
                                value={forecastMode === 'units' ? (mVal?.units ?? '') : (mVal?.pct ?? '')}
                                onChange={e => {
                                  const raw = e.target.value;
                                  const parsed = raw === '' ? undefined : +raw;
                                  setManualForecast(prev => ({
                                    ...prev,
                                    [p.productCode]: parsed === undefined 
                                      ? undefined 
                                      : forecastMode === 'units' 
                                        ? { ...prev[p.productCode], units: parsed }
                                        : { ...prev[p.productCode], pct: parsed }
                                  }));
                                }}
                                className="w-full text-[10px] font-bold bg-white border border-gray-100 rounded-xl pl-3 pr-20 py-1.5 outline-none focus:border-yellow-400 transition-all text-right font-mono"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-gray-400 tracking-widest select-none pointer-events-none">
                                {forecastMode === 'units' ? 'Units/Per' : 'Target %'}
                              </span>
                              {mVal && (
                                <button
                                  onClick={() => {
                                    setManualForecast(prev => {
                                      const next = { ...prev };
                                      delete next[p.productCode];
                                      return next;
                                    });
                                  }}
                                  className="absolute right-[4px] top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-red-100"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Scenario MR Selector */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between pl-0.5 mb-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Representatives
                    </label>
                    <div className="flex gap-2 text-[8px] font-black uppercase tracking-wider">
                      <button
                        onClick={() => setForecastScenario(prev => ({ ...prev, selectedMRs: Object.keys(forecastData.mrMap) }))}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setForecastScenario(prev => ({ ...prev, selectedMRs: [] }))}
                        className="text-gray-400 hover:underline cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <input
                    type="text" placeholder="Search representatives..."
                    value={filterSearchMR}
                    onChange={e => setFilterSearchMR(e.target.value)}
                    className="w-full text-[9px] font-bold bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 mb-2 outline-none focus:border-yellow-400"
                  />
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1 border border-gray-50 p-2 rounded-xl bg-gray-50/25">
                    {forecastData.allMRs
                      .filter(m => m.mrName.toLowerCase().includes(filterSearchMR.toLowerCase()))
                      .map(mr => {
                        const checked = forecastScenario.selectedMRs.includes(mr.mrId || mr.mrName);
                        return (
                          <label key={mr.mrId || mr.mrName} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 rounded px-1 group transition-colors">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const key = mr.mrId || mr.mrName;
                                setForecastScenario(prev => ({
                                  ...prev,
                                  selectedMRs: checked
                                    ? prev.selectedMRs.filter(x => x !== key)
                                    : [...prev.selectedMRs, key]
                                }));
                              }}
                              className="accent-yellow-400 rounded"
                            />
                            <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 truncate">
                              {mr.mrName.split('(')[0].trim()}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Scenario Product Selector */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between pl-0.5 mb-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Products
                    </label>
                    <div className="flex gap-2 text-[8px] font-black uppercase tracking-wider">
                      <button
                        onClick={() => setForecastScenario(prev => ({ ...prev, selectedProducts: Object.keys(forecastData.productSummary) }))}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setForecastScenario(prev => ({ ...prev, selectedProducts: [] }))}
                        className="text-gray-400 hover:underline cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <input
                    type="text" placeholder="Search products..."
                    value={filterSearchProduct}
                    onChange={e => setFilterSearchProduct(e.target.value)}
                    className="w-full text-[9px] font-bold bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 mb-2 outline-none focus:border-yellow-400"
                  />
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1 border border-gray-50 p-2 rounded-xl bg-gray-50/25">
                    {forecastData.allProducts
                      .filter(p => p.productName.toLowerCase().includes(filterSearchProduct.toLowerCase()))
                      .map(p => {
                        const checked = forecastScenario.selectedProducts.includes(p.productCode);
                        return (
                          <label key={p.productCode} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 rounded px-1 group transition-colors">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setForecastScenario(prev => ({
                                  ...prev,
                                  selectedProducts: checked
                                    ? prev.selectedProducts.filter(x => x !== p.productCode)
                                    : [...prev.selectedProducts, p.productCode]
                                }));
                              }}
                              className="accent-yellow-400 rounded"
                            />
                            <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 truncate">
                              {p.productName}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT PANEL: Analytics Output Table Grid (SPAN 8) */}
            <div className="lg:col-span-8 space-y-4">
              {(() => {
                // Filter the selected MRs and calculate forecast rows
                const selectedMRObjs = forecastData.allMRs.filter(mr =>
                  forecastScenario.selectedMRs.includes(mr.mrId || mr.mrName)
                );

                // Group by DM District first to group our calculations nicely!
                const dmGroups = {};
                selectedMRObjs.forEach(mr => {
                  const dmKey = mr.dmId || mr.dmName || 'unknown_dm';
                  if (!dmGroups[dmKey]) {
                    const originalDM = forecastData.allDMs.find(d => d.dmId === mr.dmId || d.dmName === mr.dmName);
                    dmGroups[dmKey] = {
                      dmId:      mr.dmId,
                      dmName:    mr.dmName || originalDM?.dmName || 'Unknown District Manager',
                      mrs:       [],
                      products:  {}
                    };
                  }
                  dmGroups[dmKey].mrs.push(mr);
                });

                // Calculate calculations on a unified schema structure
                let grandCtVal  = 0;
                let grandFcVal  = 0;
                let grandCtPts  = 0;
                let grandFcPts  = 0;
                let grandGapVal = 0;

                // ── DYNAMIC COLUMN RECKONING ──
                // Calculates the cumulative count of active HTML table columns (colSpan values)
                // dynamically based on user toggle settings for "EGP Values" and "Points" column displays.
                // This ensures we always span across exactly the right number of headers under group sections,
                // successfully eliminating any "ReferenceError: activeColsCount is not defined" exceptions.
                const activeColsCount = 6 + (showValueCols ? 3 : 0) + (showPointsCols ? 1 : 0);

                const dmGroupsArr = Object.values(dmGroups).map(dm => {
                  const mrRows = [];
                  dm.mrs.forEach(mr => {
                    const mrProds = forecastScenario.selectedProducts
                      .map(code => mr.products[code])
                      .filter(Boolean);

                    const finalProductsArr = mrProds.map(p => {
                      // Apply model target percentage calculation
                      const targetModifier = forecastTargetPct / 100;
                      
                      // Calculation logic matching EVA Pharma standard
                      let forecastUnits = 0;
                      if (forecastMode === 'units') {
                        forecastUnits = p.targetUnit * targetModifier;
                      } else {
                        // Value based: scale target value to obtain units
                        const targetValModified = p.targetValue * targetModifier;
                        forecastUnits = p.unitPrice > 0 ? (targetValModified / p.unitPrice) : 0;
                      }

                      // Adjust for active period simulation
                      const periodMultiplier = (forecastPeriodIdx + 1) / 9; // fraction of quarter
                      forecastUnits *= periodMultiplier;

                      const forecastValue  = forecastUnits * (p.unitPrice || 0);
                      const forecastPoints = forecastUnits * (p.pointRate || 0);
                      const gap            = forecastUnits - p.salesUnit;
                      const gapValue       = gap * (p.unitPrice || 0);

                      // Accumulate totals
                      grandCtVal  += p.salesValue;
                      grandFcVal  += forecastValue;
                      grandCtPts  += p.salesPoints;
                      grandFcPts  += forecastPoints;
                      grandGapVal += gapValue;

                      return {
                        ...p,
                        forecastUnits:  Math.round(forecastUnits),
                        forecastValue,
                        forecastPoints,
                        gap:            Math.round(gap),
                        gapValue,
                        currentAchPct:  p.valueRatio,
                        forecastAchPct: p.targetValue > 0
                          ? (forecastValue / (p.targetValue * periodMultiplier)) * 100
                          : 0
                      };
                    });

                    mrRows.push({
                      mrId:    mr.mrId,
                      mrName:  mr.mrName,
                      mrsProductsCalculated: finalProductsArr
                    });
                  });

                  return {
                    ...dm,
                    mrsCalculations: mrRows
                  };
                });

                return (
                  <div className="space-y-4">

                    {/* Simulation Summary Ribbon */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Current Sales Value',   val: grandCtVal,   color: 'text-gray-900',  bg: 'bg-white' },
                        { label: 'Forecasted Target',    val: grandFcVal,   color: 'text-blue-700',  bg: 'bg-blue-50/60' },
                        { label: 'Variance Gap Amount',   val: grandGapVal,  color: grandGapVal > 0 ? 'text-red-600' : 'text-green-600', bg: grandGapVal > 0 ? 'bg-red-50' : 'bg-green-50' },
                        { label: 'Current Total Points',  val: grandCtPts,   color: 'text-gray-900',  bg: 'bg-white' },
                        { label: 'Forecasted Points',     val: grandFcPts,   color: 'text-purple-700',bg: 'bg-purple-50/60 font-black' },
                      ].map((k,i) => (
                        <div key={i} className={`rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1 ${k.bg}`}>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
                          <p className={`text-base font-black ${k.color} tabular-nums leading-none mt-1`}>
                            {k.val.toLocaleString(undefined,{maximumFractionDigits:0})} EGP
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Unified Multi-level Grouped Forecaster Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-t-4 border-gray-950">
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h4 className="font-extrabold text-gray-950 uppercase tracking-tight text-xs">
                            Grouped District Projections ({forecastQuarter})
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-0.5"> Grouped by Manager (DM) → Medical Rep (MR) → Product Calculations </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Column Visibility Toggle Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowValueCols(prev => !prev)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                                         text-[9px] font-black uppercase tracking-widest
                                         transition-all border cursor-pointer
                                         ${showValueCols
                                           ? 'bg-blue-600 text-white border-blue-600 font-extrabold'
                                           : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300 font-bold'}`}
                            >
                              {showValueCols ? <Eye size={11} /> : <EyeOff size={11} />}
                              Values
                            </button>
                            <button
                              onClick={() => setShowPointsCols(prev => !prev)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                                         text-[9px] font-black uppercase tracking-widest
                                         transition-all border cursor-pointer
                                         ${showPointsCols
                                           ? 'bg-purple-600 text-white border-purple-600 font-extrabold'
                                           : 'bg-white text-gray-400 border-gray-200 hover:border-purple-300 font-bold'}`}
                            >
                              {showPointsCols ? <Eye size={11} /> : <EyeOff size={11} />}
                              Points
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              // Unified EVA Pharma CSV Export Structure
                              const headers = 'DM,MR,Product Code,Product Name,Current Units,Current Value,Forecast Units,Forecast Value,Forecast Points,Gap,Gap Value,Current Ach%,Projected Ach%';
                              const rows = [];
                              dmGroupsArr.forEach(dg => {
                                const dmLabel = dg.dmName.split('(')[0].trim();
                                dg.mrsCalculations.forEach(m => {
                                  const mrLabel = m.mrName.split('(')[0].trim();
                                  m.mrsProductsCalculated.forEach(p => {
                                    rows.push(`"${dmLabel}","${mrLabel}","${p.productCode}","${p.productName}",${p.salesUnit},${p.salesValue.toFixed(0)},${p.forecastUnits},${p.forecastValue.toFixed(0)},${p.forecastPoints.toFixed(0)},${p.gap},${p.gapValue.toFixed(0)},${p.currentAchPct.toFixed(2)},${p.forecastAchPct.toFixed(2)}`);
                                  });
                                });
                              });
                              const blob = new Blob([headers+'\n'+rows.join('\n')],{type:'text/csv'});
                              const a    = document.createElement('a');
                              a.href     = URL.createObjectURL(blob);
                              a.setAttribute('download',`EVA_Pharma_Forecast_${forecastQuarter}_P${forecastPeriodIdx+1}.csv`);
                              a.click();
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-gray-950 transition-all cursor-pointer"
                          >
                            <Download size={11} /> Export Forecast Data
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[60vh] overflow-auto">
                        <table className="w-full text-xs box-border">
                          {/* Table Header schema */}
                          <thead className="sticky top-0 bg-gray-950 text-white border-b border-gray-800 z-10 shadow-sm">
                            <tr>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-left">DM / Rep / Product</th>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Current Units</th>
                              {showValueCols && (
                                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Current Value</th>
                              )}
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Forecast Units</th>
                              {showValueCols && (
                                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Forecast Value</th>
                              )}
                              {showPointsCols && (
                                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Forecast Points</th>
                              )}
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Gap</th>
                              {showValueCols && (
                                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Gap Value</th>
                              )}
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Current Ach</th>
                              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-right">Forecast Ach</th>
                            </tr>
                          </thead>

                          {/* Grouped Body */}
                          <tbody className="divide-y divide-gray-150">
                            {dmGroupsArr.map((dg, dgIdx) => {
                              const dmLabel = dg.dmName.split('(')[0].trim();
                              const dmSub = dg.dmName.match(/\(([^)]+)\)/)?.[1] || 'Main Line';
                              return (
                                <React.Fragment key={dgIdx}>
                                  {/* DM Header Row Accent */}
                                  <tr className="bg-yellow-400/10 font-bold">
                                    <td colSpan={activeColsCount} className="px-3 py-2 text-[10px] text-gray-900 border-l-[3px] border-yellow-400 font-extrabold uppercase tracking-widest">
                                      District: {dmLabel} <span className="text-gray-500 font-medium ml-2 text-[8px] uppercase">({dmSub})</span>
                                    </td>
                                  </tr>

                                  {dg.mrsCalculations.map((m, mIdx) => {
                                    const mrLabel = m.mrName.split('(')[0].trim();
                                    return (
                                      <React.Fragment key={mIdx}>
                                        {/* MR Subheader Row */}
                                        <tr className="bg-blue-50/30 text-gray-800 font-semibold">
                                          <td colSpan={activeColsCount} className="px-5 py-1 text-[9px] pl-6 font-extrabold">
                                            <span className="text-blue-700">{mrLabel}</span> · {m.mrsProductsCalculated.length} projection segments
                                          </td>
                                        </tr>

                                        {/* Product Calculation Rows */}
                                        {m.mrsProductsCalculated.map((p, pi) => (
                                          <tr key={pi} className={`${pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-yellow-50/20 transition-colors`}>
                                            <td className="px-3 py-2 pl-10">
                                              <p className="font-extrabold text-gray-900 text-[10px] leading-tight">{p.productName}</p>
                                              <p className="text-[8px] text-violet-600 font-mono mt-0.5">{p.productCode}</p>
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                                              {p.salesUnit.toLocaleString()}
                                            </td>
                                            {showValueCols && (
                                              <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                                                {p.salesValue.toLocaleString(undefined,{maximumFractionDigits:0})} EGP
                                              </td>
                                            )}
                                            <td className="px-3 py-2 text-right font-black tabular-nums text-blue-700 bg-blue-50/30">
                                              {p.forecastUnits.toLocaleString()}
                                            </td>
                                            {showValueCols && (
                                              <td className="px-3 py-2 text-right font-black tabular-nums text-blue-700 bg-blue-50/30">
                                                {p.forecastValue.toLocaleString(undefined,{maximumFractionDigits:0})}
                                              </td>
                                            )}
                                            {showPointsCols && (
                                              <td className="px-3 py-2 text-right font-extrabold tabular-nums text-purple-700 bg-purple-50/30">
                                                {p.forecastPoints.toLocaleString(undefined,{maximumFractionDigits:0})}
                                              </td>
                                            )}
                                            <td className={`px-3 py-2 text-right font-black tabular-nums ${p.gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                              {p.gap > 0 ? '+' : ''}{p.gap.toLocaleString()}
                                            </td>
                                            {showValueCols && (
                                              <td className={`px-3 py-2 text-right font-black tabular-nums ${p.gapValue > 0 ? 'text-red-700' : 'text-green-600'}`}>
                                                {p.gapValue > 0 ? '+' : ''}{p.gapValue.toLocaleString(undefined,{maximumFractionDigits:0})}
                                              </td>
                                            )}
                                            <td className="px-3 py-2 text-right">
                                              <AchBadge pct={p.currentAchPct} />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              <AchBadge pct={p.forecastAchPct} />
                                            </td>
                                          </tr>
                                        ))}
                                      </React.Fragment>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>

        </div>
      )}

      {/* ── REPORT PERIOD CONFIGURATION MODAL ── */}
      {showDateModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 max-w-md w-full space-y-5">
            <div>
              <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center mb-3">
                <Calendar size={20} className="text-yellow-600" />
              </div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                Define Sales Report Period
              </h3>
              <p className="text-xs text-gray-400 mt-1"> Enter the active duration dates for the loaded report file </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-1">
                  Quarter Label/Identifier
                </label>
                <input
                  type="text" value={forecastQuarter}
                  onChange={e => setForecastQuarter(e.target.value)}
                  placeholder="e.g. Q1-2026, Apr-May"
                  className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-yellow-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date" value={uploadDateFrom}
                    onChange={e => setUploadDateFrom(e.target.value)}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-yellow-400 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date" value={uploadDateTo}
                    onChange={e => setUploadDateTo(e.target.value)}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-yellow-400 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Error banner within modal */}
            {forecastError && (
              <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
                {forecastError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDateModal(false);
                  setPendingFile(null);
                  setUploadDateFrom('');
                  setUploadDateTo('');
                  setForecastError('');
                }}
                className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!pendingFile) return;
                  if (!uploadDateFrom || !uploadDateTo || !forecastQuarter) {
                    setForecastError('Please enter start date, end date, and quarter label.');
                    return;
                  }
                  setShowDateModal(false);
                  parseForecastFile(pendingFile, {
                    dateFrom: uploadDateFrom,
                    dateTo:   uploadDateTo,
                    quarter:  forecastQuarter
                  });
                }}
                className="flex-1 py-3 text-[10px] font-black text-gray-900 bg-yellow-400 rounded-xl hover:bg-yellow-300 transition-all uppercase tracking-widest"
              >
                Submit & Parse File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesForecastTool;
