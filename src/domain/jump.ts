export type Jump = {
  id: string
  userId: string
  jumpNumber: number
  /** Calendar date in 'YYYY-MM-DD' form, matching the `date` column. */
  date: string
  dropZoneId: string | null
  aircraft: string | null
  exitAltitudeFt: number | null
  deployAltitudeFt: number | null
  delaySeconds: number | null
  canopySizeFt2: number | null
  description: string | null
  authoriser: string | null
  ocrSourceId: string | null
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
}

export type NewJump = {
  jumpNumber: number
  date: string
  dropZoneId?: string | null
  aircraft?: string | null
  exitAltitudeFt?: number | null
  deployAltitudeFt?: number | null
  delaySeconds?: number | null
  canopySizeFt2?: number | null
  description?: string | null
  authoriser?: string | null
  ocrSourceId?: string | null
}

export type JumpDraft = {
  jumpNumber?: number
  date?: string
  dropZoneId?: string | null
  aircraft?: string | null
  exitAltitudeFt?: number | null
  deployAltitudeFt?: number | null
  delaySeconds?: number | null
  canopySizeFt2?: number | null
  description?: string | null
  authoriser?: string | null
  ocrSourceId?: string | null
}

export class DuplicateJumpNumberError extends Error {
  readonly userId: string
  readonly jumpNumber: number

  constructor(userId: string, jumpNumber: number) {
    super(`User ${userId} already has a jump numbered ${jumpNumber}`)
    this.name = 'DuplicateJumpNumberError'
    this.userId = userId
    this.jumpNumber = jumpNumber
  }
}
