import { dropZones } from '~/adapters/db/schema'
import { runDropZoneRepositoryContract } from '~/test-support/repository-contracts'
import { createTestDatabase } from '~/test-support/pglite'
import { DrizzleDropZoneRepository } from './drizzle-drop-zone-repository'

runDropZoneRepositoryContract(
  'DrizzleDropZoneRepository (PGlite)',
  async (seed) => {
    const { client, db } = await createTestDatabase()

    if (seed.length > 0) {
      await db.insert(dropZones).values(
        seed.map((zone) => ({
          id: zone.id,
          name: zone.name,
          country: zone.country,
          latitude: zone.latitude,
          longitude: zone.longitude,
          iataCode: zone.iataCode,
          createdByUserId: zone.createdByUserId,
        })),
      )
    }

    return {
      repository: new DrizzleDropZoneRepository(db),
      dispose: async () => {
        await client.close()
      },
    }
  },
)
