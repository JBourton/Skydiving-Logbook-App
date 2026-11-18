'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { deployAltitudeWarning } from '~/domain/deploy-altitude'
import { missingFields, type MissingJumpField } from '~/domain/jump-completeness'
import { estimateFreefallSeconds } from '~/domain/logbook-insights'
import { emptyJumpFormState, type JumpFormField, type JumpFormState, type JumpFormValues } from '~/lib/jump-form'

const formSettings = {
  // the heights most UK loads go to, so the common case is 1 tap rather than 5 keystrokes
  quickExitAltitudesFt: [5000, 10000, 13000, 15000],
}

const missingFieldNames: Record<MissingJumpField, string> = {
  exitAltitudeFt: 'exit altitude',
  deployAltitudeFt: 'deploy altitude',
  delaySeconds: 'delay',
  dropZoneId: 'drop zone',
}

type JumpFormProps = {
  action: (state: JumpFormState, formData: FormData) => Promise<JumpFormState>
  initialValues: JumpFormValues
  dropZones: ReadonlyArray<{ id: string; name: string; country: string }>
  aircraftSuggestions: readonly string[]
  prefilledFromJumpNumber: number | null
}

function toNumberOrNull(value: string): number | null {
  return value.trim() === '' || Number.isNaN(Number(value)) ? null : Number(value)
}

export function JumpForm({ action, initialValues, dropZones, aircraftSuggestions, prefilledFromJumpNumber }: JumpFormProps) {
  const [state, formAction, isSaving] = useActionState(action, emptyJumpFormState)
  const [values, setValues] = useState(initialValues)
  const setField = (field: JumpFormField, value: string) => setValues((current) => ({ ...current, [field]: value }))

  const exitFt = toNumberOrNull(values.exitAltitudeFt)
  const deployFt = toNumberOrNull(values.deployAltitudeFt)
  const deployWarning = deployAltitudeWarning(deployFt)
  const estimatedDelay = exitFt !== null && deployFt !== null ? estimateFreefallSeconds(exitFt, deployFt) : null
  const stillMissing = missingFields({
    exitAltitudeFt: exitFt,
    deployAltitudeFt: deployFt,
    delaySeconds: toNumberOrNull(values.delaySeconds),
    dropZoneId: values.dropZoneId || null,
  })
  const fieldProps = (field: JumpFormField) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) => setField(field, event.target.value),
    'aria-invalid': state.fieldErrors[field] ? true : undefined,
    'aria-describedby': state.fieldErrors[field] ? `${field}-error` : undefined,
  })

  return (
    <form action={formAction} className="mt-8 max-w-[46rem]" noValidate>
      {prefilledFromJumpNumber !== null ? (
        <p className="mb-6 text-meta text-ink-soft">Drop zone, aircraft, heights & canopy are carried over from jump {prefilledFromJumpNumber}.</p>
      ) : null}

      {state.formError ? (
        <p role="alert" className="mb-6 rounded-control bg-warn-soft px-4 py-3 font-bold text-warn">
          {state.formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
        <Field label="Jump number" field="jumpNumber" error={state.fieldErrors.jumpNumber}>
          <input {...fieldProps('jumpNumber')} type="number" inputMode="numeric" required />
        </Field>
        <Field label="Date" field="date" error={state.fieldErrors.date}>
          <input {...fieldProps('date')} type="date" required />
        </Field>

        <Field label="Drop zone" field="dropZoneId" error={state.fieldErrors.dropZoneId} wide>
          <select {...fieldProps('dropZoneId')}>
            <option value="">Not recorded</option>
            {dropZones.map((dropZone) => (
              <option key={dropZone.id} value={dropZone.id}>
                {dropZone.name}, {dropZone.country}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Exit altitude (ft)" field="exitAltitudeFt" error={state.fieldErrors.exitAltitudeFt} wide>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input {...fieldProps('exitAltitudeFt')} type="number" inputMode="numeric" step={500} className="sm:max-w-48" />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Common exit altitudes">
              {formSettings.quickExitAltitudesFt.map((altitudeFt) => (
                <button
                  key={altitudeFt}
                  type="button"
                  onClick={() => setField('exitAltitudeFt', String(altitudeFt))}
                  aria-pressed={exitFt === altitudeFt}
                  className="min-h-12 rounded-full bg-haze px-4 font-bold text-ink-soft hover:bg-haze-strong aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {altitudeFt / 1000}k
                </button>
              ))}
            </div>
          </div>
        </Field>

        <Field label="Deploy altitude (ft)" field="deployAltitudeFt" error={state.fieldErrors.deployAltitudeFt}>
          <input {...fieldProps('deployAltitudeFt')} type="number" inputMode="numeric" step={500} />
        </Field>
        <Field label="Delay (seconds)" field="delaySeconds" error={state.fieldErrors.delaySeconds}>
          <input {...fieldProps('delaySeconds')} type="number" inputMode="numeric" />
          {estimatedDelay !== null && values.delaySeconds === '' ? (
            <button type="button" onClick={() => setField('delaySeconds', String(estimatedDelay))} className="mt-2 text-meta font-bold text-ink-soft underline decoration-2 underline-offset-4">
              Use about {estimatedDelay} s for these heights
            </button>
          ) : null}
        </Field>

        <Field label="Aircraft" field="aircraft" error={state.fieldErrors.aircraft}>
          <input {...fieldProps('aircraft')} type="text" list="aircraft-suggestions" autoComplete="off" />
          <datalist id="aircraft-suggestions">
            {aircraftSuggestions.map((aircraft) => (
              <option key={aircraft} value={aircraft} />
            ))}
          </datalist>
        </Field>
        <Field label="Canopy size (ft²)" field="canopySizeFt2" error={state.fieldErrors.canopySizeFt2}>
          <input {...fieldProps('canopySizeFt2')} type="number" inputMode="numeric" />
        </Field>

        <Field label="What happened" field="description" error={state.fieldErrors.description} wide>
          <textarea {...fieldProps('description')} rows={4} placeholder="Dive plan, what went well, what to work on" />
        </Field>
        <Field label="Signed off by" field="authoriser" error={state.fieldErrors.authoriser} wide>
          <input {...fieldProps('authoriser')} type="text" autoComplete="off" placeholder="Instructor or witness" />
        </Field>
      </div>

      <div className="mt-8 flex flex-col gap-3" aria-live="polite">
        {deployWarning ? <p className="rounded-control bg-warn-soft px-4 py-3 font-bold text-warn">{deployWarning}</p> : null}
        {stillMissing.length > 0 ? (
          <p className="text-meta text-ink-soft">
            Not filled in yet: {stillMissing.map((field) => missingFieldNames[field]).join(', ')}. You can save now & add them later.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="mt-6 min-h-16 w-full rounded-control bg-ink px-6 text-title font-bold text-paper hover:bg-ink-soft disabled:opacity-60 sm:w-auto sm:min-w-72"
      >
        {isSaving ? 'Saving…' : `Save jump ${values.jumpNumber || ''}`.trim()}
      </button>
    </form>
  )
}

function Field({ label, field, error, wide = false, children }: { label: string; field: JumpFormField; error?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={field} className="mb-2 block text-meta text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${field}-error`} className="mt-2 text-meta font-bold text-warn">
          {error}
        </p>
      ) : null}
    </div>
  )
}
