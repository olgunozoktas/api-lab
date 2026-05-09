# Plan: gRPC unary via grpcurl bridge

For: docs/backlog/P1-2026-05-09-170600-grpc-unary-via-grpcurl-bridge.md
Mode: inline (Path 3C — no gstack /plan-eng-review on this project,
architecture is well-grounded by the existing http.zig pattern)

## Architecture

Mirror `src/handlers/http.zig` exactly. The skill ships the handler
in three pure layers + one I/O entry:

1. **`grpc.zig`** — `Context { gpa, io, env_map }`, `handler(ctx)`
   factory returning a `bridge.Handler`, `invoke()` adapter, and
   `runRequest()` orchestrator.
2. **Pure helpers (testable)**:
   - `buildArgv(allocator, GrpcRequest) ![]const []const u8` — assembles the
     `grpcurl …` argv. Pure, no I/O. This is what the unit test suite hits.
   - `parseVerboseStderr(stderr) -> { headers, trailers, status, status_msg }`
     — extracts `Response headers received:`, `Response trailers received:`,
     and the trailing `ERROR:` block from `grpcurl -vv` output. Best-effort
     line-tokenizer; bad input never panics, just yields empty headers.
   - `formatResponse(...)` / `formatTransportError(...)` — JSON encoders
     mirroring http.zig.
3. **`runRequest`** — `std.process.run(ctx.gpa, ctx.io, .{argv, …})`,
   parses stdout (response message JSON) + stderr (verbose metadata),
   builds the `{status, message, headers, trailers, durationMs}` JSON
   into the fixed `output: []u8` buffer.
4. **Wire-up in `main.zig`** — declare a `grpc_handler.Context`,
   register `grpc_handler.handler(&grpc_ctx)` in `handler_list`, and
   add `{ .name = "grpc.invoke", .permissions = &.{"network"},
   .origins = &allowed_origins }` to `command_policies`. Same shape
   as the existing `http.request` entry.

### grpcurl invocation shape

```
grpcurl
  -format json
  -format-error
  [-plaintext]
  [-vv]                       # always — needed for headers/trailers
  [-max-time <seconds>]
  [-rpc-header 'name: value']  # repeated for each metadata entry
  [-import-path <dir>]         # repeated; only when useReflection=false
  [-proto <file>]              # repeated; only when useReflection=false
  -d '<message-json>'
  <target>                      # "host:port" — extracted from grpc(s)://host:port
  <fullMethod>                  # "package.Service/Method"
```

### Frontend mode-swap

Parallels the existing `wsMode` swap in `App.tsx` (line 149–177):

```ts
const grpcMode = isGrpcUrl(envSubst(current.url, vars));
// ...
{wsMode ? <WsPanelContainer /> : grpcMode ? <GrpcPanelContainer /> : <RequestComposerContainer />}
```

`isGrpcUrl` lives in `frontend/src/lib/grpc.ts`, returns true for
URLs starting with `grpc://` or `grpcs://` (case-insensitive).
Plaintext is auto-derived from the scheme: `grpc://` → plaintext=true,
`grpcs://` → plaintext=false.

### GrpcPanel composer + viewer

Single component file, presenter + container split (project hard rule
1: props over store access). Container reads `current.grpc` from the
Zustand store, manages local request lifecycle (running flag + last
response), and renders the presenter.

Layout: top toolbar (Send button, status pill, duration) + tabs
(Message / Metadata / Proto) for the request side, bottom panel for
the response (Message / Headers / Trailers / Raw).

The composer tabs:
- **Message** — JSON editor (textarea for v1, no Monaco).
- **Metadata** — KV table (reuses `frontend/src/components/KvTable.tsx`
  if it exists; otherwise inline implementation matching the existing
  Params/Headers tables).
- **Proto** — Reflection toggle + import-path list + .proto file list
  (text inputs for v1; native file picker via `<input type=file>` is
  speculative because WKWebView's file URL access is constrained —
  defer the picker, accept paste-paths in v1).

The viewer tabs:
- **Message** — pretty-printed response JSON (reuse the highlight
  helper from `frontend/src/lib/highlight.ts` if present).
- **Headers** / **Trailers** — KV display of `headers[]` / `trailers[]`.
- **Raw** — combined view (request argv + raw stderr) for debugging.

Status pill shows the gRPC status code (`OK`, `NotFound`, `Unavailable`, …)
with color tone (green for OK, red otherwise).

## Touchpoints (input to Step 4 reuse-auditor)

Order matters — each touchpoint maps to a verdict:

1. **Zig handler module** — does any prior handler module exist that
   already wraps a subprocess for a network protocol? (Expected:
   `src/handlers/http.zig` — REUSE its shape; CREATE new file
   `src/handlers/grpc.zig`.)
2. **Bridge command registration in `src/main.zig`** — extend
   `handler_list` + `command_policies`. (Expected: EXTEND.)
3. **Bridge handler test pattern** — does the project have
   `src/handlers/<name>_test.zig` style? (Expected: REUSE pattern from
   `http_test.zig`.)
4. **Frontend bridge wrapper types** — does `frontend/src/lib/bridge.ts`
   already export typed request/response shapes? (Expected: EXTEND
   with GrpcRequest / GrpcResponse types.)
5. **URL-scheme helper** — does the project have `isWsUrl(...)` or
   similar? (Expected: REUSE pattern from `frontend/src/lib/ws.ts`,
   CREATE new `frontend/src/lib/grpc.ts`.)
