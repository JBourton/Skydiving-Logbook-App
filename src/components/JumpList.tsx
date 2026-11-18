import Link from 'next/link'
import { missingFields } from '~/domain/jump-completeness'
import { JumpProfile } from '~/components/JumpProfile'
import { TagChips } from '~/components/Primitives'
import { formatDate, formatDuration, formatFeet } from '~/lib/format'
import type { JumpListRow } from '~/lib/logbook-view'

// in a narrow space each jump is a stacked row; with room to spare (a container query, so it reacts
// to the column it sits in rather than the window) the same markup lines up into the columns of a
// paper logbook: number, date, place, aircraft, heights, delay, canopy
const ledgerColumns = '@4xl:grid-cols-[12px_3.5rem_7.5rem_minmax(9rem,1fr)_7rem_5.75rem_5.75rem_4rem_4rem]'

export function JumpList({ rows, highlightJumpNumber }: { rows: readonly JumpListRow[]; highlightJumpNumber?: number }) {
  return (
    <div className="@container">
      <div aria-hidden="true" className={`hidden gap-x-3 px-3 pb-3 text-meta text-ink-soft @4xl:grid ${ledgerColumns}`}>
        <span />
        <span>No.</span>
        <span>Date</span>
        <span>Drop zone</span>
        <span>Aircraft</span>
        <span className="text-right">Exit</span>
        <span className="text-right">Deploy</span>
        <span className="text-right">Delay</span>
        <span className="text-right">Canopy</span>
      </div>
      <ol aria-label="Jumps, newest first" className="flex flex-col gap-1">
        {rows.map((row) => (
          <JumpListItem key={row.jump.id} row={row} isHighlighted={row.jump.jumpNumber === highlightJumpNumber} />
        ))}
      </ol>
    </div>
  )
}

function JumpListItem({ row, isHighlighted }: { row: JumpListRow; isHighlighted: boolean }) {
  const { jump } = row
  const isIncomplete = missingFields(jump).length > 0

  return (
    <li>
      <Link
        href={`/jumps/${jump.id}`}
        className={`grid grid-cols-[12px_1fr_auto] items-center gap-x-4 rounded-control px-3 py-3.5 hover:bg-haze @4xl:gap-x-3 ${ledgerColumns} ${isHighlighted ? 'just-saved' : ''}`}
      >
        <JumpProfile exitAltitudeFt={jump.exitAltitudeFt} deployAltitudeFt={jump.deployAltitudeFt} />

        <div className="min-w-0 @4xl:contents">
          <p className="flex items-baseline gap-3 @4xl:contents">
            <span className="text-title font-bold">{jump.jumpNumber}</span>
            <span className="text-meta text-ink-soft @4xl:text-body @4xl:text-ink">{formatDate(jump.date)}</span>
          </p>
          <div className="min-w-0">
            <p className="truncate">{row.dropZoneName ?? 'Drop zone not recorded'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 empty:hidden">
              <TagChips names={row.tagNames} />
              {isIncomplete ? <span className="text-meta font-bold text-caution">Incomplete</span> : null}
            </div>
          </div>
          <p className="hidden truncate text-ink-soft @4xl:block">{jump.aircraft ?? ''}</p>
        </div>

        <p className="text-right @4xl:contents">
          <span className="block font-bold @4xl:text-right">{jump.exitAltitudeFt === null ? '–' : formatFeet(jump.exitAltitudeFt)}</span>
          <span className="hidden text-right @4xl:block">{jump.deployAltitudeFt === null ? '–' : formatFeet(jump.deployAltitudeFt)}</span>
          <span className="block text-meta text-ink-soft @4xl:text-right @4xl:text-body @4xl:text-ink">
            {jump.delaySeconds === null ? '–' : formatDuration(jump.delaySeconds)}
          </span>
          <span className="hidden text-right @4xl:block">{jump.canopySizeFt2 === null ? '–' : `${jump.canopySizeFt2} ft²`}</span>
        </p>
      </Link>
    </li>
  )
}
