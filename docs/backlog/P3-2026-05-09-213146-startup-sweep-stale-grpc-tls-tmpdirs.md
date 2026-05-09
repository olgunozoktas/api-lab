# Startup sweep — clean stale /tmp/api-lab-grpc-* dirs on app launch

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-194146-grpc-tls-tmpfile-permissions-0700-0600.md`
(shipped 2026-05-09). The just-landed slice locks the per-request
PEM tmp directory to 0o700 with each PEM at 0o600. Cleanup is via
`defer cleanupTlsTmpfiles(io, prep.tmpdir_path)` so the dir is
removed on every normal exit (success / error / panic).

The gap: if the api-lab process is force-killed mid-call (kill -9,
crash, OS reaper, OOM), the `defer` doesn't fire and the tmp dir
leaks. The PEM files are still 0o600 / dir is 0o700 (locked to the
user), so the leak is benign in security terms — but it accumulates
over time. After enough crashes, `/tmp` has hundreds of empty
`api-lab-grpc-<hex>/` dirs.

The fix: at app startup, sweep `/tmp/api-lab-grpc-*` and delete any
dir whose mtime is older than 1 hour. The 1-hour window avoids
killing in-flight calls from a parallel api-lab process (rare but
possible during dev — two builds running side-by-side).

## Items

- [ ] Add a `sweepStaleTlsDirs(io)` function in `src/handlers/grpc_tls.zig`
      (or a new `src/lib/tmpfiles.zig` if a sibling caller appears).
      Iterates `/tmp` for entries matching `api-lab-grpc-*`, stats each
      one's mtime, deletes via `deleteTree` if older than 1 hour.
- [ ] Wire from `main.zig` startup — fire-and-forget call before the
      WebView mounts. Errors swallowed (sweep failures must never
      block app launch).
- [ ] Test: create a `/tmp/api-lab-grpc-deadbeef/` dir, set its mtime
      via `utimes` to 2 hours ago, run sweep, assert it's gone. Also
      assert that a fresh dir (just-created) survives.
- [ ] Update `cleanupTlsTmpfiles` doc-comment to point at the sweep
      function so future readers know about the orphan story.

## Acceptance

After 100 simulated force-kills mid-call, `ls /tmp/api-lab-grpc-* |
wc -l` is 0 within 1 hour of next app launch. No live calls are
disrupted by the sweep (TTL is much longer than typical call
duration).

## Tradeoffs

The 1-hour TTL is a guess — too short and parallel api-lab builds
race; too long and orphans linger past `/tmp` retention windows
(macOS reboots clear `/tmp` anyway, so the worst case is 1 hour of
clutter before reboot).

Linux-style `O_TMPFILE` would eliminate the orphan story entirely
(files vanish when the FD closes, even on crash) but macOS doesn't
implement it. Out of scope.

## How to work on this

1. Read the current `prepareTlsTmpfiles` / `cleanupTlsTmpfiles` for
   the prefix convention.
2. `std.Io.Dir.cwd().openDir(io, "/tmp", .{ .iterate = true })` plus
   `dir.iterator()` is the entry-listing path. Match basename starts-
   with `"api-lab-grpc-"`.
3. Stat each candidate via `dir.statFile(io, name, .{})` — check
   `stat.mtime` against `std.time.timestamp() - 3600`. Delete via
   `dir.deleteTree(io, name)`.
4. Wire from `src/main.zig` — early in `main()`, just after the
   bridge handlers register. Don't await; don't fail the launch.
