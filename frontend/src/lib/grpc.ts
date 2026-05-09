// gRPC helpers — URL detection + scheme-derived flags + target extraction.
// Pure / framework-free so the helpers stay unit-testable. Connection
// lifecycle lives in the GrpcPanel container; the bridge call itself
// goes through `bridge.invoke<GrpcResponse>("grpc.invoke", ...)`.

import type { GrpcTls } from "./types";

export function isGrpcUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return t.startsWith("grpc://") || t.startsWith("grpcs://");
}

// `grpc://` is plaintext (no TLS); `grpcs://` is TLS. The user can override
// in the Proto tab if they're hitting a plaintext server on a non-grpc://
// scheme (rare). For the common case, the scheme is the source of truth.
export function derivePlaintext(url: string): boolean {
  const t = url.trim().toLowerCase();
  if (t.startsWith("grpcs://")) return false;
  if (t.startsWith("grpc://")) return true;
  return false; // default: assume TLS for anything else (we wouldn't get here from isGrpcUrl)
}

// Strip the scheme prefix to get the bare `host:port` grpcurl expects.
// Returns the input unchanged if no recognized scheme is present (so
// pasting a bare host:port also works).
export function extractTarget(url: string): string {
  const t = url.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("grpcs://")) return t.slice("grpcs://".length);
  if (lower.startsWith("grpc://")) return t.slice("grpc://".length);
  return t;
}

// Validate `package.Service/Method` shape. grpcurl is forgiving about
// formats so we keep this minimal — used only for UI-side hint coloring.
export function isLikelyFullMethod(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return false;
  return t.includes("/") && t.includes(".");
}

// Snake-case TLS subset of GrpcRequest the bridge consumes. Kept as a
// standalone shape (instead of `Pick<GrpcRequest, ...>`) so this file
// doesn't depend on bridge.ts and stays cheap to unit-test.
export type GrpcTlsPayload = {
  ca_cert?: string;
  client_cert?: string;
  client_key?: string;
  server_name?: string;
  authority?: string;
};

// Map the camelCase GrpcTls UI shape to the snake_case fields the Zig
// handler expects. Empty / undefined fields are stripped (Zig defaults
// the corresponding GrpcRequest fields to ""), so the wire payload only
// carries the overrides the user actually set. `subst` applies env-var
// substitution per field — pasted PEM may include `{{CA_BUNDLE}}`-style
// references the user wants resolved at send time.
export function buildTlsPayload(
  tls: GrpcTls | undefined,
  subst: (s: string) => string
): GrpcTlsPayload {
  const t = tls ?? {};
  return {
    ca_cert: t.caCert ? subst(t.caCert) : undefined,
    client_cert: t.clientCert ? subst(t.clientCert) : undefined,
    client_key: t.clientKey ? subst(t.clientKey) : undefined,
    server_name: t.serverName ? subst(t.serverName) : undefined,
    authority: t.authority ? subst(t.authority) : undefined,
  };
}
