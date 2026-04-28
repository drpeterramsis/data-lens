// src/utils/periodRules.js
import { safeStr } from "./safeCSV";

export const getDayType = (dateObj) => {
  const day = dateObj.getDay();
  // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  return day;
};

export const isWorkingDayHCP = (dateObj) => {
  const day = getDayType(dateObj);
  // HCP working day = not Friday AND not Thursday
  return day !== 5 && day !== 4;
};

export const isWorkingDayHCO = (dateObj) => {
  const day = getDayType(dateObj);
  // HCO working day = not Friday
  return day !== 5;
};

export const isWorkingDayPH = (dateObj) => {
  // Same as HCO
  return isWorkingDayHCO(dateObj);
};

export const classifyFullHoliday = (dateObj) => {
  // A place to add logic checking against specific dates
  return false;
};

export const isAMPeriod = (interactionType) => {
  return interactionType === 'HCO' || interactionType === 'Pharmacy';
};

export const isPMPeriod = (interactionType) => {
  return interactionType === 'HCP';
};
