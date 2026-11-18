import type { Metadata } from 'next'
import { saveReviewedJumpsAction } from '~/app/(app)/jumps/actions'
import { ImportFlow } from '~/components/ImportFlow'
import { PageHeader } from '~/components/Primitives'
import { toJumpFormValues } from '~/lib/jump-form'
import { loadLogbook } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Scan logbook pages' }

export default async function ImportPage() {
  const view = await loadLogbook()
  const sample = view.previewOnly.importSample

  return (
    <>
      <PageHeader
        title="Scan logbook pages"
        lede="Photograph a page, check what was read against the photo, then save. Nothing reaches your logbook until you've looked at it."
      />
      <ImportFlow
        initialDrafts={sample ? sample.drafts.map((draft) => toJumpFormValues(draft)) : []}
        pageLabel={sample?.pageLabel ?? null}
        // flips to true once an OcrProvider adapter is wired into the composition root
        canReadPages={false}
        dropZones={view.dropZones.map(({ id, name }) => ({ id, name }))}
        action={saveReviewedJumpsAction}
      />
    </>
  )
}
