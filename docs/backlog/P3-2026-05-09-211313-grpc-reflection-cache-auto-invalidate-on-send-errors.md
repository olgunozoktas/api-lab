# gRPC reflection cache — auto-invalidate on Send errors

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-202732-grpc-reflection-cache-per-target-5min-ttl.md`
(shipped 2026-05-09). The parent file's Tradeoffs section explicitly
named this as a v2 idea: "if this becomes painful, listen for
grpcurl's 'method not found' errors on the next Send and
auto-invalidate."

Current behavior: cache TTL is 5 minutes. If the server's proto
schema changes mid-session (proto file edited + server restarted), a
cached service tree from the pre-change fanout will serve methods
that no longer exist. The user clicks Send → gets a "method not
found" error from grpcurl → has to manually click Refresh on the
sidebar → fresh fanout. Two extra clicks the user shouldn't need.

The fix: when `bridge.invoke<GrpcResponse>("grpc.invoke", ...)`
returns an error pattern that signals stale-schema (status code
`Unimplemented`, exit-code `12`, or stderr containing "method not
found" / "unknown service"), auto-`invalidateCached(target)` so
the very next Browse Services call gets a fresh tree.

## Items

- [ ] Identify the error patterns that imply schema drift. From the
      grpcurl source, the relevant signals are:
      - HTTP/2 grpc-status `12` (Unimplemented)
      - stderr containing `Method not found` (with that capitalization)
      - stderr containing `Unknown service`
- [ ] In `GrpcPanelContainer.onSend`, after receiving the response,
      check for those signals and call
      `invalidateCached(target)` from `useReflectionCache` if any
      hit.
- [ ] Optional UX: surface a one-line toast or hint via the existing
      `showToast` action: "Reflection cache invalidated — click
      Browse services again for the latest schema." Hidden behind a
      one-time-per-target debounce so a single bad method spam-Send
      doesn't toast 10 times.
- [ ] Tests: assert that an Unimplemented response triggers a cache
      invalidation; assert that a successful response does NOT
      invalidate.

## Acceptance

User browses `grpcb.in:9001` → reflection cached → server restarts
with a new proto removing `Greeter/SayHello` → user calls
`Greeter/SayHello` → grpcurl returns `Unimplemented` → cache for
`grpcb.in:9001` is automatically dropped → user clicks Browse
services → fresh fanout returns the updated tree (without
`SayHello`).

## Tradeoffs

False positives: if a method legitimately doesn't exist for the
current request shape (e.g. user typoed the full method) we
invalidate the cache unnecessarily. Cost: the next browse pays the
full fanout (1-3s). Acceptable — typos are rare and the next
fanout is the same fetch the user would have triggered anyway with
Refresh.

Coupling: this adds a side effect to `onSend` that depends on
`useReflectionCache`. Currently `onSend` doesn't touch the cache
at all. Worth keeping the new logic small and well-named (a
private `maybeInvalidateOnSendError` helper) so the coupling is
visible and testable.

We could also auto-Refresh the sidebar after invalidating. Held
for v2 — invalidating + waiting for the user's next click is
less surprising than a fanout firing on its own.

## How to work on this

1. Look at `GrpcPanelContainer.tsx` `onSend` — the response
   handling lives in the `try` branch. The error-classifying
   helper would slot in right after `setStatus` is called with
   the new status.
2. Reference: `frontend/src/lib/types.ts` has the `GrpcResponse`
   shape; `status_code_num` and `stderr` are the fields to check.
3. Test pattern: extend `frontend/src/lib/__tests__/grpc.test.ts`
   with a small pure helper that takes a `GrpcResponse` and
   returns `boolean` ("should invalidate?"). That keeps the
   container test-coverage hole intact while still exercising
   the logic.
