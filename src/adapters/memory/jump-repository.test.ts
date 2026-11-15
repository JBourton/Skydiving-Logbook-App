import { randomUUID } from 'node:crypto'
import { runJumpRepositoryContract } from '~/test-support/repository-contracts'
import { InMemoryJumpRepository } from './jump-repository'

runJumpRepositoryContract('InMemoryJumpRepository', async () => ({
  repository: new InMemoryJumpRepository(),
  createUser: async () => randomUUID(),
}))
