import { and, asc, eq, isNull, max } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from '~/adapters/db/schema'
import { jumps } from '~/adapters/db/schema'
import {
  DuplicateJumpNumberError,
  type Jump,
  type NewJump,
} from '~/domain/jump'
import type { JumpRepository } from '~/ports/jump-repository'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

type PostgresErrorLike = {
  code?: unknown
  constraint?: unknown
  cause?: unknown
}

function isDuplicateJumpNumberError(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current: unknown = error

  while (current !== null && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const candidate = current as PostgresErrorLike
    if (
      candidate.code === '23505' &&
      candidate.constraint === 'jumps_user_number_unique'
    ) {
      return true
    }
    current = candidate.cause
  }

  return false
}

function toJump(row: typeof jumps.$inferSelect): Jump {
  return {
    id: row.id,
    userId: row.userId,
    jumpNumber: row.jumpNumber,
    date: row.date,
    dropZoneId: row.dropZoneId,
    aircraft: row.aircraft,
    exitAltitudeFt: row.exitAltitudeFt,
    deployAltitudeFt: row.deployAltitudeFt,
    delaySeconds: row.delaySeconds,
    canopySizeFt2: row.canopySizeFt2,
    description: row.description,
    authoriser: row.authoriser,
    ocrSourceId: row.ocrSourceId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  }
}

export class DrizzleJumpRepository implements JumpRepository {
  constructor(private readonly db: Database) {}

  async create(userId: string, newJump: NewJump): Promise<Jump> {
    try {
      const [row] = await this.db
        .insert(jumps)
        .values({
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
        })
        .returning()

      if (!row) {
        throw new Error('Jump insert returned no row')
      }

      return toJump(row)
    } catch (error) {
      if (isDuplicateJumpNumberError(error)) {
        throw new DuplicateJumpNumberError(userId, newJump.jumpNumber)
      }
      throw error
    }
  }

  async findById(userId: string, id: string): Promise<Jump | null> {
    const [row] = await this.db
      .select()
      .from(jumps)
      .where(
        and(
          eq(jumps.userId, userId),
          eq(jumps.id, id),
          isNull(jumps.archivedAt),
        ),
      )
      .limit(1)

    return row ? toJump(row) : null
  }

  async listByUser(userId: string): Promise<Jump[]> {
    const rows = await this.db
      .select()
      .from(jumps)
      .where(and(eq(jumps.userId, userId), isNull(jumps.archivedAt)))
      .orderBy(asc(jumps.jumpNumber))

    return rows.map(toJump)
  }

  async update(userId: string, id: string, changes: NewJump): Promise<Jump | null> {
    try {
      const [row] = await this.db
        .update(jumps)
        .set({
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
        })
        .where(
          and(
            eq(jumps.userId, userId),
            eq(jumps.id, id),
            isNull(jumps.archivedAt),
          ),
        )
        .returning()

      return row ? toJump(row) : null
    } catch (error) {
      if (isDuplicateJumpNumberError(error)) {
        throw new DuplicateJumpNumberError(userId, changes.jumpNumber)
      }
      throw error
    }
  }

  async archive(userId: string, id: string): Promise<Jump | null> {
    const now = new Date()
    const [archived] = await this.db
      .update(jumps)
      .set({ archivedAt: now, updatedAt: now })
      .where(
        and(
          eq(jumps.userId, userId),
          eq(jumps.id, id),
          isNull(jumps.archivedAt),
        ),
      )
      .returning()

    if (archived) return toJump(archived)

    const [existing] = await this.db
      .select()
      .from(jumps)
      .where(and(eq(jumps.userId, userId), eq(jumps.id, id)))
      .limit(1)

    return existing ? toJump(existing) : null
  }

  async nextJumpNumber(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ highest: max(jumps.jumpNumber) })
      .from(jumps)
      .where(eq(jumps.userId, userId))

    const highest = row?.highest
    return highest == null ? 1 : Number(highest) + 1
  }
}
