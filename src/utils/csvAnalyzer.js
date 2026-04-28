// src/utils/csvAnalyzer.js
import { safeStr, safeBool, safeDate } from "./safeCSV";
import { isWorkingDayHCP, isWorkingDayHCO, isWorkingDayPH } from "./periodRules";

export const getKPISummary = (rows) => {
  if (!rows || !rows.length) return {
    uniqueMRs: 0,
    coachingDays: 0,
    dmHCORate: 0,
    dmHCPRate: 0,
    dmPHRate: 0,
    activeMRCountHCP: 0,
    activeMRCountHCO: 0,
    activeMRCountPH: 0
  };

  const mrData = {};

  rows.forEach((row) => {
    if (!row) return;

    const mr   = safeStr(row.MrName);
    const type = safeStr(row.InteractionType);
    const date = safeDate(row.ReportDate);
    const coached = safeBool(row.IsMRCoachingSubmitted);

    if (mr && date) {
      if (!mrData[mr]) {
        mrData[mr] = { days: {} };
      }
      if (!mrData[mr].days[date]) {
        mrData[mr].days[date] = { hcp: 0, hco: 0, ph: 0, coached: 0 };
      }
      if (type === 'HCP') mrData[mr].days[date].hcp++;
      else if (type === 'HCO') mrData[mr].days[date].hco++;
      else if (type === 'Pharmacy') mrData[mr].days[date].ph++;
      
      if (coached) mrData[mr].days[date].coached++;
    }
  });

  let totalCoachingDays = 0;
  let coachingMRsCount = 0;
  let sumHCORate = 0;
  let countHCORate = 0;
  let sumHCPRate = 0;
  let countHCPRate = 0;
  let sumPHRate = 0;
  let countPHRate = 0;

  const uniqueMRs = Object.keys(mrData).length;

  Object.values(mrData).forEach(mrInfo => {
    let hcoWorkingDaysCount = 0;
    let phWorkingDaysCount = 0;
    let hcpWorkingDaysCount = 0;

    let totalHCO = 0;
    let totalPH = 0;
    let totalHCP = 0;
    
    let hasCoachingDay = false;

    Object.entries(mrInfo.days).forEach(([dateStr, dayData]) => {
      const dObj = new Date(dateStr);
      
      if (dayData.coached >= 4) {
        totalCoachingDays++;
        hasCoachingDay = true;
      }

      if (dayData.hco > 0 && isWorkingDayHCO(dObj)) {
        hcoWorkingDaysCount++;
      }
      if (dayData.ph > 0 && isWorkingDayPH(dObj)) {
        phWorkingDaysCount++;
      }
      if (dayData.hcp > 0 && isWorkingDayHCP(dObj)) {
        hcpWorkingDaysCount++;
      }

      totalHCO += dayData.hco;
      totalPH += dayData.ph;
      totalHCP += dayData.hcp;
    });

    if (hasCoachingDay) coachingMRsCount++;

    let mrHCORate = hcoWorkingDaysCount > 0 ? (totalHCO / hcoWorkingDaysCount) : 0;
    let mrPHRate = phWorkingDaysCount > 0 ? (totalPH / phWorkingDaysCount) : 0;
    let mrHCPRate = hcpWorkingDaysCount > 0 ? (totalHCP / hcpWorkingDaysCount) : 0;

    if (hcoWorkingDaysCount > 0) { sumHCORate += mrHCORate; countHCORate++; }
    if (phWorkingDaysCount > 0) { sumPHRate += mrPHRate; countPHRate++; }
    if (hcpWorkingDaysCount > 0) { sumHCPRate += mrHCPRate; countHCPRate++; }
  });

  return {
    uniqueMRs: uniqueMRs,
    coachingDays: totalCoachingDays,
    coachingMRs: coachingMRsCount,
    dmHCORate: countHCORate > 0 ? (sumHCORate / countHCORate) : 0,
    dmHCPRate: countHCPRate > 0 ? (sumHCPRate / countHCPRate) : 0,
    dmPHRate: countPHRate > 0 ? (sumPHRate / countPHRate) : 0,
    activeMRCountHCP: countHCPRate,
    activeMRCountHCO: countHCORate,
    activeMRCountPH: countPHRate
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
