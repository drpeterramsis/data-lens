/**
 * Parse a date string safely without timezone shift.
 * Works for formats: "YYYY-MM-DD", "DD/MM/YYYY",
 * "MM/DD/YYYY", ISO strings with time
 */

// ── Core: parse date without UTC shift ──
export const parseDate = (dateInput) => {
  if (!dateInput) return null

  // Already a Date object
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null
    return dateInput
  }

  const str = String(dateInput).trim()

  // ── Format: "YYYY-MM-DD" (most common in data) ──
  // e.g. "2025-01-15"
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/
  const matchISO = str.match(isoDateOnly)
  if (matchISO) {
    // Use local constructor to avoid UTC shift
    return new Date(
      parseInt(matchISO[1]),  // year
      parseInt(matchISO[2]) - 1,  // month (0-indexed)
      parseInt(matchISO[3])   // day
    )
  }

  // ── Format: "DD/MM/YYYY" ──
  // e.g. "15/01/2025"
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const matchDDMM = str.match(ddmmyyyy)
  if (matchDDMM) {
    return new Date(
      parseInt(matchDDMM[3]),
      parseInt(matchDDMM[2]) - 1,
      parseInt(matchDDMM[1])
    )
  }

  // ── Format: "MM/DD/YYYY" ──
  // e.g. "01/15/2025"
  const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const matchMMDD = str.match(mmddyyyy)
  if (matchMMDD) {
    return new Date(
      parseInt(matchMMDD[3]),
      parseInt(matchMMDD[1]) - 1,
      parseInt(matchMMDD[2])
    )
  }

  // ── Format: ISO with time "YYYY-MM-DDTHH:mm:ssZ" ──
  // Strip time, use date part only
  const isoWithTime = /^(\d{4})-(\d{2})-(\d{2})T/
  const matchISOTime = str.match(isoWithTime)
  if (matchISOTime) {
    return new Date(
      parseInt(matchISOTime[1]),
      parseInt(matchISOTime[2]) - 1,
      parseInt(matchISOTime[3])
    )
  }

  // ── Fallback: try native parse ──
  // but adjust for UTC offset
  const fallback = new Date(str)
  if (!isNaN(fallback.getTime())) {
    // Adjust for timezone offset
    const offset = fallback.getTimezoneOffset()
    return new Date(fallback.getTime() + offset * 60 * 1000)
  }

  console.warn('dateUtils: Could not parse date:', dateInput)
  return null
}


// ── Format date for display ──
export const formatDate = (
  dateInput,
  format = 'DD/MM/YYYY'
) => {
  const date = parseDate(dateInput)
  if (!date) return '—'

  const day   = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year  = date.getFullYear()

  const monthNames = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec'
  ]
  const monthName = monthNames[date.getMonth()]

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`

    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`

    case 'DD MMM YYYY':
      return `${day} ${monthName} ${year}`

    case 'MMM DD, YYYY':
      return `${monthName} ${day}, ${year}`

    case 'MM/YYYY':
      return `${month}/${year}`

    case 'DD/MM':
      return `${day}/${month}`

    default:
      return `${day}/${month}/${year}`
  }
}


// ── Compare dates (ignoring time) ──
export const isSameDay = (date1, date2) => {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  if (!d1 || !d2) return false
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate()
  )
}

export const isDateBefore = (date1, date2) => {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  if (!d1 || !d2) return false
  // Compare date only, ignore time
  const d1Clean = new Date(
    d1.getFullYear(), d1.getMonth(), d1.getDate()
  )
  const d2Clean = new Date(
    d2.getFullYear(), d2.getMonth(), d2.getDate()
  )
  return d1Clean < d2Clean
}

export const isDateAfter = (date1, date2) => {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  if (!d1 || !d2) return false
  const d1Clean = new Date(
    d1.getFullYear(), d1.getMonth(), d1.getDate()
  )
  const d2Clean = new Date(
    d2.getFullYear(), d2.getMonth(), d2.getDate()
  )
  return d1Clean > d2Clean
}

export const isDateInRange = (date, startDate, endDate) => {
  const d    = parseDate(date)
  const start = parseDate(startDate)
  const end   = parseDate(endDate)
  if (!d || !start || !end) return false

  const dClean = new Date(
    d.getFullYear(), d.getMonth(), d.getDate()
  ).getTime()
  const sClean = new Date(
    start.getFullYear(), start.getMonth(), start.getDate()
  ).getTime()
  const eClean = new Date(
    end.getFullYear(), end.getMonth(), end.getDate()
  ).getTime()

  return dClean >= sClean && dClean <= eClean
}


// ── Get today's date (local, no time) ──
export const today = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// ── Get date X days ago ──
export const daysAgo = (n) => {
  const d = today()
  d.setDate(d.getDate() - n)
  return d
}

// ── Date range helpers ──
export const getDateRange = (rangeKey) => {
  const end   = today()
  const start = today()

  switch (rangeKey) {
    case 'today':
      return { start, end }

    case 'last7':
      start.setDate(start.getDate() - 6)
      return { start, end }

    case 'last30':
      start.setDate(start.getDate() - 29)
      return { start, end }

    case 'thisMonth':
      start.setDate(1)
      return { start, end }

    case 'lastMonth':
      start.setMonth(start.getMonth() - 1, 1)
      end.setDate(0)  // last day of previous month
      return { start, end }

    case 'thisYear':
      start.setMonth(0, 1)
      return { start, end }

    default:
      return { start, end }
  }
}
