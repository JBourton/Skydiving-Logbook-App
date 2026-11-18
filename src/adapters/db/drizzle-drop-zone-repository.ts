import { asc } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from '~/adapters/db/schema'
import { dropZones } from '~/adapters/db/schema'
import type { DropZone } from '~/domain/drop-zone'
import type { DropZoneRepository } from '~/ports/drop-zone-repository'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

function toDropZone(row: typeof dropZones.$inferSelect): DropZone {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    iataCode: row.iataCode,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  }
}

export class DrizzleDropZoneRepository implements DropZoneRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<DropZone[]> {
    const rows = await this.db
      .select()
      .from(dropZones)
      .orderBy(asc(dropZones.name))

    return rows.map(toDropZone)
  }
}
