// src/utils/csvAnalyzer.js
import { safeStr, safeBool, safeDate } from "./safeCSV";
import { isHCPWorkingDay, isHCOWorkingDay, isPHWorkingDay } from "./periodRules";

// ── KPI Card calculations ──────────────────────

export const calculateKPICards = (mrStats) => {
  if (!mrStats || mrStats.length === 0) return {
    coachingDays: 0,
    avgHCORate: 0,
    avgHCPRate: 0,
    avgPHRate:  0,
    activeMRs:  0,
  };

  // Total coaching days = sum across all MRs
  const coachingMRs = mrStats.filter(mr => mr.coachingDays > 0).length;
  const coachingDays = mrStats.reduce(
    (sum, mr) => sum + mr.coachingDays, 0
  );

  // Average rates = sum of rates / count of MRs
  // Only include MRs who have working days for that type
  const hcoMRs  = mrStats.filter(mr => mr.hcoDays > 0);
  const hcpMRs  = mrStats.filter(mr => mr.hcpDays > 0);
  const phMRs   = mrStats.filter(mr => mr.phDays  > 0);

  const avgHCORate = hcoMRs.length > 0
    ? parseFloat((
        hcoMRs.reduce((s, mr) => s + mr.hcoRate, 0)
        / hcoMRs.length
      ).toFixed(1))
    : 0;

  const avgHCPRate = hcpMRs.length > 0
    ? parseFloat((
        hcpMRs.reduce((s, mr) => s + mr.hcpRate, 0)
        / hcpMRs.length
      ).toFixed(1))
    : 0;

  const avgPHRate = phMRs.length > 0
    ? parseFloat((
        phMRs.reduce((s, mr) => s + mr.phRate, 0)
        / phMRs.length
      ).toFixed(1))
    : 0;

  return {
    coachingDays,
    coachingMRs,
    avgHCORate,
    avgHCPRate,
    avgPHRate,
    activeMRs: mrStats.length,
    hcoMRCount: hcoMRs.length,
    hcpMRCount: hcpMRs.length,
    phMRCount:  phMRs.length,
  };
};

export const calculateMRStats = (rows) => {
  if (!rows || rows.length === 0) return [];

  // Group rows by MR
  const mrMap = {};

  rows.forEach((row) => {
    if (!row) return;
    
    const mr = (row.MrName || "").trim();
    if (!mr) return;

    if (!mrMap[mr]) {
      mrMap[mr] = {
        mrName: mr,
        lineName: (row.LineName || "").trim(),
        rows: [],
      };
    }
    mrMap[mr].rows.push(row);
  });

  // Calculate stats per MR
  return Object.values(mrMap).map((mrData) => {
    const { mrName, lineName, rows: mrRows } = mrData;

    // ── Group by date ──────────────────────────
    const dateMap = {};

    mrRows.forEach((row) => {
      const date = (row.ReportDate || "").split("T")[0].trim();
      if (!date) return;

      if (!dateMap[date]) {
        dateMap[date] = {
          hco: 0, ph: 0, hcp: 0,
          coached: 0,
          hcoCoached: 0,
          phCoached:  0,
          hcpCoached: 0,
          customers: [],
        };
      }

      const type = (row.InteractionType || "").trim();
      const isCoached = 
        (row.IsMRCoachingSubmitted || "")
          .trim().toLowerCase() === "true";

      if (type === "HCO")      { 
        dateMap[date].hco++;
        if (isCoached) {
          dateMap[date].coached++;
          dateMap[date].hcoCoached++;
        }
      }
      else if (type === "Pharmacy") {
        dateMap[date].ph++;
        if (isCoached) {
          dateMap[date].coached++;
          dateMap[date].phCoached++;
        }
      }
      else if (type === "HCP") {
        dateMap[date].hcp++;
        if (isCoached) {
          dateMap[date].coached++;
          dateMap[date].hcpCoached++;
        }
      }

      // Store customer detail
      dateMap[date].customers.push({
        name:    (row.CustomerName || "").trim(),
        id:      (row.CustomerId   || "").trim(),
        type,
        grade:   (row.CustomerGrade || "").trim(),
        specialty: (row.Specialty  || "").trim(),
        coached: isCoached,
        coachingType: (row.CoachingType || "").trim(),
        site:    (row.InteractionVisitedSite || "").trim(),
        comment: (row.Comment || "").trim(),
      });
    });

    // ── Working days (Sat–Wed for HCP, Sat–Thu for HCO/PH)
    const allDates = Object.keys(dateMap);
    
    const hcoDates = allDates.filter(d => 
      dateMap[d].hco > 0 && isHCOWorkingDay(d)
    );
    const phDates = allDates.filter(d =>
      dateMap[d].ph > 0 && isPHWorkingDay(d)
    );
    const hcpDates = allDates.filter(d =>
      dateMap[d].hcp > 0 && isHCPWorkingDay(d)
    );

    // ── Totals ─────────────────────────────────
    const totalHCO = mrRows.filter(r => 
      (r.InteractionType||"").trim() === "HCO"
    ).length;
    const totalPH = mrRows.filter(r =>
      (r.InteractionType||"").trim() === "Pharmacy"
    ).length;
    const totalHCP = mrRows.filter(r =>
      (r.InteractionType||"").trim() === "HCP"
    ).length;

    // ── Call rates ─────────────────────────────
    const hcoRate = hcoDates.length > 0
      ? parseFloat((totalHCO / hcoDates.length).toFixed(1))
      : 0;
    const phRate = phDates.length > 0
      ? parseFloat((totalPH / phDates.length).toFixed(1))
      : 0;
    const hcpRate = hcpDates.length > 0
      ? parseFloat((totalHCP / hcpDates.length).toFixed(1))
      : 0;

    // ── COACHING DAYS ──────────────────────────
    // A coaching day = date where coached >= 4
    const coachingDays = allDates.filter(d =>
      dateMap[d].coached >= 4
    ).length;

    // ── Total coached visits ───────────────────
    const totalCoached = mrRows.filter(r =>
      (r.IsMRCoachingSubmitted || "")
        .trim().toLowerCase() === "true"
    ).length;
    
    const hcoCoached = mrRows.filter(r =>
      (r.InteractionType||"").trim() === "HCO" &&
      (r.IsMRCoachingSubmitted||"")
        .trim().toLowerCase() === "true"
    ).length;
    const phCoached = mrRows.filter(r =>
      (r.InteractionType||"").trim() === "Pharmacy" &&
      (r.IsMRCoachingSubmitted||"")
        .trim().toLowerCase() === "true"
    ).length;
    const hcpCoached = mrRows.filter(r =>
      (r.InteractionType||"").trim() === "HCP" &&
      (r.IsMRCoachingSubmitted||"")
        .trim().toLowerCase() === "true"
    ).length;

    // ── Last report date ───────────────────────
    const lastDate = allDates.sort().reverse()[0] || "";

    return {
      mrName,
      lineName,
      totalHCO, totalPH, totalHCP,
      hcoRate, phRate, hcpRate,
      hcoDays: hcoDates.length,
      phDays:  phDates.length,
      hcpDays: hcpDates.length,
      coachingDays,
      totalCoached,
      hcoCoached, phCoached, hcpCoached,
      lastDate,
      dateMap,
      totalCalls: totalHCO + totalPH + totalHCP,
    };
  });
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

    const cid = safeStr(row.CustomerId) || safeStr(row.CustomerName);
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
