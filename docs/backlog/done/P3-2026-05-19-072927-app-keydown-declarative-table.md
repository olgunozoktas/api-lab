# App.tsx keydown handler — declarative table keyed by lib/shortcuts.ts

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-18-143720-shortcut-map-single-source.md`
(shipped 2026-05-19). That slice made `lib/shortcuts.ts` the canonical
shortcut map: the Settings list renders from it and a drift test locks
the guide markdown to it. But one direction is still unenforced — the
*actual key bindings*.

`App.tsx`'s global keydown handler is an imperative `if (e.key === …)`
chain (`Enter` / `.` / `s` / `n` / `t` / `w` / `p` `k` / `l` / `b` /
`1`-`9` / `⌥→←`), and the `*_shortcut.ts` hooks bind `,` / `⇧E` / `?`.
None of them reference `SHORTCUTS`, so a developer can add a new
binding to the handler and never add it to the data module — the drift
test won't catch it, and the shortcut ships undocumented. That's the
exact failure mode the parent slice set out to kill, just from the
other side.

## Items

- [x] Give each `Shortcut` in `lib/shortcuts.ts` a stable `id` and an
      optional declarative match descriptor (`{ key, meta?, shift?,
      alt? }`) where the binding is a simple key+modifier combo.
- [x] Convert `App.tsx`'s keydown chain to dispatch off that table:
      look the event up by descriptor, run the mapped action. Keep
      bespoke handling (tab-jump `1`-`9` ranges, `⌥⌘→/←` cycling) as
      explicit cases, but driven by the same table so the entry's
      existence is the source of truth.
- [x] Extend `shortcuts.test.ts` to assert the binding direction:
      every descriptor in the table is reachable, and no handler case
      exists without a table entry.

## Acceptance

A new keyboard binding cannot ship without a `lib/shortcuts.ts` entry —
the build fails if `App.tsx` (or a `*_shortcut.ts` hook) binds a combo
the data module doesn't list. Drift is now impossible in both
directions: data ↔ guide (done) and data ↔ bindings (this item).

## Tradeoffs

Some bindings aren't a clean key+modifier match — tab-jump is a
numeric range, tab-cycle is arrow-key directional. Forcing every
binding into one descriptor shape would bloat the type; better to let
the descriptor be optional and have those cases stay explicit but
still keyed by a table `id`. Don't over-abstract the handler.

## How to work on this

Start in `lib/shortcuts.ts` (add `id` + optional descriptor), then
`App.tsx`'s `onKey` handler, then the `*_shortcut.ts` hooks, then the
test. `dnpm run test` + `dnpm run typecheck` + `dnpm run build`. Ship
via `/backlog-ship docs/backlog/P3-2026-05-19-072927-app-keydown-declarative-table.md`.
