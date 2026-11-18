import type { Metadata } from 'next'
import { createJumpAction } from '~/app/(app)/jumps/actions'
import { JumpForm } from '~/components/JumpForm'
import { PageHeader } from '~/components/Primitives'
import { toJumpFormValues } from '~/lib/jump-form'
import { loadLogbook } from '~/lib/logbook-view'
import { getServices } from '~/lib/services'

export const metadata: Metadata = { title: 'Log a jump' }

export default async function NewJumpPage() {
  const view = await loadLogbook()
  const nextJumpNumber = await getServices().jumpRepository.nextJumpNumber(view.userId)
  const lastJump = view.jumps.at(-1) ?? null
  // most recent aircraft 1st, so the suggestion list leads with what you're likely in today
  const aircraftSuggestions = [...new Set(view.jumps.map((jump) => jump.aircraft).filter((aircraft): aircraft is string => Boolean(aircraft)).reverse())]

  // between loads the next jump is usually the last one again, so the sticky fields carry over
  const initialValues = toJumpFormValues({
    jumpNumber: nextJumpNumber,
    date: view.today,
    dropZoneId: lastJump?.dropZoneId,
    aircraft: lastJump?.aircraft,
    exitAltitudeFt: lastJump?.exitAltitudeFt,
    deployAltitudeFt: lastJump?.deployAltitudeFt,
    canopySizeFt2: lastJump?.canopySizeFt2,
  })

  return (
    <>
      <PageHeader title="Log a jump" lede="Only the number & date are needed. Everything else can wait until you're back on the ground for longer." />
      <JumpForm
        action={createJumpAction}
        initialValues={initialValues}
        dropZones={view.dropZones.map(({ id, name, country }) => ({ id, name, country }))}
        aircraftSuggestions={aircraftSuggestions}
        prefilledFromJumpNumber={lastJump?.jumpNumber ?? null}
      />
    </>
  )
}
