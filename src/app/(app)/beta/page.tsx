import type { Metadata } from 'next'
import { DropZoneGlobe, PartnerOrbit } from '~/components/BetaVisuals'
import { BarList } from '~/components/Charts'
import { EmptyState, PageHeader, Section, TextLink } from '~/components/Primitives'
import { tally } from '~/domain/logbook-insights'
import { loadLogbook } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Beta' }

const weatherBands = [
  { label: 'Under 8 kt', test: (knots: number) => knots < 8 },
  { label: '8 to 12 kt', test: (knots: number) => knots >= 8 && knots <= 12 },
  { label: 'Over 12 kt', test: (knots: number) => knots > 12 },
]

export default async function BetaPage() {
  const view = await loadLogbook()
  const jumpsPerDropZone = tally(view.jumps, (jump) => jump.dropZoneId)
  const mappedDropZones = view.dropZones
    .filter((dropZone) => dropZone.latitude !== null && dropZone.longitude !== null && jumpsPerDropZone.has(dropZone.id))
    .map((dropZone) => ({ name: dropZone.name, latitude: dropZone.latitude ?? 0, longitude: dropZone.longitude ?? 0, jumps: jumpsPerDropZone.get(dropZone.id) ?? 0 }))

  const partnerCounts = new Map<string, number>()
  for (const names of view.previewOnly.partnersByJumpId.values()) for (const name of names) partnerCounts.set(name, (partnerCounts.get(name) ?? 0) + 1)
  const partners = [...partnerCounts].map(([name, jumps]) => ({ name, jumps }))

  const winds = [...view.previewOnly.weatherByJumpId.values()].map((weather) => weather.windKnots)

  return (
    <>
      <PageHeader title="Beta" lede="Experiments that aren't part of the core logbook yet. They might change, or quietly disappear." />

      <Section id="drop-zones" title="Where you've jumped" description="Pins grow with the number of jumps.">
        {mappedDropZones.length > 0 ? (
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <DropZoneGlobe dropZones={mappedDropZones} />
            <BarList items={[...mappedDropZones].sort((a, b) => b.jumps - a.jumps).map((dropZone) => ({ label: dropZone.name, value: dropZone.jumps }))} />
          </div>
        ) : (
          <EmptyState title="No drop zones to map">Jumps at drop zones with coordinates appear here.</EmptyState>
        )}
      </Section>

      <Section id="partners" title="Who you jump with" description="The closer the orbit, the more jumps together.">
        {partners.length > 0 ? <PartnerOrbit partners={partners} /> : <EmptyState title="Nobody here yet">Jump partners switch on once partners can be saved with a jump.</EmptyState>}
      </Section>

      <Section id="weather" title="Wind on your jump days" description="Looked up afterwards for each drop zone, so treat it as a rough guide.">
        {winds.length > 0 ? (
          <div className="max-w-[36rem]">
            <BarList items={weatherBands.map((band) => ({ label: band.label, value: winds.filter(band.test).length }))} />
          </div>
        ) : (
          <EmptyState title="No weather yet">Weather snapshots need a forecast service behind a new port.</EmptyState>
        )}
      </Section>

      <Section id="wrapped" title="Year in review">
        <TextLink href="/wrapped">Open your year in review</TextLink>
      </Section>
    </>
  )
}
