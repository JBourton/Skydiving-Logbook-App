// British Skydiving licence & grade requirements, taken from the Operations Manual Section 2
// (Apr 2024 issue) & Form 190B (Issue 9, Aug 2025). Since the 2021 canopy rewrite the old
// CH/CP grades live under Canopy Training (CT1 to CT4), so CP1 from the original plan is now CT3.
// Anything a logbook can't prove (sign-offs, written exams) comes back as `met: null`.

export type LicenceLevel = 'student' | 'A' | 'B' | 'C' | 'D'

export type GradeCode = 'JM1' | 'CT1' | 'CT2' | 'CT3' | 'FS1' | 'FF1' | 'CF1' | 'TR1'

export type ProgressionSnapshot = {
  /** null when the licence hasn't been recorded anywhere yet */
  licence: LicenceLevel | null
  grades: readonly GradeCode[]
  totalJumps: number
  jumpsInLast2Months: number
  jumpsInLast12Months: number
}

export type Requirement = {
  label: string
  /** true or false when the logbook can tell, null when it needs an instructor's sign-off */
  met: boolean | null
  current?: number
  target?: number
}

export type ProgressionTarget = {
  code: string
  name: string
  achieved: boolean
  requirements: Requirement[]
}

const LICENCE_ORDER: readonly LicenceLevel[] = ['student', 'A', 'B', 'C', 'D']

const GRADE_NAMES: Record<GradeCode, string> = {
  JM1: 'Jump Master 1',
  CT1: 'Canopy Training 1',
  CT2: 'Canopy Training 2',
  CT3: 'Canopy Training 3',
  FS1: 'Formation Skydiving 1',
  FF1: 'Freefly 1',
  CF1: 'Canopy Formation 1',
  TR1: 'Tracking 1',
}

// grade 1s that count as the "further Grade 1" for a C licence, i.e. anything beyond the B licence pair
const FURTHER_GRADE_ONES: readonly GradeCode[] = ['FS1', 'FF1', 'CF1', 'TR1']

/** The sign-off items for the grades on the licence route, paraphrased from Section 2 para 6. */
export const gradeSignOffs: Partial<Record<GradeCode, readonly string[]>> = {
  JM1: [
    'Spot correctly from at least 10,000 ft',
    'Jumpmaster duties brief, including an intro to the Operations Manual',
    'Flight-line checks brief for A licence jumpers & above',
    'Ram-air packing, inspection & basic fault-finding brief',
  ],
  CT1: [
    'Correct landing pattern & safe landing on 5 jumps',
    '5 pre-declared landings inside a 50 m circle',
    'Stall point, deep brakes & flat turns on 3 jumps',
    'Rear-riser avoidance turns on 3 jumps',
    'CT1 written exam',
  ],
  CT2: [
    'Toggle stall point, deep brakes & flat turns on 3 jumps',
    'Rear-riser stall point & riser flight on 3 jumps',
    'Pattern flown without conflicting with others',
    '5 pre-declared landings inside a 25 m circle',
    'Rear-riser avoidance turns on 3 jumps',
    'Brief on distractions under canopy',
    'CT2 written exam',
  ],
}

export function licenceAtLeast(licence: LicenceLevel | null, minimum: LicenceLevel): boolean | null {
  if (licence === null) return null
  return LICENCE_ORDER.indexOf(licence) >= LICENCE_ORDER.indexOf(minimum)
}

export function nextLicence(licence: LicenceLevel | null): LicenceLevel | null {
  if (licence === null) return null
  return LICENCE_ORDER[LICENCE_ORDER.indexOf(licence) + 1] ?? null
}

function jumpCountRequirement(totalJumps: number, target: number, label = `${target} jumps`): Requirement {
  return { label, met: totalJumps >= target, current: Math.min(totalJumps, target), target }
}

function holdsGrade(snapshot: ProgressionSnapshot, grade: GradeCode): Requirement {
  return { label: grade, met: snapshot.grades.includes(grade) }
}