6. **Mode-swap in `App.tsx`** — does `wsMode` style swap exist?
   (Expected: EXTEND `App.tsx` to add `grpcMode`.)
7. **Composer + viewer panel component** — does a `WsPanel` exist that
   shows the presenter+container split for protocol-specific UIs?
   (Expected: REUSE pattern from `frontend/src/components/WsPanel.tsx`,
   CREATE new `frontend/src/components/GrpcPanel.tsx`.)
8. **Store shape extension** — does `current.url` already exist?
   Where does `current.body` / `current.headers` live? (Expected:
   EXTEND the `current` slice with `current.grpc` block.)
9. **KV table component** — for the metadata UI. (Expected: REUSE
   if a generic `KvTable` exists; otherwise inline like Params tab.)
10. **i18n catalogue** — `frontend/src/lib/i18n/tr.ts` must gain
    `grpc.*` keys; `en.ts` must mirror. (Expected: EXTEND both.)
11. **JSON highlight helper** — for response message pretty-printing.
    (Expected: REUSE `frontend/src/lib/highlight.ts` if present.)
12. **Tab strip / response tab UI** — does ResponseViewer already have
    a tabbed layout? (Expected: REUSE pattern, but GrpcPanel renders
    its own tabs since the response shape differs.)
13. **Dependency-detection error path** — when grpcurl is missing,
    surface the install hint. (Expected: CREATE — return a structured
    `{error: "grpcurl_missing"}` from the handler, render a hint card
    in GrpcPanel viewer when this error is seen.)

## Edge cases

- **grpcurl not on PATH** — `std.process.run` returns
  `error.FileNotFound`. Map to `{error: "grpcurl_missing", install_hint: "brew install grpcurl"}`.
- **target with explicit `:port`** vs **target without port** — grpcurl
  defaults to 50051 if not specified; pass through whatever the user typed.
- **`grpc://` vs `grpcs://`** — auto-derive `-plaintext` flag; user
  toggle in UI overrides.
- **Reflection disabled + no proto files** — grpcurl errors out; we
  surface the error verbatim (don't try to be clever).
- **Empty message body** — pass `{}` not `null` (grpcurl rejects empty
  -d).
- **Metadata with non-ASCII values** — `-rpc-header 'name: value'`
  will accept what we pass; users responsible for valid headers.
  (Same as http.zig's header pass-through.)
- **Output buffer overflow** — gRPC responses can be large; output
  buffer in the bridge dispatch is fixed-size. http.zig caps stdout
  at 8 MB; we'll do the same. Larger responses → `{error: "response_too_large"}`.
- **Verbose stderr missing expected sections** — if grpcurl's output
  format changes between versions, the parser must degrade gracefully
  (return empty headers/trailers, not panic).
- **Cancellation** — v1 doesn't support cancel; the request runs to
  completion or timeout. Streaming (J.2) will need this.

## Test plan

Mirror `src/handlers/http_test.zig` — single `grpc_test.zig` file,
imported via `test { _ = @import("grpc_test.zig"); }` block in
`grpc.zig`. Unit-only (no live network). Cover:

**buildArgv**:
- Default request (target + fullMethod) emits core flags
  (`-format json`, `-format-error`, `-vv`, `-max-time`, target, method).
- `plaintext: true` adds `-plaintext`; `false` omits it.
- `metadata` entries become `-rpc-header 'name: value'` pairs.
- `useReflection: false` adds `-import-path X -proto Y` for each entry;
  `true` (default) omits both.
- `message: ""` becomes `-d {}` (sentinel).
- `message: '{"k":1}'` becomes `-d {"k":1}`.
- `timeoutMs: 30000` becomes `-max-time 30`.
- Empty metadata array → no `-rpc-header` flags.

**parseVerboseStderr**:
- Headers + trailers blocks parse to `[{name,value}]` arrays.
- Missing blocks return empty arrays (not error).
- ERROR block extracts `Code:` + `Message:`.
- "Sent 1 request and received 1 response" → status OK fallback when
  no ERROR block.

**formatError / formatTransportError**:
- Same shape as http.zig — exit_code, stderr, error.

**Frontend tests (vitest)**:
- `isGrpcUrl("grpc://x:50051")` → true
- `isGrpcUrl("grpcs://x:443")` → true
- `isGrpcUrl("https://x")` → false
- `isGrpcUrl("")` → false
- `derivePlaintext("grpc://x")` → true
- `derivePlaintext("grpcs://x")` → false
- (target + fullMethod extraction helpers if we add them)

## Risks + rollback

- **Risk**: grpcurl output format brittleness — `-vv` is human-readable,
  not machine-stable across grpcurl versions. **Mitigation**: parser
  is defensive (returns empty rather than crashing); RAW tab in viewer
  always shows the unparsed stderr so users can debug.
- **Risk**: bundle-size impact from new components. **Mitigation**:
  GrpcPanel is one file, ~250 LOC target. No new dependencies (reuse
  existing UI primitives + cn + i18n).
- **Risk**: store shape drift breaks IDB persistence (one-shot migration
  doesn't know about `current.grpc`). **Mitigation**: add `current.grpc`
  with sane defaults; any old persisted state hydrates with undefined
  for the new field, which we fill in with defaults at read time.
- **Rollback**: revert the slice's commits; the `grpc.invoke` bridge
  command becomes orphan (handler unregistered) but no live state
  depends on it. UI code is dead-code-eliminated by Vite when no
  components import it.
