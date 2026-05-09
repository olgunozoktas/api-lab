# Phase J — gRPC TLS / mTLS (cacert + client cert + servername)

Priority: P2

## Context

Follow-up to `docs/backlog/done/P1-2026-05-09-170600-grpc-unary-via-grpcurl-bridge.md`.
The unary slice supports `grpc://` (plaintext) and `grpcs://` (TLS
with system trust roots) but does NOT expose:

- Custom CA certs (`-cacert`) — required for self-signed dev
  servers, internal corp PKIs, staging environments with non-public
  certs.
- Client certs / mTLS (`-cert` + `-key`) — required for many
  production gRPC services (financial, regulated, internal-only
  APIs that authenticate via mTLS instead of bearer tokens).
- TLS server name (`-servername`) — required when the gRPC server's
  certificate doesn't match the connection target's hostname (load
  balancer + virtual hosts).
- Authority override (`-authority`) — required for some gRPC
  proxies / sidecars.

Without these, API Lab can't test any gRPC service running with
non-default TLS posture, which is a large fraction of internal /
B2B / regulated industry use cases.

## Items

- [ ] Extend `GrpcState` in `frontend/src/lib/types.ts` with a `tls`
      sub-shape: `{ caCert?: string, clientCert?: string, clientKey?: string, serverName?: string, authority?: string }`.
      All optional (string content, not file path — pasted by user
      since WKWebView file pickers are constrained per CLAUDE.md
      gotchas).
- [ ] New "TLS" tab in the GrpcPanel composer (alongside Message /
      Metadata / Proto). Reuses the existing CodeEditor for cert
      pastes (PEM-encoded, single CodeEditor each).
- [ ] Bridge: extend `GrpcRequest` in `src/handlers/grpc.zig` with
      optional cacert/cert/key/servername/authority fields. Write
      pasted PEM contents to a temp file (mkdtemp + write + cleanup
      after grpcurl exits) so grpcurl's `-cacert` / `-cert` / `-key`
      flags can reference them. tmpdir lifecycle is the trickiest
      part — prefer arena-allocated paths cleaned up at end of
      runRequest.
- [ ] Tests: argv shape with each TLS option; tmpfile lifecycle
      (file created → grpcurl invoked → file deleted regardless of
      grpcurl exit code, even on error).

## Acceptance

User points at an internal gRPC server with self-signed cert, pastes
the CA bundle + client cert/key, sees a successful response. Without
the certs, the same call fails with `transport: x509: certificate
signed by unknown authority` — visible in the error display.

## Tradeoffs

Pasted PEM in localStorage / IndexedDB is not great for security —
client keys especially are sensitive. Options:

- **A. Pasted PEM in IDB (current pattern)** — matches how OAuth
  tokens are stored today. Imperfect but consistent. Document the
  caveat in the TLS tab UI.
- **B. macOS Keychain via Security.framework** — same blocker as
  the OAuth Keychain follow-up. Defer to that landing first; reuse
  the same bridge primitive.

v1 of this slice should ship Option A (matches existing patterns)
and add a small note in the UI: "Client keys are stored in browser
storage. Use a separate dev/test cert, not your production key."
Option B comes for free once the Keychain bridge ships.

## How to work on this

1. Read `src/handlers/grpc.zig` for the bridge command + tmpfile
   pattern (none yet — this slice introduces it).
2. Read `~/Herd/zero-native/src/primitives/app_dirs/root.zig` for
   the canonical tmp-dir resolver.
3. Reference: grpcurl docs at https://github.com/fullstorydev/grpcurl#tls
   for flag semantics.
4. Test against a self-signed local server: `openssl req -newkey
   rsa:2048 -nodes -keyout server.key -x509 -days 365 -out server.crt`
   then run a small Go gRPC test server with it.
