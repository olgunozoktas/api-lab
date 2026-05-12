/** Olgun Özoktaş geliştirdi · API Lab */
// Server-Sent Events helpers — URL detection + message helpers.
// Connection lifecycle lives in the SsePanel component itself; this
// module stays pure / framework-free so the helpers can be unit-tested.
//
// SSE convention: API Lab uses an `sse://` (plaintext) / `sses://`
// (TLS) URL-bar prefix to switch the workspace into the SSE panel.
// EventSource wants a plain http(s):// URL though, so we strip the
// scheme prefix when wiring the connection — same shape as how
// `grpc://` / `grpcs://` get stripped before grpcurl gets the target.

export type SseStatus = "idle" | "connecting" | "open" | "closed" | "error";

export type SseDirection = "received" | "system";

export type SseMessage = {
  id: string;
  direction: SseDirection;
  /** Server-named event (`event: foo` line). Default `"message"` for unnamed. */
  eventName: string;
  /** Event payload. Always a string; SSE doesn't transport binary. */
  data: string;
  /** Optional `id:` field — useful with EventSource's `lastEventId` for
   * reconnect cursors (out of scope for v1, surfaced for diagnostics). */
  lastEventId?: string;
  ts: number; // epoch ms
  isJson: boolean;
};

/** Match `sse://` / `sses://` URL-bar prefixes (case-insensitive). */
export function isSseUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return t.startsWith("sse://") || t.startsWith("sses://");
}

/**
 * Convert the `sse://` / `sses://` URL-bar value into the http(s)://
 * URL that EventSource actually connects to. Returns the input
 * unchanged if no recognized scheme is present, so pasting a plain
 * `https://api.example.com/stream` URL also works once the workspace
 * is in SSE mode.
 */
export function toEventSourceUrl(url: string): string {
  const t = url.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("sses://")) return "https://" + t.slice("sses://".length);
  if (lower.startsWith("sse://")) return "http://" + t.slice("sse://".length);
  return t;
}

// Pretty-print JSON if the input parses as JSON, otherwise return null.
// Mirrors the helper in lib/ws.ts — duplicated here (instead of imported
// from ws.ts) so the SSE feature stays standalone and ws.ts isn't loaded
// when only SSE is used. Both functions are tiny and stable enough that
// the duplication cost is lower than the coupling cost.
export function tryPrettyJson(text: string, maxBytes: number = 64 * 1024): string | null {
  if (text.length === 0 || text.length > maxBytes) return null;
  const trimmed = text.trimStart();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
}

/** Cheap structural check; full parse happens lazily at render via tryPrettyJson. */
export function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

let messageIdCounter = 0;
export function nextMessageId(): string {
  messageIdCounter += 1;
  return `ssem-${Date.now().toString(36)}-${messageIdCounter}`;
}
