import { describe, expect, it } from 'vitest'
import {
  cumulativeJumpsByMonth,
  estimateFreefallSeconds,
  freefallDistanceFt,
  jumpsOnThisDay,
  lastJumpDate,
  personalBests,
  rollingTotals,
  totalFreefallSeconds,
  type InsightJump,
} from './logbook-insights'

function jump(jumpNumber: number, date: string, overrides: Partial<InsightJump> = {}): InsightJump {
  return {
    jumpNumber,
    date,
    dropZoneId: 'dz-langar',
    aircraft: 'Caravan',
    exitAltitudeFt: 13000,
    deployAltitudeFt: 3500,
    delaySeconds: 50,
    canopySizeFt2: 210,
    ...overrides,
  }
}

const logbook = [
  jump(1, '2025-06-14', { delaySeconds: null }),
  jump(2, '2025-06-14', { exitAltitudeFt: 15000, delaySeconds: 60 }),
  jump(3, '2025-08-02', { dropZoneId: 'dz-hinton', exitAltitudeFt: 5000, deployAltitudeFt: 4000, delaySeconds: 5 }),
  jump(4, '2026-11-01'),
  jump(5, '2026-11-18', { exitAltitudeFt: 15000 }),
]

describe('logbook insights', () => {
  it('adds up freefall time, ignoring jumps with no recorded delay', () => {
    expect(totalFreefallSeconds(logbook)).toBe(60 + 5 + 50 + 50)
  })

  it('estimates about a minute of freefall from 13,000 ft & a few seconds on a hop & pop', () => {
    expect(estimateFreefallSeconds(13000, 3500)).toBe(58)
    expect(estimateFreefallSeconds(5000, 4000)).toBe(6)
    expect(estimateFreefallSeconds(3000, 3500)).toBeNull()
  })

  it('measures freefall distance only where both altitudes exist', () => {
    expect(freefallDistanceFt([jump(1, '2026-01-01'), jump(2, '2026-01-02', { deployAltitudeFt: null })])).toBe(9500)
  })

  it('counts rolling windows including today', () => {
    expect(rollingTotals(logbook, '2026-11-18')).toEqual({ last30Days: 2, last90Days: 2, last365Days: 2 })
  })

  it('finds the most recent jump date', () => {
    expect(lastJumpDate(logbook)).toBe('2026-11-18')
    expect(lastJumpDate([])).toBeNull()
  })

  it('fills quiet months so the cumulative line never jumps backwards', () => {
    const series = cumulativeJumpsByMonth(logbook)
    expect(series[0]).toEqual({ month: '2025-06', total: 2 })
    expect(series.find((point) => point.month === '2025-07')).toEqual({ month: '2025-07', total: 2 })
    expect(series[series.length - 1]).toEqual({ month: '2026-11', total: 5 })
  })

  it('credits a tied record to the jump that set it 1st', () => {
    const bests = personalBests(logbook)
    expect(bests.highestExitFt).toEqual({ value: 15000, jumpNumber: 2, date: '2025-06-14' })
    expect(bests.mostJumpsInOneDay).toEqual({ date: '2025-06-14', count: 2 })
    expect(bests.dropZonesVisited).toBe(2)
  })

  it('surfaces jumps from this day in earlier years only', () => {
    expect(jumpsOnThisDay(logbook, '2026-06-14').map((entry) => entry.jumpNumber)).toEqual([1, 2])
    expect(jumpsOnThisDay(logbook, '2026-11-18')).toEqual([])
  })
})
