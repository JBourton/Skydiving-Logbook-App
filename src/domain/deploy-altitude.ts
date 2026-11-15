// TODO: Confirm this threshold against the current British Skydiving manual.
export const A_LICENCE_MIN_DEPLOY_ALTITUDE_FT = 3000

export function deployAltitudeWarning(
  ft: number | null | undefined,
): string | null {
  if (typeof ft !== 'number') return null
  if (ft >= A_LICENCE_MIN_DEPLOY_ALTITUDE_FT) return null
  return `Deploy altitude (${ft} ft) is below the A licence minimum of ${A_LICENCE_MIN_DEPLOY_ALTITUDE_FT} ft.`
}
