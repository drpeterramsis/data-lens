/**
 * Infers year and month from a filename based on common patterns.
 * 
 * Patterns supported:
 * - YYYY-MM (e.g., 2024-11)
 * - YYYY_MM (2024_11)
 * - YYYYMM (202411)
 * - MonthName YYYY (e.g., Nov 2024, November-2024, 2024 Nov)
 * 
 * Returns { year, month, key, label } or null
 */
export const inferPeriodFromFilename = (filename) => {
  if (!filename) return null;

  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const lower = filename.toLowerCase();

  // 1. Try YYYY-MM or YYYY_MM or YYYY.MM
  const yyyyMmMatch = filename.match(/(?:^|[\s_\-.])(20\d{2})[\s_\-.]?(0[1-9]|1[0-2])(?:$|[\s_\-.])/);
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10);
    const month = parseInt(yyyyMmMatch[2], 10);
    return formatResult(year, month);
  }

  // 2. Try YYYYMM (6 digits starting with 20)
  const yyyymmMatch = filename.match(/(?:^|[\s_\-.])(20\d{2})(0[1-9]|1[0-2])(?:$|[\s_\-.])/);
  if (yyyymmMatch) {
    const year = parseInt(yyyymmMatch[1], 10);
    const month = parseInt(yyyymmMatch[2], 10);
    return formatResult(year, month);
  }

  // 3. Try Month Name + YYYY
  for (let i = 0; i < monthNames.length; i++) {
    const mName = monthNames[i];
    const sName = shortMonths[i];
    
    // Pattern: Month YYYY or YYYY Month
    const monthPattern = new RegExp(`(${mName}|${sName})[\\s_\\-.]*(20\\d{2})|(20\\d{2})[\\s_\\-.]*(${mName}|${sName})`, 'i');
    const match = filename.match(monthPattern);
    
    if (match) {
      const yearStr = match[2] || match[3];
      const year = parseInt(yearStr, 10);
      return formatResult(year, i + 1);
    }
  }

  return null;
};

const formatResult = (year, month) => {
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];
  const monthStr = month.toString().padStart(2, '0');
  const key = `${year}-${monthStr}`;
  const label = `${monthNames[month - 1]} ${year}`;
  return { year, month, key, label };
};

/**
 * Infers a period range from a list of filenames.
 */
export const inferPeriodFromFiles = (filenames) => {
  if (!filenames || filenames.length === 0) return null;
  
  const periods = filenames
    .map(f => inferPeriodFromFilename(f))
    .filter(Boolean)
    .sort((a, b) => a.key.localeCompare(b.key));
    
  if (periods.length === 0) return null;
  if (periods.length === 1) return periods[0];
  
  const start = periods[0];
  const end = periods[periods.length - 1];
  
  if (start.key === end.key) return start;
  
  return {
    year: start.year,
    month: start.month,
    key: `${start.key} to ${end.key}`,
    label: `${start.label} - ${end.label}`
  };
};

// Tests (comment out in production):
// console.log(inferPeriodFromFilename('Sales_2024_11.csv')); // {year:2024, month:11, ...}
// console.log(inferPeriodFromFilename('2024-11 Sales.csv')); 
// console.log(inferPeriodFromFilename('Nov 2024.csv'));
// console.log(inferPeriodFromFilename('202411.csv'));
