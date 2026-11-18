import { addDays, weekdayIndexMondayFirst } from '~/domain/calendar-date'
import type { DropZone } from '~/domain/drop-zone'
import type { Jump, JumpDraft } from '~/domain/jump'
import { estimateFreefallSeconds } from '~/domain/logbook-insights'
import type { GradeCode, LicenceLevel } from '~/domain/progression'

// a made-up jumper part way to their B licence: AFF last spring, FS1 & CT1 done, JM1 outstanding.
// Dates are counted back from today so demo currency never quietly lapses.
export const demoSettings = {
  userId: 'demo-user',
  randomSeed: 1903,
}

// ─── view models for features whose ports don't exist yet ────────────────────
// These describe what the UI needs. When a port lands (tags, gear, partners...), its page reads
// the port instead & the matching field here goes.

export type TagCategory = 'progression' | 'discipline' | 'event_type' | 'role' | 'custom'

export type TagView = { name: string; category: TagCategory; canonicalKey: string | null }

export type GearKind = 'container' | 'main_canopy' | 'reserve_canopy' | 'aad' | 'altimeter' | 'helmet' | 'audible' | 'jumpsuit' | 'goggles' | 'other'

export type GearItem = {
  id: string
  kind: GearKind
  make: string
  model: string
  purchasedOn: string | null
  retired: boolean
  jumpIds: string[]
}

export type WeatherSnapshot = { windKnots: number; gustKnots: number; cloudBaseFt: number; temperatureC: number }

export type ProgressionProfile = {
  licence: LicenceLevel | null
  grades: GradeCode[]
  /** indexes into `gradeSignOffs[grade]` that an instructor has signed */
  signOffsDone: Partial<Record<GradeCode, number[]>>
}

export type PreviewOnlyData = {
  isSample: boolean
  profile: ProgressionProfile
  allTags: TagView[]
  tagsByJumpId: ReadonlyMap<string, TagView[]>
  gear: GearItem[]
  partnersByJumpId: ReadonlyMap<string, string[]>
  weatherByJumpId: ReadonlyMap<string, WeatherSnapshot>
  importSample: { pageLabel: string; drafts: JumpDraft[] } | null
  customGoals: Array<{ label: string; done: boolean }>
}

export const emptyPreviewOnlyData: PreviewOnlyData = {
  isSample: false,
  profile: { licence: null, grades: [], signOffsDone: {} },
  allTags: [],
  tagsByJumpId: new Map(),
  gear: [],
  partnersByJumpId: new Map(),
  weatherByJumpId: new Map(),
  importSample: null,
  customGoals: [],
}

// ─── drop zones ──────────────────────────────────────────────────────────────

const createdAt = new Date('2026-05-12T09:00:00Z')

export const demoDropZones: DropZone[] = [
  { id: 'dz-hinton', name: 'Hinton Skydiving Centre', country: 'United Kingdom', latitude: 52.028, longitude: -1.206, iataCode: null, createdByUserId: null, createdAt },
  { id: 'dz-langar', name: 'Skydive Langar', country: 'United Kingdom', latitude: 52.891, longitude: -0.906, iataCode: null, createdByUserId: null, createdAt },
  { id: 'dz-tilstock', name: 'Skydive Tilstock', country: 'United Kingdom', latitude: 52.931, longitude: -2.65, iataCode: null, createdByUserId: null, createdAt },
  { id: 'dz-hibaldstow', name: 'Skydive Hibaldstow', country: 'United Kingdom', latitude: 53.495, longitude: -0.519, iataCode: null, createdByUserId: null, createdAt },
  { id: 'dz-empuriabrava', name: 'Skydive Empuriabrava', country: 'Spain', latitude: 42.259, longitude: 3.11, iataCode: null, createdByUserId: null, createdAt },
]

const aircraftByDropZone: Record<string, string> = {
  'dz-hinton': 'Cessna Caravan',
  'dz-langar': 'Skyvan',
  'dz-tilstock': 'Cessna 206',
  'dz-empuriabrava': 'Twin Otter',
}

