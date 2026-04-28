import { useState, useEffect } from "react";
import Papa from "papaparse";
import { cleanRows } from "../../utils/safeCSV";

const CSVUploader = ({ onDataLoaded, storageKey = "datalens_last_report" }) => {
  const [status, setStatus]     = useState("idle");
  const [rowCount, setRowCount] = useState(0);
  const [cacheInfo, setCacheInfo] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCacheInfo(parsed);
        const rows = parsed.rows || [];
        setRowCount(parsed.rowCount || rows.length);
        setStatus("done");
        onDataLoaded(rows);
      }
    } catch (e) {
      console.warn("Failed to load cached report:", e);
    }
  }, [onDataLoaded, storageKey]);

  const saveToCache = (rows, fileName) => {
    try {
      const payload = {
        uploadedAt: new Date().toISOString(),
        fileName,
        rowCount: rows.length,
        rows,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setCacheInfo(payload);
    } catch (e) {
      console.warn("Data too large to cache:", e);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(storageKey);
    setCacheInfo(null);
    setStatus("idle");
    setRowCount(0);
    onDataLoaded([]);
  };

  const processFile = (file) => {
    if (!file) return;
    setStatus("parsing");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.replace(/^\uFEFF/, "").replace(/\r/g, "").trim(),
      complete: (results) => {
        const cleaned = cleanRows(results.data);
        setRowCount(cleaned.length);
        setStatus("done");
        saveToCache(cleaned, file.name);
        onDataLoaded(cleaned);
      },
      error: (err) => {
        console.error("CSV Error:", err);
        setStatus("error");
      },
    });
  };

  return (
    <div className="w-full">
      {rowCount > 0 ? (
        <div className="flex items-center justify-between bg-white border border-gray-200 shadow-sm rounded-lg p-3">
          <div>
            <p className="text-xs font-bold text-gray-900 border-b border-transparent">
              📂 {cacheInfo?.fileName || "report.csv"} · {rowCount.toLocaleString()} rows
            </p>
            {cacheInfo?.uploadedAt && (
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                 Uploaded {new Date(cacheInfo.uploadedAt).toLocaleString()}
               </p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              id="csv-input-hidden"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => processFile(e.target.files[0])}
            />
            <button 
              onClick={() => document.getElementById("csv-input-hidden").click()}
              className="px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50 text-[10px] uppercase tracking-widest font-black rounded border border-gray-200 transition-colors"
            >
              Upload New File
            </button>
            <button 
              onClick={clearCache}
              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] uppercase tracking-widest font-black rounded border border-red-100 transition-colors"
            >
              Clear Data
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            processFile(e.dataTransfer.files[0]);
          }}
          onClick={() => document.getElementById("csv-input").click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl
                     p-12 text-center cursor-pointer bg-white mb-8
                     hover:border-accent hover:bg-accent/5
                     transition-all"
        >
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => processFile(e.target.files[0])}
          />
          <div className="text-5xl mb-4">📂</div>
          <p className="font-bold text-gray-900 text-lg">
            Drop CSV file here or click to browse
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-2">
            Supports Comma ( , ) or Pipe ( | ) · Up to 50,000 rows
          </p>
        </div>
      )}

      {status === "parsing" && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
          <span className="text-blue-700 font-bold text-xs uppercase tracking-widest">⏳ Parsing file...</span>
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-center">
          <span className="text-red-700 font-bold text-xs uppercase tracking-widest">
            ❌ Failed to parse. Check file format.
          </span>
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
