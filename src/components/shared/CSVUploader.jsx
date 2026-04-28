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
        const cleanRows = (raw) => {
          return raw
            .map(row => {
              // Clean every field and key first to ensure we can find columns reliably
              const clean = {};
              Object.keys(row).forEach(k => {
                const key = k
                  .replace(/^\uFEFF/, "")
                  .replace(/\s+/g, "") // Remove all spaces from keys for matching
                  .trim();
                const val = row[k];
                clean[key] = (val === null || val === undefined)
                  ? ""
                  : String(val).replace(/\r/g, "").trim();
              });
              return clean;
            })
            .filter(row => {
              // Be lenient with InteractionId (any non-empty value)
              const id = row["InteractionId"];
              if (!id) return false;

              // Must have a valid MrName (any non-empty value)
              const mr = row["MrName"];
              if (!mr) return false;

              // Try to normalize ReportDate to YYYY-MM-DD
              let dt = String(row["ReportDate"] || "").trim();
              if (dt.includes("T")) dt = dt.split("T")[0];
              
              // Handle DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
              const separator = dt.includes("/") ? "/" : dt.includes("-") ? "-" : null;
              if (separator && dt.split(separator).length === 3) {
                const parts = dt.split(separator);
                // Case: YYYY-MM-DD
                if (parts[0].length === 4) {
                  dt = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } 
                // Case: DD/MM/YYYY or MM/DD/YYYY
                else if (parts[2].length === 4) {
                   // Clean parts to ensure they are numeric
                   const p0 = parts[0].replace(/\D/g, "");
                   const p1 = parts[1].replace(/\D/g, "");
                   const p2 = parts[2].replace(/\D/g, "");
                   
                   if (p0 && p1 && p2) {
                     // Assume DD/MM/YYYY if p0 > 12
                     if (parseInt(p0) > 12) {
                       dt = `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
                     } else {
                       // Ambiguous case, but we stick to DD/MM/YYYY as primary or whatever matches
                       dt = `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
                     }
                   }
                }
              }
              
              const isDateValid = (s) => {
                const d = new Date(s);
                return !isNaN(d.getTime());
              };

              if (!dt || !dt.match(/^\d{4}-\d{2}-\d{2}$/) || !isDateValid(dt)) return false;
              row["ReportDate"] = dt; // Save normalized date back

              // Must have valid InteractionType (normalized, case-insensitive)
              const type = row["InteractionType"] || "";
              const validTypes = ["HCP", "HCO", "Pharmacy"];
              if (!validTypes.some(t => t.toLowerCase() === type.toLowerCase())) return false;

              return true;
            });
        };

        const valid = cleanRows(results.data);

        // Deduplicate by InteractionId
        const seen = new Set();
        const deduped = valid.filter(row => {
          const id = row["InteractionId"];
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        if (deduped.length === 0) {
          console.warn("⚠️ All rows were filtered out. check columns: InteractionId, MrName, ReportDate, InteractionType.");
          alert("No valid rows found. Please check if your CSV has the required columns: InteractionId, MrName, ReportDate, InteractionType.");
        }

        setRowCount(deduped.length);
        setStatus("done");
        saveToCache(deduped, file.name);
        console.log("✅ Loaded:", deduped.length, "rows");
        onDataLoaded(deduped);
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
