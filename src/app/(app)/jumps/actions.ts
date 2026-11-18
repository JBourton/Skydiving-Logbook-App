'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { DuplicateJumpNumberError, type NewJump } from '~/domain/jump'
import { getCurrentUserId } from '~/lib/current-user'
import { type JumpFormState, parseJumpForm, type ReviewSaveState } from '~/lib/jump-form'
import { getServices } from '~/lib/services'

// server actions for the logbook routes (/jumps/new, /jumps/[id] & /jumps/import). Each one gets
// the userId from the session seam & never from the form, per AGENTS.md hard rule 2.

async function unknownDropZoneError(dropZoneId: string | null | undefined): Promise<string | null> {
  if (!dropZoneId) return null
  const dropZones = await getServices().dropZoneRepository.list()
  return dropZones.some((dropZone) => dropZone.id === dropZoneId) ? null : 'Pick a drop zone from the list'
}

export async function createJumpAction(_previousState: JumpFormState, formData: FormData): Promise<JumpFormState> {
  const userId = await getCurrentUserId()
  const parsed = parseJumpForm(Object.fromEntries(formData))
  if ('state' in parsed) return parsed.state

  const dropZoneError = await unknownDropZoneError(parsed.newJump.dropZoneId)
  if (dropZoneError) return { formError: null, fieldErrors: { dropZoneId: dropZoneError } }

  try {
    await getServices().jumpRepository.create(userId, parsed.newJump)
  } catch (saveJumpError) {
    if (saveJumpError instanceof DuplicateJumpNumberError) {
      return { formError: null, fieldErrors: { jumpNumber: `Jump ${parsed.newJump.jumpNumber} is already in your logbook` } }
    }
    throw saveJumpError
  }

  revalidatePath('/', 'layout')
  redirect(`/jumps?saved=${parsed.newJump.jumpNumber}`)
}

export async function updateJumpAction(jumpId: string, _previousState: JumpFormState, formData: FormData): Promise<JumpFormState> {
  const userId = await getCurrentUserId()
  const parsed = parseJumpForm(Object.fromEntries(formData))
  if ('state' in parsed) return parsed.state

  const dropZoneError = await unknownDropZoneError(parsed.newJump.dropZoneId)
  if (dropZoneError) return { formError: null, fieldErrors: { dropZoneId: dropZoneError } }

  try {
    const updated = await getServices().jumpRepository.update(userId, jumpId, parsed.newJump)
    if (!updated) return { formError: 'That jump has been archived, so it can no longer be edited.', fieldErrors: {} }
  } catch (updateJumpError) {
    if (updateJumpError instanceof DuplicateJumpNumberError) {
      return { formError: null, fieldErrors: { jumpNumber: `Jump ${parsed.newJump.jumpNumber} is already in your logbook` } }
    }
    throw updateJumpError
  }

  revalidatePath('/', 'layout')
  redirect(`/jumps/${jumpId}`)
}

export async function archiveJumpAction(jumpId: string): Promise<void> {
  const userId = await getCurrentUserId()
  await getServices().jumpRepository.archive(userId, jumpId)
  revalidatePath('/', 'layout')
  redirect('/jumps')
}

export async function saveReviewedJumpsAction(_previousState: ReviewSaveState, formData: FormData): Promise<ReviewSaveState> {
  const userId = await getCurrentUserId()
  const submittedDrafts: unknown = JSON.parse(String(formData.get('drafts') ?? '[]'))
  if (!Array.isArray(submittedDrafts) || submittedDrafts.length === 0) {
    return { formError: 'Tick at least 1 jump to save.', errorsByDraft: {} }
  }

  // validate every ticked draft before saving any, so a bad row never leaves half a page saved
  const errorsByDraft: ReviewSaveState['errorsByDraft'] = {}
  const jumpsToSave: Array<{ position: number; newJump: NewJump }> = []
  submittedDrafts.forEach((draft: { position: number; values: Record<string, unknown> }) => {
    const parsed = parseJumpForm(draft.values)
    if ('state' in parsed) errorsByDraft[draft.position] = parsed.state.fieldErrors
    else jumpsToSave.push({ position: draft.position, newJump: parsed.newJump })
  })

  const { jumpRepository } = getServices()
  const existingNumbers = new Set((await jumpRepository.listByUser(userId)).map((jump) => jump.jumpNumber))
  for (const { position, newJump } of jumpsToSave) {
    if (existingNumbers.has(newJump.jumpNumber)) errorsByDraft[position] = { jumpNumber: `Jump ${newJump.jumpNumber} is already in your logbook` }
    existingNumbers.add(newJump.jumpNumber)
  }
  if (Object.keys(errorsByDraft).length > 0) return { formError: 'Some jumps need another look before saving.', errorsByDraft }

  for (const { newJump } of jumpsToSave) await jumpRepository.create(userId, newJump)

  revalidatePath('/', 'layout')
  redirect(`/jumps?saved=${Math.max(...jumpsToSave.map((entry) => entry.newJump.jumpNumber))}`)
}
