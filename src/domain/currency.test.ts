import { describe, expect, it } from 'vitest'
import { currencyStatus, disciplineRecency } from './currency'

describe('jump currency', () => {
  it('has nothing to report before the 1st jump', () => {
    expect(currencyStatus(null, 'A', '2026-11-18')).toEqual({ state: 'no-jumps' })
  })

  it('keeps an A licence jumper current up to & including the 3-month anniversary', () => {
    const status = currencyStatus('2026-11-15', 'A', '2027-02-15')
    expect(status).toMatchObject({ state: 'current', currentUntil: '2027-02-15', daysLeft: 0 })
  })

  it('needs refresher training the day after 3 months for an A licence jumper', () => {
    const status = currencyStatus('2026-11-15', 'A', '2027-02-16')
    expect(status).toMatchObject({ state: 'lapsed', lapsedOn: '2027-02-16' })
    expect(status.state === 'lapsed' && status.consequence).toContain('Refresher')
  })

  it('gives B licence jumpers 6 months before drills are needed', () => {
    expect(currencyStatus('2026-05-01', 'B', '2026-10-31')).toMatchObject({ state: 'current', currentUntil: '2026-11-01' })
    expect(currencyStatus('2026-05-01', 'B', '2026-11-02')).toMatchObject({ state: 'lapsed' })
  })

  it('escalates to an instructor decision after 12 months away', () => {
    const status = currencyStatus('2025-01-10', 'C', '2026-02-01')
    expect(status.state === 'lapsed' && status.consequence).toContain('instructor decides')
  })

  it('lists the most neglected discipline 1st', () => {
    const recency = disciplineRecency(new Map([['Formation', '2026-11-01'], ['Freefly', '2026-08-01']]), '2026-11-18')
    expect(recency.map((entry) => entry.discipline)).toEqual(['Freefly', 'Formation'])
    expect(recency[1].daysSince).toBe(17)
  })
})
