import { describe, expect, it } from 'vitest'
import { missingFields } from './jump-completeness'

describe('missingFields', () => {
  it('reports all four fields when everything is absent', () => {
    expect(missingFields({})).toEqual([
      'exitAltitudeFt',
      'deployAltitudeFt',
      'delaySeconds',
      'dropZoneId',
    ])
  })

  it('treats null and undefined as missing', () => {
    expect(
      missingFields({
        exitAltitudeFt: null,
        deployAltitudeFt: undefined,
        delaySeconds: null,
        dropZoneId: undefined,
      }),
    ).toEqual([
      'exitAltitudeFt',
      'deployAltitudeFt',
      'delaySeconds',
      'dropZoneId',
    ])
  })

  it('treats zero as a real value', () => {
    expect(
      missingFields({
        exitAltitudeFt: 0,
        deployAltitudeFt: 0,
        delaySeconds: 0,
        dropZoneId: 'drop-zone-id',
      }),
    ).toEqual([])
  })

  it('reports only the fields that are missing', () => {
    expect(
      missingFields({
        exitAltitudeFt: 13000,
        deployAltitudeFt: null,
        delaySeconds: 45,
        dropZoneId: 'drop-zone-id',
      }),
    ).toEqual(['deployAltitudeFt'])
  })
})
