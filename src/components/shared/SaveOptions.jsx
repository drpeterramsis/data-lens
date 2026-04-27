import React from 'react';
import { Save, Download, Trash2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

const SaveOptions = ({ data, toolName, onDiscard, onSave }) => {
  
  const handleExportCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `datalens_${toolName}_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard all current data? This cannot be undone.")) {
      onDiscard();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-surface border border-border rounded-xl mt-6 shadow-md">
      <div>
        <button
          onClick={handleDiscard}
          className="flex items-center gap-2 px-4 py-2 border border-danger text-danger hover:bg-danger hover:text-white rounded-lg transition-all font-semibold text-sm"
        >
          <Trash2 size={16} />
          <span>Discard Data</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-6 py-2 border border-border hover:bg-border text-white rounded-lg transition-all font-semibold text-sm shadow-sm"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-hover text-bg rounded-lg transition-all font-bold text-sm shadow-lg active:scale-95"
        >
          <Save size={16} />
          <span>Save to Browser</span>
        </button>
      </div>
    </div>
  );
};

export default SaveOptions;
