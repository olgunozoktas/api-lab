# Add Testing + CI section to README.md

GitHub Issue: [#25](https://github.com/olgunozoktas/api-lab/issues/25)

Priority: P3

## Context

Follow-up to `docs/backlog/P2-2026-05-09-070300-tests-ci.md` (Phase F — Tests + CI/CD; landed 2026-05-09). Phase F shipped Zig + Vitest unit suites, two GH Actions workflows, pre-commit hooks, and a bundle-size guardrail — but README.md has zero mention of any of this. Anyone landing on the repo can't see the testing posture, can't tell at a glance whether the build is green, and can't tell which commands to run.

CEO lens: README is the front door. CI green-badge + a "Testing" section signals "this project is maintained" before anyone reads the code. Five-minute polish, real reputation effect. Eng lens: when contributors land, they need to know `dnpm run test`, `zig build test`, `bash scripts/install-hooks.sh` without spelunking. Lowering that friction lifts contribution quality.

## Items

- [ ] Add CI status badge (`![CI](https://github.com/olgunozoktas/api-lab/actions/workflows/ci.yml/badge.svg)`) at the top of README, near the title.
- [ ] New "Testing" section covering:
  - `zig build test` — Zig handler unit tests (19 tests in `src/handlers/http_test.zig`)
  - `dnpm run test` — frontend Vitest suite (25 tests in `frontend/src/lib/__tests__/`)
  - `dnpm run typecheck` — TypeScript strict check
  - `dnpm run format:check` — Prettier check (read-only — `--write` is incompatible with dnpm's RO mount; document the workaround if needed)
  - `bash scripts/install-hooks.sh` — install pre-commit hooks via `core.hooksPath`
- [ ] New "CI/CD" section briefly describing:
  - Push/PR to `main` → `ci.yml` runs Zig tests on macOS + frontend tests on Linux + bundle-size guardrail
  - Tag push (`v*`) → `release.yml` builds macOS arm64 + x86_64 and creates a draft release
- [ ] Cross-link the bundle-size thresholds (`scripts/check-bundle-size.sh` header comment) so contributors know the rule before bumping.

## Acceptance

README opens with a CI badge. Both new sections are present, link to the relevant scripts/files, and use the dnpm-respecting command forms throughout. No host-`npm`/`npx` references in any new content.

## Tradeoffs

- Keep it tight — one screen of additions max. If a contributor wants more detail, they can read CLAUDE.md.
- Don't try to document every threshold or every script — link to the source.

## How to work on this

Direct edit on `main` (single-file doc change), no worktree needed. Or land via `/backlog-ship` if you want the review-gate discipline. Both are reasonable.
