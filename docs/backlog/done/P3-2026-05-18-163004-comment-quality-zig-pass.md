# Comment-quality pass — Zig native shell (`src/`)

Priority: P3

## Context

Follow-up to `docs/backlog/P3-2026-05-18-163004-comment-quality-why-pass.md`.
That item was user-scoped to `frontend/src/` and shipped — the
TypeScript half of the comment-quality pass is done. This item is the
remaining half: the **Zig native shell** under `src/` (~20 `.zig`
files — the WKWebView host, bridge handlers, asset serving).

Same goal: comments should carry the *why* — rationale, gotchas,
non-obvious decisions — not restate what the code does. The Zig side
is gotcha-dense and benefits the most: the `http.request` ~1 MB
result-buffer cap, the brace-balanced JSON splitter in
`grpc_messages.zig`, the Zig 0.16 std-API shifts (documented in
`CLAUDE.md`'s "Hard gotchas"), the WKWebView null-origin / inline-HTML
size quirks.

## Items

- [x] **Audit `src/` `.zig` files** — sweep the native shell +
      handlers for echo-the-code comments; replace with a *why* or
      cut. Confirm every file opens with a purpose line beyond the
      `// Olgun Özoktaş geliştirdi · API Lab` attribution.
- [x] **Make the known gotchas explicit** — where the code relies on
      a Zig-0.16 API quirk, a buffer cap, or a WKWebView behaviour,
      ensure there's a comment naming it (cross-reference `CLAUDE.md`
      rather than duplicating the whole note).

## Acceptance

Every `.zig` file under `src/` opens with a purpose comment; the
buffer-cap / brace-balancing / Zig-0.16 gotchas each carry an
explaining comment at their site. `zig build test` is byte-for-byte
unaffected (comments only).

## Tradeoffs

Comments-only — no behaviour change. The TS pass found comment
quality already high (zero echo comments); the Zig side is likely
similar, so this is mostly a file-header sweep plus a few gotcha
notes. Small.

## How to work on this

The TS pass (parent file, shipped) is the template — audit, then add
purpose headers + missing-why notes. Zig file header convention is
`// Olgun Özoktaş geliştirdi · API Lab` (line comment, not `/** */`).
Verify with `zig build test`. Ship via
`/backlog-ship docs/backlog/P3-2026-05-18-163004-comment-quality-zig-pass.md`.
