import { createDatabaseClient } from '~/adapters/db/client'
import { DrizzleDropZoneRepository } from '~/adapters/db/drizzle-drop-zone-repository'
import { DrizzleJumpRepository } from '~/adapters/db/drizzle-jump-repository'
import { InMemoryDropZoneRepository } from '~/adapters/memory/drop-zone-repository'
import { InMemoryJumpRepository } from '~/adapters/memory/jump-repository'
import { buildDemoLogbook, emptyPreviewOnlyData, type PreviewOnlyData } from '~/lib/demo-data'
import { todayIsoDate } from '~/lib/format'
import type { DropZoneRepository } from '~/ports/drop-zone-repository'
import type { JumpRepository } from '~/ports/jump-repository'

export type Services = {
  jumpRepository: JumpRepository
  dropZoneRepository: DropZoneRepository
}

type DemoState = { services: Services; previewOnly: PreviewOnlyData }

// DATA_SOURCE=demo swaps the Drizzle adapters for the in-memory ones, seeded with a sample logbook.
// It's the ports-and-adapters payoff in 1 line: the whole UI runs with no database at all.
export function isDemoMode(): boolean {
  return process.env.DATA_SOURCE === 'demo'
}

function getDemoState(): DemoState {
  // I park the demo state on globalThis so Next's hot reload doesn't wipe jumps logged in demo mode
  const globalWithDemo = globalThis as typeof globalThis & { skydiveLogDemoState?: DemoState }
  if (!globalWithDemo.skydiveLogDemoState) {
    const demoLogbook = buildDemoLogbook(todayIsoDate())
    globalWithDemo.skydiveLogDemoState = {
      services: {
        jumpRepository: new InMemoryJumpRepository(demoLogbook.jumps),
        dropZoneRepository: new InMemoryDropZoneRepository(demoLogbook.dropZones),
      },
      previewOnly: demoLogbook.previewOnly,
    }
  }
  return globalWithDemo.skydiveLogDemoState
}

export function getServices(): Services {
  if (isDemoMode()) return getDemoState().services

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Configure it in .env.local (local development) or the hosting provider environment (production).',
    )
  }

  const db = createDatabaseClient(process.env.DATABASE_URL)

  return {
    jumpRepository: new DrizzleJumpRepository(db),
    dropZoneRepository: new DrizzleDropZoneRepository(db),
  }
}

/**
 * Data for features whose ports aren't built yet (tags, gear, partners, weather, OCR drafts).
 * Demo mode gets sample data so every screen can be designed & reviewed; real mode gets empty
 * values & the screens show their empty states. Each field goes once its port exists.
 */
export function getPreviewOnlyData(): PreviewOnlyData {
  return isDemoMode() ? getDemoState().previewOnly : emptyPreviewOnlyData
}
