# Phase J — gRPC reflection service browser sidebar

Priority: P2

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

- [ ] New bridge command `grpc.reflect.list({target, plaintext})` →
      returns `[{service: string, methods: [{name, requestType, responseType, streamType}]}]`.
      Wraps `grpcurl -plaintext <target> list` + per-service
      `describe`.
- [ ] Skeleton-message generator: `grpc.reflect.skeleton({target, fullMethod, plaintext})` → returns a JSON skeleton matching the
      request message shape with type-appropriate defaults (`""` for
      string, `0` for number, `null` for nested optional). Wraps
      `grpcurl describe <message>` + parses the field list.
- [ ] New `GrpcServicesSidebar` component — shown in the GrpcPanel's
      Proto tab area when a target is set. Lazy-loaded on first
      "browse" click to avoid hammering the server.
- [ ] Cache the reflection result per-target in the store (5-min
      TTL or manual refresh button) so flipping between methods on
      the same server doesn't re-issue reflection calls.
- [ ] "Use this method" click handler — populates `current.grpc.fullMethod`
      + replaces `current.grpc.message` with the generated skeleton.
- [ ] Tests: parsing `grpcurl list` output (one service per line);
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
