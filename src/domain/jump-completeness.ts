import type { Jump } from './jump'

export type MissingJumpField =
  | 'exitAltitudeFt'
  | 'deployAltitudeFt'
  | 'delaySeconds'
  | 'dropZoneId'

export type JumpCompletenessInput = Partial<
  Pick<Jump, MissingJumpField>
>

const CHECKED_FIELDS: readonly MissingJumpField[] = [
  'exitAltitudeFt',
  'deployAltitudeFt',
  'delaySeconds',
  'dropZoneId',
]

export function missingFields(jump: JumpCompletenessInput): MissingJumpField[] {
  return CHECKED_FIELDS.filter(
    (field) => jump[field] === null || jump[field] === undefined,
  )
}
