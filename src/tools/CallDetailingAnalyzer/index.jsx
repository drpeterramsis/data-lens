import React, { useState, useMemo, useEffect } from 'react';
import CSVUploader from '../../components/shared/CSVUploader';
import SummaryCards from '../../components/shared/SummaryCards';
import FilterBar from '../../components/shared/FilterBar';
import DateRangeFilter from './DateRangeFilter';
import VirtualTable from '../../components/shared/VirtualTable';
import AutoInsights from '../../components/shared/AutoInsights.jsx';
import { generateInsights } from '../../utils/insightGenerator';
import { calculateMRStats, calculateKPICards } from '../../utils/csvAnalyzer';

// Sub-components
import TargetSettingsPanel from './TargetSettingsPanel';
import MRCardsGrid from './MRCardsGrid';
import ForecastTool from './ForecastTool';
import TeamOverviewTable from './TeamOverviewTable';
import InteractionAnalysis from './InteractionAnalysis';
import CoachingAnalysis from './CoachingAnalysis';

const CallDetailingAnalyzer = () => {
  const [rawData, setRawData] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [targets, setTargets] = useState({ hcpPerDay: 0, hcoPerDay: 0, phPerDay: 0 });

  const [filters, setFilters] = useState({
    search: '',
    mrName: 'All',
    interactionType: 'All',
    customerGrade: 'All',
    specialty: 'All',
    coaching: 'All',
  });

  const handleDataLoaded = (data) => {
    setRawData(data);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      mrName: 'All',
      interactionType: 'All',
      customerGrade: 'All',
      specialty: 'All',
      coaching: 'All',
    });
  };

  const filteredData = useMemo(() => {
    return rawData.filter(d => {
      // Global Search
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const match = [d.CustomerName, d.MrName, d.CustomerId, d.InteractionVisitedSite].some(val => val?.toString().toLowerCase().includes(s));
        if (!match) return false;
      }

      // Exact Filters
      if (filters.mrName !== 'All' && d.MrName !== filters.mrName) return false;
      if (filters.interactionType !== 'All' && d.InteractionType !== filters.interactionType) return false;
      if (filters.customerGrade !== 'All' && d.CustomerGrade !== filters.customerGrade) return false;
      if (filters.specialty !== 'All' && d.Specialty !== filters.specialty) return false;
      if (filters.coaching !== 'All' && d.IsMRCoachingSubmitted !== filters.coaching) return false;

      // Date Range
      if (dateFrom && d.ReportDate && d.ReportDate < dateFrom) return false;
      if (dateTo && d.ReportDate && d.ReportDate > dateTo) return false;

      return true;
    });
  }, [rawData, filters, dateFrom, dateTo]);

  const filterOptions = useMemo(() => {
    return {
      mrNames: [...new Set(rawData.map(d => d.MrName))].filter(Boolean).sort(),
      specialties: [...new Set(rawData.map(d => d.Specialty))].filter(Boolean).sort(),
      customerGrades: [...new Set(rawData.map(d => d.CustomerGrade))].filter(Boolean).sort()
    };
  }, [rawData]);

  const mrStats = useMemo(() => calculateMRStats(filteredData), [filteredData]);
  const metrics = useMemo(() => calculateKPICards(mrStats), [mrStats]);

  const insights = useMemo(() => generateInsights(filteredData, targets), [filteredData, targets]);

  const tableColumns = useMemo(() => [
    { header: 'ID', accessorKey: 'InteractionId', size: 100 },
    { header: 'MR Name', accessorKey: 'MrName', size: 180 },
    { header: 'Customer', accessorKey: 'CustomerName', size: 220 },
    { header: 'Type', accessorKey: 'InteractionType', size: 100 },
    { header: 'Date', accessorKey: 'ReportDate', size: 120 },
    { header: 'Grade', accessorKey: 'CustomerGrade', size: 80 },
    { header: 'Coached', accessorKey: 'IsMRCoachingSubmitted', size: 100 },
    { header: 'Specialty', accessorKey: 'Specialty', size: 150 },
    { header: 'Comment', accessorKey: 'Comment', size: 300 },
  ], []);

  // Update fixed tabs based on section visibility
  const [activeTab, setActiveTab] = useState('section-performance');

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' }); // bias towards top

    const sections = ['section-performance', 'section-insights', 'section-forecast', 'section-search', 'section-datatable'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredData.length]);

  const tabs = [
    { id: "section-performance", label: "Performance",  icon: "📊" },
    { id: "section-insights",   label: "Insights",     icon: "🤖" },
    { id: "section-forecast",   label: "Forecast",     icon: "📈" },
    { id: "section-search",     label: "Search",       icon: "🔍" },
    { id: "section-datatable",  label: "Data Table",   icon: "📋" },
  ];

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveTab(id);
  };

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (rawData.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic underline decoration-accent/40 decoration-8 underline-offset-4 pb-2">
            🔍 Call Detailing <span className="text-accent underline-none">Analyzer</span>
          </h2>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-2 ml-1">Deep Field Force Intelligence Portal</p>
        </div>
        <CSVUploader onDataLoaded={handleDataLoaded} toolName="Call Detailing" />
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-24 relative">
      {/* Header section with summaries */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-accent/10 rounded-lg text-accent">🔍</span>
              <h2 className="text-2xl font-black text-gray-900 uppercase">Call Detailing Analyzer</h2>
           </div>
           <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Global Field Operations Metrics ● Environment Live</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <CSVUploader onDataLoaded={(d) => { if(d && d.length>0) handleDataLoaded(d); }} />
        </div>
      </div>

      <DateRangeFilter 
        dateFrom={dateFrom} 
        dateTo={dateTo} 
        setDateFrom={setDateFrom} 
        setDateTo={setDateTo} 
        data={rawData} 
      />

      {/* STICKY TAB BAR */}
      <div className="sticky top-0 z-40 bg-white border-b-2 border-gray-200 shadow-sm mt-4 flex gap-4 overflow-x-auto p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => scrollToSection(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors ${
              activeTab === tab.id
                ? 'text-gray-900 font-bold border-b-4 border-yellow-400 bg-white'
                : 'text-gray-500 hover:bg-gray-50 font-medium'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <SummaryCards metrics={metrics} />
      
      <TargetSettingsPanel 
        data={rawData} 
        dateFrom={dateFrom} 
        dateTo={dateTo} 
        onTargetsChange={setTargets} 
      />

      <div id="section-performance" className="scroll-mt-24 pt-8">
         <MRCardsGrid data={filteredData} targets={targets} mrStats={mrStats} />
      </div>

      <div id="section-insights" className="scroll-mt-24 pt-8">
         <AutoInsights insights={insights} />
      </div>

      <div id="section-forecast" className="scroll-mt-24 pt-8">
         <ForecastTool data={filteredData} targets={targets} mrStats={mrStats} />
      </div>

      <div id="section-search" className="scroll-mt-24 pt-8">
         <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 mb-8">
           <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 mb-4">🔍 Customer & Visit Search</h3>
           <FilterBar 
              options={filterOptions} 
              filters={filters} 
              onFilterChange={handleFilterChange} 
              onReset={resetFilters}
              dataCount={filteredData.length}
           />
           {/* Detailed Table for Global Search results */}
           {filteredData.length > 0 && (
             <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
               <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                 <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Found {filteredData.length} matches</h4>
                 {/* Optional Export button could go here */}
               </div>
               <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                 <table className="w-full text-left text-xs whitespace-nowrap">
                   <thead className="bg-white border-b border-gray-200 sticky top-0 shadow-sm">
                     <tr className="text-[10px] uppercase font-black text-gray-400 bg-gray-50">
                       <th className="px-4 py-3 border-r border-gray-100">Customer Name</th>
                       <th className="px-4 py-3 border-r border-gray-100">Customer ID</th>
                       <th className="px-4 py-3 border-r border-gray-100">MR Name</th>
                       <th className="px-4 py-3 border-r border-gray-100">Line</th>
                       <th className="px-4 py-3 border-r border-gray-100">Visit Date</th>
                       <th className="px-4 py-3 border-r border-gray-100">Day</th>
                       <th className="px-4 py-3 border-r border-gray-100">Interaction Type</th>
                       <th className="px-4 py-3 border-r border-gray-100">Grade</th>
                       <th className="px-4 py-3 border-r border-gray-100">Specialty</th>
                       <th className="px-4 py-3 border-r border-gray-100">Coached?</th>
                       <th className="px-4 py-3 border-r border-gray-100">Coaching Type</th>
                       <th className="px-4 py-3">Comment</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 bg-white">
                     {filteredData.slice(0, 500).map((row, idx) => {
                       const isCoached = row.IsMRCoachingSubmitted?.toLowerCase() === 'true';
                       const type = row.InteractionType;
                       let bgClass = "hover:bg-gray-50";
                       if (isCoached) bgClass = "bg-yellow-50 hover:bg-yellow-100";
                       else if (type === 'HCP') bgClass = "bg-blue-50/30 hover:bg-blue-50";
                       else if (type === 'HCO') bgClass = "bg-green-50/30 hover:bg-green-50";
                       else if (type === 'Pharmacy') bgClass = "bg-purple-50/30 hover:bg-purple-50";

                       const dayName = row.ReportDate ? new Date(row.ReportDate).toLocaleDateString('en-US', { weekday: 'short' }) : '';

                       return (
                         <tr key={idx} className={`transition-colors ${bgClass}`}>
                           <td className="px-4 py-2 font-bold text-gray-800 border-r border-gray-100/50">{row.CustomerName || '—'}</td>
                           <td className="px-4 py-2 text-gray-500 border-r border-gray-100/50">{row.CustomerId || '—'}</td>
                           <td className="px-4 py-2 font-medium text-gray-700 border-r border-gray-100/50">{row.MrName || '—'}</td>
                           <td className="px-4 py-2 text-gray-500 border-r border-gray-100/50">{row.LineName || '—'}</td>
                           <td className="px-4 py-2 font-medium border-r border-gray-100/50">{row.ReportDate ? row.ReportDate.split('T')[0] : '—'}</td>
                           <td className="px-4 py-2 text-gray-500 border-r border-gray-100/50">{dayName}</td>
                           <td className="px-4 py-2 font-bold text-gray-700 border-r border-gray-100/50">{type || '—'}</td>
                           <td className="px-4 py-2 text-gray-600 border-r border-gray-100/50">{row.CustomerGrade || '—'}</td>
                           <td className="px-4 py-2 text-gray-500 border-r border-gray-100/50">{row.Specialty || '—'}</td>
                           <td className="px-4 py-2 border-r border-gray-100/50 text-center">
                             {isCoached ? <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">🎓 Yes</span> : <span className="text-gray-300">—</span>}
                           </td>
                           <td className="px-4 py-2 text-gray-500 border-r border-gray-100/50">{row.CoachingType || '—'}</td>
                           <td className="px-4 py-2 text-gray-500 truncate max-w-[200px]" title={row.Comment}>{row.Comment || '—'}</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
                 {filteredData.length > 500 && (
                   <div className="p-3 text-center bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-widest border-t border-gray-200">
                     Showing 500 of {filteredData.length} results
                   </div>
                 )}
               </div>
             </div>
           )}
         </div>
      </div>

      <div id="section-datatable" className="scroll-mt-24 pt-8 space-y-8">
        <TeamOverviewTable data={filteredData} targets={targets} mrStats={mrStats} />

        <InteractionAnalysis data={filteredData} />
        <CoachingAnalysis data={filteredData} />
        
        {/* Full Raw Data Section */}
        <details className="mt-12 bg-white border border-gray-200 shadow-sm rounded-xl [&_summary::-webkit-details-marker]:hidden">
          <summary className="p-6 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors">
            <div>
              <h3 className="text-xl font-bold text-gray-900 italic tracking-tight">📋 Raw Data ({filteredData.length.toLocaleString()} rows)</h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">High-performance virtualized rendering</p>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">Expand / Collapse</span>
          </summary>
          <div className="p-6 border-t border-gray-100">
            <VirtualTable data={filteredData} columns={tableColumns} />
          </div>
        </details>
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-yellow-400 shadow-lg flex items-center justify-center hover:bg-yellow-500 transition-all text-xl font-black text-gray-900"
          title="Scroll to Top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default CallDetailingAnalyzer;

