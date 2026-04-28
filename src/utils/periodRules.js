// src/utils/periodRules.js
import { safeStr } from "./safeCSV";

export const DAYS = {
  SUN: 0, MON: 1, TUE: 2, WED: 3,
  THU: 4, FRI: 5, SAT: 6
};

// Working day rules per Data Lens v3.2
export const isHCPWorkingDay = (dateInput) => {
  if (!dateInput) return false;
  const day = new Date(dateInput).getDay();
  // HCP: Sat(6), Sun(0), Mon(1), Tue(2), Wed(3)
  return [0, 1, 2, 3, 6].includes(day);
};

export const isHCOWorkingDay = (dateInput) => {
  if (!dateInput) return false;
  const day = new Date(dateInput).getDay();
  // HCO: Sat(6), Sun(0), Mon(1), Tue(2), Wed(3), Thu(4)
  return [0, 1, 2, 3, 4, 6].includes(day);
};

export const isPHWorkingDay = (dateInput) => {
  return isHCOWorkingDay(dateInput); // Same schedule
};

export const isFriday = (dateInput) => {
  return new Date(dateInput).getDay() === 5;
};

export const isThursday = (dateInput) => {
  return new Date(dateInput).getDay() === 4;
};

export const getDayName = (dateInput) => {
  return new Date(dateInput).toLocaleDateString(
    'en-US', { weekday: 'long' }
  );
};

export const getDatesInRange = (from, to) => {
  const dates = [];
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export const countWorkingDays = (dates, type, dmMeetings = [], holidays = []) => {
  return dates.filter(d => {
    // Check base schedule
    let available = false;
    if (type === 'HCP') available = isHCPWorkingDay(d);
    if (type === 'HCO') available = isHCOWorkingDay(d);
    if (type === 'PH')  available = isPHWorkingDay(d);
    if (!available) return false;

    // Check public holidays
    const holiday = holidays.find(h => h.date === d);
    if (holiday) {
      if (holiday.type === 'full' || holiday.type === 'Full Day') return false;
      if ((holiday.type === 'am' || holiday.type === 'Half Day AM') && 
          (type === 'HCO' || type === 'PH')) return false;
      if ((holiday.type === 'pm' || holiday.type === 'Half Day PM') && type === 'HCP') return false;
    }

    // Check DM meetings (HCO always off, PH optional)
    const dm = dmMeetings.find(m => m.date === d);
    if (dm) {
      if (type === 'HCO') return false;
      if (type === 'PH' && dm.phOff) return false;
    }

    return true;
  }).length;
};

// Aliases for compatibility
export const isWorkingDayHCP = isHCPWorkingDay;
export const isWorkingDayHCO = isHCOWorkingDay;
export const isWorkingDayPH = isPHWorkingDay;

export const classifyFullHoliday = (dateObj) => {
  return false;
};

export const isAMPeriod = (interactionType) => {
  return interactionType === 'HCO' || interactionType === 'Pharmacy';
};

export const isPMPeriod = (interactionType) => {
  return interactionType === 'HCP';
};
