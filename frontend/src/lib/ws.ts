/** Olgun Özoktaş geliştirdi · API Lab */
// WebSocket helpers — URL detection + message helpers.
// Connection lifecycle lives in the WsPanel component itself; this module
// stays pure / framework-free so the helpers can be unit-tested.

export type WsDirection = "sent" | "received" | "system";

export type WsMessage = {
  id: string;
  direction: WsDirection;
  text: string;
  ts: number; // epoch ms
  isJson: boolean;
};

export type WsStatus = "idle" | "connecting" | "open" | "closing" | "closed" | "error";

export function isWsUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return t.startsWith("ws://") || t.startsWith("wss://");
}

// Pretty-print JSON if the input parses as JSON, otherwise return null.
// Keeps strings under a soft cap so the log doesn't blow up on a 10MB
// JSON message (still kept as raw text in that case — caller decides).
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

// Detect whether a message looks like JSON without paying the parse cost.
// Used to set the `isJson` flag on WsMessage so the log can render a tiny
// JSON badge — pretty-printing happens lazily via tryPrettyJson at render.
export function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

let messageIdCounter = 0;
export function nextMessageId(): string {
  messageIdCounter += 1;
  return `wsm-${Date.now().toString(36)}-${messageIdCounter}`;
}

// Default ping payload. WebSocket protocol-level pings are not exposed by
// the browser API, so this is an application-level "ping" — useful for
// echo servers (echo.websocket.org echoes "ping" back as "ping").
export const DEFAULT_PING_PAYLOAD = "ping";
