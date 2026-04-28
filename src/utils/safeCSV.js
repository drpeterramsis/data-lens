// src/utils/safeCSV.js

export const parseReportDate = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  
  // Handle M/D/YYYY format
  const mdyMatch = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
  );
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
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
      seen.add(id);
      const mr = safeStr(row.MrName);
      if (!mr || mr.length < 2) return false;
      const type = safeStr(row.InteractionType);
      if (!["HCP","HCO","Pharmacy"].includes(type))
        return false;
      const date = parseReportDate(
        safeStr(row.ReportDate)
      );
      if (!date) return false;
      return true;
    })
    .map(row => {
      const cleaned = {};
      Object.keys(row).forEach(k => {
        const key = k.replace(/^\uFEFF/,"")
          .replace(/\r/g,"").trim();
        cleaned[key] = safeStr(row[k]);
      });
      // Normalize date
      cleaned.ReportDate = parseReportDate(
        cleaned.ReportDate
      );
      return cleaned;
    });
};
