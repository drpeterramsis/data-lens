import {
  isHCPWorkingDay,
  isHCOWorkingDay,
  isPHWorkingDay,
} from "./periodRules";

const safeStr = (val) =>
  val === null || val === undefined
    ? ""
    : String(val).trim();

const safeBool = (val) =>
  safeStr(val).toLowerCase() === "true";

export const calculateMRStats = (rows) => {
  if (!rows?.length) return [];

  //───────────────────────────────────────
  // Group rows by MR name
  //───────────────────────────────────────
  const mrMap = {};

  rows.forEach(row => {
    if (!row) return;

    const mr   = safeStr(row.MrName);
    const rawType = safeStr(row.InteractionType);
    const date = safeStr(row.ReportDate)
      .split("T")[0];
    const id   = safeStr(row.InteractionId);

    // Skip invalid
    if (!mr || !date || !id) return;
    
    // Normalize type
    let type = "";
    if (rawType.toLowerCase() === "hcp") type = "HCP";
    else if (rawType.toLowerCase() === "hco") type = "HCO";
    else if (rawType.toLowerCase() === "pharmacy") type = "Pharmacy";
    
    if (!type) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    if (!mrMap[mr]) {
      mrMap[mr] = {
        mrName:   mr,
        lineName: safeStr(row.LineName),
        dateMap:  {},
      };
    }

    const dm = mrMap[mr].dateMap;

    if (!dm[date]) {
      dm[date] = {
        hco: 0, ph: 0, hcp: 0,
        coached: 0,
        hcoCoached: 0,
        phCoached: 0,
        hcpCoached: 0,
        customers: [],
      };
    }

    const isCoached = safeBool(
      row.IsMRCoachingSubmitted
    );

    if (type === "HCO") {
      dm[date].hco++;
      if (isCoached) {
        dm[date].coached++;
        dm[date].hcoCoached++;
      }
    } else if (type === "Pharmacy") {
      dm[date].ph++;
      if (isCoached) {
        dm[date].coached++;
        dm[date].phCoached++;
      }
    } else if (type === "HCP") {
      dm[date].hcp++;
      if (isCoached) {
        dm[date].coached++;
        dm[date].hcpCoached++;
      }
    }

    // Store full customer record for calendar
    dm[date].customers.push({
      interactionId: id,
      name:          safeStr(row.CustomerName),
      customerId:    safeStr(row.CustomerId),
      type,
      grade:         safeStr(row.CustomerGrade),
      specialty:     safeStr(row.Specialty),
      coached:       isCoached,
      coachingType:  safeStr(row.CoachingType),
      site:          safeStr(
        row.InteractionVisitedSite),
      comment:       safeStr(row.Comment),
      isManagerCoached: safeBool(
        row.IsManagerCoachingSubmitted),
    });
  });

  //───────────────────────────────────────
  // Build stats per MR
  //───────────────────────────────────────
  return Object.values(mrMap).map(mrData => {
    const { mrName, lineName, dateMap } = mrData;
    const allDates = Object.keys(dateMap).sort();

    // Totals
    let totalHCO = 0, totalPH = 0, totalHCP = 0;
    let totalCoached = 0;
    let hcoCoached = 0, phCoached = 0,
        hcpCoached = 0;

    allDates.forEach(d => {
      totalHCO     += dateMap[d].hco;
      totalPH      += dateMap[d].ph;
      totalHCP     += dateMap[d].hcp;
      totalCoached += dateMap[d].coached;
      hcoCoached   += dateMap[d].hcoCoached;
      phCoached    += dateMap[d].phCoached;
      hcpCoached   += dateMap[d].hcpCoached;
    });

    // Working days (only dates with visits
    // on valid working days)
    const hcoDates = allDates.filter(d =>
      dateMap[d].hco > 0 && isHCOWorkingDay(d)
    );
    const phDates = allDates.filter(d =>
      dateMap[d].ph > 0 && isPHWorkingDay(d)
    );
    const hcpDates = allDates.filter(d =>
      dateMap[d].hcp > 0 && isHCPWorkingDay(d)
    );

    // Call rates
    const hcoRate = hcoDates.length
      ? +(totalHCO / hcoDates.length).toFixed(1)
      : 0;
    const phRate = phDates.length
      ? +(totalPH  / phDates.length).toFixed(1)
      : 0;
    const hcpRate = hcpDates.length
      ? +(totalHCP / hcpDates.length).toFixed(1)
      : 0;

    // Coaching days: dates with >= 4 coached visits
    const coachingDaysList = allDates.filter(d =>
      dateMap[d].coached >= 4
    );

    // Last reported date
    const lastDate = allDates[allDates.length - 1]
      ?? "";

    return {
      mrName,
      lineName,
      totalHCO,
      totalPH,
      totalHCP,
      hcoRate,
      phRate,
      hcpRate,
      hcoDays:       hcoDates.length,
      phDays:        phDates.length,
      hcpDays:       hcpDates.length,
      coachingDays:  coachingDaysList.length,
      coachingDates: coachingDaysList,
      totalCoached,
      hcoCoached,
      phCoached,
      hcpCoached,
      lastDate,
      dateMap,        // ← FULL dateMap with customers
      totalCalls:
        totalHCO + totalPH + totalHCP,
      allDates,
    };
  });
};

//─────────────────────────────────────────
// KPI Cards from mrStats
//─────────────────────────────────────────
export const calculateKPICards = (mrStats) => {
  if (!mrStats?.length) return {
    coachingDays: 0,
    avgHCORate: "0.0",
    avgHCPRate: "0.0",
    avgPHRate:  "0.0",
    activeMRs:  0,
    hcoMRCount: 0,
    hcpMRCount: 0,
    phMRCount:  0,
    coachingMRs: 0,
  };

  // Total coaching days = sum across all MRs
  const coachingDays = mrStats.reduce(
    (s, mr) => s + mr.coachingDays, 0
  );
  const coachingMRs = mrStats.filter(
    mr => mr.coachingDays > 0
  ).length;

  // Average rates — only MRs with working days
  const hcoMRs = mrStats.filter(
    mr => mr.hcoDays > 0
  );
  const phMRs  = mrStats.filter(
    mr => mr.phDays  > 0
  );
  const hcpMRs = mrStats.filter(
    mr => mr.hcpDays > 0
  );

  const avg = (arr, key) => arr.length
    ? (arr.reduce((s,m) => s + m[key], 0)
       / arr.length).toFixed(1)
    : "0.0";

  return {
    coachingDays,
    coachingMRs,
    avgHCORate:  avg(hcoMRs, "hcoRate"),
    avgHCPRate:  avg(hcpMRs, "hcpRate"),
    avgPHRate:   avg(phMRs,  "phRate"),
    activeMRs:   mrStats.length,
    hcoMRCount:  hcoMRs.length,
    hcpMRCount:  hcpMRs.length,
    phMRCount:   phMRs.length,
  };
};
