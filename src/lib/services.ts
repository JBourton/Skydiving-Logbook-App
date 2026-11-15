import { createDatabaseClient } from '~/adapters/db/client'
import { DrizzleDropZoneRepository } from '~/adapters/db/drizzle-drop-zone-repository'
import { DrizzleJumpRepository } from '~/adapters/db/drizzle-jump-repository'
import type { DropZoneRepository } from '~/ports/drop-zone-repository'
import type { JumpRepository } from '~/ports/jump-repository'

export type Services = {
  jumpRepository: JumpRepository
  dropZoneRepository: DropZoneRepository
}

export function getServices(): Services {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Configure it in .env.local (local development) or the hosting provider environment (production).',
    )
  }

  const db = createDatabaseClient(process.env.DATABASE_URL)

  return {
    jumpRepository: new DrizzleJumpRepository(db),
    dropZoneRepository: new DrizzleDropZoneRepository(db),
  }
}
