
/**
 * Safely parses a date string and returns a Date object.
 * Returns null if the date is invalid.
 */
export const safeParseDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // Handle YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dateStr + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    
    // Handle generic date strings
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

/**
 * Safely formats a date object or string into a readable string.
 * Returns a fallback if the date is invalid.
 */
export const safeFormatDate = (dateInput, options = {}, fallback = "—") => {
  const d = dateInput instanceof Date ? dateInput : safeParseDate(dateInput);
  
  if (!d || isNaN(d.getTime())) return fallback;
  
  try {
    return d.toLocaleDateString("en-GB", options);
  } catch (e) {
    return fallback;
  }
};

/**
 * Safely gets day name (Mon, Tue, etc.)
 */
export const safeGetDayName = (dateInput, format = 'short') => {
  const d = dateInput instanceof Date ? dateInput : safeParseDate(dateInput);
  if (!d || isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString('en-US', { weekday: format });
};
