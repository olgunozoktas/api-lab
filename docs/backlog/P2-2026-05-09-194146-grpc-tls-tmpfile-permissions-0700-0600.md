# gRPC TLS tmpfile permissions — chmod 0o700 dir / 0o600 PEMs

Priority: P2

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-154501-grpc-tls-mtls-cacert-cert-key.md`
(shipped 2026-05-09). The Step 8 Eng Manager pass flagged this as concrete
security debt left on the table.

The TLS slice writes pasted PEM contents (CA cert, client cert, **client
key**) to `/tmp/api-lab-grpc-<8 hex>/` for grpcurl to consume via
`-cacert` / `-cert` / `-key`. Cleanup happens via `defer` so files exist
for ~milliseconds-to-seconds (the grpcurl call duration). During that
window, with the current `Dir.createDirPath` + `Dir.writeFile` defaults,
the dir lands at 0o755 and files at the umask default (typically 0o644).

A local attacker — same-machine UID, malware running as the user, a
stale `lsof` watcher, etc. — could read the client key during the call.
Same threat model as cookies/tokens in localStorage, but unlike a
session token, the client key is harder to rotate.

The mitigation is mechanical: explicitly chmod 0o700 on the dir at
creation, 0o600 on each file. Zig 0.16's `Dir.createDirPath` doesn't
accept a mode parameter directly (recursive create); we likely need to
chmod via `posix.chmod` after the fact, or use `Dir.makeDir(io, path,
.{ .mode = 0o700 })` if the API supports it.

## Items

- [ ] Add explicit chmod 0o700 to the tmpdir created in
      `prepareTlsTmpfiles` (research the right Zig 0.16 API:
      `posix.chmod`, `Dir.chmod`, or a mode arg on the create call).
- [ ] Add explicit chmod 0o600 to each PEM file written via
      `Dir.writeFile`. Apply post-write since `WriteFileOptions.flags`
      is a `CreateFileOptions` and may not expose mode bits.
- [ ] Test: `prepareTlsTmpfiles` writes a PEM, then `stat` the file via
      `Dir.statFile` to assert mode bits land at 0o600 (and dir 0o700).
- [ ] Add a one-line note in the TLS tab security warning that the
      tmp files are protected to the current user only.

## Acceptance

`stat /tmp/api-lab-grpc-<hex>/client.key` shows `-rw-------` (0o600)
during a gRPC call; `stat /tmp/api-lab-grpc-<hex>` shows `drwx------`
(0o700). A second-user check (`sudo -u nobody cat ...`) returns
permission denied.

## Tradeoffs

Zig 0.16's filesystem mode-bit API may not be uniform — `Dir.makeDir`
might accept mode but `createDirPath` (recursive) might not. Worst case
we wrap with `posix.chmod` calls after creation, which has a small TOCTOU
window (file exists at default mode for microseconds before chmod). For
a meaningful local attacker that's still fine — they'd need precise
timing inside that window.

Alternative: use `O_TMPFILE` (Linux-only) to create a never-named file
then pipe via `/dev/fd/N`. macOS doesn't support `O_TMPFILE`. Out of
scope for v1.

## How to work on this

1. Read `src/handlers/grpc_tls.zig` for current write pattern.
2. Check `/opt/homebrew/Cellar/zig/0.16.0_1/lib/zig/std/Io/Dir.zig` for
   `makeDir` mode parameter (line ~1037 for `deleteDir`, find `makeDir`).
3. Extend `grpc_tls_test.zig` with a stat-based mode-bits assertion.
4. Tests must run cleanly on macOS — Linux-specific syscalls are out.
