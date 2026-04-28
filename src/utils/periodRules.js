// src/utils/periodRules.js
import { safeStr } from "./safeCSV";
import { safeParseDate, safeGetDayName } from "./dateHelpers";

const parseDateSafe = (dateStr) => {
  return safeParseDate(dateStr);
};

export const getDayOfWeek = (dateStr) => {
  const d = parseDateSafe(dateStr);
  return d ? d.getDay() : 0;
};

export const isHCPWorkingDay = (dateStr) => {
  const d = parseDateSafe(dateStr);
  if (!d) return false;
  const day = d.getDay();
  // Sat=6, Sun=0, Mon=1, Tue=2, Wed=3
  return [6, 0, 1, 2, 3].includes(day);
};

export const isHCOWorkingDay = (dateStr) => {
  const d = parseDateSafe(dateStr);
  if (!d) return false;
  const day = d.getDay();
  // Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4
  return [6, 0, 1, 2, 3, 4].includes(day);
};

export const isPHWorkingDay = (dateStr) => {
  return isHCOWorkingDay(dateStr);
};

export const getDayLabel = (dateStr) => {
  const d = parseDateSafe(dateStr);
  if (!d) return "--";
  const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return names[d.getDay()];
};

export const getDayName = (dateInput) => {
  const name = safeGetDayName(dateInput, 'long');
  return name || "Unknown";
};

export const isFriday = (dateStr) => {
  return getDayOfWeek(dateStr) === 5;
};

export const isThursday = (dateStr) => {
  return getDayOfWeek(dateStr) === 4;
};

// Get all dates in range
export const getDatesInRange = (from, to) => {
  if (!from || !to) return [];
  const start = parseDateSafe(from);
  const end   = parseDateSafe(to);
  
  if (!start || !end) return [];
  if (start > end) return [];

  const dates = [];
  const cur = new Date(start);
  
  // Safety limit to prevent infinite loops (e.g. 1 year max)
  let guard = 0;
  while (cur <= end && guard < 1000) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return dates;
};

// Count working days remaining (with adjustments)
export const getRemainingWorkingDays = (
  from, to, type,
  dmMeetings = [],
  holidays = [],
  mrVacations = []
) => {
  const dates = getDatesInRange(from, to);
  return dates.filter(d => {
    // Base schedule
    let ok = false;
    if (type === "HCO") ok = isHCOWorkingDay(d);
    if (type === "PH")  ok = isPHWorkingDay(d);
    if (type === "HCP") ok = isHCPWorkingDay(d);
    if (!ok) return false;

    // DM Meetings
    const dm = dmMeetings.find(m => m.date === d);
    if (dm) {
      if (type === "HCO") return false;
      if (type === "PH" && dm.phOff) return false;
    }

    // Public Holidays
    const h = holidays.find(x => x.date === d);
    if (h) {
      if (h.type === "full") return false;
      if (h.type === "am" && 
          (type === "HCO" || type === "PH")) return false;
      if (h.type === "pm" && type === "HCP") return false;
    }

    // MR Vacations
    const vac = mrVacations.find(v =>
      d >= v.from && d <= v.to
    );
    if (vac) {
      if (vac.type === "full") return false;
      if (vac.type === "am" && 
          (type === "HCO" || type === "PH")) return false;
      if (vac.type === "pm" && type === "HCP") return false;
    }

    return true;
  }).length;
};

export const countWorkingDays = (dates, type, dmMeetings = [], holidays = []) => {
  return dates.filter(d => {
    let available = false;
    if (type === 'HCP') available = isHCPWorkingDay(d);
    if (type === 'HCO') available = isHCOWorkingDay(d);
    if (type === 'PH')  available = isPHWorkingDay(d);
    if (!available) return false;

    const holiday = holidays.find(h => h.date === d);
    if (holiday) {
      if (holiday.type === 'full' || holiday.type === 'Full Day') return false;
      if ((holiday.type === 'am' || holiday.type === 'Half Day AM') && 
          (type === 'HCO' || type === 'PH')) return false;
      if ((holiday.type === 'pm' || holiday.type === 'Half Day PM') && type === 'HCP') return false;
    }

    const dm = dmMeetings.find(m => m.date === d);
    if (dm) {
      if (type === 'HCO') return false;
      if (type === 'PH' && dm.phOff) return false;
    }
    return true;
  }).length;
};


// Helper exports
export const hasHCPActivity = isHCPWorkingDay;
export const hasHCOActivity = isHCOWorkingDay;


