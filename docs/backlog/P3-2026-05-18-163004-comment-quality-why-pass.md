# Comment-quality pass — make comments carry the *why*

GitHub Issue: [#42](https://github.com/olgunozoktas/api-lab/issues/42)

Priority: P3

## Context

User request (2026-05-18). Many comments across the codebase narrate
*what* the code does — restating the line below them — rather than
the *why*: the rationale, the gotcha avoided, the non-obvious
decision, the constraint that forced this shape. The example the user
flagged was a Zig test-file header:

```
// Unit tests for `handlers/grpc_messages.zig` — the brace-balanced
// JSON splitter that breaks grpcurl stdout into individual messages.
```

That header is *fine* — but it's the ceiling, not the floor. The goal
of this pass: every load-bearing comment should tell the next reader
something the code itself can't. Comments that only echo the code get
cut; comments that should exist but don't get written.

The codebase already has strong examples to calibrate against — the
`current.ts` / `tabs.ts` loader comments, the Zig 0.16 gotcha notes
in `CLAUDE.md`, the `responseCache.ts` header. This pass brings the
rest up to that bar.

## Items

- [ ] **Audit `frontend/src/`** — sweep components, `lib/`, `store/`
      for comments that restate the code. Replace each with a *why*
      (rationale / gotcha / constraint) or delete it if there's
      nothing non-obvious to say.
- [ ] **Audit `src/` (Zig)** — same sweep over the native shell +
      handlers; the bridge / curl / grpc handlers especially have
      gotchas (buffer caps, brace-balancing, Zig 0.16 API shifts)
      worth making explicit.
- [ ] **File-header comments** — every `src/` and `frontend/src/`
      file should open with one or two lines stating what the file is
      *for* and any cross-file contract it participates in — not just
      the `/** Olgun Özoktaş geliştirdi · API Lab */` attribution.
- [ ] **No behaviour change** — comments only. If a comment can't be
      written truthfully without first understanding murky code, note
      that file as a candidate for a separate clarity refactor.

## Acceptance

A reader new to a file learns something from its comments that the
code alone wouldn't tell them. No comment merely paraphrases the
statement beneath it. Tests, typecheck, and build are unaffected
(comments-only diff).

## Tradeoffs

Comment edits are low-risk but high-volume — a big diff that's
tedious to review. Consider doing it per-area (one slice for
`store/`, one for `components/`, one for Zig) rather than one
mega-commit. Resist the urge to "fix the code while I'm here" — that
turns a safe comment pass into a risky refactor; note such files
instead and let them get their own backlog item.

## How to work on this

Pure documentation pass — no logic changes. Work area by area so the
diff stays reviewable. Calibrate against the existing good examples
(`store/loadRequest.ts`, `store/responseCache.ts`, the `CLAUDE.md`
gotcha sections). After each area: `cd frontend && dnpm run typecheck`
+ `dnpm run test` and `zig build test` should be byte-for-byte
unaffected (comments only). Ship via
`/backlog-ship docs/backlog/P3-2026-05-18-163004-comment-quality-why-pass.md`.
