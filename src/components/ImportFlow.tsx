'use client'

import { useActionState, useState } from 'react'
import { deployAltitudeWarning } from '~/domain/deploy-altitude'
import { missingFields } from '~/domain/jump-completeness'
import { estimateFreefallSeconds } from '~/domain/logbook-insights'
import { emptyReviewSaveState, type JumpFormField, type JumpFormValues, type ReviewSaveState } from '~/lib/jump-form'

// the OCR trust boundary from ARCHITECTURE.md §4: whatever the model read stays a draft until it's
// been looked at here, & only ticked drafts are sent to the server, which validates them again

type ReviewDraft = { position: number; keep: boolean; values: JumpFormValues }

type ImportFlowProps = {
  initialDrafts: JumpFormValues[]
  pageLabel: string | null
  canReadPages: boolean
  dropZones: ReadonlyArray<{ id: string; name: string }>
  action: (state: ReviewSaveState, formData: FormData) => Promise<ReviewSaveState>
}

function numberOrNull(value: string): number | null {
  return value.trim() === '' || Number.isNaN(Number(value)) ? null : Number(value)
}

// a dropped 0 is the classic handwriting misread: "3500" comes back as "350"
function likelyMisreadDeploy(deployFt: number | null): number | null {
  if (deployFt === null || deployFt >= 1000) return null
  const corrected = deployFt * 10
  return corrected >= 2000 && corrected <= 6000 ? corrected : null
}

type Check = { tone: 'warn' | 'caution'; message: string; fix?: { label: string; field: JumpFormField; value: string } }

function checksFor(draft: ReviewDraft, previousNumber: number | null): Check[] {
  const { values } = draft
  const checks: Check[] = []
  const exitFt = numberOrNull(values.exitAltitudeFt)
  const deployFt = numberOrNull(values.deployAltitudeFt)

  if (values.jumpNumber === '') {
    const suggestion = previousNumber === null ? undefined : { label: `Use ${previousNumber + 1}`, field: 'jumpNumber' as const, value: String(previousNumber + 1) }
    checks.push({ tone: 'caution', message: "Couldn't read the jump number", fix: suggestion })
  }
  const misread = likelyMisreadDeploy(deployFt)
  const warning = deployAltitudeWarning(deployFt)
  if (warning) {
    checks.push({ tone: 'warn', message: warning, fix: misread ? { label: `Change to ${misread.toLocaleString('en-GB')} ft`, field: 'deployAltitudeFt', value: String(misread) } : undefined })
  }
  const missing = missingFields({ exitAltitudeFt: exitFt, deployAltitudeFt: deployFt, delaySeconds: numberOrNull(values.delaySeconds), dropZoneId: values.dropZoneId || null })
  if (missing.includes('delaySeconds')) {
    const estimate = exitFt !== null && deployFt !== null ? estimateFreefallSeconds(exitFt, deployFt) : null
    checks.push({ tone: 'caution', message: 'No delay written down', fix: estimate ? { label: `Use about ${estimate} s`, field: 'delaySeconds', value: String(estimate) } : undefined })
  }
  return checks
}

