import { randomUUID } from 'node:crypto'
import {
  DuplicateJumpNumberError,
  type Jump,
  type NewJump,
} from '~/domain/jump'
import type { JumpRepository } from '~/ports/jump-repository'

export class InMemoryJumpRepository implements JumpRepository {
  private readonly jumps: Jump[]

  constructor(initialJumps: readonly Jump[] = []) {
    this.jumps = initialJumps.map((jump) => ({ ...jump }))
  }

  async create(userId: string, newJump: NewJump): Promise<Jump> {
    const duplicate = this.jumps.some(
      (jump) => jump.userId === userId && jump.jumpNumber === newJump.jumpNumber,
    )
    if (duplicate) {
      throw new DuplicateJumpNumberError(userId, newJump.jumpNumber)
    }

    const now = new Date()
    const jump: Jump = {
      id: randomUUID(),
      userId,
      jumpNumber: newJump.jumpNumber,
      date: newJump.date,
      dropZoneId: newJump.dropZoneId ?? null,
      aircraft: newJump.aircraft ?? null,
      exitAltitudeFt: newJump.exitAltitudeFt ?? null,
      deployAltitudeFt: newJump.deployAltitudeFt ?? null,
      delaySeconds: newJump.delaySeconds ?? null,
      canopySizeFt2: newJump.canopySizeFt2 ?? null,
      description: newJump.description ?? null,
      authoriser: newJump.authoriser ?? null,
      ocrSourceId: newJump.ocrSourceId ?? null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    }

    this.jumps.push(jump)
    return { ...jump }
  }

  async findById(userId: string, id: string): Promise<Jump | null> {
    const jump = this.jumps.find(
      (candidate) =>
        candidate.userId === userId &&
        candidate.id === id &&
        candidate.archivedAt === null,
    )
    return jump ? { ...jump } : null
  }

  async listByUser(userId: string): Promise<Jump[]> {
    return this.jumps
      .filter((jump) => jump.userId === userId && jump.archivedAt === null)
      .sort((a, b) => a.jumpNumber - b.jumpNumber)
      .map((jump) => ({ ...jump }))
  }

  async update(userId: string, id: string, changes: NewJump): Promise<Jump | null> {
    const index = this.jumps.findIndex(
      (jump) => jump.userId === userId && jump.id === id && jump.archivedAt === null,
    )
    const existing = this.jumps[index]
    if (!existing) return null

    const numberTaken = this.jumps.some(
      (jump) => jump.userId === userId && jump.id !== id && jump.jumpNumber === changes.jumpNumber,
    )
    if (numberTaken) {
      throw new DuplicateJumpNumberError(userId, changes.jumpNumber)
    }

    const updated: Jump = {
      ...existing,
      jumpNumber: changes.jumpNumber,
      date: changes.date,
      dropZoneId: changes.dropZoneId ?? null,
      aircraft: changes.aircraft ?? null,
      exitAltitudeFt: changes.exitAltitudeFt ?? null,
      deployAltitudeFt: changes.deployAltitudeFt ?? null,
      delaySeconds: changes.delaySeconds ?? null,
      canopySizeFt2: changes.canopySizeFt2 ?? null,
      description: changes.description ?? null,
      authoriser: changes.authoriser ?? null,
      updatedAt: new Date(),
    }
    this.jumps[index] = updated
    return { ...updated }
  }

  async archive(userId: string, id: string): Promise<Jump | null> {
    const index = this.jumps.findIndex(
      (jump) => jump.userId === userId && jump.id === id,
    )
    const existing = this.jumps[index]
    if (!existing) return null
    if (existing.archivedAt !== null) return { ...existing }

    const now = new Date()
    const archived: Jump = { ...existing, archivedAt: now, updatedAt: now }
    this.jumps[index] = archived
    return { ...archived }
  }

  async nextJumpNumber(userId: string): Promise<number> {
    const numbers = this.jumps
      .filter((jump) => jump.userId === userId)
      .map((jump) => jump.jumpNumber)
    return numbers.length === 0 ? 1 : Math.max(...numbers) + 1
  }
}
