# Skydiving Logbook App

An interactive digital skydiving logbook. Scan handwritten logbook pages, review extracted data, save securely and explore your jumping history through a dashboard built for skydivers.

> **Status:** early development. Single-user by default; designed for multi-user from day one.

---

## Overview

`skydive-log` is a personal logbook application built around three ideas:

1. **OCR-first ingest.** Photograph a logbook page; an LLM-based vision pipeline extracts each jump into structured fields. Every extracted jump goes through a side-by-side human review screen before it's committed.
2. **A dashboard worth opening.** Currency tracking, rolling totals, progression toward British Skydiving licences and discipline tickets, a year-in-review experience, and personal-best surfacing. Beta features (drop-zone globe, jump-partner graph, weather correlations) live in their own zone so the core stays polished.
3. **Production-grade by construction.** Ports-and-adapters architecture, every external dependency swappable, multi-user-ready schema from the first migration, type-safe end-to-end.

This is also a portfolio project: the auth, observability, and infrastructure choices are deliberately industry-relevant.

## Features

### Implemented

- _(none yet — initial scaffold in progress)_

### Planned for v1

- Manual jump entry, editing, deletion
- Photo upload → Gemini-powered field extraction → review screen → commit
- Tag system (progression, discipline, event, role, equipment)
- Filters and search across the logbook
- Equipment inventory with per-item jump history
- Currency tracking with per-discipline countdowns
- Heatmap calendar (GitHub-style activity grid)
- Cumulative and rolling totals (30/90/365-day windows)
- British Skydiving progression tracker (A → D licence, FS1, FF1, CP1, CF1)
- Personal-best dashboard
- JSON export endpoint for backup and portability

### Planned for v2 / beta

- Drop-zone map (globe with pins sized by jump count)
- Jump-partner network graph
- Weather snapshot at jump time
- Spotify-Wrapped-style year-in-review
- BS-format PDF export for licence applications
- iCalendar feed for currency-expiry reminders

## Tech stack

| Layer           | Choice                               | Swap target                                       |
| --------------- | ------------------------------------ | ------------------------------------------------- |
| Framework       | Next.js 15 (App Router) + TypeScript | SvelteKit, Remix                                  |
| Styling         | Tailwind CSS v4 + shadcn/ui          | —                                                 |
| Auth            | Microsoft Entra ID via Auth.js       | Auth0, Clerk, Google OIDC                         |
| Database        | PostgreSQL (Neon) via Drizzle ORM    | Supabase, Azure PG, self-hosted                   |
| Object storage  | Cloudflare R2 (S3-compatible)        | Azure Blob, Backblaze B2, MinIO                   |
| OCR             | Google Gemini 2.5 Flash              | Claude Sonnet vision, Azure Document Intelligence |
| Secrets         | Doppler                              | provider env vars                                 |
| Errors          | Sentry                               | —                                                 |
| Hosting         | Vercel (Hobby)                       | Cloudflare Pages, Azure Static Web Apps           |
| Package manager | pnpm                                 | —                                                 |
| Tests           | Vitest + Playwright                  | —                                                 |
| Lint/format     | Biome                                | ESLint + Prettier                                 |

Every row in the right-hand column is reachable via a single adapter swap — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Prerequisites

- Node.js 22 LTS or newer
- pnpm 9+
- A Neon project (or any PostgreSQL 15+ instance)
- A Microsoft Entra ID tenant with an App Registration (free)
- A Google AI Studio API key (free tier is fine)
- A Cloudflare R2 bucket (or any S3-compatible bucket)
- Optional: Doppler CLI for local secrets

## Getting started

```bash
git clone https://github.com/<you>/skydive-log.git
cd skydive-log
pnpm install

# Copy env template and fill in
cp .env.example .env.local

# Run database migrations against your local/Neon DB
pnpm db:migrate

# Start dev server
pnpm dev
```

Open <http://localhost:3000>. Sign in with your Entra ID account.

## Scripts

| Command            | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Next.js dev server with hot reload               |
| `pnpm build`       | Production build                                 |
| `pnpm start`       | Run the production build                         |
| `pnpm typecheck`   | TypeScript no-emit check across the repo         |
| `pnpm lint`        | Biome lint                                       |
| `pnpm format`      | Biome format-write                               |
| `pnpm test`        | Vitest unit tests                                |
| `pnpm test:e2e`    | Playwright end-to-end tests                      |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate`  | Apply pending migrations                         |
| `pnpm db:studio`   | Open Drizzle Studio (DB inspector)               |

## Project structure

```
src/
  domain/           # Pure business logic — entities, rules, no I/O
  ports/            # Interfaces describing what the domain needs
  adapters/         # Concrete implementations of ports
  app/              # Next.js routes (App Router)
  components/       # React UI components
  lib/              # Shared utilities
docs/
  ARCHITECTURE.md   # Deep architectural overview
  adr/              # Architecture Decision Records
  runbooks/         # Operational playbooks
.github/            # CI workflows, issue/PR templates
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the rationale behind this layout.

## Deployment

Default deployment target is Vercel (free Hobby tier). The repo also ships a Cloudflare Pages config and an Azure Static Web Apps workflow in `.github/workflows/` — picking a different host is a configuration change, not a rewrite.

Environment variables required in production are documented in [`.env.example`](./.env.example).

## Roadmap

Public progress tracker lives in [GitHub Issues](../../issues) and the [project board](../../projects). High-level direction is in [`docs/ROADMAP.md`](docs/ROADMAP.md) (to be created).

## Contributing

This is a single-developer project for now, but it's structured to accept contributions later. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow.

If you're an AI coding assistant, read [`AGENTS.md`](AGENTS.md) first.

## Security

To report a vulnerability, see [`SECURITY.md`](SECURITY.md).

## Licence

TBD. The project will be source-available; the licence file will be added before any third-party contribution is accepted.

## Acknowledgements

- British Skydiving for the progression frameworks the app encodes
- The open-source community behind every package in `package.json`