// ─── tags ────────────────────────────────────────────────────────────────────

function tag(name: string, category: TagCategory, canonicalKey: string): TagView {
  return { name, category, canonicalKey }
}

const tags = {
  aff: (level: number) => tag(`AFF ${level}`, 'progression', `aff-${level}`),
  consol: tag('Consolidation', 'progression', 'consol'),
  fsCoach: tag('FS coach jump', 'progression', 'fs-coach'),
  fs1: tag('FS1 sign-off', 'progression', 'fs1'),
  ct1: tag('CT1 training', 'progression', 'ct1'),
  solo: tag('Solo', 'discipline', 'solo'),
  formation: tag('Formation', 'discipline', 'fs'),
  canopy: tag('Canopy', 'discipline', 'canopy'),
  hopAndPop: tag('Hop & pop', 'event_type', 'hop-pop'),
  boogie: tag('Spain trip', 'event_type', 'trip'),
  student: tag('Student', 'role', 'student'),
  twoWay: tag('2-way', 'custom', '2-way'),
  threeWay: tag('3-way', 'custom', '3-way'),
}

// ─── the jumping story ───────────────────────────────────────────────────────

type JumpKind = 'aff' | 'consol' | 'solo' | 'hopAndPop' | 'fsCoach' | 'fs1' | 'twoWay' | 'threeWay' | 'ct1' | 'fun'

type Session = { weeksAgo: number; dayOffset: number; dropZoneId: string; kinds: JumpKind[] }

// dayOffset counts from the Saturday `weeksAgo` weeks back: 0 = Sat, 1 = Sun, 2 = Mon...
const sessions: Session[] = [
  { weeksAgo: 84, dayOffset: 0, dropZoneId: 'dz-hinton', kinds: ['aff', 'aff'] },
  { weeksAgo: 84, dayOffset: 1, dropZoneId: 'dz-hinton', kinds: ['aff'] },
  { weeksAgo: 82, dayOffset: 0, dropZoneId: 'dz-hinton', kinds: ['aff', 'aff'] },
  { weeksAgo: 80, dayOffset: 0, dropZoneId: 'dz-hinton', kinds: ['aff', 'aff'] },
  { weeksAgo: 80, dayOffset: 1, dropZoneId: 'dz-hinton', kinds: ['aff'] },
  { weeksAgo: 78, dayOffset: 0, dropZoneId: 'dz-hinton', kinds: ['consol', 'consol', 'consol'] },
  { weeksAgo: 77, dayOffset: 1, dropZoneId: 'dz-hinton', kinds: ['consol', 'consol'] },
  { weeksAgo: 75, dayOffset: 0, dropZoneId: 'dz-hinton', kinds: ['consol', 'consol', 'consol'] },
  { weeksAgo: 73, dayOffset: 0, dropZoneId: 'dz-hinton', kinds: ['consol', 'consol'] },
  { weeksAgo: 70, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['solo', 'hopAndPop'] },
  { weeksAgo: 68, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['fsCoach', 'fsCoach', 'fsCoach'] },
  { weeksAgo: 66, dayOffset: 1, dropZoneId: 'dz-langar', kinds: ['fsCoach', 'fs1'] },
  { weeksAgo: 62, dayOffset: 0, dropZoneId: 'dz-tilstock', kinds: ['twoWay', 'solo', 'hopAndPop'] },
  { weeksAgo: 58, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['twoWay', 'solo'] },
  { weeksAgo: 54, dayOffset: 1, dropZoneId: 'dz-langar', kinds: ['twoWay', 'twoWay'] },
  { weeksAgo: 32, dayOffset: 2, dropZoneId: 'dz-empuriabrava', kinds: ['fun', 'twoWay', 'fun'] },
  { weeksAgo: 32, dayOffset: 3, dropZoneId: 'dz-empuriabrava', kinds: ['threeWay', 'fun', 'twoWay'] },
  { weeksAgo: 32, dayOffset: 4, dropZoneId: 'dz-empuriabrava', kinds: ['fun', 'threeWay'] },
  { weeksAgo: 32, dayOffset: 5, dropZoneId: 'dz-empuriabrava', kinds: ['twoWay', 'fun', 'fun'] },
  { weeksAgo: 28, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['ct1', 'solo'] },
  { weeksAgo: 24, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['ct1', 'ct1', 'twoWay'] },
  { weeksAgo: 22, dayOffset: 1, dropZoneId: 'dz-langar', kinds: ['ct1', 'ct1'] },
  { weeksAgo: 19, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['ct1', 'ct1', 'ct1'] },
  { weeksAgo: 15, dayOffset: 0, dropZoneId: 'dz-tilstock', kinds: ['threeWay', 'solo'] },
  { weeksAgo: 12, dayOffset: 1, dropZoneId: 'dz-langar', kinds: ['twoWay', 'hopAndPop'] },
  { weeksAgo: 8, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['threeWay', 'twoWay'] },
  { weeksAgo: 5, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['solo', 'twoWay'] },
  { weeksAgo: 0, dayOffset: 0, dropZoneId: 'dz-langar', kinds: ['twoWay', 'threeWay'] },
]

