import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import CSVUploader from '../../components/shared/CSVUploader';
import AutoInsights from '../../components/shared/AutoInsights.jsx';
import VirtualTable from '../../components/shared/VirtualTable';
import { generateInsights } from '../../utils/insightGenerator';
import { calculateMRStats, calculateKPICards } from '../../utils/mrCalculations';
import { safeFormatDate, safeGetDayName } from '../../utils/dateHelpers';

// Sub-components
import TargetSettingsPanel from './TargetSettingsPanel';
import MRCardsGrid from './MRCardsGrid';
import ForecastTool from './ForecastTool';
import TeamOverviewTable from './TeamOverviewTable';
import InteractionAnalysis from './InteractionAnalysis';
import CoachingAnalysis from './CoachingAnalysis';
import InlineCalendar from './InlineCalendar';

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
        {value}
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

const CallDetailingAnalyzer = () => {
  const [rawData, setRawData] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [targets, setTargets] = useState({ hcpPerDay: 0, hcoPerDay: 0, phPerDay: 0 });
  const [selectedMRForCalendar, setSelectedMRForCalendar] = useState(null);
  const [activeTab, setActiveTab] = useState('section-performance');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("All"); // All, HCP, HCO, Pharmacy
  const [onlyCoached, setOnlyCoached] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

  useEffect(() => {
    if (minDate && maxDate && !dateFrom) {
      setDateFrom(minDate);
      setDateTo(maxDate);
    }
  }, [minDate, maxDate]);

  const handleDataLoaded = useCallback((data) => {
    setRawData(data);
    setIsUploadModalOpen(false);
    if (data.length === 0) {
       setSelectedMRForCalendar(null);
       // Clear tool cache
       localStorage.removeItem('datalens_csv_cache_call_detailing');
    }
  }, []);

  const handleFullPeriod = () => {
    setDateFrom(minDate);
    setDateTo(maxDate);
  };

  const filteredData = useMemo(() => {
    if (!rawData.length) return [];
    return rawData.filter(d => {
      const date = d.ReportDate;
      if (date < dateFrom || date > dateTo) return false;
      return true;
    });
  }, [rawData, dateFrom, dateTo]);

  const mrStats = useMemo(() => calculateMRStats(filteredData), [filteredData]);
  const metrics = useMemo(() => calculateKPICards(mrStats), [mrStats]);
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

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveTab(id);
  };

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 }); 

    ['section-performance', 'section-insights', 'section-forecast', 'section-search', 'section-datatable'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredData.length]);

  const formatDateBanner = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const hasData = rawData.length > 0;

  return (
    <div className="space-y-6 pb-24 relative max-w-7xl mx-auto px-4">
      
      {/* 2. UPLOAD BANNER / DROPZONE */}
      {!hasData ? (
        <div className="py-12">
          <CSVUploader onDataLoaded={handleDataLoaded} toolName="Call Detailing" />
        </div>
      ) : (
        <div className="bg-white border-2 border-accent/20 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-2xl">📂</div>
              <div>
                 <h3 className="font-black text-gray-900 uppercase tracking-tight">CallDetailingReport.csv</h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{rawData.length.toLocaleString()} rows uploaded today</p>
              </div>
           </div>
           <div className="flex gap-2">
              <button 
                onClick={() => handleDataLoaded([])}
                className="px-6 py-2.5 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-colors"
              >
                Clear Data
              </button>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg"
              >
                Upload New File
              </button>
           </div>
        </div>
      )}

      {/* UPLOAD MODAL OVERLAY */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl relative shadow-2xl animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
              >
                <X size={24}/>
              </button>
              <div className="mb-8">
                 <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Upload <span className="text-accent underline decoration-accent/20">Interactions</span></h2>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Select a new CSV export to analyze</p>
              </div>
              <CSVUploader onDataLoaded={handleDataLoaded} toolName="Call Detailing" />
              <div className="mt-6 text-center">
                 <button 
                   onClick={() => setIsUploadModalOpen(false)}
                   className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                 >
                   Cancel and return to dashboard
                 </button>
              </div>
           </div>
        </div>
      )}

      {hasData && (
        <>
          {/* 3. PERIOD BANNER */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute right-0 top-0 w-64 h-64 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-accent/20 transition-all duration-700"></div>
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">📅 Report Period</p>
                   <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                      {formatDateBanner(minDate)} <span className="text-accent">→</span> {formatDateBanner(maxDate)}
                   </h2>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/5 text-right">
                   <p className="text-2xl font-black leading-none">{Math.ceil((new Date(maxDate) - new Date(minDate)) / (1000*60*60*24)) + 1} <span className="text-xs text-gray-400 uppercase">Days</span></p>
                   <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">{rawData.length.toLocaleString()} Interactions</p>
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
                <button 
                   onClick={handleFullPeriod}
                   className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-gray-200 hover:bg-white transition-colors"
                >
                   Full Period
                </button>
             </div>
          </div>

          {/* 5. STICKY TAB BAR */}
          <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl -mx-4 px-4 py-2 border-b border-gray-200 shadow-sm flex items-center justify-between overflow-x-auto custom-scrollbar">
             <div className="flex gap-1 md:gap-4 min-w-max">
                {[
                  { id: 'section-performance', label: 'Performance', icon: '📊' },
                  { id: 'section-insights', label: 'Insights', icon: '🤖' },
                  { id: 'section-forecast', label: 'Forecast', icon: '📈' },
                  { id: 'section-search', label: 'Search', icon: '🔍' },
                  { id: 'section-datatable', label: 'Data', icon: '📋' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => scrollToSection(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      activeTab === tab.id 
                        ? 'bg-accent text-black shadow-lg scale-105' 
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
             </div>
          </div>

          {/* 6. KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard title="Coaching Days" value={metrics.coachingDays} sub={`${metrics.coachingMRs} active coaches`} icon="🎓" color="#F5C518" />
            <KPICard title="HCO Rate" value={metrics.avgHCORate} unit="/d" sub={`Across ${metrics.hcoMRCount} MRs`} icon="🏥" color="#10B981" />
            <KPICard title="HCP Rate" value={metrics.avgHCPRate} unit="/d" sub={`Across ${metrics.hcpMRCount} MRs`} icon="👨‍⚕️" color="#3B82F6" />
            <KPICard title="PH Rate" value={metrics.avgPHRate} unit="/d" sub={`Across ${metrics.phMRCount} MRs`} icon="💊" color="#8B5CF6" />
            <KPICard title="Active MRs" value={metrics.activeMRs} sub="Unique field force" icon="👥" color="#F59E0B" />
          </div>

          {/* 7. TARGET PANEL */}
          <TargetSettingsPanel data={rawData} dateFrom={dateFrom} dateTo={dateTo} onTargetsChange={setTargets} />

          {/* 8-9. PERFORMANCE SECTION */}
          <div id="section-performance" className="scroll-mt-24 pt-8">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Performance <span className="text-accent underline decoration-accent/20">Analysis</span></h2>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Field force efficiency & call rates</p>
                </div>
             </div>
             <MRCardsGrid mrStats={mrStats} targets={targets} onSelectMRForCalendar={setSelectedMRForCalendar} />
          </div>

          {/* 10. INLINE CALENDAR */}
          {selectedMRForCalendar && (
            <div className="animate-in zoom-in-95 duration-300">
               <InlineCalendar 
                  mr={selectedMRForCalendar} 
                  targets={targets} 
                  onClose={() => setSelectedMRForCalendar(null)} 
               />
            </div>
          )}

          {/* 11. INSIGHTS SECTION */}
          <div id="section-insights" className="scroll-mt-24 pt-8">
             <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Auto <span className="text-accent underline decoration-accent/20">Insights</span></h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">AI-Powered trend detection</p>
             </div>
             <AutoInsights insights={insights} />
          </div>

          {/* 12. FORECAST SECTION */}
          <div id="section-forecast" className="scroll-mt-24 pt-8">
             <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Growth <span className="text-accent underline decoration-accent/20">Forecast</span></h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Predictive achievement modeling</p>
             </div>
             <ForecastTool data={filteredData} targets={targets} mrStats={mrStats} />
          </div>

          {/* 13. GLOBAL SEARCH SECTION */}
          <div id="section-search" className="scroll-mt-24 pt-8">
             <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="mb-8">
                   <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Global <span className="text-accent underline decoration-accent/20">Discovery</span></h2>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Instant visit lookup across entire team</p>
                </div>

                <div className="flex flex-col gap-6">
                   <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
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
                        <button
                          key={f}
                          onClick={() => setSearchFilter(f)}
                          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                            searchFilter === f ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                      <div className="w-[2px] h-6 bg-gray-100 mx-2"></div>
                      <button
                        onClick={() => setOnlyCoached(!onlyCoached)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          onlyCoached ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                        }`}
                      >
                         🎓 Coached Only
                      </button>
                   </div>
                </div>

                {globalSearchResults.length > 0 ? (
                  <div className="mt-8 border-2 border-gray-50 rounded-[2rem] overflow-hidden">
                     <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{globalSearchResults.length} Results found</span>
                        <button onClick={() => {setGlobalSearch(""); setOnlyCoached(false); setSearchFilter("All")}} className="text-[10px] font-black text-red-500 uppercase tracking-widest">Reset All</button>
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
                                      <td className="px-6 py-4 text-gray-500">{r.ReportDate.split("-").reverse().join("/")}</td>
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

          {/* 14-18. DATA SECTION */}
          <div id="section-datatable" className="scroll-mt-24 pt-8 space-y-12">
             <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Structured <span className="text-accent underline decoration-accent/20">Data</span></h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Consolidated reports & raw tables</p>
             </div>
             
             <TeamOverviewTable data={filteredData} targets={targets} mrStats={mrStats} />
             <InteractionAnalysis data={filteredData} />
             <CoachingAnalysis data={filteredData} />

             {/* Raw Data Table */}
             <details className="mt-12 bg-white border border-gray-200 shadow-sm rounded-[2.5rem] overflow-hidden group">
                <summary className="p-8 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors list-none">
                  <div className="flex items-center gap-4">
                     <span className="text-3xl">📋</span>
                     <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Raw Source Data</h3>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">High-performance virtualized rendering ({filteredData.length.toLocaleString()} rows)</p>
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
        </>
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
