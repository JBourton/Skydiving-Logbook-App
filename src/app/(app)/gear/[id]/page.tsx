import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JumpList } from '~/components/JumpList'
import { PageHeader, Section, TextLink } from '~/components/Primitives'
import { formatDate, pluralise } from '~/lib/format'
import { gearKindNames, loadLogbook } from '~/lib/logbook-view'

type GearItemPageProps = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Gear' }

export default async function GearItemPage({ params }: GearItemPageProps) {
  const { id } = await params
  const view = await loadLogbook()
  const item = view.previewOnly.gear.find((candidate) => candidate.id === id)
  if (!item) notFound()

  const jumps = view.jumps.filter((jump) => item.jumpIds.includes(jump.id))
  const bought = item.purchasedOn ? `, bought ${formatDate(item.purchasedOn)}` : ''

  return (
    <>
      <div className="pt-8 md:pt-12">
        <TextLink href="/gear">Gear</TextLink>
      </div>
      <PageHeader
        title={`${item.make} ${item.model}`}
        lede={`${gearKindNames[item.kind]}${bought}. ${pluralise(jumps.length, 'jump')}${item.retired ? ', now retired' : ''}.`}
      />
      <Section title="Jumps it's been on">
        <JumpList rows={view.rowsNewestFirst(jumps)} />
      </Section>
    </>
  )
}