function holdsLicence(snapshot: ProgressionSnapshot, licence: LicenceLevel): Requirement {
  return { label: `${licence} licence`, met: licenceAtLeast(snapshot.licence, licence) }
}

function signedOffOnceHeld(snapshot: ProgressionSnapshot, licence: LicenceLevel, label: string): Requirement {
  // written exams aren't in the logbook, but holding the licence proves they were passed
  return { label, met: licenceAtLeast(snapshot.licence, licence) ? true : null }
}

/** The A to D licence route with each requirement checked against the logbook. */
export function licenceRoute(snapshot: ProgressionSnapshot): ProgressionTarget[] {
  const hasFurtherGradeOne = FURTHER_GRADE_ONES.some((grade) => snapshot.grades.includes(grade))
  const route: Array<{ level: LicenceLevel; requirements: Requirement[] }> = [
    {
      level: 'A',
      requirements: [
        signedOffOnceHeld(snapshot, 'A', 'Category 8, or AFF plus 10 consolidation jumps'),
        signedOffOnceHeld(snapshot, 'A', 'CT written exam'),
      ],
    },
    {
      level: 'B',
      requirements: [holdsLicence(snapshot, 'A'), jumpCountRequirement(snapshot.totalJumps, 50), holdsGrade(snapshot, 'CT1'), holdsGrade(snapshot, 'JM1')],
    },
    {
      level: 'C',
      requirements: [
        holdsLicence(snapshot, 'B'),
        jumpCountRequirement(snapshot.totalJumps, 200),
        holdsGrade(snapshot, 'CT2'),
        { label: 'A further Grade 1, such as FS1 or FF1', met: hasFurtherGradeOne },
        signedOffOnceHeld(snapshot, 'C', 'C licence written exam'),
      ],
    },
    {
      level: 'D',
      requirements: [holdsLicence(snapshot, 'C'), jumpCountRequirement(snapshot.totalJumps, 1000)],
    },
  ]

  return route.map(({ level, requirements }) => ({
    code: level,
    name: `${level} licence`,
    achieved: licenceAtLeast(snapshot.licence, level) === true,
    requirements,
  }))
}

/** What each grade needs before it can be awarded; sign-offs themselves sit in `gradeSignOffs`. */
export function gradeTargets(snapshot: ProgressionSnapshot): ProgressionTarget[] {
  const prerequisites: Record<GradeCode, Requirement[]> = {
    JM1: [holdsLicence(snapshot, 'A')],
    CT1: [holdsLicence(snapshot, 'A')],
    CT2: [holdsLicence(snapshot, 'B')],
    CT3: [
      holdsLicence(snapshot, 'C'),
      holdsGrade(snapshot, 'CT2'),
      jumpCountRequirement(snapshot.totalJumps, 300),
      jumpCountRequirement(snapshot.jumpsInLast12Months, 100, '100 jumps in the last 12 months'),
    ],
    FS1: [holdsLicence(snapshot, 'A')],
    FF1: [holdsGrade(snapshot, 'FS1')],
    CF1: [
      holdsLicence(snapshot, 'B'),
      jumpCountRequirement(snapshot.totalJumps, 100),
      jumpCountRequirement(snapshot.jumpsInLast2Months, 5, '5 jumps in the last 2 months'),
    ],
    TR1: [holdsLicence(snapshot, 'B'), holdsGrade(snapshot, 'FS1')],
  }

  return (Object.keys(prerequisites) as GradeCode[]).map((grade) => ({
    code: grade,
    name: GRADE_NAMES[grade],
    achieved: snapshot.grades.includes(grade),
    requirements: prerequisites[grade],
  }))
}

/** Unmet or unknown requirements, in route order, for "what's left" summaries. */
export function outstandingRequirements(target: ProgressionTarget): Requirement[] {
  return target.requirements.filter((requirement) => requirement.met !== true)
}
