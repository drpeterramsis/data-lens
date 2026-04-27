// src/utils/safeCSV.js

export const safeStr = (val) => {
  if (val === null || val === undefined) return "";
  return String(val).trim();
};

export const safeBool = (val) => {
  if (!val) return false;
  return String(val).trim().toLowerCase() === "true";
};

export const safeDate = (val) => {
  if (!val) return "";
  return String(val).trim().split("T")[0];
};

export const cleanRow = (row) => {
  if (!row || typeof row !== "object") return {};
  const out = {};
  Object.keys(row).forEach((key) => {
    const k = key.replace(/^\uFEFF/, "").trim();
    const v = row[key];
    out[k] = (v === null || v === undefined) ? "" : String(v).trim();
  });
  return out;
};
