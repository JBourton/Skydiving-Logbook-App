import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { fileURLToPath } from 'node:url'
import * as schema from '~/adapters/db/schema'

const migrationsFolder = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
)

export async function createTestDatabase() {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder })
  return { client, db }
}
