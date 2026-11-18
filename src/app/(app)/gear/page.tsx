import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader, Section } from '~/components/Primitives'
import type { GearItem } from '~/lib/demo-data'
import { formatDate, pluralise } from '~/lib/format'
import { gearKindNames, loadLogbook } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Gear' }

export default async function GearPage() {
  const view = await loadLogbook()
  const gear = [...view.previewOnly.gear].sort((a, b) => b.jumpIds.length - a.jumpIds.length)
  const inUse = gear.filter((item) => !item.retired)
  const retired = gear.filter((item) => item.retired)

  return (
    <>
      <PageHeader title="Gear" lede="What you own & how much it's jumped. Rented rigs aren't listed; each jump records its canopy size instead." />
      {gear.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No gear yet">Your kit list switches on once the equipment store is built. Each item will show every jump it's been on.</EmptyState>
        </div>
      ) : (
        <>
          <Section title="In use">
            <GearList items={inUse} />
          </Section>
          {retired.length > 0 ? (
            <Section title="Retired">
              <GearList items={retired} />
            </Section>
          ) : null}
        </>
      )}
    </>
  )
}

function GearList({ items }: { items: readonly GearItem[] }) {
  return (
    <ul className="flex max-w-[48rem] flex-col gap-1">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/gear/${item.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-control px-3 py-4 hover:bg-haze">
            <div>
              <p className="text-meta text-ink-soft">{gearKindNames[item.kind]}</p>
              <p className="text-title font-bold">
                {item.make} {item.model}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{pluralise(item.jumpIds.length, 'jump')}</p>
              {item.purchasedOn ? <p className="text-meta text-ink-soft">since {formatDate(item.purchasedOn)}</p> : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
