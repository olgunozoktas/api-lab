// gRPC helpers — URL detection + scheme-derived flags + target extraction.
// Pure / framework-free so the helpers stay unit-testable. Connection
// lifecycle lives in the GrpcPanel container; the bridge call itself
// goes through `bridge.invoke<GrpcResponse>("grpc.invoke", ...)`.

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
