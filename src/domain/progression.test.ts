import { describe, expect, it } from 'vitest'
import { gradeTargets, licenceRoute, nextLicence, outstandingRequirements, type ProgressionSnapshot } from './progression'

const aLicenceJumper: ProgressionSnapshot = {
  licence: 'A',
  grades: ['FS1', 'CT1'],
  totalJumps: 63,
  jumpsInLast2Months: 7,
  jumpsInLast12Months: 41,
}

describe('licence progression', () => {
  it('leaves only JM1 outstanding for an A licence jumper with 63 jumps & CT1', () => {
    const bLicence = licenceRoute(aLicenceJumper).find((target) => target.code === 'B')
    expect(bLicence?.achieved).toBe(false)
    expect(bLicence && outstandingRequirements(bLicence).map((requirement) => requirement.label)).toEqual(['JM1'])
  })

  it('counts jumps towards the C licence without overshooting the target', () => {
    const cLicence = licenceRoute(aLicenceJumper).find((target) => target.code === 'C')
    const jumpRequirement = cLicence?.requirements.find((requirement) => requirement.target === 200)
    expect(jumpRequirement).toMatchObject({ met: false, current: 63, target: 200 })
  })

  it('treats written exams as passed once the licence that needs them is held', () => {
    const aLicence = licenceRoute(aLicenceJumper).find((target) => target.code === 'A')
    expect(aLicence?.achieved).toBe(true)
    expect(aLicence?.requirements.every((requirement) => requirement.met === true)).toBe(true)
  })

  it("can't judge licence requirements when no licence has been recorded", () => {
    const route = licenceRoute({ ...aLicenceJumper, licence: null })
    expect(route.every((target) => !target.achieved)).toBe(true)
    expect(route.find((target) => target.code === 'B')?.requirements[0].met).toBeNull()
  })

  it('needs FS1 before FF1 & a B licence plus recent jumps before CF1', () => {
    const grades = gradeTargets({ ...aLicenceJumper, grades: [] })
    expect(grades.find((grade) => grade.code === 'FF1')?.requirements[0]).toMatchObject({ label: 'FS1', met: false })
    const canopyFormation = grades.find((grade) => grade.code === 'CF1')
    expect(canopyFormation?.requirements.map((requirement) => requirement.met)).toEqual([false, false, true])
  })

  it('stops after the D licence', () => {
    expect(nextLicence('A')).toBe('B')
    expect(nextLicence('D')).toBeNull()
  })
})
