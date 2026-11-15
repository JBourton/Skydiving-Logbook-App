import type { DropZone } from '~/domain/drop-zone'

export interface DropZoneRepository {
  /** Lists the global drop-zone catalogue, sorted by name. */
  list(): Promise<DropZone[]>
}
