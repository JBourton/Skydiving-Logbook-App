import type { Metadata } from 'next'
import { ActivityHeatmap, BarList, CumulativeLine } from '~/components/Charts'
import { EmptyState, PageHeader, Readout, Section, TextLink } from '~/components/Primitives'
import { disciplineRecency } from '~/domain/currency'
import type { Jump } from '~/domain/jump'
import {
  cumulativeJumpsByMonth,
  freefallDistanceFt,
  jumpsPerDay,
  personalBests,
  rollingTotals,
  tally,
  totalFreefallSeconds,
} from '~/domain/logbook-insights'
import { formatDate, formatDaysAgo, formatDuration, formatFeet, formatMonth, pluralise } from '~/lib/format'
import { type LogbookView, lastJumpDateByDiscipline, loadLogbook, totalJumpCount } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Stats' }

const statsSettings = {
  // licence jump counts, drawn on the cumulative line when they're behind you or within reach
  licenceJumpCounts: [
    { jumps: 50, licence: 'B' },
    { jumps: 200, licence: 'C' },
    { jumps: 1000, licence: 'D' },
  ],
  topBreakdownRows: 6,
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function licenceMarker(totalJumps: number): { jumps: number; label: string } | undefined {
  const next = statsSettings.licenceJumpCounts.find((count) => count.jumps > totalJumps)
  if (next && next.jumps <= totalJumps * 1.6) return { jumps: next.jumps, label: `${next.jumps} jumps for a ${next.licence} licence` }
  const passed = [...statsSettings.licenceJumpCounts].reverse().find((count) => count.jumps <= totalJumps)
  return passed ? { jumps: passed.jumps, label: `${passed.jumps} jumps, the ${passed.licence} licence count` } : undefined
}

/** Runs of consecutive jumps on the same canopy size, e.g. "210 ft²: jumps 41 to 55". */
function canopyHistory(jumps: readonly Jump[]): Array<{ size: number; firstJump: number; lastJump: number }> {
  const runs: Array<{ size: number; firstJump: number; lastJump: number }> = []
  for (const jump of jumps) {
    if (jump.canopySizeFt2 === null) continue
    const currentRun = runs.at(-1)
    if (currentRun && currentRun.size === jump.canopySizeFt2) currentRun.lastJump = jump.jumpNumber
    else runs.push({ size: jump.canopySizeFt2, firstJump: jump.jumpNumber, lastJump: jump.jumpNumber })
  }
  return runs
}

function namedTally(jumps: readonly Jump[], nameOf: (jump: Jump) => string | null): Array<{ label: string; value: number }> {
  return [...tally(jumps, (jump) => nameOf(jump as Jump))]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, statsSettings.topBreakdownRows)
}

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const view = await loadLogbook()
  const read = (key: string) => String((Array.isArray(params[key]) ? params[key]?.[0] : params[key]) ?? '')
  const from = read('from')
  const to = read('to')
  const isFiltered = Boolean(from || to)
  const jumps = view.jumps.filter((jump) => (!from || jump.date >= from) && (!to || jump.date <= to))

  if (view.jumps.length === 0) {
    return (
      <>
        <PageHeader title="Stats" />
        <EmptyState title="Nothing to count yet">Stats fill in as soon as the 1st jump is in your logbook.</EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Stats" lede={isFiltered ? `${pluralise(jumps.length, 'jump')} between the dates you picked.` : `Everything since ${formatDate(view.jumps[0].date)}.`} />
      <RangeFilter from={from} to={to} isFiltered={isFiltered} />
      <StatsBody view={view} jumps={jumps} isFiltered={isFiltered} endDate={to && to < view.today ? to : view.today} />
    </>
  )
}

function RangeFilter({ from, to, isFiltered }: { from: string; to: string; isFiltered: boolean }) {
  return (
    <form method="get" className="mt-8 flex flex-wrap items-end gap-4 [&_input]:w-auto">
      <label>
        <span className="mb-1.5 block text-meta text-ink-soft">From</span>
        <input type="date" name="from" defaultValue={from} />
      </label>
      <label>
        <span className="mb-1.5 block text-meta text-ink-soft">To</span>
        <input type="date" name="to" defaultValue={to} />
      </label>
      <button type="submit" className="min-h-[3.25rem] rounded-control bg-ink px-6 font-bold text-paper hover:bg-ink-soft">
        Update
      </button>
      {isFiltered ? <TextLink href="/stats">All time</TextLink> : null}
    </form>
  )
}

