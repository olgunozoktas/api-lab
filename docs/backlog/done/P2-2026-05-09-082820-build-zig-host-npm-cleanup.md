# Refactor build.zig — remove host-`npm` shellouts

GitHub Issue: [#24](https://github.com/olgunozoktas/api-lab/issues/24)

Priority: P2

## Context

Follow-up to `docs/backlog/P2-2026-05-09-070300-tests-ci.md` (Phase F — Tests + CI/CD; landed 2026-05-09). Surfaced during Step 8 ultrathink: `build.zig:99` and `build.zig:103` shell out to host `npm` directly, which violates the dnpm-only policy in `frontend/CLAUDE.md` ("All npm/Node.js commands MUST run through dnpm. NEVER run npm, npx, yarn, pnpm, or node directly on the host").

```zig
// build.zig:99
const frontend_install = b.addSystemCommand(&.{ "npm", "install", "--prefix", "frontend" });
// build.zig:103
const frontend_build = b.addSystemCommand(&.{ "npm", "--prefix", "frontend", "run", "build" });
```

These steps are reachable via `zig build run` (the `run` step depends on `frontend-build`, which depends on `frontend-install`). Anyone who runs `zig build run` on a fresh checkout triggers a host-npm install — exactly the supply-chain attack vector the dnpm policy is designed to close.

The dnpm flow is the documented path for frontend work (`cd frontend && dnpm setup`, `dnpm run dev`, `dnpm run build`). The `frontend-install` and `frontend-build` zig steps are unused in practice — the README documents `cd frontend && dnpm run build` as the build flow.

A second, smaller concern in the same file: `default_zero_native_path = "../zero-native"` (line 31) breaks under git worktrees that are one level deeper than the primary checkout (e.g. `../api-lab-wt/<slug>/`). The Phase F worktree had to be patched with a manual `ln -s ~/Herd/zero-native ~/Herd/api-lab-wt/zero-native` symlink. Either auto-discover the sibling via `git rev-parse --show-toplevel`, accept the per-worktree symlink as documented friction, or surface a friendlier error message.

## Items

- [ ] Decide: remove the `frontend-install`/`frontend-build` zig steps entirely (force users to `dnpm run build` separately), OR route them through a host-side wrapper that calls `dnpm` (so `zig build run` orchestrates the full flow without violating policy).
- [ ] Update `run`, `dev`, and `package` steps so they no longer depend on the npm-shellout steps (or depend on the new dnpm-routed equivalents).
- [ ] Update README.md and CLAUDE.md so the documented build flow matches the new behaviour.
- [ ] Address `default_zero_native_path` worktree fragility: either (a) auto-discover by walking up to the git toplevel and looking for a sibling `zero-native/`, (b) accept the per-worktree symlink and document it in CLAUDE.md, or (c) emit a clearer panic when the path doesn't exist with a concrete fix command.
- [ ] If a wrapper script is introduced, add it to the pre-commit hook's awareness so formatting/linting runs in the same shape.

## Acceptance

`zig build run` works on a fresh checkout without invoking host `npm`. Either the npm-shellout steps are gone OR they're routed through `dnpm`. CI's `zig-tests` and `release.yml` flows still work without modification (or the workflow updates land in the same PR).

`zig build test -Dzero-native-path=../zero-native` works from any worktree of arbitrary depth, with no manual symlink.

## Tradeoffs

- **Removing the steps entirely** is simplest but slightly worse DX — devs must remember to `dnpm run build` before `zig build run`. README can mitigate.
- **Routing through dnpm** keeps single-command DX but couples the zig build to the dnpm install state.
- **For the zero-native path**: auto-discovery is nice but adds runtime complexity to `build.zig`. The symlink workaround is one-line per worktree and arguably the cheapest option.

## How to work on this

1. Audit the actual call graph — which steps depend on `frontend-install` / `frontend-build`. May only be `run` and `package`.
2. If routing through dnpm, write a tiny `scripts/build-frontend.sh` that calls `dnpm run build` and produces a status file. The zig step shells to that script.
3. Do the worktree-path fix as a separate slice if it's non-trivial.
