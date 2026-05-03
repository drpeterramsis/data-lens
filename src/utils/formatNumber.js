// Safe number converter
export const toNumberSafe = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Main KPI formatter — smart decimal formatting
export const formatKpi = (value) => {
  const n = toNumberSafe(value)
  const safe = Object.is(n, -0) ? 0 : n

  // Has decimals → show max 2 decimal places
  if (safe % 1 !== 0) {
    // parseFloat(toFixed(2)) removes trailing zeros: 9.10 -> 9.1, 9.00 -> 9
    return parseFloat(safe.toFixed(2)).toString()
  }

  // Whole number → no decimals
  return new Intl.NumberFormat('en-US').format(safe)
}

// KPI formatter WITH thousands separator — smart decimals
export const formatKpiGrouped = (value) => {
  const n = toNumberSafe(value)
  const safe = Object.is(n, -0) ? 0 : n
  const rounded = parseFloat(safe.toFixed(2))

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rounded)
}

// Percentage formatter — smart decimals + %
export const formatKpiPercent = (value) => {
  const n = toNumberSafe(value)
  const safe = Object.is(n, -0) ? 0 : n
  const rounded = parseFloat(safe.toFixed(2))

  if (rounded % 1 !== 0) {
    return rounded.toFixed(2) + '%'
  }
  return rounded + '%'
}

// Safety check for raw decimals
export const isSafeDisplay = (value) => {
  const str = String(value)
  const decimalPart = str.split('.')[1]
  if (decimalPart && decimalPart.length > 2) {
    console.warn(
      `[formatNumber] Raw decimal detected: ${value}`,
      '→ Use formatKpi() before displaying'
    )
    return false
  }
  return true
}