function StatsBody({ view, jumps, isFiltered, endDate }: { view: LogbookView; jumps: Jump[]; isFiltered: boolean; endDate: string }) {
  const bests = personalBests(jumps)
  const rolling = rollingTotals(view.jumps, view.today)
  const freefallSeconds = totalFreefallSeconds(jumps)
  const jumpsWithDelay = jumps.filter((jump) => jump.delaySeconds !== null).length
  const disciplines = disciplineRecency(lastJumpDateByDiscipline(view), view.today)

  return (
    <>
      <Section title="Totals">
        <Readout
          columns={3}
          items={[
            { label: 'Jumps', value: pluralise(isFiltered ? jumps.length : totalJumpCount(jumps), 'jump') },
            { label: 'Freefall time', value: formatDuration(freefallSeconds) },
            { label: 'Fallen in freefall', value: formatFeet(freefallDistanceFt(jumps)) },
            { label: 'Average delay', value: jumpsWithDelay > 0 ? formatDuration(Math.round(freefallSeconds / jumpsWithDelay)) : 'Not recorded' },
            { label: 'Drop zones', value: String(tally(jumps, (jump) => jump.dropZoneId).size) },
            { label: 'Aircraft types', value: String(tally(jumps, (jump) => jump.aircraft).size) },
          ]}
        />
      </Section>

      {!isFiltered ? (
        <Section title="Rolling totals" description="Jumps in the window ending today.">
          <Readout
            columns={3}
            items={[
              { label: 'Last 30 days', value: String(rolling.last30Days) },
              { label: 'Last 90 days', value: String(rolling.last90Days) },
              { label: 'Last 365 days', value: String(rolling.last365Days) },
            ]}
          />
        </Section>
      ) : null}

      <Section title="Activity" description={`The 12 months to ${formatDate(endDate)}.`}>
        <ActivityHeatmap jumpsPerDay={jumpsPerDay(jumps)} endDate={endDate} />
      </Section>

      <Section title="Jumps over time">
        <CumulativeLine series={cumulativeJumpsByMonth(jumps)} milestone={licenceMarker(totalJumpCount(jumps))} />
      </Section>

      <div className="grid gap-x-16 md:grid-cols-2">
        <Section title="Personal bests">
          <Readout
            items={[
              { label: 'Highest exit', value: bests.highestExitFt ? formatFeet(bests.highestExitFt.value) : 'Not recorded', hint: bests.highestExitFt ? `Jump ${bests.highestExitFt.jumpNumber}` : undefined },
              { label: 'Longest delay', value: bests.longestDelaySeconds ? formatDuration(bests.longestDelaySeconds.value) : 'Not recorded', hint: bests.longestDelaySeconds ? `Jump ${bests.longestDelaySeconds.jumpNumber}` : undefined },
              { label: 'Busiest day', value: bests.mostJumpsInOneDay ? pluralise(bests.mostJumpsInOneDay.count, 'jump') : '–', hint: bests.mostJumpsInOneDay ? formatDate(bests.mostJumpsInOneDay.date) : undefined },
              { label: 'Busiest month', value: bests.mostJumpsInOneMonth ? pluralise(bests.mostJumpsInOneMonth.count, 'jump') : '–', hint: bests.mostJumpsInOneMonth ? formatMonth(bests.mostJumpsInOneMonth.month) : undefined },
            ]}
          />
        </Section>
        <Section title="Since your last jump in each discipline" description="A nudge, not a rule: discipline currency is down to you & your DZ.">
          {disciplines.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {disciplines.map((entry) => (
                <li key={entry.discipline} className="flex items-baseline justify-between gap-4">
                  <span className="font-bold">{entry.discipline}</span>
                  <span className="text-ink-soft">{formatDaysAgo(entry.daysSince)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">Shows up once jumps are tagged with a discipline.</p>
          )}
        </Section>
      </div>

      <div className="grid gap-x-16 md:grid-cols-2">
        <Section title="Where you jump">
          <BarList items={namedTally(jumps, (jump) => view.dropZoneName(jump.dropZoneId))} />
        </Section>
        <Section title="What you jump from">
          <BarList items={namedTally(jumps, (jump) => jump.aircraft)} />
        </Section>
      </div>

      <Section title="Canopy sizes" description="Each run of jumps on the same size, so downsizing is easy to see.">
        <ol className="flex flex-col gap-2">
          {canopyHistory(jumps).map((run) => (
            <li key={`${run.size}-${run.firstJump}`} className="flex items-baseline gap-4">
              <span className="w-24 font-bold">{run.size} ft²</span>
              <span className="text-ink-soft">{run.firstJump === run.lastJump ? `jump ${run.firstJump}` : `jumps ${run.firstJump} to ${run.lastJump}`}</span>
            </li>
          ))}
        </ol>
      </Section>

      <p className="mt-16">
        <TextLink href="/wrapped">See your year in review</TextLink>
      </p>
    </>
  )
}
