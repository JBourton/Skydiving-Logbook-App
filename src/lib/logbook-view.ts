import { addMonths } from '~/domain/calendar-date'
import type { DropZone } from '~/domain/drop-zone'
import type { Jump } from '~/domain/jump'
import type { ProgressionSnapshot } from '~/domain/progression'
import { getCurrentUserId } from '~/lib/current-user'
import type { GearKind, PreviewOnlyData } from '~/lib/demo-data'
import { todayIsoDate } from '~/lib/format'
import { getPreviewOnlyData, getServices, isDemoMode } from '~/lib/services'

// every page starts by loading the same slice of the logbook, so I do it once here rather than
// repeating the userId + repository + lookup dance in 15 route files

export type JumpListRow = { jump: Jump; dropZoneName: string | null; tagNames: string[] }

export type LogbookView = {
  userId: string
  today: string
  isDemo: boolean
  /** oldest 1st, as the repository returns them */
  jumps: Jump[]
  dropZones: DropZone[]
  previewOnly: PreviewOnlyData
  dropZoneName: (dropZoneId: string | null) => string | null
  tagNamesFor: (jumpId: string) => string[]
  rowsNewestFirst: (jumps: readonly Jump[]) => JumpListRow[]
}

export async function loadLogbook(): Promise<LogbookView> {
  const userId = await getCurrentUserId()
  const { jumpRepository, dropZoneRepository } = getServices()
  const [jumps, dropZones] = await Promise.all([jumpRepository.listByUser(userId), dropZoneRepository.list()])
  const previewOnly = getPreviewOnlyData()
  const dropZoneNames = new Map(dropZones.map((dropZone) => [dropZone.id, dropZone.name]))

  const dropZoneName = (dropZoneId: string | null) => (dropZoneId === null ? null : (dropZoneNames.get(dropZoneId) ?? null))
  const tagNamesFor = (jumpId: string) => (previewOnly.tagsByJumpId.get(jumpId) ?? []).map((tagView) => tagView.name)

  return {
    userId,
    today: todayIsoDate(),
    isDemo: isDemoMode(),
    jumps,
    dropZones,
    previewOnly,
    dropZoneName,
    tagNamesFor,
    rowsNewestFirst: (selectedJumps) =>
      [...selectedJumps]
        .sort((a, b) => b.jumpNumber - a.jumpNumber)
        .map((jump) => ({ jump, dropZoneName: dropZoneName(jump.dropZoneId), tagNames: tagNamesFor(jump.id) })),
  }
}

/** Lifetime descents. The highest jump number wins, so a half-digitised logbook still counts right. */
export function totalJumpCount(jumps: readonly Jump[]): number {
  return jumps.reduce((highest, jump) => Math.max(highest, jump.jumpNumber), jumps.length)
}

export function progressionSnapshotFor(view: LogbookView): ProgressionSnapshot {
  const twoMonthsAgo = addMonths(view.today, -2)
  const twelveMonthsAgo = addMonths(view.today, -12)
  return {
    licence: view.previewOnly.profile.licence,
    grades: view.previewOnly.profile.grades,
    totalJumps: totalJumpCount(view.jumps),
    jumpsInLast2Months: view.jumps.filter((jump) => jump.date > twoMonthsAgo).length,
    jumpsInLast12Months: view.jumps.filter((jump) => jump.date > twelveMonthsAgo).length,
  }
}

/** Most recent jump date per discipline tag, for the per-discipline currency countdowns. */
export function lastJumpDateByDiscipline(view: LogbookView): Map<string, string> {
  const lastDates = new Map<string, string>()
  for (const jump of view.jumps) {
    for (const tagView of view.previewOnly.tagsByJumpId.get(jump.id) ?? []) {
      if (tagView.category !== 'discipline') continue
      const previous = lastDates.get(tagView.name)
      if (previous === undefined || jump.date > previous) lastDates.set(tagView.name, jump.date)
    }
  }
  return lastDates
}

export const gearKindNames: Record<GearKind, string> = {
  container: 'Container',
  main_canopy: 'Main canopy',
  reserve_canopy: 'Reserve',
  aad: 'AAD',
  altimeter: 'Altimeter',
  helmet: 'Helmet',
  audible: 'Audible',
  jumpsuit: 'Jumpsuit',
  goggles: 'Goggles',
  other: 'Other',
}
