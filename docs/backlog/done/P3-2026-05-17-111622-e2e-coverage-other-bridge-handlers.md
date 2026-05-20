# E2E follow-up — extend coverage to grpc / mock / git.sync handlers

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-082819-e2e-zero-native-automation.md`
(shipped 2026-05-17 in `feat/e2e-zero-native-automation`). That slice
landed `scripts/e2e/run.sh` — an E2E harness that drives the app via
zero-native's automation protocol and asserts a bridge response. It
currently covers exactly one command: `http.request` (happy + error).

CEO + Eng lens (both agree): api-lab now registers eight other bridge
commands with **no E2E coverage** —
`grpc.invoke`, `grpc.reflect.list`, `grpc.reflect.skeleton`,
`mock.start`, `mock.stop`, `mock.list`,
`git.sync.status`, `git.sync.read` (and the network-dependent
`git.sync.setup/pull/push/resolve`). Each is an integration seam the
unit tests deliberately skip. The harness's `run_case <name> <json>`
rig already generalizes per command, so adding a case is cheap — the
marginal cost is a fixture, not new infrastructure.

## Items

- [x] Add a `mock.list` E2E case — asserts the handler is reachable
      and the list is empty on a fresh process. The full
      start → list → stop cycle can't span launches (mocks live in
      process memory; each launch starts with `ctx.servers` empty),
      so the per-process state guarantee IS the assertion.
- [x] Add a `git.sync.status` E2E case (shape check only — the
      developer's actual `~/.api-lab/git-sync/` state may be
      configured, so asserting on the value would be brittle; the
      `"configured":` key presence catches "handler registered but
      throws on invoke" regressions). A throwaway-repo variant
      could pin the value side; deferred since the value-side
      behaviour stays unit-tested.
- [x] `grpc.reflect.*` case deferred — local gRPC reflection
      fixtures need a real gRPC server (grpcurl talks the wire
      protocol, not a mock). Standing one up under CI adds
      cross-platform pain that exceeds the marginal value of a
      handler-reachable assertion; the case is queued as a
      follow-up if a `grpcurl` fixture appears in CI for other
      reasons.
- [x] Suite kept tight — 4 cases total (2 http.request, 1 mock,
      1 git.sync). Each adds ~3s of macOS CI time (a fresh app
      launch).

## Acceptance

The E2E harness covers at least `mock.*` and `git.sync.status` in
addition to `http.request`. All cases green in the macOS CI job
within the existing 25-minute budget.

## Tradeoffs

- **App-launch-per-case cost.** The harness re-launches the app per
  case (the WebView host does not tick frames when idle, so commands
  must be pre-seeded before launch). Each new case adds one app
  launch (~1-2s). Fine for a handful; if the suite grows past ~10
  cases, the right fix is upstream — a zero-native idle frame pump or
  a multi-command protocol.
- gRPC / git-remote handlers need fixtures or network; scope each to
  the offline-deterministic subset and document deferrals.

## How to work on this

1. Reuse the `run_case` rig in `scripts/e2e/run.sh` — no new harness.
2. One fixture per handler under `scripts/e2e/fixtures/`.
