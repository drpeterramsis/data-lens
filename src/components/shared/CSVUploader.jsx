import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const CSVUploader = ({ onDataLoaded, toolName }) => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleUpload(file);
    }
  };

  const handleUpload = (file) => {
    setLoading(true);
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Limit to 2000 rows as requested
        const limitedData = results.data.slice(0, 2000);
        setTimeout(() => {
          onDataLoaded(limitedData);
          setLoading(false);
        }, 800);
      },
      error: (error) => {
        console.error("PapaParse error: ", error);
        setLoading(false);
      }
    });
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
        fileName ? 'border-accent bg-accent/5' : 'border-border hover:border-accent hover:bg-accent/5 bg-surface/50'
      }`}
      onClick={() => document.getElementById('csv-input').click()}
    >
      <input 
        id="csv-input"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onFileChange}
      />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-accent" size={48} />
          <p className="text-accent font-medium">Parsing your data...</p>
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center text-center p-6">
          <CheckCircle2 size={48} className="text-success mb-3" />
          <h3 className="text-xl font-bold text-white mb-1">{fileName}</h3>
          <p className="text-muted text-sm">{fileSize}</p>
          <p className="mt-4 px-4 py-2 bg-accent text-bg rounded-lg font-bold text-sm">File Ready</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center p-10">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
            <Upload size={32} className="text-accent" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Upload your CSV</h3>
          <p className="text-muted max-w-sm">
            Drag and drop your file here, or <span className="text-accent font-bold">browse</span> to upload.
            Supports up to 2000 rows.
          </p>
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
