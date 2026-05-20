# Filesystem-write bridge to enable "open docs in browser"

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-17-215552-open-in-system-browser-bridge.md`
(shipped 2026-05-21 as v0.16.4). That slice added the `shell.open`
bridge AND wired it as a global external-link interceptor — every
`<a target="_blank" href="https?://...">` in the app now opens the
URL in the system default browser.

The parent's K.3 acceptance criterion ("exporting the Redoc docs
opens the rendered page in the system default browser") wasn't met,
because `shell.open` accepts only `http(s)://` URLs by design. To
hand the OS a rendered HTML page, we need to:

1. Write the bundle HTML to a known location under
   `~/Library/Caches/API Lab/exports/` (sandbox-friendly, auto-
   purgable, never user-visible).
2. Allow `shell.open` to accept `file://` URLs whose path is under
   that cache root (and ONLY that root — no path traversal).
3. Wire the Export HTML button to: write file → `shell.open` it.

## Items

- [x] Add a `shell.writeTempFile` bridge command — accepts
      `{name, contents, contentType}`, writes to
      `~/Library/Caches/API Lab/exports/<random>/<name>`, returns the
      absolute path. Bounds: name must be a plain basename (no
      slashes, no `..`); contents capped at 8 MB.
- [x] Extend `shell.open` to accept `file://` URLs whose canonical
      path starts with the cache-exports root. Reject everything
      else with the existing `invalid_url_scheme` error.
- [x] Wire `frontend/src/components/OpenApiEditor.tsx` `exportDocs()`
      to call `shell.writeTempFile(buildRedocHtml(...))` then
      `shell.open(file://<path>)`. Fall back to the current
      `downloadTextFile` path when the bridge is unavailable
      (browser-mode dev).
- [x] Test the cache-root containment check (file://path traversal
      attempts get rejected).

## Acceptance

Clicking Export HTML in the OpenAPI editor's docs view opens the
rendered Redoc page directly in the system browser, with no
intermediate download step.

## Tradeoffs

- Cache files accumulate over time. Either truncate the exports
  subtree on app start (simplest), or stamp each file with creation
  time and prune entries older than 7 days. Start with truncate-on-
  start; nobody expects a docs export to persist between sessions.
- `file://` URLs are typically reachable only by the same origin in
  modern browsers. macOS `open file://...` hands the path to the
  user's default browser via `LaunchServices`, which then resolves
  the path via the filesystem (not via origin). So a Safari open
  Just Works; a Chrome open works because Chrome trusts the OS-
  invoked URL load.

## How to work on this

1. Mirror `src/handlers/shell.zig` structure — extend with a
   `writeTempFile` invoke.
2. The `app_dirs.resolveOne(.cache, ...)` primitive from
   zero-native gives the canonical cache root; build the exports
   subdir under that.
3. Strengthen `isAllowedUrl` to allow `file://` only if
   `realpath(file_path)` is under the exports cache root. Don't
   trust the input path — resolve, then containment-check.

## Reference

- Parent: `docs/backlog/done/P3-2026-05-17-215552-open-in-system-browser-bridge.md`
- Existing handler: `src/handlers/shell.zig`
