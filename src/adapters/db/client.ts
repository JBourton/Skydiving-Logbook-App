import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/adapters/db/schema'

export function createDatabaseClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set; cannot create the Neon database client.',
    )
  }

  return drizzle(neon(databaseUrl), { schema })
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>
