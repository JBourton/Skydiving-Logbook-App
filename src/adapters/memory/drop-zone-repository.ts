import type { DropZone } from '~/domain/drop-zone'
import type { DropZoneRepository } from '~/ports/drop-zone-repository'

export class InMemoryDropZoneRepository implements DropZoneRepository {
  private readonly dropZones: DropZone[]

  constructor(initialDropZones: readonly DropZone[] = []) {
    this.dropZones = initialDropZones.map((dropZone) => ({ ...dropZone }))
  }

  async list(): Promise<DropZone[]> {
    return [...this.dropZones]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((dropZone) => ({ ...dropZone }))
  }
}
