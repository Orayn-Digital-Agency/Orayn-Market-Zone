/**
 * Formats a kobo integer (NGN * 100) as NGN currency string.
 * All amounts are stored as kobo in the DB and divided by 100 for display.
 */
export function formatNGN(kobo: number): string {
  const naira = kobo / 100
  return naira.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
}

/**
 * Converts a naira integer (as stored in the leads/deals tables directly in NGN,
 * NOT kobo — the business plan uses NGN integers directly) to a display string.
 * Note: deal_amount in Supabase is stored as NGN integers (not kobo).
 * Only Paystack API calls use kobo (NGN * 100).
 */
export function formatNairaDirect(naira: number): string {
  return naira.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
}

/**
 * Formats a UTC ISO date string for display in WAT (Africa/Lagos, UTC+1).
 */
export function formatDateWAT(
  isoString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }
  return new Intl.DateTimeFormat('en-NG', defaultOptions).format(
    new Date(isoString)
  )
}

/**
 * Returns a relative time string like "2h ago", "just now", "3d ago".
 */
export function timeAgo(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return formatDateWAT(isoString, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Returns the current YYYY-MM string in WAT.
 */
export function currentMonthWAT(): string {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .split('/')
    .reverse()
    .join('-')
}

/**
 * Calculates commission rate: 30% if deal exceeds price_range_max, else 25%.
 * price_range_max is parsed from the price_range string e.g. "₦200,000 – ₦300,000".
 */
export function getCommissionRate(
  dealAmount: number,
  priceRangeMax: number
): 0.25 | 0.3 {
  return dealAmount > priceRangeMax ? 0.3 : 0.25
}

/**
 * Parses the upper bound from a price_range string like "₦200,000 – ₦300,000".
 */
export function parsePriceRangeMax(priceRange: string): number {
  const parts = priceRange.split('–')
  if (parts.length < 2) return 0
  const raw = parts[1].replace(/[₦,\s+]/g, '')
  return parseInt(raw, 10) || 0
}
