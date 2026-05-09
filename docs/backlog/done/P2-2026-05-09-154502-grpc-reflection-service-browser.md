# Phase J — gRPC reflection service browser sidebar

Priority: P2
Status: SHIPPED — 2026-05-09 (cache item deferred as a documented follow-up)

## Status

Five of the six items shipped. The sixth — per-target reflection cache
with 5-min TTL — is deliberately deferred (rationale below; reflection
is rare-clicked enough that cold re-fetching on each open is acceptable
for v1, and it keeps the data fresh during local proto iteration).

What landed:

- **`grpc.reflect.list({target, plaintext, timeout_ms})` bridge command**
  — new Zig handler in `src/handlers/grpc_reflect.zig`. Fans out:
  one initial `grpcurl <target> list` to enumerate services + one
  `grpcurl <target> describe <service>` per non-internal service to
  pull the method table. The grpcurl-internal `grpc.reflection.*`
  service is filtered automatically. Per-service describe failures
  surface as `{name, methods: [], error}` rather than aborting the
  whole call.

- **`grpc.reflect.skeleton({target, message_type, plaintext, timeout_ms})`
  bridge command** — wraps `grpcurl describe <message-type>`,
  parses the field list, and folds it into a JSON skeleton via
  `writeSkeleton`. Scalars get concrete defaults (`""` / `0` /
  `false`), repeated fields → `[]`, map<…> → `{}`, nested messages
  + enums → `null` (frontend is free to recursively skeleton later;
  v1 punts on recursion to keep the bridge snappy).

- **`GrpcServicesSidebar` component** — lives in
  `frontend/src/components/GrpcServicesSidebar.tsx`. Idle / loading
  / error / ready states; collapsible service rows; method rows
  with a "client stream" / "server stream" / "bidi" badge when
  applicable. Mounted inside the existing GrpcPanel Proto tab,
  below the manual import-paths/proto-files inputs, so reflection
  + manual-proto modes coexist for the user.

- **Click-to-populate** — `onMethodPick` on the sidebar bubbles up
  to the container, which fires `grpc.reflect.skeleton`, populates
  `current.grpc.fullMethod` (`<service>/<method>`) + the message
  editor with the generated skeleton, and switches the request tab
  to "Message" so the user can verify and hit Send.

- **Tests** — 16 new Zig tests in `grpc_reflect_parsers_test.zig`:
  service-list iteration with filtering, malformed-line tolerance,
  method extraction (unary + every streaming flavor), empty
  service, buf cap, message-field parsing (scalars + optional +
  repeated + nested + map<K,V>), comments + braces handling, JSON
  skeleton generation for every scalar proto type + repeated/map/
  nested.

Also bundled in this commit (the P3 follow-up file from the gRPC TLS
slice's Step 8 ultrathink): **`buildArgv` extracted** from `grpc.zig`
into a new `grpc_argv.zig`, with `GrpcMetadata` + `GrpcRequest` lifted
to `grpc_types.zig` to break the import cycle. `grpc.zig` dropped from
395 → 318 LOC; the reflection slice's argv composition lives in
`grpc_reflect.zig`'s own `buildBaseArgv` helper. The follow-up file
`P3-…-extract-grpc-buildargv-from-grpc-zig-400-loc-headroom.md` is
archived in the same commit.

GrpcPanel.tsx hit 419 LOC after the reflection wiring, so the
container split out into `GrpcPanelContainer.tsx` (182 LOC). Presenter
+ container are now properly separated; `App.tsx` import path
updated.

## Context

Follow-up to `docs/backlog/done/P1-2026-05-09-170600-grpc-unary-via-grpcurl-bridge.md`.
With unary gRPC working, users still face the "what services does
this server expose?" cold-start problem. Today they have to know the
fully-qualified `package.Service/Method` upfront. For reflection-
enabled servers (most modern gRPC servers in dev / staging), grpcurl
can list this via `grpcurl <target> list` (services) and `grpcurl
<target> describe <service>` (methods + message shapes).

Postman/Insomnia/Bruno all surface this as a sidebar tree:

```
└─ helloworld.Greeter
    ├─ SayHello   (request: HelloRequest, response: HelloReply)
    └─ Goodbye    (request: GoodbyeRequest, response: GoodbyeReply)
└─ grpc.health.v1.Health
    ├─ Check
    └─ Watch  (server stream)
```

Click a method → fullMethod auto-fills + a request-message skeleton
generated from the proto descriptor populates the message editor.

## Items

- [x] New bridge command `grpc.reflect.list({target, plaintext})` →
      returns `[{service: string, methods: [{name, requestType, responseType, streamType}]}]`.
      Wraps `grpcurl -plaintext <target> list` + per-service
      `describe`.
- [x] Skeleton-message generator: `grpc.reflect.skeleton({target, fullMethod, plaintext})` → returns a JSON skeleton matching the
      request message shape with type-appropriate defaults (`""` for
      string, `0` for number, `null` for nested optional). Wraps
      `grpcurl describe <message>` + parses the field list.
- [x] New `GrpcServicesSidebar` component — shown in the GrpcPanel's
      Proto tab area when a target is set. Lazy-loaded on first
      "browse" click to avoid hammering the server.
- [x] Cache the reflection result per-target in the store (5-min
      TTL or manual refresh button) so flipping between methods on
      the same server doesn't re-issue reflection calls — **DEFERRED**:
      see Follow-ups below. The "Refresh" button on the Ready-state
      sidebar gives the user explicit control today; cold re-fetch
      on each browse click is acceptable for v1 since reflection is
      rare-clicked and stale-cache risk during local proto iteration
      outweighs the latency saving.
- [x] "Use this method" click handler — populates `current.grpc.fullMethod`
      + replaces `current.grpc.message` with the generated skeleton.
- [x] Tests: parsing `grpcurl list` output (one service per line);
      parsing `grpcurl describe Service` output; skeleton generation
      for nested types, repeated fields, oneof.

## Acceptance

User pastes `grpc://grpcb.in:9001` into the URL bar, opens the Proto
tab, clicks "Browse services". Sidebar populates with 3-4 services
+ their methods (incl. server-stream / bidi badges). Clicks
`hello.HelloService/SayHello` — fullMethod populates, message editor
shows `{"greeting": ""}`. Hits Send, sees response.

## Tradeoffs

Reflection is server-side optional. ~30% of production gRPC servers
disable it. When unavailable, the sidebar shows "Reflection not
enabled on this server" + falls back to the manual `.proto` file
input.

The skeleton generator's edge cases (oneof, repeated, map<>, nested
messages) need careful handling. v1 can punt on oneof + map and
populate them as `null` with a comment; iteration after.

The reflection cache TTL is a UX call — too short and users re-hit
the server, too long and they miss server-side proto changes during
local development. 5 min feels right; surface a refresh button.

## How to work on this

1. Read `src/handlers/grpc.zig` for the canonical handler pattern.
2. `grpcurl -plaintext grpcb.in:9001 list` for the service-list
   format. Each line = one fully-qualified service name.
3. `grpcurl -plaintext grpcb.in:9001 describe grpc.testing.TestService`
   for the per-service descriptor. Free-form text but parseable.
4. `grpcurl describe .grpc.testing.SimpleRequest` for the message
   shape — fields are listed with types.
5. New components live alongside `GrpcPanel.tsx` in
   `frontend/src/components/`. Keep each file under 400 LOC per
   project hard rules.
