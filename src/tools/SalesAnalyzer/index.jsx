import React, { useState, useEffect } from 'react';
import CSVUploader from '../../components/shared/CSVUploader';
import DataTable from '../../components/shared/DataTable';
import SummaryCards from '../../components/shared/SummaryCards';
import SaveOptions from '../../components/shared/SaveOptions';
import AnalysisSummary from '../../components/shared/AnalysisSummary';
import { getTableStats, analyzeCSVData } from '../../utils/csvAnalyzer';
import Toast, { useToast } from '../../components/Toast';
import { TrendingUp, DollarSign } from 'lucide-react';

const SalesAnalyzer = () => {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    // Check for saved data in localStorage
    const saved = localStorage.getItem('datalens_sales-analyzer_data');
    if (saved) {
      if (window.confirm("Load saved sales analysis data from your browser?")) {
        const parsedSaved = JSON.parse(saved);
        handleSetData(parsedSaved);
        showToast("Restored analysis session", "success");
      }
    }
  }, []);

  const handleSetData = (csvData) => {
    setData(csvData);
    setStats(getTableStats(csvData));
    setAnalysis(analyzeCSVData(csvData));
  };

  const onCSVLoaded = (csvData) => {
    handleSetData(csvData);
    showToast(`Successfully parsed ${csvData.length} records`, 'success');
  };

  const handleSave = () => {
    localStorage.setItem('datalens_sales-analyzer_data', JSON.stringify(data));
    showToast("Data secured in local storage", "success");
  };

  const handleDiscard = () => {
    setData(null);
    setStats(null);
    setAnalysis(null);
    localStorage.removeItem('datalens_sales-analyzer_data');
    showToast("Workspace cleared", "info");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tight">📊 SALES <span className="text-accent">ANALYZER</span></h2>
          <p className="text-muted mt-1 uppercase text-xs font-bold tracking-widest">Track and analyze your enterprise sales performance</p>
        </div>
      </div>

      {!data ? (
        <div className="space-y-8">
          <CSVUploader onDataLoaded={onCSVLoaded} toolName="sales-analyzer" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 text-accent mb-3">
                <DollarSign size={20} />
                <h4 className="font-bold">Monetary Tracking</h4>
              </div>
              <p className="text-sm text-muted">
                Detect currency patterns and calculate total revenue, average order value, and profit margins automatically from your sales logs.
              </p>
            </div>
            <div className="p-6 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 text-accent mb-3">
                <TrendingUp size={20} />
                <h4 className="font-bold">Performance Vectors</h4>
              </div>
              <p className="text-sm text-muted">
                Identify top performing products or regions by sorting the data tables based on revenue columns or quantity metrics.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <SummaryCards {...stats} />
          
          <div className="bg-surface border border-border rounded-xl p-6 shadow-2xl mb-8">
             <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Sales Records Table</h3>
              <span className="text-xs font-medium text-muted">Sorted by first column by default</span>
            </div>
            <DataTable data={data} />
          </div>

          <AnalysisSummary analysis={analysis} />

          <SaveOptions 
            data={data} 
            toolName="sales-analyzer" 
            onSave={handleSave} 
            onDiscard={handleDiscard} 
          />
        </>
      )}
    </div>
  );
};

export default SalesAnalyzer;
