import { useState, useEffect } from "react";
import Papa from "papaparse";

const CSVUploader = ({ onDataLoaded }) => {
  const [status, setStatus]     = useState("idle");
  const [rowCount, setRowCount] = useState(0);
  const [cacheInfo, setCacheInfo] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("datalens_last_report");
      if (raw) {
        const parsed = JSON.parse(raw);
        setCacheInfo(parsed);
        setRowCount(parsed.rowCount || parsed.rows.length);
        setStatus("done");
        onDataLoaded(parsed.rows);
      }
    } catch (e) {
      console.warn("Failed to load cached report:", e);
    }
  }, [onDataLoaded]);

  const saveToCache = (rows, fileName) => {
    try {
      const payload = {
        uploadedAt: new Date().toISOString(),
        fileName,
        rowCount: rows.length,
        rows,
      };
      localStorage.setItem("datalens_last_report", JSON.stringify(payload));
      setCacheInfo(payload);
    } catch (e) {
      console.warn("Data too large to cache:", e);
      alert("Data too large to cache. Will reload on refresh.");
    }
  };

  const clearCache = () => {
    localStorage.removeItem("datalens_last_report");
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
      delimiter: "",      // ← Auto-detect (supports | and ,)
      worker: false,
      chunk: false,
      dynamicTyping: false,

      // ✅ This handles quoted cells with newlines correctly
      newline: "",        // auto-detect

      complete: (results) => {
        const REQUIRED = "InteractionId";

        const cleaned = results.data
          .filter((row) => {
            // remove empty/bad rows
            if (!row || typeof row !== "object") return false;
            // remove rows where ALL values are empty
            const vals = Object.values(row);
            if (vals.every((v) => !v || String(v).trim() === "")) return false;
            return true;
          })
          .map((row) => {
            const out = {};
            Object.keys(row).forEach((key) => {
              // ✅ Remove BOM + trim key
              const k = key.replace(/^\uFEFF/, "").trim();
              const v = row[key];
              // ✅ Never store undefined/null
              out[k] = (v === null || v === undefined) ? "" : String(v).trim();
            });
            return out;
          })
          // ✅ Only keep rows that have InteractionId
          .filter((row) => row[REQUIRED] && row[REQUIRED] !== "");

        setRowCount(cleaned.length);
        setStatus("done");
        saveToCache(cleaned, file.name);
        console.log("✅ Loaded:", cleaned.length, "rows");
        console.log("🔑 Headers:", Object.keys(cleaned[0] || {}));
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
      {cacheInfo ? (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">📂 Showing last report: {cacheInfo.fileName}</p>
            <p className="text-xs text-blue-700 mt-1">Uploaded {new Date(cacheInfo.uploadedAt).toLocaleString()} · {cacheInfo.rowCount.toLocaleString()} rows. Upload new file to refresh.</p>
          </div>
          <button 
            onClick={clearCache}
            className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
          >
            Clear Data
          </button>
        </div>
      ) : null}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          processFile(e.dataTransfer.files[0]);
        }}
        onClick={() => document.getElementById("csv-input").click()}
        className="border-2 border-dashed border-gray-300 rounded-xl
                   p-10 text-center cursor-pointer
                   hover:border-yellow-400 hover:bg-yellow-50
                   transition-all"
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => processFile(e.target.files[0])}
        />
        <div className="text-4xl mb-3">📂</div>
        <p className="font-semibold text-gray-700 text-lg">
          Drop CSV file here or click to browse
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Supports Comma ( , ) or Pipe ( | ) · Up to 50,000 rows
        </p>
      </div>

      {status === "parsing" && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-blue-700 text-sm">⏳ Parsing file...</span>
        </div>
      )}

      {status === "done" && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-700 font-medium text-sm">
            ✅ {rowCount.toLocaleString()} rows loaded successfully
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-700 text-sm">
            ❌ Failed to parse. Check file format.
          </span>
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