export function ImportFlow({ initialDrafts, pageLabel, canReadPages, dropZones, action }: ImportFlowProps) {
  const [state, formAction, isSaving] = useActionState(action, emptyReviewSaveState)
  const [drafts, setDrafts] = useState<ReviewDraft[]>(initialDrafts.map((values, position) => ({ position, keep: true, values })))
  const [chosenPhotos, setChosenPhotos] = useState<string[]>([])
  const keptDrafts = drafts.filter((draft) => draft.keep)
  const currentStep = drafts.length === 0 ? 1 : 2

  const updateDraft = (position: number, change: Partial<ReviewDraft> | { field: JumpFormField; value: string }) =>
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.position !== position) return draft
        return 'field' in change ? { ...draft, values: { ...draft.values, [change.field]: change.value } } : { ...draft, ...change }
      }),
    )

  return (
    <div className="mt-6">
      <ol aria-label="Steps" className="flex flex-wrap gap-x-6 gap-y-1 text-meta">
        {['Add photos', 'Check each jump', 'Save to your logbook'].map((label, index) => (
          <li key={label} aria-current={index + 1 === currentStep ? 'step' : undefined} className="text-ink-soft aria-[current=step]:font-bold aria-[current=step]:text-ink">
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {drafts.length === 0 ? (
        <PhotoPicker chosenPhotos={chosenPhotos} onChoose={setChosenPhotos} canReadPages={canReadPages} />
      ) : (
        <form action={formAction} className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <input type="hidden" name="drafts" value={JSON.stringify(keptDrafts.map(({ position, values }) => ({ position, values })))} />
          <div className="lg:sticky lg:top-6 lg:self-start">
            <SampleLogbookPage drafts={initialDrafts} />
            {pageLabel ? <p className="mt-3 text-meta text-ink-soft">{pageLabel}, as read from your photo</p> : null}
          </div>

          <div className="flex flex-col gap-5">
            {state.formError ? (
              <p role="alert" className="rounded-control bg-warn-soft px-4 py-3 font-bold text-warn">
                {state.formError}
              </p>
            ) : null}
            {drafts.map((draft, index) => (
              <DraftReview
                key={draft.position}
                draft={draft}
                checks={checksFor(draft, numberOrNull(drafts[index - 1]?.values.jumpNumber ?? ''))}
                errors={state.errorsByDraft[draft.position] ?? {}}
                dropZones={dropZones}
                onChange={(change) => updateDraft(draft.position, change)}
              />
            ))}
            <div className="sticky bottom-24 z-30 flex flex-col gap-2 rounded-panel bg-paper py-3 sm:flex-row sm:items-center md:bottom-4">
              <button type="submit" disabled={isSaving || keptDrafts.length === 0} className="min-h-16 rounded-control bg-ink px-8 text-title font-bold text-paper hover:bg-ink-soft disabled:opacity-50">
                {isSaving ? 'Saving…' : `Save ${keptDrafts.length} ${keptDrafts.length === 1 ? 'jump' : 'jumps'}`}
              </button>
              {drafts.length > keptDrafts.length ? <p className="text-meta text-ink-soft">{drafts.length - keptDrafts.length} left out</p> : null}
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

function PhotoPicker({ chosenPhotos, onChoose, canReadPages }: { chosenPhotos: string[]; onChoose: (urls: string[]) => void; canReadPages: boolean }) {
  return (
    <div className="mt-8 max-w-[40rem]">
      <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border-2 border-dashed border-line bg-haze px-6 text-center hover:border-ink-soft">
        <span className="text-title font-bold">Choose photos of logbook pages</span>
        <span className="text-meta text-ink-soft">On a phone this opens the camera. Flat, well-lit pages read best.</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(event) => onChoose([...(event.target.files ?? [])].map((file) => URL.createObjectURL(file)))}
        />
      </label>
      {chosenPhotos.length > 0 ? (
        <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {chosenPhotos.map((url) => (
            <li key={url}>
              {/* local previews only, so a plain img is right here rather than next/image */}
              <img src={url} alt="Chosen logbook page" className="aspect-[3/4] w-full rounded-control object-cover" />
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" disabled={!canReadPages || chosenPhotos.length === 0} className="mt-6 min-h-14 rounded-control bg-ink px-6 font-bold text-paper disabled:opacity-45">
        Read {chosenPhotos.length > 1 ? `${chosenPhotos.length} pages` : 'page'}
      </button>
      {!canReadPages ? <p className="mt-3 text-meta text-ink-soft">Reading pages needs the OCR service, which isn't connected yet.</p> : null}
    </div>
  )
}

type DraftReviewProps = {
  draft: ReviewDraft
  checks: Check[]
  errors: Partial<Record<JumpFormField, string>>
  dropZones: ReadonlyArray<{ id: string; name: string }>
  onChange: (change: Partial<ReviewDraft> | { field: JumpFormField; value: string }) => void
}

function DraftReview({ draft, checks, errors, dropZones, onChange }: DraftReviewProps) {
  const needsAttention = checks.length > 0 || Object.keys(errors).length > 0
  const [isOpen, setIsOpen] = useState(needsAttention)
  const input = (field: JumpFormField, label: string, type: 'number' | 'date' | 'text' = 'number', className = '') => (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-meta text-ink-soft">{label}</span>
      <input
        type={type}
        inputMode={type === 'number' ? 'numeric' : undefined}
        value={draft.values[field]}
        onChange={(event) => onChange({ field, value: event.target.value })}
        aria-invalid={errors[field] ? true : undefined}
      />
      {errors[field] ? <span className="mt-1 block text-meta font-bold text-warn">{errors[field]}</span> : null}
    </label>
  )

  return (
    <article className={`rounded-panel px-5 py-4 ${draft.keep ? 'bg-haze' : 'bg-paper outline-2 outline-line outline-dashed'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={draft.keep} onChange={(event) => onChange({ keep: event.target.checked })} className="h-6 w-6 accent-[var(--ink)]" />
          <span className="text-title font-bold">{draft.values.jumpNumber ? `Jump ${draft.values.jumpNumber}` : 'Jump number unreadable'}</span>
        </label>
        <button type="button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} className="min-h-11 rounded-control px-3 text-meta font-bold text-ink-soft underline decoration-2 underline-offset-4">
          {isOpen ? 'Done' : needsAttention ? 'Check' : 'Edit'}
        </button>
      </div>
      <p className={`text-meta ${checks.length > 0 ? 'font-bold text-caution' : 'text-ink-soft'}`}>
        {checks.length === 0 ? 'Looks complete' : `${checks.length} ${checks.length === 1 ? 'thing' : 'things'} to check`}
      </p>

      {checks.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {checks.map((check) => (
            <li key={check.message} className={`flex flex-wrap items-center justify-between gap-2 rounded-control px-3 py-2 ${check.tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-caution-soft text-caution'}`}>
              <span className="font-bold">{check.message}</span>
              {check.fix ? (
                <button type="button" onClick={() => check.fix && onChange({ field: check.fix.field, value: check.fix.value })} className="min-h-10 rounded-full bg-paper px-4 text-meta font-bold text-ink">
                  {check.fix.label}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {isOpen ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {input('jumpNumber', 'Jump number', 'number', 'col-span-2 sm:col-span-1')}
          {input('date', 'Date', 'date', 'col-span-2 sm:col-span-1')}
          <label className="col-span-2 block">
            <span className="mb-1.5 block text-meta text-ink-soft">Drop zone</span>
            <select value={draft.values.dropZoneId} onChange={(event) => onChange({ field: 'dropZoneId', value: event.target.value })}>
              <option value="">Not recorded</option>
              {dropZones.map((dropZone) => (
                <option key={dropZone.id} value={dropZone.id}>
                  {dropZone.name}
                </option>
              ))}
            </select>
          </label>
          {input('exitAltitudeFt', 'Exit (ft)')}
          {input('deployAltitudeFt', 'Deploy (ft)')}
          {input('delaySeconds', 'Delay (s)')}
          {input('canopySizeFt2', 'Canopy (ft²)')}
          {input('description', 'What happened', 'text', 'col-span-2 md:col-span-4')}
        </div>
      ) : (
        <p className="mt-2 truncate text-ink-soft">{draft.values.description || 'No notes'}</p>
      )}
    </article>
  )
}

/** Stand-in photo for demo mode: a ruled logbook page "handwritten" in biro blue. */
function SampleLogbookPage({ drafts }: { drafts: JumpFormValues[] }) {
  const columns = [
    { label: 'No.', x: 14 },
    { label: 'Date', x: 52 },
    { label: 'Exit', x: 118 },
    { label: 'Open', x: 168 },
    { label: 'Delay', x: 216 },
    { label: 'Details', x: 262 },
  ]
  const rowHeight = 46
  return (
    <svg viewBox="0 0 420 300" role="img" aria-label="Photo of a handwritten logbook page" className="w-full rounded-control">
      <rect width={420} height={300} fill="#f6f7f4" />
      {columns.map((column) => (
        <text key={column.label} x={column.x} y={26} fontSize={11} fill="#7d8aa3">
          {column.label}
        </text>
      ))}
      {Array.from({ length: 7 }, (_, index) => (
        <line key={index} x1={0} x2={420} y1={36 + index * rowHeight} y2={36 + index * rowHeight} stroke="#b9c6dc" strokeWidth={1} />
      ))}
      {columns.slice(1).map((column) => (
        <line key={column.label} x1={column.x - 8} x2={column.x - 8} y1={14} y2={300} stroke="#e1b7b7" strokeWidth={1} />
      ))}
      {drafts.map((draft, index) => {
        const y = 36 + index * rowHeight + 30
        const deploy = numberOrNull(draft.deployAltitudeFt)
        // the page shows what was actually written; the OCR's mistakes live in the drafts, not here
        const writtenDeploy = deploy !== null && deploy < 1000 ? deploy * 10 : deploy
        const cells = [
          draft.jumpNumber || '6?',
          draft.date ? `${draft.date.slice(8, 10)}/${draft.date.slice(5, 7)}` : '',
          draft.exitAltitudeFt,
          writtenDeploy === null ? '' : String(writtenDeploy),
          draft.delaySeconds,
          draft.description.slice(0, 24),
        ]
        return (
          <g key={index} fill="#24409a" fontStyle="italic" fontSize={14} transform={`rotate(${index % 2 === 0 ? -0.6 : 0.4} 200 ${y})`}>
            {cells.map((cell, cellIndex) => (
              <text key={cellIndex} x={columns[cellIndex].x + (cellIndex % 2) * 2} y={y} opacity={cellIndex === 0 && !draft.jumpNumber ? 0.35 : 0.92}>
                {cell}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
