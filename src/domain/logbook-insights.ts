import { addDays, daysBetween, monthOf } from './calendar-date'
import type { Jump } from './jump'

// the insights only need a handful of fields, so I type them narrowly & keep them easy to test
export type InsightJump = Pick<
  Jump,
  'jumpNumber' | 'date' | 'dropZoneId' | 'aircraft' | 'exitAltitudeFt' | 'deployAltitudeFt' | 'delaySeconds' | 'canopySizeFt2'
>

export type RollingTotals = {
  last30Days: number
  last90Days: number
  last365Days: number
}

export type PersonalBest<T> = { value: T; jumpNumber: number; date: string } | null

export type PersonalBests = {
  highestExitFt: PersonalBest<number>
  longestDelaySeconds: PersonalBest<number>
  mostJumpsInOneDay: { date: string; count: number } | null
  mostJumpsInOneMonth: { month: string; count: number } | null
  dropZonesVisited: number
}

/**
 * Rough belly-to-earth delay for a pair of heights: ~10 s to reach terminal, then ~176 ft a second.
 * Used to sanity-check & pre-fill the delay box, never as a recorded value.
 */
export function estimateFreefallSeconds(exitAltitudeFt: number, deployAltitudeFt: number): number | null {
  const freefallFt = exitAltitudeFt - deployAltitudeFt
  if (freefallFt <= 0) return null
  if (freefallFt <= 1500) return Math.max(3, Math.round(freefallFt / 170))
  return Math.round(10 + (freefallFt - 1000) / 176)
}

export function totalFreefallSeconds(jumps: readonly InsightJump[]): number {
  return jumps.reduce((total, jump) => total + (jump.delaySeconds ?? 0), 0)
}

/** Feet fallen in freefall (exit minus deploy), skipping jumps missing either altitude. */
export function freefallDistanceFt(jumps: readonly InsightJump[]): number {
  return jumps.reduce((total, jump) => {
    if (jump.exitAltitudeFt === null || jump.deployAltitudeFt === null) return total
    return total + Math.max(0, jump.exitAltitudeFt - jump.deployAltitudeFt)
  }, 0)
}

/** A 30 day window covers today & the 29 days before it. */
export function countJumpsInLastDays(jumps: readonly InsightJump[], today: string, windowDays: number): number {
  return jumps.filter((jump) => {
    const ageInDays = daysBetween(jump.date, today)
    return ageInDays >= 0 && ageInDays < windowDays
  }).length
}

export function rollingTotals(jumps: readonly InsightJump[], today: string): RollingTotals {
  return {
    last30Days: countJumpsInLastDays(jumps, today, 30),
    last90Days: countJumpsInLastDays(jumps, today, 90),
    last365Days: countJumpsInLastDays(jumps, today, 365),
  }
}

export function lastJumpDate(jumps: readonly InsightJump[]): string | null {
  return jumps.reduce<string | null>((latest, jump) => (latest === null || jump.date > latest ? jump.date : latest), null)
}

/** Generic tally, e.g. jumps per drop zone or per aircraft. Nulls are skipped. */
export function tally<K>(jumps: readonly InsightJump[], keyOf: (jump: InsightJump) => K | null): Map<K, number> {
  const counts = new Map<K, number>()
  for (const jump of jumps) {
    const key = keyOf(jump)
    if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function jumpsPerDay(jumps: readonly InsightJump[]): Map<string, number> {
  return tally(jumps, (jump) => jump.date)
}

/** Running total at the end of every month from the 1st jump to the last, gaps included. */
export function cumulativeJumpsByMonth(jumps: readonly InsightJump[]): Array<{ month: string; total: number }> {
  if (jumps.length === 0) return []

  const perMonth = tally(jumps, (jump) => monthOf(jump.date))
  const months = [...perMonth.keys()].sort()
  const series: Array<{ month: string; total: number }> = []
  let runningTotal = 0

  for (let month = months[0]; month <= months[months.length - 1]; month = nextMonth(month)) {
    runningTotal += perMonth.get(month) ?? 0
    series.push({ month, total: runningTotal })
  }
  return series
}

function nextMonth(month: string): string {
  return monthOf(addDays(`${month}-28`, 7))
}

function bestBy(jumps: readonly InsightJump[], valueOf: (jump: InsightJump) => number | null): PersonalBest<number> {
  let best: PersonalBest<number> = null
  for (const jump of jumps) {
    const value = valueOf(jump)
    // ties go to the earlier jump, since that's when the record was 1st set
    if (value !== null && (best === null || value > best.value)) best = { value, jumpNumber: jump.jumpNumber, date: jump.date }
  }
  return best
}

function busiest(counts: Map<string, number>): { key: string; count: number } | null {
  let busiestEntry: { key: string; count: number } | null = null
  for (const [key, count] of counts) {
    if (busiestEntry === null || count > busiestEntry.count) busiestEntry = { key, count }
  }
  return busiestEntry
}

export function personalBests(jumps: readonly InsightJump[]): PersonalBests {
  const inJumpOrder = [...jumps].sort((a, b) => a.jumpNumber - b.jumpNumber)
  const busiestDay = busiest(jumpsPerDay(inJumpOrder))
  const busiestMonth = busiest(tally(inJumpOrder, (jump) => monthOf(jump.date)))

  return {
    highestExitFt: bestBy(inJumpOrder, (jump) => jump.exitAltitudeFt),
    longestDelaySeconds: bestBy(inJumpOrder, (jump) => jump.delaySeconds),
    mostJumpsInOneDay: busiestDay && { date: busiestDay.key, count: busiestDay.count },
    mostJumpsInOneMonth: busiestMonth && { month: busiestMonth.key, count: busiestMonth.count },
    dropZonesVisited: tally(inJumpOrder, (jump) => jump.dropZoneId).size,
  }
}

/** Jumps made on today's day & month in earlier years. */
export function jumpsOnThisDay<T extends InsightJump>(jumps: readonly T[], today: string): T[] {
  const monthAndDay = today.slice(5)
  return jumps.filter((jump) => jump.date.slice(5) === monthAndDay && jump.date < today)
}
