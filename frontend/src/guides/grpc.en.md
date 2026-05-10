---
title: gRPC — reflection-cached service browser
group: Protocols
order: 1
---

The gRPC tab activates automatically when your URL starts with
`grpc://` or `grpcs://`. API Lab shells out to `grpcurl` for the
actual RPC call — install it once with:

```
brew install grpcurl
```

If `grpcurl` isn't on your `PATH` you'll see a "GRPCURL YOK / GRPCURL
MISSING" status; the in-tab error has the install hint.

## Browsing services via reflection

When the server has reflection enabled (most modern gRPC servers do):

1. Type `grpc://host:port` in the URL bar.
2. Click **Servisleri tara / Browse services** in the left pane.
3. Pick a method — API Lab generates a JSON skeleton from the proto
   schema.
4. Edit the request body and hit **Çağır / Call**.

Service lists are cached per `host:port` for 5 minutes. The cache
hit is marked `(önbellek, Xs önce)` next to the service count.
**Yenile / Refresh** invalidates manually.

## TLS

The **TLS** sub-tab accepts CA cert + client cert + client key
(PEM, paste-in). Per-call temp files are written to
`/tmp/api-lab-grpc-*` with `0o700` dir / `0o600` file modes; cleaned
up on call completion. Self-signed dev servers + mTLS prod services
both work.

## Without reflection

Toggle off **Server reflection kullan / Use server reflection**, then
fill in **import paths** (comma-separated) and **.proto files**. v1
limitation: file-picker is paste-only because WKWebView restricts
file-system dialogs. Backlog has a follow-up to add a real picker.
