import { describe, expect, it } from 'vitest'
import { addDays, addMonths, daysBetween, weekdayIndexMondayFirst } from './calendar-date'

describe('calendar dates', () => {
  it('counts whole days across a BST change without drifting', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('crosses month & year boundaries when adding days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('clamps calendar-month addition to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
  })

  it('starts the week on Monday', () => {
    expect(weekdayIndexMondayFirst('2026-11-16')).toBe(0)
    expect(weekdayIndexMondayFirst('2026-11-22')).toBe(6)
  })
})
