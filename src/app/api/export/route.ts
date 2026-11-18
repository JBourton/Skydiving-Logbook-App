import { getCurrentUserId } from '~/lib/current-user'
import { todayIsoDate } from '~/lib/format'
import { getServices } from '~/lib/services'

// the "JSON export endpoint for backup and portability" from the v1 plan: every active jump plus
// the drop zones they point at, in a versioned envelope so a future importer can read old backups
export async function GET(): Promise<Response> {
  const userId = await getCurrentUserId()
  const { jumpRepository, dropZoneRepository } = getServices()
  const [jumps, dropZones] = await Promise.all([jumpRepository.listByUser(userId), dropZoneRepository.list()])
  const usedDropZoneIds = new Set(jumps.map((jump) => jump.dropZoneId))

  const backup = {
    format: 'skydive-log-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    jumps,
    dropZones: dropZones.filter((dropZone) => usedDropZoneIds.has(dropZone.id)),
  }

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="skydive-log-${todayIsoDate()}.json"`,
      'cache-control': 'no-store',
    },
  })
}
