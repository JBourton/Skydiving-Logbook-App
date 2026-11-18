import { ActivityHeatmap } from '~/components/Charts'
import { JumpList } from '~/components/JumpList'
import { JumpProfile } from '~/components/JumpProfile'
import { ButtonLink, EmptyState, Readout, Section, TextLink } from '~/components/Primitives'
import { RequirementList } from '~/components/ProgressRoute'
import { daysBetween } from '~/domain/calendar-date'
import { currencySettings, currencyStatus, disciplineRecency } from '~/domain/currency'
import { jumpsOnThisDay, jumpsPerDay, lastJumpDate, personalBests, rollingTotals, totalFreefallSeconds } from '~/domain/logbook-insights'
import { licenceRoute } from '~/domain/progression'
import { formatDate, formatDaysAgo, formatDuration, formatFeet, formatLongDate, pluralise } from '~/lib/format'
import { gearKindNames, type LogbookView, lastJumpDateByDiscipline, loadLogbook, progressionSnapshotFor, totalJumpCount } from '~/lib/logbook-view'
import { getServices } from '~/lib/services'

const todaySettings = {
  skylineJumps: 40,
  skylineJumpsOnPhones: 16,
  recentJumps: 4,
  gearItems: 3,
  // under this many days of currency left, the bar turns amber as a nudge to book a jump
  currencyNudgeDays: 21,
}

export default async function TodayPage() {
  const view = await loadLogbook()
  const nextJumpNumber = await getServices().jumpRepository.nextJumpNumber(view.userId)

  return (
    <>
      <header className="pt-8 md:pt-14">
        <h1 className="text-heading md:text-display">{formatLongDate(view.today)}</h1>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/jumps/new" className="min-h-16 text-title sm:min-w-80">
            Log jump {nextJumpNumber}
          </ButtonLink>
          <ButtonLink href="/jumps/import" variant="quiet" className="min-h-16">
            Scan logbook pages
          </ButtonLink>
        </div>
      </header>
      {view.jumps.length === 0 ? (
        <div className="mt-12">
          <EmptyState title="Your logbook is empty">
            Log your most recent jump above, or scan your paper logbook a page at a time & check each jump before it's saved.
          </EmptyState>
        </div>
      ) : (
        <Dashboard view={view} />
      )}
    </>
  )
}