const affNotes = [
  'Level 1: heading awareness & practice pulls, pulled on signal',
  'Level 2: solo pull on my own altitude awareness',
  'Level 3: released, held heading on my own',
  'Level 4: started & stopped turns',
  'Level 5: 360s left & right',
  'Level 6: solo exit, back loop, short track',
  'Level 7: dive exit, alternate 360s, track & wave off',
  'Level 8: solo exit & stable pull inside 10 s',
]

const notesByKind: Record<Exclude<JumpKind, 'aff'>, readonly string[]> = {
  consol: ['Back loop, 360s & wave off', 'Unstable exit, recovered quickly', 'Track turn as an avoidance drill', 'Spot check from the door, good exit', 'Short track & clean pull'],
  solo: ['Solo, worked on fall rate', 'Back loops & turns, relaxed', 'Solo, practised levels'],
  hopAndPop: ['Hop & pop, clean exit, flew the pattern', 'Hop & pop under low cloud'],
  fsCoach: ['FS coach jump: fall rate & docks', 'FS coach jump: approaches & levels', 'FS coach jump: break-off & track'],
  fs1: ['FS1 sign-off: docks, turns & a clean break-off'],
  twoWay: ['2-way with Dan, 4 points', '2-way, worked on docks', '2-way, slow but clean'],
  threeWay: ['3-way, built a star & 2 points', '3-way, funnelled the exit'],
  ct1: ['CT1: stall point & deep brakes, flat turns', 'CT1: rear-riser avoidance turns', 'CT1: pre-declared landing inside 50 m'],
  fun: ['Tracked along the coast', 'Sunset load', 'Big formation load, held my slot'],
}

