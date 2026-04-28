// src/utils/safeCSV.js

export const parseReportDate = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  
  // Handle M/D/YYYY or D/M/YYYY format
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, p1, p2, y] = dmyMatch;
    // We assume M/D/YYYY if p1 <= 12 and p2 > 12, or just stick to a logic.
    // Based on user sample 4/27/2026, it is M/D/YYYY.
    // To be safe, if p1 > 12 it's D/M/YYYY. If p2 > 12 it's M/D/YYYY.
    // Defaulting to M/D/YYYY as per sample.
    let m = p1;
    let d = p2;
    if (parseInt(p1) > 12) {
      // Must be D/M/YYYY
      d = p1;
      m = p2;
    }
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  
  // Handle YYYY-MM-DD already
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return s.substring(0, 10);
  
  return "";
};

export const isCoached = (val) =>
  String(val || "").trim().toUpperCase() === "TRUE";

export const safeStr = (v) =>
  v == null ? "" : String(v).replace(/\r/g,"").trim();

export const cleanRows = (raw) => {
  const seen = new Set();
  return raw
    .filter(row => {
      if (!row) return false;
      const id = safeStr(row.InteractionId);
      if (!id || !/^\d{5,}$/.test(id)) return false;
      if (seen.has(id)) return false;
      
      const mr = safeStr(row.MrName);
      if (!mr || mr.length < 2) return false;
      
      const typeStr = safeStr(row.InteractionType);
      // Case insensitive check and normalization
      const typeLower = typeStr.toLowerCase();
      let normalizedType = "";
      if (typeLower === "hcp") normalizedType = "HCP";
      else if (typeLower === "hco") normalizedType = "HCO";
      else if (typeLower === "pharmacy") normalizedType = "Pharmacy";
      
      if (!normalizedType) return false;
      
      const date = parseReportDate(safeStr(row.ReportDate));
      if (!date) return false;
      
      seen.add(id);
      return true;
    })
    .map(row => {
      const cleaned = {};
      Object.keys(row).forEach(k => {
        const key = k.replace(/^\uFEFF/,"").replace(/\r/g,"").trim();
        cleaned[key] = safeStr(row[k]);
      });
      
      // Normalize date
      cleaned.ReportDate = parseReportDate(cleaned.ReportDate);
      
      // Normalize type case
      const t = cleaned.InteractionType.toLowerCase();
      if (t === "hcp") cleaned.InteractionType = "HCP";
      else if (t === "hco") cleaned.InteractionType = "HCO";
      else if (t === "pharmacy") cleaned.InteractionType = "Pharmacy";
      
      return cleaned;
    });
};
