# Native "open in system browser" bridge

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-171700-spec-to-docs-redoc-preview.md`
(shipped 2026-05-18 as v0.11.0). K.3's item 4 asked to "write a
self-contained HTML to a temp file + open the system browser". api-lab
has no filesystem-write or open-browser bridge, so it shipped as an
**Export HTML download** instead — the user opens the file themselves.

CEO + Eng lens (both agree): a native `shell.open` bridge command —
"open this URL / file in the OS default browser" — closes the gap for
the docs export AND is a reusable capability (open a request's URL
externally, open a generated report, open docs links). It's a small,
well-bounded Zig handler.

## Items

- [x] Add a `shell.open` bridge command — `src/handlers/shell.zig`
      shelling out to `open` (macOS) with a URL or file path.
- [x] Register the command + policy in `src/main.zig` (a new
      `shell` permission, or reuse an existing one — decide at impl).
- [x] `frontend/src/lib/bridge.ts` wrapper + wire the docs **Export
      HTML** flow to optionally open the result instead of (or after)
      downloading.

## Acceptance

Exporting the Redoc docs opens the rendered page in the system
default browser.

## Tradeoffs

- Shelling `open` with an arbitrary path is a capability worth
  gating — restrict to `https?:` URLs and files under the app's own
  temp/cache directory; never an arbitrary path from JS.
- Writing the temp file needs a filesystem-write handler too — scope
  that into this item or keep "export = download" as the fallback.

## How to work on this

1. Mirror the existing handler pattern (`src/handlers/http.zig` —
   Context struct + factory + `invoke_fn`).
2. `std.process.run` with `open <url>` on macOS; gate the input.
