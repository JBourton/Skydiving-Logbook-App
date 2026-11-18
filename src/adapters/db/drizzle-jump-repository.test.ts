import { randomUUID } from 'node:crypto'
import { users } from '~/adapters/db/schema'
import { runJumpRepositoryContract } from '~/test-support/repository-contracts'
import { createTestDatabase } from '~/test-support/pglite'
import { DrizzleJumpRepository } from './drizzle-jump-repository'

runJumpRepositoryContract('DrizzleJumpRepository (PGlite)', async () => {
  const { client, db } = await createTestDatabase()

  return {
    repository: new DrizzleJumpRepository(db),
    createUser: async () => {
      const [row] = await db
        .insert(users)
        .values({ email: `${randomUUID()}@example.test` })
        .returning({ id: users.id })

      if (!row) throw new Error('User insert returned no row')
      return row.id
    },
    dispose: async () => {
      await client.close()
    },
  }
})
