// src/utils/forecastEngine.js

import { getRemainingWorkingDays, isHCOWorkingDay,
         isHCPWorkingDay, isPHWorkingDay } from "./periodRules";

export const calculateForecast = ({
  mrStats,
  targets,
  lastReportDate,
  endDate,
  dmMeetings,
  holidays,
  mrVacations,
  dataFromDate,   // start of data period
}) => {
  if (!mrStats?.length || !lastReportDate || !endDate)
    return [];

  return mrStats.map((mr) => {
    const mrVacs = mrVacations.filter(
      v => v.mrName === mr.mrName
    );

    // Working days already worked in data period
    // (from dataFromDate to lastReportDate)
    const workedHCODays = mr.hcoDays;
    const workedPHDays  = mr.phDays;
    const workedHCPDays = mr.hcpDays;

    // Remaining working days after adjustments
    const remHCO = getRemainingWorkingDays(
      lastReportDate, endDate, "HCO",
      dmMeetings, holidays, mrVacs
    );
    const remPH = getRemainingWorkingDays(
      lastReportDate, endDate, "PH",
      dmMeetings, holidays, mrVacs
    );
    const remHCP = getRemainingWorkingDays(
      lastReportDate, endDate, "HCP",
      dmMeetings, holidays, mrVacs
    );

    // Total working days entire period
    const totalHCODays = workedHCODays + remHCO;
    const totalPHDays  = workedPHDays  + remPH;
    const totalHCPDays = workedHCPDays + remHCP;

    // Full period targets
    const fullHCOTarget = targets.hcoPerDay * totalHCODays;
    const fullPHTarget  = targets.phPerDay  * totalPHDays;
    const fullHCPTarget = targets.hcpPerDay * totalHCPDays;

    // Deficit (how many calls behind)
    const hcoDeficit = fullHCOTarget - mr.totalHCO;
    const phDeficit  = fullPHTarget  - mr.totalPH;
    const hcpDeficit = fullHCPTarget - mr.totalHCP;

    // Required rate formula:
    // requiredRate = (deficit + target × remaining) / remaining
    // = deficit/remaining + target
    const calcRequired = (deficit, remaining, target) => {
      if (deficit <= 0) return { rate: 0, achieved: true };
      if (remaining <= 0) return { 
        rate: null, achieved: false, impossible: true 
      };
      const rate = parseFloat(
        ((deficit / remaining) + target).toFixed(2)
      );
      return { rate, achieved: false };
    };

    const hcoForecast = calcRequired(
      hcoDeficit, remHCO, targets.hcoPerDay
    );
    const phForecast  = calcRequired(
      phDeficit,  remPH,  targets.phPerDay
    );
    const hcpForecast = calcRequired(
      hcpDeficit, remHCP, targets.hcpPerDay
    );

    // Status per type
    const getStatus = (forecast, target) => {
      if (forecast.achieved) return "achieved";
      if (forecast.impossible) return "impossible";
      if (forecast.rate <= target) return "ontrack";
      if (forecast.rate <= target * 1.5) return "atrisk";
      return "critical";
    };

    const overallStatus = (() => {
      const statuses = [
        getStatus(hcoForecast, targets.hcoPerDay),
        getStatus(phForecast,  targets.phPerDay),
        getStatus(hcpForecast, targets.hcpPerDay),
      ];
      if (statuses.some(s => s === "impossible")) 
        return "impossible";
      if (statuses.some(s => s === "critical"))   
        return "critical";
      if (statuses.some(s => s === "atrisk"))     
        return "atrisk";
      if (statuses.every(s => s === "achieved" || 
          s === "ontrack")) return "ontrack";
      return "ontrack";
    })();

    return {
      mrName:       mr.mrName,
      lineName:     mr.lineName,

      // HCO
      hcoDone:      mr.totalHCO,
      hcoWorkedDays: workedHCODays,
      hcoActualRate: mr.hcoRate,
      hcoFullTarget: parseFloat(fullHCOTarget.toFixed(1)),
      hcoDeficit:   parseFloat(hcoDeficit.toFixed(1)),
      hcoRemDays:   remHCO,
      hcoRequired:  hcoForecast.rate,
      hcoAchieved:  hcoForecast.achieved,
      hcoStatus:    getStatus(hcoForecast, targets.hcoPerDay),

      // PH
      phDone:       mr.totalPH,
      phWorkedDays:  workedPHDays,
      phActualRate:  mr.phRate,
      phFullTarget:  parseFloat(fullPHTarget.toFixed(1)),
      phDeficit:    parseFloat(phDeficit.toFixed(1)),
      phRemDays:    remPH,
      phRequired:   phForecast.rate,
      phAchieved:   phForecast.achieved,
      phStatus:     getStatus(phForecast, targets.phPerDay),

      // HCP
      hcpDone:      mr.totalHCP,
      hcpWorkedDays: workedHCPDays,
      hcpActualRate: mr.hcpRate,
      hcpFullTarget: parseFloat(fullHCPTarget.toFixed(1)),
      hcpDeficit:   parseFloat(hcpDeficit.toFixed(1)),
      hcpRemDays:   remHCP,
      hcpRequired:  hcpForecast.rate,
      hcpAchieved:  hcpForecast.achieved,
      hcpStatus:    getStatus(hcpForecast, targets.hcpPerDay),

      overallStatus,
    };
  });
};
