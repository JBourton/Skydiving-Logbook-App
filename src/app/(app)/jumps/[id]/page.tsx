import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { archiveJumpAction } from '~/app/(app)/jumps/actions'
import { AltitudeTape } from '~/components/JumpProfile'
import { Readout, Section, TagChips, TextLink } from '~/components/Primitives'
import { deployAltitudeWarning } from '~/domain/deploy-altitude'
import { missingFields } from '~/domain/jump-completeness'
import { formatDuration, formatFeet, formatLongDate } from '~/lib/format'
import { gearKindNames, loadLogbook } from '~/lib/logbook-view'

type JumpPageProps = { params: Promise<{ id: string }> }

const missingFieldNames = { exitAltitudeFt: 'exit altitude', deployAltitudeFt: 'deploy altitude', delaySeconds: 'delay', dropZoneId: 'drop zone' }

export async function generateMetadata({ params }: JumpPageProps): Promise<Metadata> {
  const { id } = await params
  const view = await loadLogbook()
  const jump = view.jumps.find((candidate) => candidate.id === id)
  return { title: jump ? `Jump ${jump.jumpNumber}` : 'Jump' }
}

export default async function JumpPage({ params }: JumpPageProps) {
  const { id } = await params
  const view = await loadLogbook()
  const position = view.jumps.findIndex((candidate) => candidate.id === id)
  const jump = view.jumps[position]
  if (!jump) notFound()

  const previousJump = view.jumps[position - 1]
  const nextJump = view.jumps[position + 1]
  const dropZone = view.dropZones.find((candidate) => candidate.id === jump.dropZoneId)
  const deployWarning = deployAltitudeWarning(jump.deployAltitudeFt)
  const missing = missingFields(jump)
  const partners = view.previewOnly.partnersByJumpId.get(jump.id) ?? []
  const gearUsed = view.previewOnly.gear.filter((item) => item.jumpIds.includes(jump.id))
  const weather = view.previewOnly.weatherByJumpId.get(jump.id)

  return (
    <>
      <div className="pt-8 md:pt-12">
        <TextLink href="/jumps">Logbook</TextLink>
      </div>
      <header className="mt-6">
        <h1 className="text-display">Jump {jump.jumpNumber}</h1>
        <p className="mt-3 text-title text-ink-soft">
          {formatLongDate(jump.date)}
          {dropZone ? ` at ${dropZone.name}, ${dropZone.country}` : ''}
        </p>
      </header>

      {deployWarning ? <p className="mt-8 max-w-[44rem] rounded-control bg-warn-soft px-5 py-4 font-bold text-warn">{deployWarning}</p> : null}

      <div className="mt-12 grid gap-x-16 gap-y-12 md:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="pl-9">
          <AltitudeTape exitAltitudeFt={jump.exitAltitudeFt} deployAltitudeFt={jump.deployAltitudeFt} delayLabel={jump.delaySeconds === null ? null : formatDuration(jump.delaySeconds)} />
        </div>
        <div className="max-w-[40rem]">
          <Readout
            items={[
              { label: 'Aircraft', value: jump.aircraft ?? 'Not recorded' },
              { label: 'Canopy', value: jump.canopySizeFt2 === null ? 'Not recorded' : `${jump.canopySizeFt2} ft²` },
              { label: 'Delay', value: jump.delaySeconds === null ? 'Not recorded' : formatDuration(jump.delaySeconds) },
              { label: 'Signed off by', value: jump.authoriser ?? 'Nobody yet' },
            ]}
          />
          {missing.length > 0 ? (
            <p className="mt-6 text-meta font-bold text-caution">Not recorded: {missing.map((field) => missingFieldNames[field]).join(', ')}.</p>
          ) : null}

          {jump.description ? (
            <Section title="What happened">
              <p className="text-title leading-relaxed">{jump.description}</p>
            </Section>
          ) : null}
          {view.tagNamesFor(jump.id).length > 0 ? (
            <Section title="Tags">
              <TagChips names={view.tagNamesFor(jump.id)} />
            </Section>
          ) : null}
          {partners.length > 0 ? (
            <Section title="Jumped with">
              <p>{partners.join(', ')}</p>
            </Section>
          ) : null}
          {gearUsed.length > 0 ? (
            <Section title="Gear">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {gearUsed.map((item) => (
                  <li key={item.id}>
                    <TextLink href={`/gear/${item.id}`}>{`${item.make} ${item.model}`}</TextLink> <span className="text-meta text-ink-soft">{gearKindNames[item.kind].toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {weather ? (
            <Section title="Weather at the time" description="Beta. Looked up afterwards for the drop zone, not measured on the day.">
              <Readout
                columns={3}
                items={[
                  { label: 'Wind', value: `${weather.windKnots} kt`, hint: `gusting ${weather.gustKnots}` },
                  { label: 'Cloud base', value: formatFeet(weather.cloudBaseFt) },
                  { label: 'Temperature', value: `${weather.temperatureC} °C` },
                ]}
              />
            </Section>
          ) : null}
          {jump.ocrSourceId ? <p className="mt-10 text-meta text-ink-soft">Read from a scanned logbook page & checked before saving.</p> : null}
        </div>
      </div>

      <nav aria-label="Neighbouring jumps" className="mt-16 flex justify-between gap-6">
        {previousJump ? (
          <Link href={`/jumps/${previousJump.id}`} className="rounded-control bg-haze px-5 py-3 font-bold hover:bg-haze-strong">
            Jump {previousJump.jumpNumber}
          </Link>
        ) : (
          <span />
        )}
        {nextJump ? (
          <Link href={`/jumps/${nextJump.id}`} className="rounded-control bg-haze px-5 py-3 font-bold hover:bg-haze-strong">
            Jump {nextJump.jumpNumber}
          </Link>
        ) : null}
      </nav>

      <details className="mt-16 max-w-[34rem]">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold text-ink-soft hover:text-ink">Archive this jump</summary>
        <form action={archiveJumpAction.bind(null, jump.id)} className="mt-3 rounded-panel bg-warn-soft p-5">
          <p>
            Jump {jump.jumpNumber} leaves your logbook & stats. It's kept in the database rather than deleted, & its number stays taken, but there's no restore button yet.
          </p>
          <button type="submit" className="mt-4 min-h-12 rounded-control bg-warn px-5 font-bold text-paper">
            Archive jump {jump.jumpNumber}
          </button>
        </form>
      </details>
    </>
  )
}
