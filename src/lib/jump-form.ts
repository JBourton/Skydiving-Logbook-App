import { z } from 'zod'
import { addDays } from '~/domain/calendar-date'
import type { NewJump } from '~/domain/jump'
import { todayIsoDate } from '~/lib/format'

// the 1 place untrusted jump input becomes a NewJump. Manual entry & the OCR review screen both
// come through here, which is what makes the review screen a real trust boundary.

export const jumpFormFields = [
  'jumpNumber',
  'date',
  'dropZoneId',
  'aircraft',
  'exitAltitudeFt',
  'deployAltitudeFt',
  'delaySeconds',
  'canopySizeFt2',
  'description',
  'authoriser',
] as const

export type JumpFormField = (typeof jumpFormFields)[number]

/** Every field as the string an <input> holds, so forms can be fully controlled. */
export type JumpFormValues = Record<JumpFormField, string>

export type JumpFormState = {
  formError: string | null
  fieldErrors: Partial<Record<JumpFormField, string>>
}

export const emptyJumpFormState: JumpFormState = { formError: null, fieldErrors: {} }

export type ReviewSaveState = {
  formError: string | null
  /** keyed by the draft's position on the review screen */
  errorsByDraft: Record<number, JumpFormState['fieldErrors']>
}

export const emptyReviewSaveState: ReviewSaveState = { formError: null, errorsByDraft: {} }

function blankToNull(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? null : value
}

function wholeNumber(label: string, minimum: number, maximum: number) {
  return z
    .number({ error: `${label} needs to be a number` })
    .int(`${label} needs to be a whole number`)
    .min(minimum, `${label} looks too low`)
    .max(maximum, `${label} looks too high`)
}

function optionalWholeNumber(label: string, minimum: number, maximum: number) {
  return z.preprocess((value) => {
    const cleaned = blankToNull(value)
    return cleaned === null || cleaned === undefined ? null : Number(cleaned)
  }, wholeNumber(label, minimum, maximum).nullable())
}

function optionalText(maximumLength: number) {
  return z.preprocess((value) => blankToNull(typeof value === 'string' ? value.trim() : value), z.string().max(maximumLength).nullable().default(null))
}

export const jumpFormSchema = z
  .object({
    jumpNumber: z.preprocess((value) => Number(blankToNull(value) ?? Number.NaN), wholeNumber('Jump number', 1, 100000)),
    date: z
      .string({ error: 'Pick a date' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
      // a day's grace either side of midnight, so time zones never block a genuine jump
      .refine((date) => date <= addDays(todayIsoDate(), 1), "That date hasn't happened yet"),
    dropZoneId: optionalText(64),
    aircraft: optionalText(80),
    exitAltitudeFt: optionalWholeNumber('Exit altitude', 500, 40000),
    deployAltitudeFt: optionalWholeNumber('Deploy altitude', 0, 40000),
    delaySeconds: optionalWholeNumber('Delay', 0, 600),
    canopySizeFt2: optionalWholeNumber('Canopy size', 50, 400),
    description: optionalText(2000),
    authoriser: optionalText(120),
    ocrSourceId: optionalText(64),
  })
  .refine(
    (jump) => jump.exitAltitudeFt === null || jump.deployAltitudeFt === null || jump.deployAltitudeFt < jump.exitAltitudeFt,
    { path: ['deployAltitudeFt'], message: 'Deploy altitude has to be below exit altitude' },
  )

export function parseJumpForm(input: Record<string, unknown>): { newJump: NewJump } | { state: JumpFormState } {
  const parsed = jumpFormSchema.safeParse(input)
  if (parsed.success) return { newJump: parsed.data }

  const fieldErrors: JumpFormState['fieldErrors'] = {}
  for (const issue of parsed.error.issues) {
    const field = jumpFormFields.find((formField) => formField === issue.path[0])
    if (field && !(field in fieldErrors)) fieldErrors[field] = issue.message
  }
  return { state: { formError: 'Some details need another look.', fieldErrors } }
}

/** Turns a stored jump (or OCR draft) back into strings for a controlled form. */
export function toJumpFormValues(source: Partial<Record<JumpFormField, string | number | null | undefined>>): JumpFormValues {
  return Object.fromEntries(jumpFormFields.map((field) => [field, source[field] == null ? '' : String(source[field])])) as JumpFormValues
}
