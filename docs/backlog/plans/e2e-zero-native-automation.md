# Plan — E2E via zero-native automation hooks

For: `docs/backlog/P2-2026-05-09-082819-e2e-zero-native-automation.md`

## Research findings (Items 1 + 2)

zero-native's automation surface is a **file-based protocol** under
`.zig-cache/zero-native-automation/`:

- Driver writes `command.txt` — one line: `reload`, `wait`, or
  `bridge <json>`.
- The app (built `-Dautomation=true`) consumes `command.txt` each
  frame (`Runtime.consumeAutomationCommand`), writes back `done\n`,
  and publishes `snapshot.txt` (`ready=true frame=N …`),
  `accessibility.txt`, `windows.txt`.
- A `bridge` command is dispatched via `handleBridgeMessage` with a
  synthesized origin `zero://inline`; the response is written to
  `bridge-response.txt` (`Runtime.completeBridgeResponse`).

Two findings that collapse the implementation cost:

1. **api-lab already wires the automation server** —
   `src/runner.zig` sets `.automation = if (build_options.automation)
   …Server.init(…)` on every platform path. No Zig runtime changes
   are required.
2. **`zero://inline` is already in api-lab's `allowed_origins`** — so
   a `bridge` automation command carrying `http.request` passes the
   policy check and runs the real handler → curl subprocess → JSON
   response. The full Zig integration seam is exercisable today.

**Test runner decision (Item 2):** a standalone shell harness driving
the file protocol directly — the same approach zero-native uses for
its own `test-webview-smoke` step. Rejected: Playwright (WKWebView
automation is flaky and the file protocol is the supported path); a
separate Zig driver binary (the protocol is plain files — shell is
enough).

## Scope boundary (Items 3 + 4)

The automation snapshot exposes **window-level state only** (title,
bounds, focus, a11y nodes at window granularity) — there is **no DOM
introspection**. Asserting "the response renders in the Body tab" is
not possible with zero-native today.

Decision (user-approved): the E2E asserts the **`http.request` bridge
response** in `bridge-response.txt` — a genuine end-to-end of the
process → runtime → automation server → bridge dispatch → policy →
handler → curl → JSON-artifact path. The DOM-rendering assertion is
deferred to a P3 follow-up (needs zero-native upstream to grow DOM
introspection).

## Architecture

- `scripts/e2e/run.sh` — the harness. Builds `frontend/dist` if
  missing, builds `zig build -Dautomation=true -Djs-bridge=true`,
  starts a local fixture HTTP server, launches the app, drives a
  happy-path + error-path `http.request`, asserts `bridge-response.txt`.
- `scripts/e2e/fixtures/serve.py` — binds port 0, writes the chosen
  port to a file, serves the fixture dir.
- `scripts/e2e/fixtures/hello.json` — the happy-path response body.
- No `build.zig` step — `build.zig` is already 443 lines (over the
  400-line cap); adding to it would force a refactor. The harness
  stays standalone shell, invoked directly by CI.

## CI

Extend the **existing** macOS `zig-tests` job in
`.github/workflows/ci.yml` with frontend-build + E2E steps — no
second macOS runner (macOS minutes are 10× Linux; the Tradeoffs
section asks to keep the suite tight).

## Edge cases / risks

- App must reach `ready=true` — harness polls `snapshot.txt` with a
  timeout and fails loudly if it never does.
- `bridge-response.txt` persists between commands — harness `rm`s it
  before each send.
- The app is a real AppKit window; harness backgrounds it and kills
  it on `trap EXIT`. Proven viable by zero-native's own smoke step.
- Error-path determinism — uses a port that was bound then closed, so
  the connection is guaranteed refused (curl exit 7).

## Verification

`bash scripts/e2e/run.sh` green locally + in CI; both cases fail the
script (and the workflow) on a bad response.
