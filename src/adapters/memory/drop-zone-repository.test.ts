import { runDropZoneRepositoryContract } from '~/test-support/repository-contracts'
import { InMemoryDropZoneRepository } from './drop-zone-repository'

runDropZoneRepositoryContract(
  'InMemoryDropZoneRepository',
  async (seed) => ({
    repository: new InMemoryDropZoneRepository(seed),
  }),
)
