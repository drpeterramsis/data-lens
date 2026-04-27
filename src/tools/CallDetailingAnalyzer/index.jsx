import React, { useState, useMemo } from 'react';
import CSVUploader from '../../components/shared/CSVUploader';
import SummaryCards from '../../components/shared/SummaryCards';
import FilterBar from '../../components/shared/FilterBar';
import DateRangeFilter from './DateRangeFilter';
import VirtualTable from '../../components/shared/VirtualTable';
import AutoInsights from '../../components/shared/AutoInsights.jsx';
import ActivityCalendar from '../../components/shared/ActivityCalendar.jsx';
import { parseISO, isValid } from 'date-fns';
import { generateInsights } from '../../utils/insightGenerator';

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
        const match = [d.CustomerName, d.MrName].some(val => val?.toLowerCase().includes(s));
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

  const metrics = useMemo(() => {
    return {
      totalInteractions: filteredData.length,
      uniqueCustomers: new Set(filteredData.map(d => d.CustomerId)).size,
      uniqueMRs: new Set(filteredData.map(d => d.MrName)).size,
      coachingSessions: filteredData.filter(d => d.IsMRCoachingSubmitted === 'True').length,
      hcpVisits: filteredData.filter(d => d.InteractionType === 'HCP').length,
      pharmacyVisits: filteredData.filter(d => d.InteractionType === 'Pharmacy').length,
    };
  }, [filteredData]);

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
    <div className="space-y-2 pb-24">
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

      <SummaryCards metrics={metrics} />
      
      <TargetSettingsPanel 
        data={rawData} 
        dateFrom={dateFrom} 
        dateTo={dateTo} 
        onTargetsChange={setTargets} 
      />

      <MRCardsGrid data={filteredData} targets={targets} />

      <ForecastTool data={filteredData} targets={targets} />

      <div className="mb-8">
        <FilterBar 
           options={filterOptions} 
           filters={filters} 
           onFilterChange={handleFilterChange} 
           onReset={resetFilters}
           dataCount={filteredData.length}
        />
      </div>

      <TeamOverviewTable data={filteredData} targets={targets} />

      <InteractionAnalysis data={filteredData} />
      <CoachingAnalysis data={filteredData} />
      <AutoInsights insights={insights} />

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
  );
};

export default CallDetailingAnalyzer;
