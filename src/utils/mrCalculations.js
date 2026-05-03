import {
  isHCPWorkingDay,
  isHCOWorkingDay,
  isPHWorkingDay,
} from "./periodRules";
import { isCoached, safeStr } from "./safeCSV";
import { formatKpi } from "./formatNumber";

export const getRateStatus = (rate, target) => {
  if (!target || target === 0) {
    return {
      color: "text-gray-600",
      bg: "bg-gray-50",
      icon: "",
      status: "gray"
    };
  }
  const pct = (rate / target) * 100;
  if (pct >= 100) return {
    color: "text-green-700",
    bg: "bg-green-50",
    icon: "✅",
    status: "green"
  };
  if (pct >= 90) return {
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    icon: "🟡",
    status: "yellow"
  };
  return {
    color: "text-red-600",
    bg: "bg-red-50",
    icon: "🔴",
    status: "red"
  };
};

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
      ? (totalHCO / hcoDates.length) : 0;
    const phRate  = phDates.length
      ? (totalPH  / phDates.length)  : 0;
    const hcpRate = hcpDates.length
      ? (totalHCP / hcpDates.length) : 0;

    // Coaching days = ANY day with at least 1 coached visit
    const coachingDaysList = allDates.filter(d =>
      dateMap[d].coached >= 1
    );

    const coachingDays = coachingDaysList.length;
    const coachedVisits = totalCoached;

    const lastDate = allDates[allDates.length-1] ?? "";
    const fromDate = allDates[0] ?? "";

    return {
      mrName, lineName,
      totalHCO, totalPH, totalHCP,
      hcoRate, phRate, hcpRate,
      hcoDays:       hcoDates.length,
      phDays:        phDates.length,
      hcpDays:       hcpDates.length,
      coachingDays,
      coachedVisits,
      coachingDates: coachingDaysList,
      totalCoached,
      hcoCoached, phCoached, hcpCoached,
      lastDate,
      fromDate,
      dateMap,
      allDates,
      totalCalls: totalHCO + totalPH + totalHCP,
      workedDays: allDates.length, // Add total working days for display 'mr.workedDays'
      totalVisits: totalHCO + totalPH + totalHCP, // Same as totalCalls for prompt compatibility
      hcoActualRate: hcoRate, // aliases for the prompt card
      phActualRate: phRate,
      hcpActualRate: hcpRate,
    };
  });
};

/**
 * v4.9 Status Logic — WHAT EACH LABEL MEANS
 */
export const getStatusInfo = (mr, targets) => {
  const hcoPct = targets.hcoPerDay > 0
    ? Math.round((mr.hcoActualRate / targets.hcoPerDay) * 100)
    : 100;

  const phPct = targets.phPerDay > 0
    ? Math.round((mr.phActualRate / targets.phPerDay) * 100)
    : 100;

  const hcpPct = targets.hcpPerDay > 0
    ? Math.round((mr.hcpActualRate / targets.hcpPerDay) * 100)
    : 100;

  const worstPct = Math.min(hcoPct, phPct, hcpPct);

  // ── ACHIEVED ──
  // All types: done >= total target
  if (
    mr.totalHCO >= targets.hcoPerDay * mr.hcoDays &&
    mr.totalPH >= targets.phPerDay * mr.phDays &&
    mr.totalHCP >= targets.hcpPerDay * mr.hcpDays
  ) {
    return "achieved";
  }

  // ── ON TRACK ──
  // Worst performing type >= 90% of target rate
  if (worstPct >= 90) return "on_track";

  // ── WARNING ──
  // Worst >= 75% but < 90%
  if (worstPct >= 75) return "warning";

  // ── AT RISK ──
  // Worst >= 50% but < 75%
  if (worstPct >= 50) return "at_risk";

  // ── CRITICAL ──
  // Worst < 50% of target rate
  return "critical";
};

/**
 * v4.9 Tooltip Content Builder for Overall Status
 */
const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch { return d; }
};

