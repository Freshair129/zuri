/**
 * unitConverter — Unit conversion utilities for culinary & inventory contexts
 *
 * Supports:
 *   Weight  : g ↔ kg ↔ lb ↔ oz
 *   Volume  : ml ↔ L ↔ tsp ↔ tbsp ↔ cup ↔ fl_oz
 *   Temp    : °C ↔ °F ↔ K
 *   Currency: THB ↔ USD (rate-based, pass-in)
 *
 * All converters follow the pattern:
 *   convert(value, fromUnit, toUnit) → number (rounded to 4 decimal places)
 *
 * Unit strings are case-insensitive (e.g. 'KG', 'kg', 'Kg' all work).
 */

// ─── Weight ──────────────────────────────────────────────────────────────────

/** Conversion factors to base unit: grams (g) */
const WEIGHT_TO_G = {
  g:   1,
  kg:  1000,
  lb:  453.59237,
  oz:  28.3495231,
  mg:  0.001,
}

/**
 * Convert a weight value from one unit to another.
 * @param {number} value
 * @param {'g'|'kg'|'lb'|'oz'|'mg'} from
 * @param {'g'|'kg'|'lb'|'oz'|'mg'} to
 * @returns {number}
 */
export function convertWeight(value, from, to) {
  const f = from.toLowerCase()
  const t = to.toLowerCase()
  if (!(f in WEIGHT_TO_G)) throw new Error(`Unknown weight unit: ${from}`)
  if (!(t in WEIGHT_TO_G)) throw new Error(`Unknown weight unit: ${to}`)
  if (f === t) return value
  const grams = value * WEIGHT_TO_G[f]
  return round4(grams / WEIGHT_TO_G[t])
}

// ─── Volume ──────────────────────────────────────────────────────────────────

/** Conversion factors to base unit: millilitres (ml) */
const VOLUME_TO_ML = {
  ml:     1,
  l:      1000,
  tsp:    4.92892,      // teaspoon (US)
  tbsp:   14.7868,      // tablespoon (US)
  cup:    236.588,      // cup (US)
  fl_oz:  29.5735,      // fluid ounce (US)
  fl_oz_uk: 28.4131,   // fluid ounce (imperial)
  pt:     473.176,      // pint (US)
  qt:     946.353,      // quart (US)
  gal:    3785.41,      // gallon (US)
}

/**
 * Convert a volume value from one unit to another.
 * @param {number} value
 * @param {'ml'|'l'|'tsp'|'tbsp'|'cup'|'fl_oz'|'pt'|'qt'|'gal'} from
 * @param {'ml'|'l'|'tsp'|'tbsp'|'cup'|'fl_oz'|'pt'|'qt'|'gal'} to
 * @returns {number}
 */
export function convertVolume(value, from, to) {
  const f = from.toLowerCase()
  const t = to.toLowerCase()
  if (!(f in VOLUME_TO_ML)) throw new Error(`Unknown volume unit: ${from}`)
  if (!(t in VOLUME_TO_ML)) throw new Error(`Unknown volume unit: ${to}`)
  if (f === t) return value
  const ml = value * VOLUME_TO_ML[f]
  return round4(ml / VOLUME_TO_ML[t])
}

// ─── Temperature ─────────────────────────────────────────────────────────────

/**
 * Convert a temperature value from one unit to another.
 * @param {number} value
 * @param {'C'|'F'|'K'} from
 * @param {'C'|'F'|'K'} to
 * @returns {number}
 */
export function convertTemp(value, from, to) {
  const f = from.toUpperCase()
  const t = to.toUpperCase()

  if (f === t) return value

  // First convert to Celsius as intermediate
  let celsius
  switch (f) {
    case 'C': celsius = value; break
    case 'F': celsius = (value - 32) * (5 / 9); break
    case 'K': celsius = value - 273.15; break
    default:  throw new Error(`Unknown temperature unit: ${from}`)
  }

  switch (t) {
    case 'C': return round4(celsius)
    case 'F': return round4(celsius * (9 / 5) + 32)
    case 'K': return round4(celsius + 273.15)
    default:  throw new Error(`Unknown temperature unit: ${to}`)
  }
}

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Convert a currency amount using a provided exchange rate.
 * @param {number} amount    Amount to convert
 * @param {number} rate      Exchange rate: 1 unit of `from` = `rate` units of `to`
 * @returns {number}
 *
 * @example
 *   // 100 THB at rate 0.028 USD/THB → 2.8 USD
 *   convertCurrency(100, 0.028)
 */
