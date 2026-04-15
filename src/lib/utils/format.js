/**
 * Formatters for display values — currency, dates, phone numbers, relative time.
 * All date formatting uses Thai locale (th-TH).
 */

/**
 * Format a number as Thai Baht.
 * @param {number} amount
 * @returns {string} e.g. "฿1,234.00"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date as Thai short date.
 * @param {Date|string} date
 * @returns {string} e.g. "28 มี.ค. 2026"
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Format a date with time as Thai short date + time.
 * @param {Date|string} date
 * @returns {string} e.g. "28 มี.ค. 2026 14:30"
 */
export function formatDateTime(date) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date))
}

/**
 * Format an E.164 Thai phone number to local display format.
 * @param {string} phone - E.164 format, e.g. "+66812345678"
 * @returns {string} e.g. "081-234-5678"
 */
export function formatPhone(phone) {
  if (!phone) return ''

  // Strip +66 country code and prepend leading 0
  const local = phone.startsWith('+66')
    ? '0' + phone.slice(3)
    : phone.replace(/\D/g, '')

  // Format as 0XX-XXX-XXXX (10 digits)
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
  }

  return phone
}

/**
 * Format a date as a Thai relative time string.
 * @param {Date|string} date
 * @returns {string} e.g. "3 นาทีที่แล้ว" or "2 ชม."
 */
export function formatRelativeTime(date) {
  const now = Date.now()
  const diffMs = now - new Date(date).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'เมื่อกี้'
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  if (diffHr < 24) return `${diffHr} ชม.`
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`

  return formatDate(date)
}
