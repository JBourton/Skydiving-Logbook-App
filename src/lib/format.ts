export const displaySettings = {
  locale: 'en-GB',
  // single-user for now; this becomes a per-user setting once there's more than 1 of us
  timeZone: 'Europe/London',
}

const shortDateFormat = new Intl.DateTimeFormat(displaySettings.locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const longDateFormat = new Intl.DateTimeFormat(displaySettings.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayMonthFormat = new Intl.DateTimeFormat(displaySettings.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthYearFormat = new Intl.DateTimeFormat(displaySettings.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
const wholeNumberFormat = new Intl.NumberFormat(displaySettings.locale)

// jump dates are calendar dates, so I pin them to UTC midnight & format in UTC to stop them sliding a day
function asUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

/** Today's calendar date where the jumper is, as 'YYYY-MM-DD'. */
export function todayIsoDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: displaySettings.timeZone }).format(now)
}

/** "15 Nov 2026" */
export function formatDate(isoDate: string): string {
  return shortDateFormat.format(asUtcDate(isoDate))
}

/** "Saturday 15 November 2026" */
export function formatLongDate(isoDate: string): string {
  return longDateFormat.format(asUtcDate(isoDate))
}

/** "15 Nov" */
export function formatDayMonth(isoDate: string): string {
  return dayMonthFormat.format(asUtcDate(isoDate))
}

/** "November 2026" from 'YYYY-MM' */
export function formatMonth(yearMonth: string): string {
  return monthYearFormat.format(asUtcDate(`${yearMonth}-01`))
}

export function formatNumber(value: number): string {
  return wholeNumberFormat.format(value)
}

/** "13,000 ft" */
export function formatFeet(feet: number): string {
  return `${formatNumber(feet)} ft`
}

/** "52 s", "4 min 10 s", "1 h 54 min" - freefall adds up in seconds, so small units matter early on */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
  if (minutes > 0) return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`
  return `${seconds} s`
}

/** "1 jump", "2 jumps" */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

/** "today", "yesterday", "4 days ago" */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${formatNumber(days)} days ago`
}
