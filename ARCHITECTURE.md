# Architecture

This document explains how `skydive-log` is structured and why. It is the authoritative reference for design decisions; the [`adr/`](adr/) directory holds the dated decision records that feed into it.

If you only have five minutes, read sections 1 and 2.

---

## 1. Principles

The architecture serves four goals, in roughly this order of priority:

1. **Extensibility under provider churn.** Free tiers expire, student status lapses, APIs deprecate. Every external dependency is reachable behind an interface so a replacement is a one-file change, not a rewrite.
2. **Multi-user readiness from day one.** The app deploys single-user, but no code in the repository assumes a single user exists. The day the contact form gets used and a friend wants in, the only changes are a sign-up route and a feature flag.
3. **Type safety end-to-end.** TypeScript strict mode, Drizzle's inferred types from schema to query, Zod schemas at every untrusted boundary. The compiler is the first reviewer.
4. **Production-grade habits even at one user.** Structured logging, error tracking, automated tests, CI, ADRs. The point is to learn habits that scale; the cost at small scale is small.

## 2. The big picture

The codebase is organised in four concentric layers, with imports allowed only inward:

```
┌─────────────────────────────────────────────────────┐
│  app/  components/                                  │   ← Next.js routes, React UI
│      ↓ uses                                         │
│  ports/                                             │   ← Interfaces (contracts)
│      ↑ implements                                   │
│  adapters/                                          │   ← Gemini, R2, Entra, Drizzle...
│      ↑ uses                                         │
│  domain/                                            │   ← Pure business logic
└─────────────────────────────────────────────────────┘
```

- **`domain/`** holds entities (`Jump`, `Tag`, `Equipment`, `DropZone`), value objects (`Altitude`, `FreefallDuration`), and pure functions encoding rules (currency calculation, British Skydiving progression requirements). It imports from nothing except itself and the standard library.
- **`ports/`** holds TypeScript interfaces describing what the domain and app need from the outside world: an `OcrProvider`, a `JumpRepository`, an `AuthProvider`, a `StorageProvider`, a `NotificationProvider`.
- **`adapters/`** holds concrete implementations of those interfaces. There is typically one production adapter per port (`adapters/ocr/gemini.ts`, `adapters/db/drizzle-postgres.ts`) and one test double (`adapters/ocr/in-memory.ts`).
- **`app/`** and **`components/`** are the Next.js routes and React UI. They consume `ports/` via a composition root and never import from `adapters/` directly.

This is the ports-and-adapters (a.k.a. hexagonal) pattern. It is the single most important architectural decision in this repo. See [`adr/0001-ports-and-adapters.md`](adr/0001-ports-and-adapters.md).

## 3. Data model

The relational schema centres on `jumps`, which sits at the heart of a small star:

```
                    users
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   equipment       jumps         drop_zones
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   jump_tags      jump_partners   jump_photos
       │
     tags
```

Notable design choices:

- **Every user-owned row has `user_id`.** No exceptions. This is enforced by a Biome rule on the schema files and by a runtime assertion in the base repository.
- **`jumps` is append-mostly.** Edits are allowed (handwritten logbooks have errors too), but every jump has `created_at`, `updated_at`, and a soft-delete `archived_at`. Hard deletes are admin-only and out of scope.
- **`tags` are user-owned.** A canonical seed set is inserted on first login per user, but users can rename, delete, and add freely. Code never references tags by numeric ID; always by `canonical_key` (e.g. `aff-1`, `fs-1`).
- **`jump_partners` references other users by `user_id` if they exist on the platform, otherwise stores a free-text name.** This is how the multi-user-ready model handles the "I jumped with a friend who isn't on the app" case.
- **Photos are stored in object storage, not the database.** The `jump_photos` table holds R2 keys and metadata; bytes live in R2.

The full schema is in `src/adapters/db/schema.ts` and is the source of truth — Drizzle generates types from it.

## 4. The OCR pipeline

OCR is the most novel part of the application. The pipeline runs in three stages:

```
[ image upload ]
       │
       ▼
[ OcrProvider.extractJumpsFromImage ]   ← adapters/ocr/gemini.ts
       │  returns JumpDraft[]
       ▼
[ Review screen ]                        ← app/(app)/jumps/import/review
       │  user edits, accepts, rejects
       ▼
[ JumpRepository.bulkInsert ]            ← adapters/db/...
       │  validates against domain rules
       ▼
[ Jump records committed ]
```

