import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '~/components/Primitives'
import { freefallDistanceFt, personalBests, tally, totalFreefallSeconds } from '~/domain/logbook-insights'
import { formatDate, formatDuration, formatFeet, formatNumber, pluralise } from '~/lib/format'
import { type LogbookView, loadLogbook } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Year in review' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function factsForYear(view: LogbookView, year: string) {
  const jumps = view.jumps.filter((jump) => jump.date.startsWith(year))
  const bests = personalBests(jumps)
  const favouriteDropZone = [...tally(jumps, (jump) => jump.dropZoneId)].sort((a, b) => b[1] - a[1])[0]
  const progressionTags = [...new Set(jumps.flatMap((jump) => (view.previewOnly.tagsByJumpId.get(jump.id) ?? []).filter((tagView) => tagView.category === 'progression').map((tagView) => tagView.name)))]
  const firstJump = jumps[0]

  return [
    { figure: formatNumber(jumps.length), words: jumps.length === 1 ? 'jump this year.' : 'jumps this year.' },
    { figure: formatDuration(totalFreefallSeconds(jumps)), words: 'in freefall, between the door & the canopy.' },
    { figure: formatFeet(freefallDistanceFt(jumps)), words: 'fallen before deploying.' },
    favouriteDropZone ? { figure: formatNumber(favouriteDropZone[1]), words: `jumps at ${view.dropZoneName(favouriteDropZone[0]) ?? 'your favourite drop zone'}, your most visited of ${pluralise(tally(jumps, (jump) => jump.dropZoneId).size, 'drop zone')}.` } : null,
    bests.mostJumpsInOneDay ? { figure: formatNumber(bests.mostJumpsInOneDay.count), words: `jumps on ${formatDate(bests.mostJumpsInOneDay.date)}, your busiest day.` } : null,
    firstJump ? { figure: `#${firstJump.jumpNumber}`, words: `was your 1st jump of the year, on ${formatDate(firstJump.date)}.` } : null,
    progressionTags.length > 0 ? { figure: formatNumber(progressionTags.length), words: `${progressionTags.length === 1 ? 'step' : 'steps'} up the progression ladder: ${progressionTags.join(', ')}.` } : null,
  ].filter((fact) => fact !== null)
}

export default async function WrappedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const view = await loadLogbook()
  const years = [...new Set(view.jumps.map((jump) => jump.date.slice(0, 4)))].sort().reverse()
  const requestedYear = String(Array.isArray(params.year) ? params.year[0] : (params.year ?? ''))
  const year = years.includes(requestedYear) ? requestedYear : years[0]

  if (!year) {
    return (
      <>
        <PageHeader title="Year in review" />
        <EmptyState title="Nothing to look back on yet">Your 1st year in review appears after your 1st jump.</EmptyState>
      </>
    )
  }

  return (
    <>
      <header className="pt-8 md:pt-14">
        <p className="text-meta text-ink-soft">Year in review</p>
        <h1 className="mt-2 text-figure md:text-[7rem] md:leading-none">{year}</h1>
        {years.length > 1 ? (
          <nav aria-label="Other years" className="mt-6 flex gap-2">
            {years.map((candidate) => (
              <Link
                key={candidate}
                href={`/wrapped?year=${candidate}`}
                aria-current={candidate === year ? 'page' : undefined}
                className="min-h-11 rounded-full bg-haze px-4 py-2 font-bold text-ink-soft aria-[current=page]:bg-ink aria-[current=page]:text-paper"
              >
                {candidate}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <ol className="mt-12">
        {factsForYear(view, year).map((fact) => (
          <li key={fact.words} className="grid gap-x-10 gap-y-2 border-t-2 border-ink py-10 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-baseline">
            <span className="text-figure font-bold">{fact.figure}</span>
            <span className="max-w-[30rem] text-heading">{fact.words}</span>
          </li>
        ))}
      </ol>
    </>
  )
}
