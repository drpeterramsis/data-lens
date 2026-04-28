import {
  isHCPWorkingDay,
  isHCOWorkingDay,
  isPHWorkingDay,
} from "./periodRules";
import { isCoached, safeStr } from "./safeCSV";

export const calculateMRStats = (filteredRows) => {
  if (!filteredRows?.length) return [];

  // Group by MR
  const mrMap = {};
  filteredRows.forEach(row => {
    const mr   = row.MrName;
    const type = row.InteractionType;
    const date = row.ReportDate;
    const id   = row.InteractionId;

    if (!mr || !type || !date || !id) return;

    if (!mrMap[mr]) mrMap[mr] = {
      mrName: mr,
      lineName: row.LineName || "",
      dateMap: {},
    };

    const dm = mrMap[mr].dateMap;
    if (!dm[date]) dm[date] = {
      hco: 0, ph: 0, hcp: 0,
      coached: 0,
      hcoCoached: 0, phCoached: 0, hcpCoached: 0,
      customers: [],
    };

    const coached = isCoached(row.IsMRCoachingSubmitted);

    if (type === "HCO") {
      dm[date].hco++;
      if (coached) {
        dm[date].coached++;
        dm[date].hcoCoached++;
      }
    } else if (type === "Pharmacy") {
      dm[date].ph++;
      if (coached) {
        dm[date].coached++;
        dm[date].phCoached++;
      }
    } else if (type === "HCP") {
      dm[date].hcp++;
      if (coached) {
        dm[date].coached++;
        dm[date].hcpCoached++;
      }
    }

    dm[date].customers.push({
      interactionId: row.InteractionId,
      name:          row.CustomerName,
      customerId:    row.CustomerId,
      type,
      grade:         row.CustomerGrade,
      specialty:     row.Specialty,
      site:          row.InteractionVisitedSite,
      coached,
      coachingType:  row.CoachingType,
      comment:       row.Comment,
      isManagerCoached:
        isCoached(row.IsManagerCoachingSubmitted),
    });
  });

  return Object.values(mrMap).map(({ mrName,
    lineName, dateMap }) => {
    
    const allDates = Object.keys(dateMap).sort();

    // Totals
    let totalHCO=0, totalPH=0, totalHCP=0;
    let totalCoached=0;
    let hcoCoached=0, phCoached=0, hcpCoached=0;

    allDates.forEach(d => {
      totalHCO     += dateMap[d].hco;
      totalPH      += dateMap[d].ph;
      totalHCP     += dateMap[d].hcp;
      totalCoached += dateMap[d].coached;
      hcoCoached   += dateMap[d].hcoCoached;
      phCoached    += dateMap[d].phCoached;
      hcpCoached   += dateMap[d].hcpCoached;
    });

    // Working days (only count days with visits on valid schedule)
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
      ? +(totalHCO / hcoDates.length).toFixed(1) : 0;
    const phRate  = phDates.length
      ? +(totalPH  / phDates.length).toFixed(1)  : 0;
    const hcpRate = hcpDates.length
      ? +(totalHCP / hcpDates.length).toFixed(1) : 0;

    // Coaching days = dates with >= 4 coached visits
    const coachingDaysList = allDates.filter(d =>
      dateMap[d].coached >= 4
    );

    const lastDate = allDates[allDates.length-1] ?? "";

    return {
      mrName, lineName,
      totalHCO, totalPH, totalHCP,
      hcoRate, phRate, hcpRate,
      hcoDays:       hcoDates.length,
      phDays:        phDates.length,
      hcpDays:       hcpDates.length,
      coachingDays:  coachingDaysList.length,
      coachingDates: coachingDaysList,
      totalCoached,
      hcoCoached, phCoached, hcpCoached,
      lastDate,
      dateMap,
      allDates,
      totalCalls: totalHCO + totalPH + totalHCP,
    };
  });
};

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

  const coachingDays = mrStats.reduce((s, mr) => s + mr.coachingDays, 0);
  const coachingMRs = mrStats.filter(mr => mr.coachingDays > 0).length;
  const hcoMRs = mrStats.filter(mr => mr.hcoDays > 0);
  const phMRs  = mrStats.filter(mr => mr.phDays  > 0);
  const hcpMRs = mrStats.filter(mr => mr.hcpDays > 0);

  const avg = (arr, key) => arr.length
    ? (arr.reduce((s,m) => s + m[key], 0) / arr.length).toFixed(1)
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
