
export const TARGETS = {
  hco: 2,   // visits per HCO working day
  ph:  10,  // visits per PH working day
  hcp: 9,   // visits per HCP working day
};

export const isHCODay = (d) => {
  const dow = new Date(d + "T00:00:00").getDay();
  return [0, 1, 2, 3, 4, 6].includes(dow); // Sat-Thu
};

export const isPHDay = isHCODay; // Same as HCO base schedule

export const isHCPDay = (d) => {
  const dow = new Date(d + "T00:00:00").getDay();
  return [0, 1, 2, 3, 6].includes(dow); // Sat-Wed (NOT Thu, NOT Fri)
};

const getDatesInRange = (from, to) => {
  const dates = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  let guard = 0;
  while (cur <= end && guard < 400) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return dates;
};

export const calculateForecast = ({
  mrStats,
  periodEndDate,
  dmMeetings = [], // [{date, hcoOff:true, phOff, hcpOff}]
  holidays = [], // [{date, type:"full"|"am"|"pm"}]
  mrVacations = [], // [{mrName, from, to, type:"full"|"am"|"pm"}]
  targets = TARGETS,
}) => {
  if (!mrStats?.length || !periodEndDate) return [];

  const isAvailableForType = (date, type, mrName) => {
    const dow = new Date(date + "T00:00:00").getDay();

    // Base schedule
    if (type === "HCO" || type === "PH") {
      if (dow === 5) return false; // Friday off
    }
    if (type === "HCP") {
      if (dow === 5 || dow === 4) return false; // Friday and Thursday off
    }

    // Public holidays
    const hol = holidays.find(h => h.date === date);
    if (hol) {
      if (hol.type === "full") return false;
      if (hol.type === "am" && (type === "HCO" || type === "PH")) return false;
      if (hol.type === "pm" && type === "HCP") return false;
    }

    // DM Meetings
    const dm = dmMeetings.find(m => m.date === date);
    if (dm) {
      if (type === "HCO") return false; // always off
      if (type === "PH" && dm.phOff) return false;
      if (type === "HCP" && dm.hcpOff) return false;
    }

    // MR personal vacations
    const vac = mrVacations.filter(
      v => v.mrName === mrName && date >= v.from && date <= v.to
    );
    for (const v of vac) {
      if (v.type === "full") return false;
      if (v.type === "am" && (type === "HCO" || type === "PH")) return false;
      if (v.type === "pm" && type === "HCP") return false;
    }

    return true;
  };

  return mrStats.map(mr => {
    const lastDate = mr.lastDate;
    if (!lastDate || lastDate >= periodEndDate) {
      return { mrName: mr.mrName, skipped: true };
    }

    // Build remaining dates
    const nextDay = new Date(lastDate + "T00:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    const remStartDate = nextDay.toISOString().split("T")[0];

    const remainingDates = getDatesInRange(remStartDate, periodEndDate);

    // Count remaining working days per type
    const remHCO = remainingDates.filter(d => isAvailableForType(d, "HCO", mr.mrName)).length;
    const remPH = remainingDates.filter(d => isAvailableForType(d, "PH", mr.mrName)).length;
    const remHCP = remainingDates.filter(d => isAvailableForType(d, "HCP", mr.mrName)).length;

    // Worked days from CSV
    const workedHCO = mr.hcoDays || 0;
    const workedPH = mr.phDays || 0;
    const workedHCP = mr.hcpDays || 0;

    // Total working days (entire period)
    const totalHCODays = workedHCO + remHCO;
    const totalPHDays = workedPH + remPH;
    const totalHCPDays = workedHCP + remHCP;

    // Full period targets (total visits)
    const hcoTotalTarget = (targets.hcoPerDay || targets.hco || 0) * totalHCODays;
    const phTotalTarget = (targets.phPerDay || targets.ph || 0) * totalPHDays;
    const hcpTotalTarget = (targets.hcpPerDay || targets.hcp || 0) * totalHCPDays;

    // Deficit
    const hcoDeficit = hcoTotalTarget - mr.totalHCO;
    const phDeficit = phTotalTarget - mr.totalPH;
    const hcpDeficit = hcpTotalTarget - mr.totalHCP;

    const calcRequired = (deficit, remDays, targetVal) => {
      if (deficit <= 0) return { rate: 0, status: "achieved" };
      if (remDays <= 0) return { rate: null, status: "impossible" };
      const rate = +(deficit / remDays).toFixed(2);
      let status;
      if (rate <= targetVal) status = "on_track";
      else if (rate <= targetVal * 1.25) status = "warning";
      else if (rate <= targetVal * 1.5) status = "at_risk";
      else status = "critical";
      return { rate, status };
    };

    const hcoForecast = calcRequired(hcoDeficit, remHCO, (targets.hcoPerDay || targets.hco || 0));
    const phForecast = calcRequired(phDeficit, remPH, (targets.phPerDay || targets.ph || 0));
    const hcpForecast = calcRequired(hcpDeficit, remHCP, (targets.hcpPerDay || targets.hcp || 0));

    // Overall status (worst case)
    const statusOrder = ["achieved", "on_track", "warning", "at_risk", "critical", "impossible"];
    const worstStatus = [hcoForecast.status, phForecast.status, hcpForecast.status].reduce((worst, s) =>
      statusOrder.indexOf(s) > statusOrder.indexOf(worst) ? s : worst
      , "achieved");

    return {
      mrName: mr.mrName,
      lineName: mr.lineName,
      lastDate,
      fromDate: mr.fromDate,

      // HCO
      hcoDone: mr.totalHCO,
      hcoWorkedDays: workedHCO,
      hcoActualRate: mr.hcoRate,
      hcoTotalDays: totalHCODays,
      hcoTotalTarget: +hcoTotalTarget.toFixed(0),
      hcoDeficit: +hcoDeficit.toFixed(0),
      hcoRemDays: remHCO,
      hcoRequired: hcoForecast.rate,
      hcoStatus: hcoForecast.status,

      // PH
      phDone: mr.totalPH,
      phWorkedDays: workedPH,
      phActualRate: mr.phRate,
      phTotalDays: totalPHDays,
      phTotalTarget: +phTotalTarget.toFixed(0),
      phDeficit: +phDeficit.toFixed(0),
      phRemDays: remPH,
      phRequired: phForecast.rate,
      phStatus: phForecast.status,

      // HCP
      hcpDone: mr.totalHCP,
      hcpWorkedDays: workedHCP,
      hcpActualRate: mr.hcpRate,
      hcpTotalDays: totalHCPDays,
      hcpTotalTarget: +hcpTotalTarget.toFixed(0),
      hcpDeficit: +hcpDeficit.toFixed(0),
      hcpRemDays: remHCP,
      hcpRequired: hcpForecast.rate,
      hcpStatus: hcpForecast.status,

      overallStatus: worstStatus,
      remainingDates,
    };
  });
};

export const STATUS_CONFIG = {
  achieved: { label: "✅ Achieved", bg: "#D1FAE5", text: "#065F46" },
  on_track: { label: "🟢 On Track", bg: "#D1FAE5", text: "#065F46" },
  warning: { label: "🟡 Warning", bg: "#FEF9C3", text: "#854D0E" },
  at_risk: { label: "🟠 At Risk", bg: "#FED7AA", text: "#9A3412" },
  critical: { label: "🔴 Critical", bg: "#FEE2E2", text: "#991B1B" },
  impossible: { label: "❌ No Days", bg: "#F3F4F6", text: "#6B7280" },
};