Three constraints:

1. The `OcrProvider` interface returns `JumpDraft[]`. Drafts are partial and possibly invalid — they have nullable fields and free-text discipline/tag suggestions.
2. The review screen is the trust boundary. No code path commits a `Jump` without it (or an explicit manual-entry server action). This is enforced by type discipline: `JumpRepository.bulkInsert` accepts `Jump`, not `JumpDraft`.
3. The original photo is always retained alongside the committed jumps. The user can re-OCR a page later with a better model and reconcile differences.

Swap path: a `claude.ts` or `azure-doc-ai.ts` adapter implementing `OcrProvider` is the only addition needed to change providers. Env var `OCR_PROVIDER` selects the active one.

## 5. Authentication

Auth is handled by [Auth.js](https://authjs.dev) with the Microsoft Entra ID provider, against an App Registration in the maintainer's personal Azure tenant.

Flow:

1. User visits a route under `app/(app)/`. Middleware checks for a valid session cookie.
2. If absent, redirect to `/login`. The login button kicks off the OIDC authorization-code-with-PKCE flow.
3. Entra authenticates the user and redirects back to `/api/auth/callback/microsoft-entra-id` with an authorization code.
4. Auth.js exchanges the code for tokens and creates a session.
5. On first sign-in, a `users` row is created and seeded with the default tag set.

While the app is single-user, the Entra App Registration is restricted to one tenant and one user object ID via a server-side allowlist (`AUTH_ALLOWED_USER_IDS` env var). Removing this allowlist is the one change required to open the app to multi-user.

Why Entra: it's the dominant enterprise identity provider, the OIDC implementation is standard, and the credentials transfer cleanly to any future job in a Microsoft-shop environment. [`adr/0002-entra-id-for-auth.md`](adr/0002-entra-id-for-auth.md) records the full reasoning.

## 6. Storage layout

R2 (or any S3-compatible bucket) holds two kinds of objects:

```
users/{userId}/logbook-pages/{uploadId}.jpg       ← raw scanned pages
users/{userId}/jumps/{jumpId}/{photoId}.jpg       ← per-jump cropped photos & gear pics
```

All paths are user-scoped. Signed URLs are generated server-side with short TTLs; clients never get bucket-wide credentials. The `StorageProvider` interface abstracts presigning, so swapping to Azure Blob is one adapter.

## 7. Observability

- **Logging.** All server-side logging goes through `src/lib/log.ts`, which wraps Pino. Logs are JSON-structured with request ID, user ID (when available), and a level. `console.log` is banned by lint rule.
- **Error tracking.** Sentry captures unhandled errors on both server and client. Source maps are uploaded on each deploy.
- **Metrics.** Postponed to v2. The free tier of Better Stack or Axiom will be the target.

## 8. Deployment

The default path is Vercel. The CI workflow in `.github/workflows/` builds, typechecks, lints, tests, and (on `main`) deploys. Database migrations run as a separate, manually triggered workflow against the production DB — never automatically on deploy.

Two alternative deployments are kept current in case the primary host needs to change:

- **Cloudflare Pages** via the `wrangler` adapter. No credit-card-required free tier.
- **Azure Static Web Apps** via the official GitHub Action. Pairs naturally with Entra ID and uses available Azure credits.

Switching hosts requires: updating env vars in the new provider, pointing DNS at the new endpoint, and disabling the old workflow. No code changes.

## 9. What's deliberately not here

A few decisions worth recording as *not yet*:

- **No microservices.** A monolith is correct at this size. Splitting it would be premature.
- **No GraphQL.** Server Actions and a small REST surface cover the access patterns.
- **No mobile app.** The web app is responsive; a wrapper is v3+ work.
- **No real-time features.** No WebSockets, no SSE. There's no collaborative editing model that requires them.
- **No payments.** This is a personal app. If multi-user ever ships, billing is a separate ADR.

## 10. Decision records

The `adr/` directory holds Architecture Decision Records — short markdown files capturing significant decisions, their context, and their consequences. The format is loosely based on Michael Nygard's template.

Current ADRs:

- [0001 — Ports and adapters architecture](adr/0001-ports-and-adapters.md)
- [0002 — Microsoft Entra ID for authentication](adr/0002-entra-id-for-auth.md)

Add a new ADR whenever a decision is non-obvious, expensive to reverse, or one a future maintainer (or a future you) might second-guess.
