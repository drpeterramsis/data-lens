/**
 * Parse a date value safely — NO timezone shift.
 * Handles all common formats from Excel/CSV uploads.
 * Always returns LOCAL date at noon (12:00) to avoid
 * any timezone boundary issues.
 */

// ── Main safe parser ──
export const parseDate = (value) => {
  if (!value && value !== 0) return null

  // ── Case 1: Already a JS Date object ──
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    // Re-create as local noon to strip time issues
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      12, 0, 0
    )
  }

  // ── Case 2: Excel serial number (e.g. 46022) ──
  // Excel dates: days since 1900-01-00
  // (with infamous 1900 leap year bug)
  if (typeof value === 'number') {
    return excelSerialToDate(value)
  }

  if (typeof value === 'string') {
    const str = value.trim()
    if (!str) return null

    // ── Case 3: ISO format "2026-04-01" ──
    // DO NOT use new Date(str) — causes UTC shift!
    const isoMatch = str.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    )
    if (isoMatch) {
      return new Date(
        parseInt(isoMatch[1]),   // year
        parseInt(isoMatch[2])-1, // month (0-indexed)
        parseInt(isoMatch[3]),   // day
        12, 0, 0                 // noon — no tz issue
      )
    }

    // ── Case 4: DD/MM/YYYY (most common in Egypt) ──
    const dmySlash = str.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    )
    if (dmySlash) {
      return new Date(
        parseInt(dmySlash[3]),   // year
        parseInt(dmySlash[2])-1, // month
        parseInt(dmySlash[1]),   // day
        12, 0, 0
      )
    }

    // ── Case 5: DD-MM-YYYY ──
    const dmyDash = str.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/
    )
    if (dmyDash) {
      return new Date(
        parseInt(dmyDash[3]),
        parseInt(dmyDash[2])-1,
        parseInt(dmyDash[1]),
        12, 0, 0
      )
    }

    // ── Case 6: MM/DD/YYYY (US format) ──
    const mdySlash = str.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    )
    // NOTE: ambiguous with DD/MM — if day > 12,
    // it MUST be DD/MM. If day <= 12, assume DD/MM
    // (Egyptian context default)

    // ── Case 7: YYYY/MM/DD ──
    const ymdSlash = str.match(
      /^(\d{4})\/(\d{2})\/(\d{2})$/
    )
    if (ymdSlash) {
      return new Date(
        parseInt(ymdSlash[1]),
        parseInt(ymdSlash[2])-1,
        parseInt(ymdSlash[3]),
        12, 0, 0
      )
    }

    // ── Case 8: DD MMM YYYY (e.g. "01 Apr 2026") ──
    const dMonthY = str.match(
      /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/
    )
    if (dMonthY) {
      const d = parseInt(dMonthY[1])
      const m = parseMonthName(dMonthY[2])
      const y = parseInt(dMonthY[3])
      if (m !== -1) {
        return new Date(y, m, d, 12, 0, 0)
      }
    }

    // ── Case 9: ISO with time "2026-04-01T..." ──
    // Strip time and re-parse date part only
    const isoTime = str.match(
      /^(\d{4})-(\d{2})-(\d{2})T/
    )
    if (isoTime) {
      return new Date(
        parseInt(isoTime[1]),
        parseInt(isoTime[2])-1,
        parseInt(isoTime[3]),
        12, 0, 0
      )
    }

    // ── Case 10: Numeric string "46022" ──
    const numStr = str.match(/^\d{5}$/)
    if (numStr) {
      return excelSerialToDate(parseInt(str))
    }
  }

  console.warn('dateParser: Cannot parse date:', value)
  return null
}

// ── Excel serial → JS Date ──
const excelSerialToDate = (serial) => {
  if (!serial || serial < 1) return null

  // Excel epoch: December 30, 1899
  // (accounts for Excel's 1900 leap year bug)
  const excelEpoch = new Date(1899, 11, 30, 12, 0, 0)
  const ms = serial * 24 * 60 * 60 * 1000
  const date = new Date(excelEpoch.getTime() + ms)

  // Return as local noon date
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12, 0, 0
  )
}

// ── Month name helper ──
const MONTH_NAMES = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
  january:0, february:1, march:2, april:3,
  june:5, july:6, august:7, september:8,
  october:9, november:10, december:11
}

const parseMonthName = (str) => {
  return MONTH_NAMES[str.toLowerCase()] ?? -1
}

// ── Format date safely (local, no UTC shift) ──
export const formatDate = (
  value,
  format = 'DD/MM/YYYY'
) => {
  const date = value instanceof Date
    ? value
    : parseDate(value)

  if (!date || isNaN(date.getTime())) return ''

  const d  = date.getDate()
  const m  = date.getMonth() + 1
  const y  = date.getFullYear()
  const dd = String(d).padStart(2, '0')
  const mm = String(m).padStart(2, '0')

  switch (format) {
    case 'DD/MM/YYYY': return `${dd}/${mm}/${y}`
    case 'YYYY-MM-DD': return `${y}-${mm}-${dd}`
    case 'DD MMM YYYY':
      const months = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec']
      return `${dd} ${months[m-1]} ${y}`
    case 'MM/YYYY':    return `${mm}/${y}`
    case 'MMM YYYY':
      const mo = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec']
      return `${mo[m-1]} ${y}`
    default:           return `${dd}/${mm}/${y}`
  }
}

// ── Get day of month (1-31) safely ──
export const getDayOfMonth = (value) => {
  const date = parseDate(value)
  return date ? date.getDate() : null
}

// ── Get month (1-12) safely ──
export const getMonth = (value) => {
  const date = parseDate(value)
  return date ? date.getMonth() + 1 : null
}

// ── Get year safely ──
export const getYear = (value) => {
  const date = parseDate(value)
  return date ? date.getFullYear() : null
}

// ── Get "YYYY-MM" month key ──
export const getMonthKey = (value) => {
  const date = parseDate(value)
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth()+1).padStart(2,'0')
  return `${y}-${m}`
}

// ── Compare two dates (day precision only) ──
export const isSameDay = (a, b) => {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth()    === db.getMonth()    &&
    da.getDate()     === db.getDate()
  )
}

// ── Is date within range (inclusive) ──
export const isInRange = (date, from, to) => {
  const d = parseDate(date)
  const f = parseDate(from)
  const t = parseDate(to)
  if (!d) return false
  if (f && d < f) return false
  if (t && d > t) return false
  return true
}
