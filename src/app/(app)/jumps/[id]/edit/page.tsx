import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { updateJumpAction } from '~/app/(app)/jumps/actions'
import { JumpForm } from '~/components/JumpForm'
import { PageHeader, TextLink } from '~/components/Primitives'
import { toJumpFormValues } from '~/lib/jump-form'
import { loadLogbook } from '~/lib/logbook-view'

type EditJumpPageProps = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Edit jump' }

export default async function EditJumpPage({ params }: EditJumpPageProps) {
  const { id } = await params
  const view = await loadLogbook()
  const jump = view.jumps.find((candidate) => candidate.id === id)
  if (!jump) notFound()

  const aircraftSuggestions = [...new Set(view.jumps.map((candidate) => candidate.aircraft).filter((aircraft): aircraft is string => Boolean(aircraft)).reverse())]

  return (
    <>
      <div className="pt-8 md:pt-12">
        <TextLink href={`/jumps/${jump.id}`}>Jump {jump.jumpNumber}</TextLink>
      </div>
      <PageHeader title={`Edit jump ${jump.jumpNumber}`} lede="Handwritten logbooks have mistakes too. Changes replace what's saved." />
      <JumpForm
        action={updateJumpAction.bind(null, jump.id)}
        initialValues={toJumpFormValues(jump)}
        dropZones={view.dropZones.map(({ id: dropZoneId, name, country }) => ({ id: dropZoneId, name, country }))}
        aircraftSuggestions={aircraftSuggestions}
        prefilledFromJumpNumber={null}
      />
    </>
  )
}
