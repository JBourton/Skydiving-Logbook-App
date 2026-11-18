import type { Metadata } from 'next'
import { EmptyState, PageHeader, Section, TextLink } from '~/components/Primitives'
import { ProgressRoute, RequirementMark } from '~/components/ProgressRoute'
import { type GradeCode, gradeSignOffs, gradeTargets, licenceRoute, outstandingRequirements } from '~/domain/progression'
import { tally, totalFreefallSeconds } from '~/domain/logbook-insights'
import { formatDuration, pluralise } from '~/lib/format'
import { type LogbookView, loadLogbook, progressionSnapshotFor, totalJumpCount } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Progress' }

// personal milestones, separate from licences. The freefall steps line up with the FAI certificates
// (B: 30 min, C: 1 h, D: 3 h) from Operations Manual Section 2 para 3.
const milestoneSettings = {
  jumps: [25, 50, 100, 200, 500, 1000, 2000],
  freefallMinutes: [{ minutes: 30, note: 'FAI B certificate time' }, { minutes: 60, note: 'FAI C certificate time' }, { minutes: 180, note: 'FAI D certificate time' }, { minutes: 600, note: '' }],
  dropZones: [3, 5, 10, 20],
}

export default async function ProgressPage() {
  const view = await loadLogbook()
  const snapshot = progressionSnapshotFor(view)
  const route = licenceRoute(snapshot)
  const nextTarget = route.find((target) => !target.achieved)
  const isRecorded = snapshot.licence !== null
  const gradesNeedingSignOff = nextTarget
    ? outstandingRequirements(nextTarget)
        .map((requirement) => requirement.label)
        .filter((label): label is GradeCode => label in gradeSignOffs)
    : []

  return (
    <>
      <PageHeader
        title="Progress"
        lede={
          isRecorded
            ? `You hold ${snapshot.licence === 'student' ? 'no licence yet' : `an ${snapshot.licence} licence`}.${nextTarget ? ` Next on the route: ${nextTarget.name}.` : ''}`
            : 'Jump counts are worked out from your logbook. Licences & grades come from your licence card, so record them in Settings.'
        }
      />

      <div className="grid gap-x-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Section title="Your route">
            <ProgressRoute route={route} />
          </Section>
          {gradesNeedingSignOff.map((grade) => (
            <SignOffChecklist key={grade} grade={grade} view={view} />
          ))}
        </div>
        <div>
          <Section title="Discipline grades" description="The stamps in your licence. Each is signed off by an Advanced Instructor once you've trained.">
            <ul className="flex flex-col gap-5">
              {gradeTargets(snapshot).map((grade) => {
                const outstanding = outstandingRequirements(grade)
                return (
                  <li key={grade.code} className="grid grid-cols-[3.5rem_1fr] gap-x-3">
                    <span className="text-title font-bold">{grade.code}</span>
                    <div>
                      <p>{grade.name}</p>
                      <p className={`text-meta ${grade.achieved ? 'font-bold text-ink' : 'text-ink-soft'}`}>
                        {grade.achieved ? 'Held' : outstanding.length === 0 ? 'Ready to train for' : `Needs ${outstanding.map((requirement) => requirement.label).join(', ')}`}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Section>
          <Milestones view={view} />
          <Section title="Your own goals">
            {view.previewOnly.customGoals.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {view.previewOnly.customGoals.map((goal) => (
                  <li key={goal.label} className="grid grid-cols-[1.5rem_1fr] gap-x-2">
                    <RequirementMark met={goal.done} />
                    <span className={goal.done ? 'text-ink-soft' : 'font-bold'}>{goal.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No goals yet">Goals you set yourself will live here once they can be saved.</EmptyState>
            )}
          </Section>
        </div>
      </div>

      <p className="mt-20 max-w-[44rem] text-meta text-ink-soft">
        Requirements follow the British Skydiving Operations Manual, Section 2, & the B licence application form (Form 190B). Your chief instructor has the final word. Spotted
        something out of date? It lives in one file: <code>src/domain/progression.ts</code>.
      </p>
    </>
  )
}

function SignOffChecklist({ grade, view }: { grade: GradeCode; view: LogbookView }) {
  const signedOff = view.previewOnly.profile.signOffsDone[grade] ?? []
  return (
    <Section title={`${grade} sign-offs`} description={view.previewOnly.isSample ? 'Ticked once an instructor has signed your logbook.' : "Sign-offs can't be recorded yet, so these show as unknown."}>
      <ul className="flex flex-col gap-3">
        {(gradeSignOffs[grade] ?? []).map((item, index) => (
          <li key={item} className="grid grid-cols-[1.5rem_1fr] gap-x-2">
            <RequirementMark met={view.previewOnly.isSample ? signedOff.includes(index) : null} />
            <span className={signedOff.includes(index) ? 'text-ink-soft' : ''}>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function nextAbove(steps: readonly number[], current: number): number | null {
  return steps.find((step) => step > current) ?? null
}

function Milestones({ view }: { view: LogbookView }) {
  const totalJumps = totalJumpCount(view.jumps)
  const freefallMinutes = Math.floor(totalFreefallSeconds(view.jumps) / 60)
  const dropZoneCount = tally(view.jumps, (jump) => jump.dropZoneId).size
  const nextJumps = nextAbove(milestoneSettings.jumps, totalJumps)
  const nextFreefall = milestoneSettings.freefallMinutes.find((step) => step.minutes > freefallMinutes) ?? null
  const nextDropZones = nextAbove(milestoneSettings.dropZones, dropZoneCount)

  const milestones = [
    nextJumps ? { label: `${nextJumps} jumps`, current: totalJumps, target: nextJumps, note: `${pluralise(nextJumps - totalJumps, 'jump')} to go` } : null,
    nextFreefall
      ? { label: `${formatDuration(nextFreefall.minutes * 60)} of freefall`, current: freefallMinutes, target: nextFreefall.minutes, note: nextFreefall.note || `${formatDuration(freefallMinutes * 60)} so far` }
      : null,
    nextDropZones ? { label: `${nextDropZones} drop zones`, current: dropZoneCount, target: nextDropZones, note: `${dropZoneCount} so far` } : null,
  ].filter((milestone) => milestone !== null)

  return (
    <Section title="Milestones">
      <ul className="flex flex-col gap-6">
        {milestones.map((milestone) => (
          <li key={milestone.label}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-bold">{milestone.label}</span>
              <span className="text-meta text-ink-soft">{milestone.note}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-haze">
              <div className="h-2 rounded-full bg-ink" style={{ width: `${Math.min(100, (milestone.current / milestone.target) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
