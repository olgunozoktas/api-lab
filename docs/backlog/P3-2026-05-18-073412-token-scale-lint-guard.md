# Token-scale lint guard — prevent raw `text-[Npx]` from creeping back

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-18-064049-token-scale-migration.md`
(shipped 2026-05-18). That slice migrated 175 raw `text-[9/10/11/12px]`
values across 51 files onto the named `@theme` scale (`text-4xs/3xs/2xs`
+ the default `text-xs`). The acceptance grep
(`grep -r 'text-\[[0-9]' frontend/src/components`) returned clean.

But nothing *keeps* it clean. A new component — or a careless edit —
can reintroduce `text-[10px]` tomorrow and no check will catch it. The
migration's value erodes the moment the scale stops being enforced.
The project already has the right rails: `scripts/check-bundle-size.sh`
and a pre-commit hook wired by `scripts/install-hooks.sh` (zig fmt +
prettier). A token-scale guard belongs in the same place.

## Items

- [ ] Add `scripts/check-token-scale.sh` — fails (exit 1) if
      `grep -rE 'text-\[[0-9]' frontend/src/components` finds any hit.
      Allow an opt-out comment marker for genuinely off-scale cases
      (mirror the `App.tsx` `text-[13px]` documented-exception pattern).
- [ ] Wire it into the pre-commit hook (`scripts/install-hooks.sh`)
      alongside the existing zig-fmt + prettier checks.
- [ ] Optionally also guard arbitrary spacing (`p-[Npx]` etc.) and
      arbitrary non-token colours, if cheap to add in the same script.
- [ ] Document the guard + the exception-marker convention in
      `frontend/CLAUDE.md` or the main `CLAUDE.md`.

## Acceptance

A committed `scripts/check-token-scale.sh` that fails on any
undocumented raw `text-[Npx]` in components; the pre-commit hook runs
it; reintroducing a raw value is blocked at commit time.

## Tradeoffs

A grep-based guard is coarse (no AST) but cheap and matches the
project's existing `check-bundle-size.sh` style — good enough to hold
the line. The exception marker keeps deliberate off-scale values
(`App.tsx`'s 13px base) from tripping it.

## How to work on this

1. Model the script on `scripts/check-bundle-size.sh` — same
   `::error::` output convention, exit-1-on-violation shape.
2. The exception marker can be a simple inline comment the script
   greps for on the same or preceding line (e.g. `token-scale-ok`).
3. Keep it in the pre-commit hook, not just CI — fast feedback.
