# Update README with the current Vite + dnpm build flow

Created: 2026-05-09 07:04:00
Refined: 2026-05-16 08:20:00
Priority: **P3** (Docs-only; public-repo onboarding hygiene — no feature impact, but a stale README actively misleads anyone who clones api-lab)
GitHub Issue: [#6](https://github.com/olgunozoktas/api-lab/issues/6)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-09 07:04:00.

The README still documents the old "just run `zig build`" path from
before the frontend moved to Vite + React. That path no longer works:
`zig build run` no longer shells out to host `npm`, so it fails with a
`WebViewSource.assets` runtime error unless `frontend/dist/` was
already populated.

Refinement note — the original capture suggested documenting the raw
`cd frontend && dnpm install && dnpm run build && dnpm sync-dist`
sequence. Since then, `./build.sh` has become the canonical build
entry point (it sequences the frontend + Zig build, kills any running
instance, wipes the WebKit asset cache, and launches). The README
should lead with `./build.sh`, not the manual sequence — the manual
steps belong as underlying detail only.

This repo is public (https://github.com/olgunozoktas/api-lab), so the
README is the project's front door for every new clone.

## Items

- [x] **Rewrite the README build section around `./build.sh`.** Document
  the real flow: clone `api-lab` and `zero-native` as siblings, then
  `./build.sh` to build + launch. Cover the useful flags (`--no-run`,
  `--release`, `--frontend-only`, `--zig-only`, `--reset-state`).
  Remove the obsolete standalone `zig build` instructions, or demote
  them to a clearly-labelled "advanced / manual" subsection that notes
  `frontend/dist/` must be populated first. Touchpoints: `README.md`.
  Verify by following the steps verbatim on a fresh clone.
  *(Done — README "Quick start" leads with `./build.sh`, covers every
  flag, and has a "Why the build flow is one script" section. The
  obsolete `zig build run` path is documented as not-shelling-to-npm.)*
- [x] **Add a "Why `dnpm` / why the build is sandboxed" explainer.**
  A short section explaining that all Node/npm work runs in a hardened
  Docker container (supply-chain defense), with a link to
  `frontend/CLAUDE.md` for the full policy rather than duplicating it.
  Mention the `dnpm setup` first-run step for fresh clones.
  *(Done — README's frontend-builder list (preferred/alternative/last-
  resort) links to `frontend/CLAUDE.md`, the "How `./build.sh` picks
  its frontend builder" section explains the hardening, and the
  preferred bullet now names `dnpm setup` as the first-run step.)*
  Touchpoints: `README.md`.

## Acceptance

A fresh clone of `api-lab` (plus a sibling `zero-native`) can follow
the README top-to-bottom and reach a running app. The README no
longer mentions a build path that fails. The `dnpm` sandbox policy is
discoverable from the README in one hop.

## Tradeoffs & risks

- Docs drift — the README can re-rot as the build flow evolves.
  Mitigate by treating `CLAUDE.md`'s "Common commands" as the source
  of truth and keeping the README's command list short + linked,
  rather than an exhaustive duplicate.
- No feature or behaviour risk — docs-only change.

## How to work on this

Edit `README.md`. Cross-check every command against `CLAUDE.md`'s
"Common commands" section and `frontend/CLAUDE.md`'s `dnpm` policy so
the README never contradicts them. Validate by doing a genuine fresh
clone into a scratch directory, cloning `zero-native` alongside it,
and running the documented steps start to finish — the README passes
only if that produces a running API Lab window. No app code changes;
nothing to test or build beyond the manual clone walkthrough.
