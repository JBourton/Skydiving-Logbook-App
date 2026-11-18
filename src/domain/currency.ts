import { addDays, addMonths, daysBetween } from './calendar-date'
import type { LicenceLevel } from './progression'

export type CurrencyStep = {
  afterMonths: number
  consequence: string
}

// UK currency isn't set nationally: each DZ's chief instructor writes it into their SOPs, so these
// steps mirror the common published pattern (Hinton's, for example). Check them against your own DZ
// & change the numbers here, nowhere else.
export const currencySettings: Record<LicenceLevel, readonly CurrencyStep[]> = {
  student: [{ afterMonths: 1, consequence: 'Refresher training with an instructor before your next jump' }],
  A: [
    { afterMonths: 3, consequence: 'Refresher training before your next jump' },
    { afterMonths: 12, consequence: 'An instructor assesses what retraining you need' },
  ],
  B: [
    { afterMonths: 6, consequence: 'Daily & emergency drills with an instructor before you manifest' },
    { afterMonths: 12, consequence: 'An instructor decides how you regain currency' },
  ],
  C: [
    { afterMonths: 6, consequence: 'Daily & emergency drills with an instructor before you manifest' },
    { afterMonths: 12, consequence: 'An instructor decides how you regain currency' },
  ],
  D: [
    { afterMonths: 6, consequence: 'Daily & emergency drills with an instructor before you manifest' },
    { afterMonths: 12, consequence: 'An instructor decides how you regain currency' },
  ],
}

export type CurrencyStatus =
  | { state: 'no-jumps' }
  | {
      state: 'current'
      lastJumpDate: string
      currentUntil: string
      daysLeft: number
      windowDays: number
      daysSinceLastJump: number
    }
  | {
      state: 'lapsed'
      lastJumpDate: string
      lapsedOn: string
      daysSinceLastJump: number
      consequence: string
    }

/**
 * Where a jumper stands against their licence's currency steps. "More than 3 months" means the
 * 3-month anniversary itself still counts as current, so `currentUntil` is that anniversary.
 */
export function currencyStatus(lastJumpDate: string | null, licence: LicenceLevel, today: string): CurrencyStatus {
  if (lastJumpDate === null) return { state: 'no-jumps' }

  const steps = currencySettings[licence]
  const daysSinceLastJump = daysBetween(lastJumpDate, today)
  const currentUntil = addMonths(lastJumpDate, steps[0].afterMonths)

  if (daysBetween(today, currentUntil) >= 0) {
    return {
      state: 'current',
      lastJumpDate,
      currentUntil,
      daysLeft: daysBetween(today, currentUntil),
      windowDays: daysBetween(lastJumpDate, currentUntil),
      daysSinceLastJump,
    }
  }

  // walk the steps & keep the most serious one that has kicked in
  const reachedSteps = steps.filter((step) => daysBetween(addMonths(lastJumpDate, step.afterMonths), today) > 0)
  const mostSeriousStep = reachedSteps[reachedSteps.length - 1] ?? steps[0]

  return {
    state: 'lapsed',
    lastJumpDate,
    lapsedOn: addDays(addMonths(lastJumpDate, mostSeriousStep.afterMonths), 1),
    daysSinceLastJump,
    consequence: mostSeriousStep.consequence,
  }
}

export type DisciplineRecency = {
  discipline: string
  lastJumpDate: string
  daysSince: number
}

/** Days since the last jump in each discipline, most neglected 1st. */
export function disciplineRecency(lastJumpDateByDiscipline: ReadonlyMap<string, string>, today: string): DisciplineRecency[] {
  return [...lastJumpDateByDiscipline.entries()]
    .map(([discipline, lastJumpDate]) => ({ discipline, lastJumpDate, daysSince: daysBetween(lastJumpDate, today) }))
    .sort((a, b) => b.daysSince - a.daysSince)
}
