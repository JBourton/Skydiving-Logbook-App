import type { Jump, NewJump } from '~/domain/jump'

export interface JumpRepository {
  /**
   * Creates a jump for `userId`. Throws DuplicateJumpNumberError if the user
   * already has a jump with the same jumpNumber, archived or not.
   */
  create(userId: string, newJump: NewJump): Promise<Jump>

  /** Returns null when the jump does not exist or is archived. */
  findById(userId: string, id: string): Promise<Jump | null>

  /** Lists the user's active (non-archived) jumps. */
  listByUser(userId: string): Promise<Jump[]>

  /**
   * Replaces a jump's details. Returns the updated jump, or null when no active jump belongs to
   * `userId` under `id`. Throws DuplicateJumpNumberError if the new jumpNumber is already taken.
   * `ocrSourceId` is provenance, so an update never changes it.
   */
  update(userId: string, id: string, changes: NewJump): Promise<Jump | null>

  /**
   * Soft-deletes a jump. Returns the archived jump, or null when no jump
   * belongs to `userId` under `id`.
   */
  archive(userId: string, id: string): Promise<Jump | null>

  /**
   * Returns one more than the user's highest jumpNumber, counting archived
   * jumps because the uniqueness constraint still covers them. Returns 1 when
   * the user has no jumps.
   */
  nextJumpNumber(userId: string): Promise<number>
}
