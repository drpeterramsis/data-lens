
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
  if (!from || !to || from > to) return [];
  const dates = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  let guard = 0;
  while (cur <= end && guard < 500) {
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
    const mrVacs = mrVacations.filter(
      v => v.mrName === mrName && date >= v.from && date <= v.to
    );
    for (const vac of mrVacs) {
      if (vac.type === "full") return false;
      if (vac.type === "am" && (type === "HCO" || type === "PH")) return false;
      if (vac.type === "pm" && type === "HCP") return false;
    }

    return true;
  };

  const getNextDay = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  return mrStats.map(mr => {
    const lastDate = mr.lastDate;
    if (!lastDate) {
      return { mrName: mr.mrName, skipped: true };
    }

    const fromDate = getNextDay(lastDate);

    if (fromDate > periodEndDate) {
      return {
        mrName:      mr.mrName,
        lineName:    mr.lineName,
        lastDate,
        fromDate,
        hcoDone:     mr.totalHCO || 0,
        phDone:      mr.totalPH || 0,
        hcpDone:     mr.totalHCP || 0,
        hcoRemDays:  0,
        phRemDays:   0,
        hcpRemDays:  0,
        hcoRequired: null,
        phRequired:  null,
        hcpRequired: null,
        hcoStatus:   mr.totalHCO >= (targets.hcoPerDay || targets.hco || 0) * (mr.hcoDays || 0) ? "achieved" : "impossible",
        phStatus:    mr.totalPH >= (targets.phPerDay || targets.ph || 0) * (mr.phDays || 0) ? "achieved" : "impossible",
        hcpStatus:   mr.totalHCP >= (targets.hcpPerDay || targets.hcp || 0) * (mr.hcpDays || 0) ? "achieved" : "impossible",
        overallStatus: "impossible",
      };
    }

    const remainingDates = getDatesInRange(fromDate, periodEndDate);

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
      fromDate,

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