function createRandom(seed: number): () => number {
  // mulberry32: tiny, seedable, & good enough for believable sample numbers
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function mostRecentSaturday(today: string): string {
  const daysSinceSaturday = (weekdayIndexMondayFirst(today) + 2) % 7
  return addDays(today, -daysSinceSaturday)
}

type GeneratedJump = { jump: Jump; tags: TagView[]; partners: string[]; weather: WeatherSnapshot }

function tagsFor(kind: JumpKind, affLevel: number, dropZoneId: string): TagView[] {
  const kindTags: Record<JumpKind, TagView[]> = {
    aff: [tags.aff(affLevel), tags.student],
    consol: [tags.consol, tags.solo, tags.student],
    solo: [tags.solo],
    hopAndPop: [tags.hopAndPop, tags.solo],
    fsCoach: [tags.fsCoach, tags.formation],
    fs1: [tags.fs1, tags.formation],
    twoWay: [tags.formation, tags.twoWay],
    threeWay: [tags.formation, tags.threeWay],
    ct1: [tags.ct1, tags.canopy],
    fun: [tags.solo],
  }
  return dropZoneId === 'dz-empuriabrava' ? [...kindTags[kind], tags.boogie] : kindTags[kind]
}

function partnersFor(kind: JumpKind, random: () => number): string[] {
  if (kind === 'fsCoach' || kind === 'fs1') return ['Rachel W (coach)']
  if (kind === 'twoWay') return [random() > 0.4 ? 'Dan K' : 'Mia S']
  if (kind === 'threeWay') return ['Dan K', random() > 0.5 ? 'Mia S' : 'Tom B']
  return []
}

function altitudesFor(kind: JumpKind, affLevel: number, jumpNumber: number) {
  if (kind === 'aff' && affLevel === 8) return { exitFt: 5000, deployFt: 4000 }
  if (kind === 'aff') return { exitFt: 13000, deployFt: 5500 }
  if (kind === 'consol') return { exitFt: 13000, deployFt: jumpNumber < 14 ? 5000 : 4500 }
  if (kind === 'hopAndPop') return { exitFt: 5000, deployFt: 4000 }
  // jump 37 is the one low pull worth learning from, so the UI has a real warning to show
  if (jumpNumber === 37) return { exitFt: 13000, deployFt: 2900 }
  return { exitFt: kind === 'ct1' ? 6000 : 13000, deployFt: kind === 'ct1' ? 5000 : 3500 }
}

function canopySizeFor(jumpNumber: number): number {
  if (jumpNumber <= 8) return 260
  if (jumpNumber <= 18) return 240
  if (jumpNumber <= 40) return 220
  return jumpNumber <= 55 ? 210 : 190
}

function generateDemoJumps(today: string): GeneratedJump[] {
  const random = createRandom(demoSettings.randomSeed)
  const anchorSaturday = mostRecentSaturday(today)
  const generated: GeneratedJump[] = []
  let affLevel = 0
  const kindCounters = new Map<JumpKind, number>()

  for (const session of sessions) {
    const date = addDays(anchorSaturday, -7 * session.weeksAgo + session.dayOffset)
    for (const kind of session.kinds) {
      const jumpNumber = generated.length + 1
      if (kind === 'aff') affLevel += 1
      const kindIndex = kindCounters.get(kind) ?? 0
      kindCounters.set(kind, kindIndex + 1)

      const { exitFt, deployFt } = altitudesFor(kind, affLevel, jumpNumber)
      const isStudentJump = kind === 'aff' || kind === 'consol' || kind === 'fsCoach' || kind === 'fs1' || kind === 'ct1'
      const description = kind === 'aff' ? affNotes[affLevel - 1] : notesByKind[kind][kindIndex % notesByKind[kind].length]
      // a couple of early consol entries were scrawled in a hurry, so their delays never made it in
      const delayIllegible = jumpNumber === 11 || jumpNumber === 15

      const jump: Jump = {
        id: `demo-jump-${String(jumpNumber).padStart(3, '0')}`,
        userId: demoSettings.userId,
        jumpNumber,
        date,
        dropZoneId: session.dropZoneId,
        aircraft: aircraftByDropZone[session.dropZoneId] ?? null,
        exitAltitudeFt: exitFt,
        deployAltitudeFt: deployFt,
        delaySeconds: delayIllegible ? null : (estimateFreefallSeconds(exitFt, deployFt) ?? 0) + Math.round(random() * 4 - 2),
        canopySizeFt2: canopySizeFor(jumpNumber),
        description,
        authoriser: isStudentJump ? (jumpNumber % 2 === 0 ? 'R. Whitfield' : 'A. Okafor') : null,
        ocrSourceId: jumpNumber <= 18 ? 'demo-page-1' : null,
        createdAt: new Date(`${date}T17:00:00Z`),
        updatedAt: new Date(`${date}T17:00:00Z`),
        archivedAt: null,
      }

      const weather: WeatherSnapshot = {
        windKnots: Math.round(4 + random() * 12),
        gustKnots: Math.round(14 + random() * 8),
        cloudBaseFt: Math.round((3000 + random() * 6000) / 500) * 500,
        temperatureC: Math.round(8 + random() * 14),
      }

      generated.push({ jump, tags: tagsFor(kind, affLevel, session.dropZoneId), partners: partnersFor(kind, random), weather })
    }
  }
  return generated
}

function demoGear(jumps: readonly Jump[]): GearItem[] {
  const usedFrom = (jumpNumber: number) => jumps.filter((jump) => jump.jumpNumber >= jumpNumber).map((jump) => jump.id)
  const purchasedOn = (jumpNumber: number) => jumps.find((jump) => jump.jumpNumber === jumpNumber)?.date ?? null
  return [
    { id: 'gear-helmet', kind: 'helmet', make: 'Cookie', model: 'G4', purchasedOn: purchasedOn(19), retired: false, jumpIds: usedFrom(19) },
    { id: 'gear-altimeter', kind: 'altimeter', make: 'L&B', model: 'Viso II+', purchasedOn: purchasedOn(19), retired: false, jumpIds: usedFrom(19) },
    { id: 'gear-audible', kind: 'audible', make: 'L&B', model: 'Optima II', purchasedOn: purchasedOn(26), retired: false, jumpIds: usedFrom(26) },
    { id: 'gear-jumpsuit', kind: 'jumpsuit', make: 'Tonfly', model: 'FS suit', purchasedOn: purchasedOn(21), retired: false, jumpIds: usedFrom(21) },
    { id: 'gear-goggles', kind: 'goggles', make: 'Flexvue', model: 'Clear', purchasedOn: purchasedOn(1), retired: true, jumpIds: usedFrom(1).slice(0, 18) },
  ]
}

function demoImportDrafts(lastJump: Jump): JumpDraft[] {
  // the sort of page that comes back from a phone photo: mostly right, a few things to check
  const nextDate = addDays(lastJump.date, 1)
  const base = { date: nextDate, dropZoneId: 'dz-langar', aircraft: 'Skyvan', exitAltitudeFt: 13000, canopySizeFt2: 190 }
  return [
    { ...base, jumpNumber: lastJump.jumpNumber + 1, deployAltitudeFt: 3500, delaySeconds: 58, description: '2-way with Mia, 5 points' },
    { ...base, jumpNumber: lastJump.jumpNumber + 2, deployAltitudeFt: 350, delaySeconds: 57, description: '3-way, 2 points then a funnel' },
    { ...base, jumpNumber: lastJump.jumpNumber + 3, deployAltitudeFt: 3500, delaySeconds: null, description: 'Solo, sit-fly drills (coach watching)' },
    { ...base, jumpNumber: undefined, exitAltitudeFt: 5000, deployAltitudeFt: 4000, delaySeconds: 5, description: 'Hop & pop, last load' },
  ]
}

/** Builds the whole sample logbook relative to `today`. */
export function buildDemoLogbook(today: string): { jumps: Jump[]; dropZones: DropZone[]; previewOnly: PreviewOnlyData } {
  const generated = generateDemoJumps(today)
  const jumps = generated.map((entry) => entry.jump)
  const lastJump = jumps[jumps.length - 1]

  return {
    jumps,
    dropZones: demoDropZones,
    previewOnly: {
      isSample: true,
      profile: { licence: 'A', grades: ['FS1', 'CT1'], signOffsDone: { JM1: [2] } },
      allTags: [...new Map(generated.flatMap((entry) => entry.tags).map((tagView) => [tagView.name, tagView])).values()],
      tagsByJumpId: new Map(generated.map((entry) => [entry.jump.id, entry.tags])),
      gear: demoGear(jumps),
      partnersByJumpId: new Map(generated.filter((entry) => entry.partners.length > 0).map((entry) => [entry.jump.id, entry.partners])),
      weatherByJumpId: new Map(generated.map((entry) => [entry.jump.id, entry.weather])),
      importSample: { pageLabel: 'Logbook page 11', drafts: demoImportDrafts(lastJump) },
      customGoals: [
        { label: 'Sit-fly in the tunnel before FF1 training', done: false },
        { label: 'Fly a canopy course at a boogie', done: false },
        { label: 'Jump somewhere new abroad', done: true },
      ],
    },
  }
}