export function convertCurrency(amount, rate) {
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Rate must be a positive number')
  return round4(amount * rate)
}

// ─── Generic wrapper ─────────────────────────────────────────────────────────

/**
 * Auto-detect unit category and convert.
 * Supports weight ('g','kg','lb','oz','mg'),
 * volume ('ml','l','tsp','tbsp','cup','fl_oz','pt','qt','gal'),
 * and temperature ('C','F','K').
 *
 * @param {number} value
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
export function convert(value, from, to) {
  const f = from.toLowerCase()
  const t = to.toLowerCase()

  const tempUnits = new Set(['c', 'f', 'k'])
  const weightUnits = new Set(Object.keys(WEIGHT_TO_G))
  const volumeUnits = new Set(Object.keys(VOLUME_TO_ML))

  const yearUnits = new Set(['ce', 'ad', 'ค.ศ.', 'คศ', 'be', 'พ.ศ.', 'พศ', 'b.e.'])

  if (tempUnits.has(f) || tempUnits.has(t)) return convertTemp(value, from, to)
  if (weightUnits.has(f) || weightUnits.has(t)) return convertWeight(value, from, to)
  if (volumeUnits.has(f) || volumeUnits.has(t)) return convertVolume(value, from, to)
  if (yearUnits.has(f)   || yearUnits.has(t))   return convertYear(value, from, to)

  throw new Error(`Cannot auto-detect unit category for: ${from} → ${to}`)
}

// ─── Year (Buddhist Era ↔ Christian Era) ────────────────────────────────────

/** Thai Buddhist Era is 543 years ahead of Common Era (Christian Era). */
const BE_OFFSET = 543

/**
 * Convert a CE (ค.ศ.) year to BE (พ.ศ.) year.
 * @param {number} ceYear  e.g. 2026
 * @returns {number}       e.g. 2569
 */
export function toBuddhistYear(ceYear) {
  if (typeof ceYear !== 'number' || !Number.isFinite(ceYear)) {
    throw new Error('ceYear must be a finite number')
  }
  return ceYear + BE_OFFSET
}

/**
 * Convert a BE (พ.ศ.) year to CE (ค.ศ.) year.
 * @param {number} beYear  e.g. 2569
 * @returns {number}       e.g. 2026
 */
export function toChristianYear(beYear) {
  if (typeof beYear !== 'number' || !Number.isFinite(beYear)) {
    throw new Error('beYear must be a finite number')
  }
  return beYear - BE_OFFSET
}

/**
 * Convert a year between 'CE'/'AD' and 'BE'/'พ.ศ.'/'ค.ศ.' systems.
 * @param {number} year
 * @param {'CE'|'AD'|'ค.ศ.'} from
 * @param {'BE'|'พ.ศ.'} to   (or reverse)
 * @returns {number}
 *
 * @example
 *   convertYear(2026, 'CE', 'BE')   // → 2569
 *   convertYear(2569, 'BE', 'CE')   // → 2026
 */
export function convertYear(year, from, to) {
  const CE_ALIASES = new Set(['ce', 'ad', 'ค.ศ.', 'คศ', 'ce/ad'])
  const BE_ALIASES = new Set(['be', 'พ.ศ.', 'พศ', 'b.e.'])

  const f = from.toLowerCase()
  const t = to.toLowerCase()

  const fromIsCE = CE_ALIASES.has(f)
  const fromIsBE = BE_ALIASES.has(f)
  const toIsCE   = CE_ALIASES.has(t)
  const toIsBE   = BE_ALIASES.has(t)

  if (!fromIsCE && !fromIsBE) throw new Error(`Unknown year system: ${from}`)
  if (!toIsCE   && !toIsBE)   throw new Error(`Unknown year system: ${to}`)
  if (fromIsCE && toIsBE) return toBuddhistYear(year)
  if (fromIsBE && toIsCE) return toChristianYear(year)

  return year // same system
}

// ─── Display helper ──────────────────────────────────────────────────────────

/**
 * Convert and format the result as a human-readable string.
 * @param {number} value
 * @param {string} from
 * @param {string} to
 * @returns {string} e.g. "2.5 kg"
 */
export function convertDisplay(value, from, to) {
  const result = convert(value, from, to)
  // Round display to 2 decimal places, strip trailing zeros
  const display = parseFloat(result.toFixed(2))
  return `${display} ${to}`
}

// ─── Internal ────────────────────────────────────────────────────────────────

function round4(n) {
  return Math.round(n * 10000) / 10000
}
