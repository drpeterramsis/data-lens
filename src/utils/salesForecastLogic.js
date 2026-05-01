
/**
 * src/utils/salesForecastLogic.js
 * Core engine for Sales Forecast Tool calculations
 */

export const cleanValue = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  // Remove commas and handle percentage strings if any
  const cleaned = val.toString().replace(/,/g, '').replace('%', '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const parseNameAndArea = (str) => {
  if (!str) return { name: 'Unknown', sub: 'Unknown' };
  // Format: "Name (Area Name)"
  const parts = str.split('(');
  const name = parts[0].trim();
  let sub = 'Unknown';
  if (parts.length > 1) {
    sub = parts[1].replace(')', '').trim();
  }
  return { name, sub };
};

export const calculatePeriodProgress = (currentDay, totalDays) => {
  return (currentDay / totalDays) * 100;
};

export const projectValue = (actual, progressPercent) => {
  if (progressPercent <= 0) return actual;
  return (actual / (progressPercent / 100));
};

export const getStatusDetails = (projectedAchievement) => {
  if (projectedAchievement >= 100) return { label: '🏆 Exceeding', color: 'text-purple-600', bg: 'bg-purple-100', status: 'exceeding' };
  if (projectedAchievement >= 95) return { label: '✅ On Track', color: 'text-emerald-600', bg: 'bg-emerald-100', status: 'on_track' };
  if (projectedAchievement >= 75) return { label: '⚠️ At Risk', color: 'text-amber-600', bg: 'bg-amber-100', status: 'at_risk' };
  return { label: '🔴 Critical', color: 'text-red-600', bg: 'bg-red-100', status: 'critical' };
};

export const getDifficultyDetails = (dailyRateNeeded, currentDailyRate) => {
  if (dailyRateNeeded <= 0) return { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-100' };
  if (dailyRateNeeded <= currentDailyRate * 1.2) return { label: 'Easy', color: 'text-emerald-600', bg: 'bg-emerald-100' };
  if (dailyRateNeeded <= currentDailyRate * 1.5) return { label: 'Moderate', color: 'text-blue-600', bg: 'bg-blue-100' };
  if (dailyRateNeeded <= currentDailyRate * 2.0) return { label: 'Hard', color: 'text-amber-600', bg: 'bg-amber-100' };
  return { label: 'Impossible', color: 'text-red-600', bg: 'bg-red-100' };
};

export const getRiskLevel = (achievement) => {
  if (achievement >= 100) return 'safe';
  if (achievement >= 95) return 'low';
  if (achievement >= 75) return 'medium';
  return 'high';
};

export const getQuadrant = (current, projected) => {
  if (current >= 100 && projected >= 100) return 'Safe Zone';
  if (current < 100 && projected >= 100) return 'Recovering';
  if (current < 100 && projected < 100 && projected >= 75) return 'At Risk';
  return 'Critical';
};
