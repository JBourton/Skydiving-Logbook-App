# AGENTS.md

Instructions for AI coding assistants working in this repository. This file is the canonical agent-guidance document; tool-specific files like `CLAUDE.md` extend or override what's here.

If you are a human reader: this is fine to skim, but the design rationale lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 1. What this project is

`skydive-log` is a private digital skydiving logbook with OCR-based ingest of handwritten logbook pages. It is single-user in deployment but built multi-user-ready at the data layer.

The README is the human entry point; this file is yours.

## 2. Hard rules

These cannot be relaxed without an explicit decision recorded as an ADR:

1. **Ports-and-adapters is non-negotiable.** Code in `src/domain/` must not import from `src/adapters/` or any framework module (`next`, `react`, Drizzle, etc.). Domain talks to the outside world only through interfaces in `src/ports/`.
2. **Every database row owned by a user has a `user_id` column.** Every repository method takes `userId` as a required parameter. Every route handler reads `userId` from the session — never from a query string, body, or header.
3. **No secret values in source.** Use environment variables, Doppler for local dev, hosting-provider env vars in production.
4. **TypeScript strict mode is on.** Do not add `// @ts-ignore`, `// @ts-expect-error`, or `any` to silence errors. If a type is genuinely unknown, model it as `unknown` and narrow.
5. **No `console.log` in committed code.** Use the structured logger in `src/lib/log.ts`.
6. **Never commit a migration without running it locally first.** Drizzle migrations are forward-only in production.

## 3. Conventions

- **Package manager:** pnpm. Do not introduce `npm` or `yarn` lockfiles.
- **Node version:** pinned via `.nvmrc` and `engines` in `package.json`. Don't change the major version without an ADR.
- **Imports:** absolute imports rooted at `~/` (aliased to `src/`). No `../../../`.
- **File naming:** `kebab-case.ts` for files, `PascalCase` for React components and their files (`JumpCard.tsx`), `camelCase` for functions and variables, `SCREAMING_SNAKE` only for env-var keys.
- **Routes:** Next.js App Router. Auth-required routes go under `src/app/(app)/`. Public routes (about, contact, login) go under `src/app/(marketing)/`.
- **Server actions** live next to the route that uses them in an `actions.ts` file. They always start with `'use server'`.
- **React components** are server components by default. Add `'use client'` only when interactivity demands it.
- **Styling:** Tailwind utilities only. No CSS modules, no styled-components. Reach for shadcn/ui primitives before hand-rolling.

## 4. Architectural constraints

### Where things go

| Concern | Location | Notes |
|---------|----------|-------|
| Business entities (Jump, Tag, Equipment) | `src/domain/` | Pure TS, no I/O |
| Validation rules, currency calculation, progression logic | `src/domain/` | Pure functions |
| Interface for OCR, storage, auth, DB | `src/ports/` | TS interfaces only |
| Gemini / R2 / Entra / Drizzle implementations | `src/adapters/` | One file per adapter |
| Composition root (wiring) | `src/lib/services.ts` | Reads env, picks adapters |
| React UI | `src/components/` | Server components by default |
| Routes / server actions | `src/app/` | Thin — delegate to domain |
| Shared utilities | `src/lib/` | Logger, env parser, etc. |
| Tests | colocated `*.test.ts` next to source | Vitest |

### Forbidden direction of imports

```
app/components  →  ports  →  domain
       ↓
   adapters  →  ports
```

`domain` never imports anything except other `domain`. `adapters` implement `ports`. `app` and `components` use `ports` via the composition root, never `adapters` directly.

### Multi-user-readiness

Even though only one user signs in today, write every query, route, and storage path as if there were a million users. Examples:

- DB: `SELECT * FROM jumps WHERE user_id = $1 AND id = $2` — never just `WHERE id = $2`.
- Storage: object keys are `users/{userId}/logbook/{jumpId}/{photo}` — never globally addressed.
- Caches: keyed by `userId` if they hold user data.

## 5. Commands you should run

Before claiming a task is done, run these and ensure they all pass:

```bash
pnpm typecheck   # TS errors
pnpm lint        # Biome
pnpm test        # Unit tests
```

For database schema changes:

```bash
pnpm db:generate
pnpm db:migrate
```

For e2e changes:

```bash
pnpm test:e2e
```

Never commit if `pnpm typecheck` fails.

## 6. Things agents commonly get wrong here

- **Bypassing the ports layer.** Tempting to `import { db } from '~/adapters/db/drizzle'` directly in a route. Don't. Go through the repository interface in `src/ports/`.
- **Forgetting `userId` on a new query.** Every new query method needs it. There is a Biome lint rule that flags repository methods missing it; do not disable it.
- **Adding a `console.log` "just for now".** Use the logger.
- **Treating OCR output as truth.** Extracted jumps are always `JumpDraft`, never `Jump`. They become `Jump` only after the human review screen commits them.
- **Hard-coding tag IDs.** Tags are user-editable. Read by name or by canonical key, never by numeric ID in code.
- **Writing tests that hit the network.** Use the test doubles in `src/adapters/*/test-double.ts`.

## 7. When to ask, when to act

**Act without asking** for:
- Adding a new test
- Fixing a typecheck or lint error
- Following an existing pattern to add a new field or route
- Writing or improving documentation

**Ask first** for:
- Anything that touches `src/ports/` (changes the contract)
- Schema changes (DB migrations)
- New external dependencies
- New environment variables
- Anything that bypasses the architectural rules in section 2

## 8. References

- [`README.md`](README.md) — project overview
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architectural rationale
- [`docs/adr/`](docs/adr/) — recorded decisions
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — human contribution workflow
