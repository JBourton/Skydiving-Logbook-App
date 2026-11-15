import { describe, expect, it } from 'vitest'
import { deployAltitudeWarning } from './deploy-altitude'

describe('deployAltitudeWarning', () => {
  it('returns null exactly at the A licence minimum', () => {
    expect(deployAltitudeWarning(3000)).toBeNull()
  })

  it('returns null above the A licence minimum', () => {
    expect(deployAltitudeWarning(3001)).toBeNull()
  })

  it('warns below the A licence minimum', () => {
    const warning = deployAltitudeWarning(2999)
    expect(warning).not.toBeNull()
    expect(warning).toContain('2999')
    expect(warning).toContain('3000')
  })

  it('treats zero as a real altitude below the minimum', () => {
    const warning = deployAltitudeWarning(0)
    expect(warning).not.toBeNull()
    expect(warning).toContain('0 ft')
  })

  it('returns null when there is no altitude to check', () => {
    expect(deployAltitudeWarning(null)).toBeNull()
    expect(deployAltitudeWarning(undefined)).toBeNull()
  })
})