function Dashboard({ view }: { view: LogbookView }) {
  const rolling = rollingTotals(view.jumps, view.today)
  const bests = personalBests(view.jumps)
  const onThisDay = jumpsOnThisDay(view.jumps, view.today)
  const activeGear = view.previewOnly.gear.filter((item) => !item.retired).sort((a, b) => b.jumpIds.length - a.jumpIds.length)

  return (
    <>
      <Skyline view={view} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div>
          <Section title="Currency">
            <CurrencySummary view={view} />
          </Section>
          <Section title="Recent jumps" action={<TextLink href="/jumps">Logbook</TextLink>}>
            <JumpList rows={view.rowsNewestFirst(view.jumps).slice(0, todaySettings.recentJumps)} />
          </Section>
          <Section title="The last 12 months" description="Each square is a day. The darker it is, the more jumps.">
            <ActivityHeatmap jumpsPerDay={jumpsPerDay(view.jumps)} endDate={view.today} />
          </Section>
        </div>

        <div>
          <NextLicence view={view} />
          <Section title="Totals">
            <Readout
              items={[
                { label: 'All time', value: pluralise(totalJumpCount(view.jumps), 'jump'), hint: `${formatDuration(totalFreefallSeconds(view.jumps))} of freefall` },
                { label: 'Last 30 days', value: pluralise(rolling.last30Days, 'jump') },
                { label: 'Last 90 days', value: pluralise(rolling.last90Days, 'jump') },
                { label: 'Last 365 days', value: pluralise(rolling.last365Days, 'jump') },
              ]}
            />
          </Section>
          <Section title="Personal bests" action={<TextLink href="/stats">Stats</TextLink>}>
            <Readout
              items={[
                ...(bests.highestExitFt ? [{ label: 'Highest exit', value: formatFeet(bests.highestExitFt.value), hint: `Jump ${bests.highestExitFt.jumpNumber}` }] : []),
                ...(bests.longestDelaySeconds ? [{ label: 'Longest delay', value: formatDuration(bests.longestDelaySeconds.value), hint: `Jump ${bests.longestDelaySeconds.jumpNumber}` }] : []),
                ...(bests.mostJumpsInOneDay ? [{ label: 'Busiest day', value: pluralise(bests.mostJumpsInOneDay.count, 'jump'), hint: formatDate(bests.mostJumpsInOneDay.date) }] : []),
                { label: 'Drop zones', value: String(bests.dropZonesVisited) },
              ]}
            />
          </Section>
          {onThisDay.length > 0 ? (
            <Section title="On this day">
              <ul className="flex flex-col gap-2">
                {onThisDay.map((jump) => (
                  <li key={jump.id}>
                    In {jump.date.slice(0, 4)}: <TextLink href={`/jumps/${jump.id}`}>jump {jump.jumpNumber}</TextLink>
                    {view.dropZoneName(jump.dropZoneId) ? ` at ${view.dropZoneName(jump.dropZoneId)}` : ''}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {activeGear.length > 0 ? (
            <Section title="Gear" action={<TextLink href="/gear">All gear</TextLink>}>
              <ul className="flex flex-col gap-3">
                {activeGear.slice(0, todaySettings.gearItems).map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-4">
                    <span>
                      {item.make} {item.model} <span className="text-meta text-ink-soft">{gearKindNames[item.kind].toLowerCase()}</span>
                    </span>
                    <span className="font-bold">{pluralise(item.jumpIds.length, 'jump')}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>
    </>
  )
}

function Skyline({ view }: { view: LogbookView }) {
  const recentJumps = view.jumps.slice(-todaySettings.skylineJumps)
  const hiddenOnPhones = recentJumps.length - todaySettings.skylineJumpsOnPhones

  return (
    <figure className="mt-14">
      <div className="flex h-28 items-end gap-[7px]">
        {recentJumps.map((jump, index) => (
          <div key={jump.id} className={index < hiddenOnPhones ? 'hidden sm:block' : ''}>
            <JumpProfile exitAltitudeFt={jump.exitAltitudeFt} deployAltitudeFt={jump.deployAltitudeFt} height={112} label={`Jump ${jump.jumpNumber}`} />
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-meta text-ink-soft">Recent jumps, drawn from exit to deploy, then canopy to the ground</figcaption>
    </figure>
  )
}

function CurrencySummary({ view }: { view: LogbookView }) {
  const lastDate = lastJumpDate(view.jumps)
  const lastJump = view.jumps.at(-1)
  if (lastDate === null || lastJump === undefined) return null

  const licence = view.previewOnly.profile.licence
  const where = view.dropZoneName(lastJump.dropZoneId)
  const lastJumpLine = `Last jumped ${formatDaysAgo(daysBetween(lastDate, view.today))}${where ? ` at ${where}` : ''}.`
  const disciplines = disciplineRecency(lastJumpDateByDiscipline(view), view.today)

  if (licence === null) {
    return (
      <div>
        <p className="text-title font-bold">{lastJumpLine}</p>
        <p className="mt-1 text-meta text-ink-soft">
          Record your licence in <TextLink href="/settings">Settings</TextLink> to see how long you stay current.
        </p>
      </div>
    )
  }

  const status = currencyStatus(lastDate, licence, view.today)
  const firstStep = currencySettings[licence][0]
  if (status.state === 'lapsed') {
    return (
      <div className="rounded-panel bg-warn-soft px-5 py-4">
        <p className="text-title font-bold text-warn">{status.consequence}</p>
        <p className="mt-1 text-meta">
          {lastJumpLine} Lapsed on {formatDate(status.lapsedOn)}.
        </p>
      </div>
    )
  }
  if (status.state !== 'current') return null

  const isNudge = status.daysLeft <= todaySettings.currencyNudgeDays
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-title font-bold">Current until {formatDate(status.currentUntil)}</p>
        <p className={`font-bold ${isNudge ? 'text-caution' : 'text-ink-soft'}`}>{pluralise(status.daysLeft, 'day')} left</p>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-haze" role="img" aria-label={`${status.daysLeft} of ${status.windowDays} days of currency left`}>
        <div className={`h-2.5 rounded-full ${isNudge ? 'bg-caution' : 'bg-ink'}`} style={{ width: `${Math.max(3, (status.daysLeft / status.windowDays) * 100)}%` }} />
      </div>
      <p className="mt-3 text-meta text-ink-soft">
        {lastJumpLine} On an {licence} licence, after {firstStep.afterMonths} months away: {firstStep.consequence.toLowerCase()}.
      </p>
      {disciplines.length > 0 ? (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
          {disciplines.map((entry) => (
            <div key={entry.discipline} className="flex items-baseline gap-2">
              <dt className="font-bold">{entry.discipline}</dt>
              <dd className="text-meta text-ink-soft">{formatDaysAgo(entry.daysSince)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

function NextLicence({ view }: { view: LogbookView }) {
  if (view.previewOnly.profile.licence === null) {
    return (
      <Section title="Your next licence">
        <p className="text-ink-soft">
          Record your licence & grades in <TextLink href="/settings">Settings</TextLink> & this shows what's left for the next one.
        </p>
      </Section>
    )
  }
  const nextTarget = licenceRoute(progressionSnapshotFor(view)).find((target) => !target.achieved)
  return (
    <Section title={nextTarget ? `Towards your ${nextTarget.name}` : 'Licences'} action={<TextLink href="/progress">Route</TextLink>}>
      {nextTarget ? <RequirementList requirements={nextTarget.requirements} /> : <p>All 4 British Skydiving licences held.</p>}
    </Section>
  )
}
