import React, { useState, useEffect } from 'react';
import CSVUploader from '../../components/shared/CSVUploader';
import DataTable from '../../components/shared/DataTable';
import SummaryCards from '../../components/shared/SummaryCards';
import SaveOptions from '../../components/shared/SaveOptions';
import AnalysisSummary from '../../components/shared/AnalysisSummary';
import { getTableStats, analyzeCSVData } from '../../utils/csvAnalyzer';
import Toast, { useToast } from '../../components/Toast';
import { Info, HelpCircle } from 'lucide-react';

const CallDetailingAnalyzer = () => {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    // Check for saved data in localStorage
    const saved = localStorage.getItem('datalens_call-detailing_data');
    if (saved) {
      if (window.confirm("Load saved call detailing data from your browser?")) {
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
    localStorage.setItem('datalens_call-detailing_data', JSON.stringify(data));
    showToast("Data secured in local storage", "success");
  };

  const handleDiscard = () => {
    setData(null);
    setStats(null);
    setAnalysis(null);
    localStorage.removeItem('datalens_call-detailing_data');
    showToast("Workspace cleared", "info");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tight">🔍 CALL DETAILING <span className="text-accent">ANALYZER</span></h2>
          <p className="text-muted mt-1 uppercase text-xs font-bold tracking-widest">Analyze your field force call activity metrics</p>
        </div>
      </div>

      {!data ? (
        <div className="space-y-8">
          <CSVUploader onDataLoaded={onCSVLoaded} toolName="call-detailing" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 text-accent mb-3">
                <Info size={20} />
                <h4 className="font-bold">Required Structure</h4>
              </div>
              <p className="text-sm text-muted">
                Ensure your CSV has clear headers in the first row. The system will auto-detect activity dates, field rep names, and call durations to generate insights.
              </p>
            </div>
            <div className="p-6 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 text-accent mb-3">
                <HelpCircle size={20} />
                <h4 className="font-bold">Privacy Note</h4>
              </div>
              <p className="text-sm text-muted">
                Analysis remains strictly in your browser session. No data is transmitted to external servers during the parsing or visualization process.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <SummaryCards {...stats} />
          
          <div className="bg-surface border border-border rounded-xl p-6 shadow-2xl mb-8">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Dataset Explorer</h3>
              <span className="text-xs font-medium text-muted">Auto-scrolling disabled for high density arrays</span>
            </div>
            <DataTable data={data} />
          </div>

          <AnalysisSummary analysis={analysis} />

          <SaveOptions 
            data={data} 
            toolName="call-detailing" 
            onSave={handleSave} 
            onDiscard={handleDiscard} 
          />
        </>
      )}
    </div>
  );
};

export default CallDetailingAnalyzer;
