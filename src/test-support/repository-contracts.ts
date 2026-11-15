import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DropZone } from '~/domain/drop-zone'
import { DuplicateJumpNumberError } from '~/domain/jump'
import type { DropZoneRepository } from '~/ports/drop-zone-repository'
import type { JumpRepository } from '~/ports/jump-repository'

export type JumpRepositoryHarness = {
  repository: JumpRepository
  createUser: () => Promise<string>
  dispose?: () => Promise<void>
}

export function runJumpRepositoryContract(
  name: string,
  createHarness: () => Promise<JumpRepositoryHarness>,
): void {
  describe(name, () => {
    let harness: JumpRepositoryHarness

    beforeEach(async () => {
      harness = await createHarness()
    })

    afterEach(async () => {
      await harness?.dispose?.()
    })

    it('creates a jump and reads it back', async () => {
      const userId = await harness.createUser()

      const created = await harness.repository.create(userId, {
        jumpNumber: 1,
        date: '2026-05-01',
        exitAltitudeFt: 13000,
        deployAltitudeFt: 3500,
        delaySeconds: 45,
        description: 'First jump',
      })

      expect(created.id).toBeTruthy()
      expect(created).toMatchObject({
        userId,
        jumpNumber: 1,
        date: '2026-05-01',
        exitAltitudeFt: 13000,
        deployAltitudeFt: 3500,
        delaySeconds: 45,
        description: 'First jump',
        archivedAt: null,
      })

      const found = await harness.repository.findById(userId, created.id)
      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.jumpNumber).toBe(1)
      expect(found?.date).toBe('2026-05-01')
      expect(found?.createdAt).toEqual(created.createdAt)
    })

    it("does not expose one user's jumps to another user", async () => {
      const userA = await harness.createUser()
      const userB = await harness.createUser()
      expect(userA).not.toBe(userB)

      const jumpA = await harness.repository.create(userA, {
        jumpNumber: 1,
        date: '2026-01-01',
      })

      expect(await harness.repository.findById(userB, jumpA.id)).toBeNull()
      expect(await harness.repository.listByUser(userB)).toEqual([])
      expect(await harness.repository.archive(userB, jumpA.id)).toBeNull()
      expect(await harness.repository.findById(userA, jumpA.id)).not.toBeNull()

      const jumpB = await harness.repository.create(userB, {
        jumpNumber: 1,
        date: '2026-01-02',
      })
      expect(jumpB.userId).toBe(userB)

      expect((await harness.repository.listByUser(userA)).map((j) => j.id)).toEqual([
        jumpA.id,
      ])
      expect((await harness.repository.listByUser(userB)).map((j) => j.id)).toEqual([
        jumpB.id,
      ])
    })

    it('starts nextJumpNumber at 1 and counts archived jumps', async () => {
      const userId = await harness.createUser()

      expect(await harness.repository.nextJumpNumber(userId)).toBe(1)

      await harness.repository.create(userId, {
        jumpNumber: 1,
        date: '2026-02-01',
      })
      await harness.repository.create(userId, {
        jumpNumber: 2,
        date: '2026-02-02',
      })
      expect(await harness.repository.nextJumpNumber(userId)).toBe(3)

      const tenth = await harness.repository.create(userId, {
        jumpNumber: 10,
        date: '2026-02-03',
      })
      expect(await harness.repository.nextJumpNumber(userId)).toBe(11)

      await harness.repository.archive(userId, tenth.id)
      expect(await harness.repository.nextJumpNumber(userId)).toBe(11)
    })

    it('rejects a duplicate jumpNumber, including an archived one', async () => {
      const userId = await harness.createUser()
      const first = await harness.repository.create(userId, {
        jumpNumber: 7,
        date: '2026-03-01',
      })

      await expect(
        harness.repository.create(userId, {
          jumpNumber: 7,
          date: '2026-03-02',
        }),
      ).rejects.toBeInstanceOf(DuplicateJumpNumberError)

      await harness.repository.archive(userId, first.id)

      await expect(
        harness.repository.create(userId, {
          jumpNumber: 7,
          date: '2026-03-03',
        }),
      ).rejects.toBeInstanceOf(DuplicateJumpNumberError)
    })

    it('excludes archived jumps from reads', async () => {
      const userId = await harness.createUser()
      const keep = await harness.repository.create(userId, {
        jumpNumber: 1,
        date: '2026-04-01',
      })
      const remove = await harness.repository.create(userId, {
        jumpNumber: 2,
        date: '2026-04-02',
      })

      const archived = await harness.repository.archive(userId, remove.id)
      expect(archived?.id).toBe(remove.id)
      expect(archived?.archivedAt).not.toBeNull()

      const archivedAgain = await harness.repository.archive(userId, remove.id)
      expect(archivedAgain?.archivedAt).toEqual(archived?.archivedAt)

      expect(await harness.repository.findById(userId, remove.id)).toBeNull()
      expect((await harness.repository.listByUser(userId)).map((j) => j.id)).toEqual([
        keep.id,
      ])
      expect(
        await harness.repository.archive(
          userId,
          '00000000-0000-4000-8000-000000000000',
        ),
      ).toBeNull()
    })
  })
}

export type DropZoneRepositoryHarness = {
  repository: DropZoneRepository
  dispose?: () => Promise<void>
}

export function runDropZoneRepositoryContract(
  name: string,
  createHarness: (
    seed: readonly DropZone[],
  ) => Promise<DropZoneRepositoryHarness>,
): void {
  describe(name, () => {
    it('returns an empty list when there are no drop zones', async () => {
      const harness = await createHarness([])
      try {
        expect(await harness.repository.list()).toEqual([])
      } finally {
        await harness.dispose?.()
      }
    })

    it('lists drop zones sorted by name', async () => {
      const zulu = makeDropZone('Zulu DZ')
      const alpha = makeDropZone('Alpha DZ')
      const mike = makeDropZone('Mike DZ')

      const harness = await createHarness([zulu, alpha, mike])
      try {
        const zones = await harness.repository.list()
        expect(zones.map((zone) => zone.name)).toEqual([
          'Alpha DZ',
          'Mike DZ',
          'Zulu DZ',
        ])
        expect(zones.map((zone) => zone.id)).toEqual([
          alpha.id,
          mike.id,
          zulu.id,
        ])
      } finally {
        await harness.dispose?.()
      }
    })
  })
}

function makeDropZone(name: string): DropZone {
  return {
    id: randomUUID(),
    name,
    country: 'United Kingdom',
    latitude: null,
    longitude: null,
    iataCode: null,
    createdByUserId: null,
    createdAt: new Date(),
  }
}