export const buildStatusTooltip = (mr, targets, status) => {
  const hcoPct = targets.hcoPerDay > 0
    ? Math.round((mr.hcoActualRate / targets.hcoPerDay) * 100)
    : 100;
  const phPct = targets.phPerDay > 0
    ? Math.round((mr.phActualRate / targets.phPerDay) * 100)
    : 100;
  const hcpPct = targets.hcpPerDay > 0
    ? Math.round((mr.hcpActualRate / targets.hcpPerDay) * 100)
    : 100;

  const worstPct = Math.min(hcoPct, phPct, hcpPct);

  const colorMap = {
    achieved: "green",
    on_track: "green",
    warning:  "yellow",
    at_risk:  "orange",
    critical: "red",
  };

  const titleMap = {
    achieved: "✅ Why Achieved?",
    on_track: "🟢 Why On Track?",
    warning:  "🟡 Why Warning?",
    at_risk:  "🟠 Why At Risk?",
    critical: "🔴 Why Critical?",
  };

  const thresholdLine = {
    achieved: "All visit types met their total target",
    on_track: "Lowest performing type ≥ 90% of daily target",
    warning:  "Lowest performing type is 75–89% of daily target",
    at_risk:  "Lowest performing type is 50–74% of daily target",
    critical: "Lowest performing type is below 50% of daily target",
  };

  const lines = [
    `Rule: ${thresholdLine[status]}`,
    "─────────────────────",
    `🏥 HCO: ${formatKpi(mr.hcoActualRate)}/day vs target ${formatKpi(targets.hcoPerDay)}/day = ${hcoPct}%` +
      (mr.hcoRequired ? ` · needs ${formatKpi(mr.hcoRequired)}/day` : ""),
    `💊 PH: ${formatKpi(mr.phActualRate)}/day vs target ${formatKpi(targets.phPerDay)}/day = ${phPct}%` +
      (mr.phRequired ? ` · needs ${formatKpi(mr.phRequired)}/day` : ""),
    `👤 HCP: ${formatKpi(mr.hcpActualRate)}/day vs target ${formatKpi(targets.hcpPerDay)}/day = ${hcpPct}%` +
      (mr.hcpRequired ? ` · needs ${formatKpi(mr.hcpRequired)}/day` : ""),
    "─────────────────────",
    `Weakest: ${worstPct}% achievement rate`,
    `Worked: ${mr.workedDays} days · Last visit: ${formatDate(mr.lastDate)}`,
  ];

  return {
    title: titleMap[status],
    color: colorMap[status],
    lines,
  };
};

/**
 * v4.9 Tooltip Content Builder for Forecast Required Cell
 */
export const buildRequiredTooltip = (
  required, target, status,
  done, totalTarget, remDays, type
) => {
  if (status === "achieved") return {
    title: "✅ Already Achieved",
    color: "green",
    lines: [
      `${type} visits done: ${done}`,
      `Total target was: ${totalTarget}`,
      `Done ≥ target → no more visits needed`,
    ],
  };

  if (status === "impossible" || remDays === 0)
    return {
      title: "❌ No Remaining Days",
      color: "gray",
      lines: [
        `No working days left in period`,
        `${type} done: ${done} / ${totalTarget}`,
        `Period has ended for this MR`,
      ],
    };

  const deficit = totalTarget - done;
  const color   = required <= target ? "green" : "red";
  const feasible = required <= target ? "Achievable ✓" : "Hard to achieve ✗";

  return {
    title: required <= target ? `✅ ${type} Rate Achievable` : `⚠️ ${type} Rate Too High`,
    color,
    lines: [
      `Visits done so far: ${done}`,
      `Total target for period: ${totalTarget}`,
      `Still needed: ${deficit} more visits`,
      `Remaining working days: ${remDays}`,
      `Required rate: ${deficit} ÷ ${remDays} = ${formatKpi(deficit / remDays)}/day`,
      `Daily target: ${formatKpi(target)}/day`,
      `Status: ${feasible}`,
      required > target
        ? `Exceeds target by ${formatKpi(required - target)}/day`
        : `Within target — keep current pace`,
    ],
  };
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
    ? (arr.reduce((s,m) => s + m[key], 0) / arr.length)
    : 0;

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
