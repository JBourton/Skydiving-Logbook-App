import type { Metadata } from 'next'
import { JumpList } from '~/components/JumpList'
import { ButtonLink, EmptyState, PageHeader, TextLink } from '~/components/Primitives'
import type { Jump } from '~/domain/jump'
import { monthOf } from '~/domain/calendar-date'
import { formatMonth, pluralise } from '~/lib/format'
import { type LogbookView, loadLogbook, totalJumpCount } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Logbook' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type LogbookFilters = { search: string; dropZoneId: string; tag: string; from: string; to: string }

function readFilters(params: Record<string, string | string[] | undefined>): LogbookFilters {
  const read = (key: string) => {
    const raw = params[key]
    return ((Array.isArray(raw) ? raw[0] : raw) ?? '').trim()
  }
  return { search: read('q'), dropZoneId: read('dz'), tag: read('tag'), from: read('from'), to: read('to') }
}

// filters run here rather than in SQL for now: a lifetime logbook is a few thousand rows at most,
// & it keeps the repository port small until there's a real reason to grow it
function matchesFilters(jump: Jump, filters: LogbookFilters, view: LogbookView): boolean {
  if (filters.dropZoneId && jump.dropZoneId !== filters.dropZoneId) return false
  if (filters.from && jump.date < filters.from) return false
  if (filters.to && jump.date > filters.to) return false
  if (filters.tag && !view.tagNamesFor(jump.id).includes(filters.tag)) return false
  if (!filters.search) return true

  const searchableText = [String(jump.jumpNumber), jump.description, jump.aircraft, jump.authoriser, view.dropZoneName(jump.dropZoneId), ...view.tagNamesFor(jump.id)]
    .join(' ')
    .toLowerCase()
  return filters.search
    .toLowerCase()
    .split(/\s+/)
    .every((word) => searchableText.includes(word))
}

export default async function LogbookPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const view = await loadLogbook()
  const filters = readFilters(params)
  const isFiltered = Object.values(filters).some(Boolean)
  const matchingJumps = view.jumps.filter((jump) => matchesFilters(jump, filters, view))
  const savedJumpNumber = Number(Array.isArray(params.saved) ? params.saved[0] : params.saved) || undefined
  const firstJump = view.jumps[0]

  return (
    <>
      <PageHeader
        title="Logbook"
        lede={firstJump ? `${pluralise(totalJumpCount(view.jumps), 'jump')} since ${formatMonth(monthOf(firstJump.date))}.` : undefined}
      >
        <ButtonLink href="/jumps/new">Log jump</ButtonLink>
        <ButtonLink href="/jumps/import" variant="quiet">
          Scan pages
        </ButtonLink>
      </PageHeader>

      {view.jumps.length > 0 ? <Filters filters={filters} isFiltered={isFiltered} view={view} /> : null}

      <div className="mt-8">
        {view.jumps.length === 0 ? (
          <EmptyState title="No jumps yet" action={<ButtonLink href="/jumps/new">Log your 1st jump</ButtonLink>}>
            Every jump you log or scan in lands here, newest at the top.
          </EmptyState>
        ) : matchingJumps.length === 0 ? (
          <EmptyState title="No jumps match" action={<TextLink href="/jumps">Clear the filters</TextLink>}>
            Try fewer words, or a wider date range.
          </EmptyState>
        ) : (
          <>
            {isFiltered ? <p className="mb-4 text-meta text-ink-soft">{matchingJumps.length} of {pluralise(view.jumps.length, 'jump')}</p> : null}
            <JumpList rows={view.rowsNewestFirst(matchingJumps)} highlightJumpNumber={savedJumpNumber} />
          </>
        )}
      </div>
    </>
  )
}

function Filters({ filters, isFiltered, view }: { filters: LogbookFilters; isFiltered: boolean; view: LogbookView }) {
  return (
    <details open={isFiltered} className="group mt-8 rounded-panel bg-haze">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 font-bold [&::-webkit-details-marker]:hidden">
        Search & filter
        <span className="text-meta font-normal text-ink-soft group-open:hidden">{isFiltered ? 'Filters on' : 'By text, place, tag or date'}</span>
      </summary>
      <form method="get" className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-6 [&_input]:bg-paper [&_select]:bg-paper">
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="mb-1.5 block text-meta text-ink-soft">Search</span>
          <input type="search" name="q" defaultValue={filters.search} placeholder="Notes, aircraft, people, number" />
        </label>
        <label>
          <span className="mb-1.5 block text-meta text-ink-soft">Drop zone</span>
          <select name="dz" defaultValue={filters.dropZoneId}>
            <option value="">Any</option>
            {view.dropZones.map((dropZone) => (
              <option key={dropZone.id} value={dropZone.id}>
                {dropZone.name}
              </option>
            ))}
          </select>
        </label>
        {view.previewOnly.allTags.length > 0 ? (
          <label>
            <span className="mb-1.5 block text-meta text-ink-soft">Tag</span>
            <select name="tag" defaultValue={filters.tag}>
              <option value="">Any</option>
              {view.previewOnly.allTags.map((tagView) => (
                <option key={tagView.name} value={tagView.name}>
                  {tagView.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span className="mb-1.5 block text-meta text-ink-soft">From</span>
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label>
          <span className="mb-1.5 block text-meta text-ink-soft">To</span>
          <input type="date" name="to" defaultValue={filters.to} />
        </label>
        <div className="flex items-center gap-5 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="min-h-12 rounded-control bg-ink px-6 font-bold text-paper hover:bg-ink-soft">
            Show jumps
          </button>
          {isFiltered ? <TextLink href="/jumps">Clear</TextLink> : null}
        </div>
      </form>
    </details>
  )
}
