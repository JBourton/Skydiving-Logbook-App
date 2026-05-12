# CLAUDE.md

Guidance for Claude (Anthropic) when working in this repository, whether via Claude Code, Antigravity's Claude mode, the Claude API, or any other surface.

**Start by reading [`AGENTS.md`](AGENTS.md).** Everything in that file applies to you. The notes below are Claude-specific additions.

---

## How the maintainer prefers to work with Claude

- **Plan before you act.** For any task larger than a one-line fix, propose a brief plan (numbered steps, files you intend to touch) and wait for confirmation. In Antigravity, prefer Plan mode over Fast mode for anything touching `src/domain/`, `src/ports/`, or the database schema.
- **Small, reviewable diffs.** Prefer multiple small commits over one large one. Each commit should pass `pnpm typecheck && pnpm lint && pnpm test`.
- **Show your work.** When you make a non-obvious choice, leave a short comment explaining why — not what — at the top of the change.
- **Honest uncertainty.** If you don't know how something in this codebase works, say so and read the relevant file. Don't guess at conventions.

## Repository quirks worth knowing

- **The `domain` layer is allergic to frameworks.** It's tempting to `import { z } from 'zod'` in there because validation feels domain-ish. Don't — domain types are hand-written. Zod schemas live in adapter or app boundaries where input crosses into the system.
- **`Jump` vs `JumpDraft`.** A `Jump` is a committed, validated, persisted record. A `JumpDraft` is OCR output or user form state — partial, possibly invalid. They are distinct types in `src/domain/jump.ts`. Conflating them is the single most common bug.
- **British Skydiving terminology is canonical.** Use the spellings `freefall` (one word), `canopy`, `discipline`, `hop & pop`, `BS A licence` (not "license"). The progression module uses BS terms; do not Americanise.
- **Tags are user-editable, but a seed set exists.** When testing, do not assume the seed IDs are stable — query by `canonicalKey` (e.g. `'aff-1'`, `'fs-1'`, `'fun-jump'`).
- **The OCR review screen is the trust boundary.** No code path writes a `Jump` to the DB without it having passed through the review screen (or an authenticated server action that explicitly bypasses for manual entry).

## Tool use guidance

- **Reading before writing.** When asked to modify a file you have not read in the current session, read it first. Do not edit blind.
- **Run commands you propose.** If you suggest a `pnpm` command, run it (where the environment allows) and report the result. Don't propose commands and trust they'll work.
- **Migration commands are dangerous.** Do not run `pnpm db:migrate` against any database with real data without explicit confirmation in the current turn. `pnpm db:generate` (which only writes a migration file) is fine.
- **Browser automation (Antigravity).** Useful for verifying the OCR review UX and the dashboard rendering. Always take a screenshot artifact for the maintainer to review.

## Style preferences

- **Comments:** sparing. The code should explain itself. Comments explain *why*, not *what*.
- **Function length:** prefer ~30 lines or less. Split when it grows.
- **Naming:** verbose over clever. `currencyExpiryDateForDiscipline` over `expiry`.
- **Error handling:** never swallow errors silently. If something cannot reasonably be recovered, propagate; the logger and Sentry will handle it. `try { ... } catch {}` is forbidden without a comment justifying it.
- **Tests:** describe behaviour, not implementation. `describe('jump currency')`, `it('expires after 90 days of no jumping for non-licensed jumpers')`. Avoid testing private functions directly.

## What I (the maintainer) am learning

Context useful for tutoring-style explanations alongside code:

- This project is partly a learning vehicle for production-grade auth (OIDC, Entra ID), observability, and cloud-native architecture. When you make a non-trivial choice, a short *why* comment in chat is welcome.
- I'm an active skydiver going for the British Skydiving B licence area. If domain logic about progressions, currency, or BS rules looks wrong, say so — I will know.
- I use Antigravity IDE as my primary editor for this project. If your suggestion depends on a specific IDE feature, mention it.

## When you finish a task

End with:

1. A one-line summary of what changed.
2. Any files touched (path list).
3. Test status: `pnpm typecheck`, `pnpm lint`, `pnpm test` results.
4. Anything you noticed but didn't fix (tech debt, follow-ups).

That's it. Welcome aboard.
