// src/utils/csvAnalyzer.js
// Add these guards to EVERY function

import { safeStr, safeBool, safeDate } from "./safeCSV";

// ✅ ALWAYS access row fields like this:
// safeStr(row?.MrName)        ← safe
// row?.MrName?.trim()         ← safe
// row.MrName.trim()           ← 💥 crashes if undefined

export const getKPISummary = (rows) => {
  if (!rows || !rows.length) return {
    totalInteractions: 0,
    uniqueCustomers: 0,
    uniqueMRs: 0,
    hcpCount: 0,
    pharmacyCount: 0,
    hcoCount: 0,
    coachedCount: 0,
  };

  const customers = new Set();
  const mrs = new Set();
  let hcp = 0, pharmacy = 0, hco = 0, coached = 0;

  rows.forEach((row) => {
    if (!row) return;

    const cid  = safeStr(row.CustomerId);
    const mr   = safeStr(row.MrName);
    const type = safeStr(row.InteractionType);

    if (cid) customers.add(cid);
    if (mr)  mrs.add(mr);

    if (type === "HCP")           hcp++;
    else if (type === "Pharmacy") pharmacy++;
    else if (type === "HCO")      hco++;

    if (safeBool(row.IsMRCoachingSubmitted)) coached++;
  });

  return {
    totalInteractions: rows.length,
    uniqueCustomers:   customers.size,
    uniqueMRs:         mrs.size,
    hcpCount:          hcp,
    pharmacyCount:     pharmacy,
    hcoCount:          hco,
    coachedCount:      coached,
  };
};

export const groupByMR = (rows) => {
  if (!rows?.length) return [];
  const map = {};

  rows.forEach((row) => {
    if (!row) return;
    const mr = safeStr(row.MrName) || "Unknown";

    if (!map[mr]) {
      map[mr] = {
        mrName: mr,
        lineName: safeStr(row.LineName),
        total: 0, hcp: 0, hco: 0,
        pharmacy: 0, coached: 0,
        customers: new Set(),
      };
    }

    map[mr].total++;
    const type = safeStr(row.InteractionType).toLowerCase();
    if (type === "hcp")            map[mr].hcp++;
    else if (type === "hco")       map[mr].hco++;
    else if (type === "pharmacy")  map[mr].pharmacy++;
    if (safeBool(row.IsMRCoachingSubmitted)) map[mr].coached++;

    const cid = safeStr(row.CustomerId);
    if (cid) map[mr].customers.add(cid);
  });

  return Object.values(map)
    .map((g) => ({
      mrName:          g.mrName,
      lineName:        g.lineName,
      total:           g.total,
      hcp:             g.hcp,
      hco:             g.hco,
      pharmacy:        g.pharmacy,
      coached:         g.coached,
      uniqueCustomers: g.customers.size,
    }))
    .sort((a, b) => b.total - a.total);
};

export const groupByDate = (rows) => {
  if (!rows?.length) return [];
  const map = {};

  rows.forEach((row) => {
    if (!row) return;
    const date = safeDate(row.ReportDate);
    if (!date) return;

    if (!map[date]) map[date] = { date, count: 0, mrs: new Set() };
    map[date].count++;

    const mr = safeStr(row.MrName);
    if (mr) map[date].mrs.add(mr);
  });

  return Object.values(map)
    .map((g) => ({
      date:     g.date,
      count:    g.count,
      mrCount:  g.mrs.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getInteractionTypes = (rows) => {
  if (!rows?.length) return [];
  const counts = { HCP: 0, HCO: 0, Pharmacy: 0 };
  const total = rows.length;

  rows.forEach((row) => {
    if (!row) return;
    const t = safeStr(row.InteractionType);
    if (counts[t] !== undefined) counts[t]++;
  });

  return Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([type, count]) => ({
      type,
      count,
      percent: ((count / total) * 100).toFixed(1),
    }));
};

export const getGradeDistribution = (rows) => {
  if (!rows?.length) return [];
  const freq = {};
  const total = rows.length;
  const order = ["A+", "A", "B", "C"];

  rows.forEach((row) => {
    if (!row) return;
    const g = safeStr(row.CustomerGrade) || "Ungraded";
    freq[g] = (freq[g] || 0) + 1;
  });

  return Object.entries(freq)
    .map(([grade, count]) => ({
      grade,
      count,
      percent: ((count / total) * 100).toFixed(1),
    }))
    .sort((a, b) => {
      const ai = order.indexOf(a.grade);
      const bi = order.indexOf(b.grade);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
};

export const getSpecialtyBreakdown = (rows) => {
  if (!rows?.length) return [];
  const freq = {};

  rows
    .filter((row) => row && safeStr(row.InteractionType) === "HCP")
    .forEach((row) => {
      const s = safeStr(row.Specialty) || "Not Specified";
      freq[s] = (freq[s] || 0) + 1;
    });

  const total = Object.values(freq).reduce((a, b) => a + b, 0) || 1;

  return Object.entries(freq)
    .map(([specialty, count]) => ({
      specialty,
      count,
      percent: ((count / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);
};

export const getCoachingSummary = (rows) => {
  if (!rows?.length) return {
    mrCoached: 0, mrNotCoached: 0,
    mgrCoached: 0, mgrNotCoached: 0,
    coachingTypes: [],
  };

  let mrCoached = 0, mrNot = 0, mgrCoached = 0, mgrNot = 0;
  const types = {};

  rows.forEach((row) => {
    if (!row) return;

    safeBool(row.IsMRCoachingSubmitted)       ? mrCoached++ : mrNot++;
    safeBool(row.IsManagerCoachingSubmitted)   ? mgrCoached++ : mgrNot++;

    const ct = safeStr(row.CoachingType);
    if (ct) types[ct] = (types[ct] || 0) + 1;
  });

  return {
    mrCoached,
    mrNotCoached:  mrNot,
    mgrCoached,
    mgrNotCoached: mgrNot,
    coachingTypes: Object.entries(types)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
};
