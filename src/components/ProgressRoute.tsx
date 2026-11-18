import type { ProgressionTarget, Requirement } from '~/domain/progression'

// the licence ladder drawn like a flight plan on a glass cockpit: a magenta line through each
// waypoint, solid behind you & dashed ahead. Magenta is used for nothing else in the app.

export function ProgressRoute({ route }: { route: readonly ProgressionTarget[] }) {
  const nextTargetIndex = route.findIndex((target) => !target.achieved)

  return (
    <ol className="relative">
      {route.map((target, index) => {
        const isNext = index === nextTargetIndex
        const isBehind = target.achieved
        const isLast = index === route.length - 1
        return (
          <li key={target.code} className="relative grid grid-cols-[2rem_1fr] gap-x-4 pb-10 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden="true"
                className={`absolute top-6 bottom-0 left-[0.9375rem] w-0.5 ${
                  isBehind ? 'bg-route' : 'bg-[repeating-linear-gradient(to_bottom,var(--route)_0_6px,transparent_6px_12px)] opacity-60'
                }`}
              />
            ) : null}
            <Waypoint state={isBehind ? 'behind' : isNext ? 'next' : 'ahead'} />
            <div>
              <h3 className={`text-title ${isNext ? 'text-route' : ''}`}>
                {target.name}
                <span className="sr-only">{isBehind ? ', held' : isNext ? ', next' : ''}</span>
              </h3>
              {isBehind ? <p className="text-meta text-ink-soft">Held</p> : <RequirementList requirements={target.requirements} />}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Waypoint({ state }: { state: 'behind' | 'next' | 'ahead' }) {
  const ringStyles = {
    behind: 'border-route bg-route',
    next: 'border-route bg-paper ring-4 ring-route-soft',
    ahead: 'border-line bg-paper',
  }
  return (
    <span aria-hidden="true" className="relative z-10 mt-1 flex h-8 w-8 items-center justify-center">
      <span className={`h-5 w-5 rotate-45 rounded-[4px] border-[3px] ${ringStyles[state]}`} />
    </span>
  )
}

export function RequirementList({ requirements }: { requirements: readonly Requirement[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2.5">
      {requirements.map((requirement) => (
        <li key={requirement.label} className="grid grid-cols-[1.5rem_1fr] items-start gap-x-2">
          <RequirementMark met={requirement.met} />
          <div>
            <p className={requirement.met === true ? 'text-ink-soft' : 'font-bold'}>{requirement.label}</p>
            {requirement.target !== undefined && requirement.met === false ? (
              <JumpCountProgress current={requirement.current ?? 0} target={requirement.target} />
            ) : null}
            {requirement.met === null ? <p className="text-meta text-ink-soft">Needs an instructor's sign-off</p> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function JumpCountProgress({ current, target }: { current: number; target: number }) {
  return (
    <div className="mt-1.5 max-w-80">
      <div className="h-1.5 rounded-full bg-route-soft">
        <div className="h-1.5 rounded-full bg-route" style={{ width: `${(current / target) * 100}%` }} />
      </div>
      <p className="mt-1 text-meta text-ink-soft">
        {current} of {target}
      </p>
    </div>
  )
}

/** A tick for done, an open ring for not yet, a dashed ring for "can't tell from the logbook". */
export function RequirementMark({ met }: { met: boolean | null }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" className="mt-0.5" role="img" aria-label={met === true ? 'Done' : met === false ? 'Not yet' : 'Not recorded'}>
      {met === true ? (
        <>
          <circle cx={10} cy={10} r={9} className="fill-ink" />
          <path d="M5.5 10.5l3 3 6-6.5" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="stroke-paper" />
        </>
      ) : (
        <circle cx={10} cy={10} r={8} fill="none" strokeWidth={2} strokeDasharray={met === null ? '3 3' : undefined} className="stroke-ink-soft" />
      )}
    </svg>
  )
}
