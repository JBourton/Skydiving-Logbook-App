# ADR 0001: Ports and Adapters Architecture

- **Status:** Accepted
- **Date:** 2026-05-12
- **Decider:** Project maintainer

## Context

`skydive-log` depends on several external services that are likely to change over the project's lifetime:

- **OCR provider.** Starting with Google Gemini 2.5 Flash (free tier). Candidates for the future include Anthropic Claude, OpenAI vision models, Azure Document Intelligence, and self-hosted alternatives. Choice depends on accuracy on handwriting, cost, and free-tier availability.
- **Database host.** Starting with Neon Postgres (free tier). Candidates: Supabase, Azure Database for PostgreSQL, self-hosted Postgres on a VPS.
- **Object storage.** Starting with Cloudflare R2. Candidates: Azure Blob, Backblaze B2, MinIO.
- **Identity provider.** Starting with Microsoft Entra ID. Candidates: Auth0, Clerk, Google OIDC.
- **Hosting.** Starting with Vercel. Candidates: Cloudflare Pages, Azure Static Web Apps.

The project is also a learning vehicle, and one of the explicit learning goals is exposure to architectural patterns common in production systems.

A naïve approach would import provider SDKs directly throughout the codebase, which produces tight coupling: changing OCR provider would require changes across many files; mocking the database in tests would require monkey-patching or environment-specific code paths.

## Decision

Adopt ports-and-adapters (a.k.a. hexagonal architecture) as the structural pattern.

Concretely:

- The codebase is organised into four layers: `domain/`, `ports/`, `adapters/`, and `app/` (+ `components/`).
- `domain/` holds pure business logic and may not import from any other layer or any third-party framework.
- `ports/` holds TypeScript interfaces describing what the application needs from the outside world.
- `adapters/` holds concrete implementations of those interfaces, one per external provider.
- `app/` and `components/` (the Next.js routes and React UI) consume ports via a composition root (`src/lib/services.ts`), never adapters directly.
- A Biome lint rule forbids imports from `adapters/` outside the composition root, and forbids imports from any non-domain module within `domain/`.

## Consequences

### Positive

- Swapping any external provider becomes a one-file addition (a new adapter) plus a configuration change. The expected cost of a provider migration is hours, not days.
- Testing is straightforward: every port has an in-memory test-double adapter used in unit tests.
- The pattern is widely recognised in industry, making the codebase legible to future contributors and useful as a portfolio reference.
- The boundary between "code that could exist in any application" (domain) and "code that exists because of our choices" (adapters) is explicit and policed.

### Negative

- More files and more indirection than a flat layout. For a project of this size, this is a deliberate cost paid up front to avoid a much larger cost later.
- Reading a code path requires jumping from `app/` to `ports/` to find the interface, then optionally to `adapters/` to find the implementation. Mitigated by IDE go-to-definition.
- Some developers will find the discipline of "no framework imports in domain" pedantic. The lint rule makes it non-negotiable.

### Neutral

- Adds approximately three folders to the top-level layout. This is small.

## Alternatives considered

- **Flat structure with provider SDKs imported directly.** Faster to start, painful to migrate. Rejected because provider churn is expected.
- **Repository pattern only (for the database) without applying the same pattern to OCR, auth, etc.** Inconsistent. If the discipline is worth having for one external dependency, it is worth having for all of them.
- **Clean Architecture with explicit use-cases as a separate layer.** Adds a `use-cases/` layer between ports and app. Rejected as over-engineering for a project of this size; Server Actions in `app/` serve the same role here.

## References

- Alistair Cockburn, *Hexagonal Architecture* (the original article).
- Rob Martin, *Clean Architecture* — adjacent, more elaborate version of the same idea.
- Hexagonal Architecture FAQ at [`alistaircockburn.com/Hexagonal+architecture`](https://alistaircockburn.com/Hexagonal+architecture).
