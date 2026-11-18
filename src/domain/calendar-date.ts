// jumps store calendar dates as 'YYYY-MM-DD' strings (matching the `date` column), so I do all the
// date maths on whole UTC days. That keeps BST changes & server time zones from shifting a jump by a day.

const MILLISECONDS_PER_DAY = 86_400_000

function toUtcDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY
}

function fromUtcDayNumber(utcDayNumber: number): string {
  return new Date(utcDayNumber * MILLISECONDS_PER_DAY).toISOString().slice(0, 10)
}

/** Whole days from `fromDate` to `toDate` (negative when `toDate` is earlier). */
export function daysBetween(fromDate: string, toDate: string): number {
  return toUtcDayNumber(toDate) - toUtcDayNumber(fromDate)
}

export function addDays(isoDate: string, days: number): string {
  return fromUtcDayNumber(toUtcDayNumber(isoDate) + days)
}

/** Calendar-month addition that clamps to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const targetMonthIndex = month - 1 + months
  const lastDayOfTargetMonth = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate()
  const clampedDay = Math.min(day, lastDayOfTargetMonth)
  return new Date(Date.UTC(year, targetMonthIndex, clampedDay)).toISOString().slice(0, 10)
}

/** 'YYYY-MM' for grouping by month. */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** 0 = Monday … 6 = Sunday, matching how UK calendars start the week. */
export function weekdayIndexMondayFirst(isoDate: string): number {
  const sundayFirstIndex = new Date(toUtcDayNumber(isoDate) * MILLISECONDS_PER_DAY).getUTCDay()
  return (sundayFirstIndex + 6) % 7
}
