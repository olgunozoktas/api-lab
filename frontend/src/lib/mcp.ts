/** Olgun Özoktaş geliştirdi · API Lab */
// MCP (Model Context Protocol) client — JSON-RPC 2.0 over two
// transports:
//
//   - `stdio`  — a locally-installed MCP server spawned as a child
//     process. The WKWebView can't spawn processes, so this routes
//     through the native `mcp.stdio` bridge command (see
//     src/handlers/mcp.zig). Most MCP servers use this transport.
//   - `http`   — a remote MCP server reached over Streamable HTTP;
//     each JSON-RPC frame is POSTed through the `http.request` bridge
//     (CORS-free), threading the `Mcp-Session-Id` the server hands
//     back on `initialize`.
//
// One-shot model: every operation re-runs the full handshake
// (`initialize` → `notifications/initialized` → the operation). No
// persistent session — the Zig handler spawns the server fresh per
// call. The JSON-RPC framing + response parsing here are pure and
// unit-tested; the transports do the bridge I/O.
import { bridge, type HttpResponse, type HttpHeader } from "./bridge";

// Protocol revision advertised in the `initialize` handshake.
export const MCP_PROTOCOL_VERSION = "2025-06-18";

export type McpTransport =
  | { kind: "stdio"; command: string; args: string[] }
  | { kind: "http"; url: string };

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type McpResult<T> = { ok: true; value: T } | { ok: false; error: string };

// ── JSON-RPC framing (pure) ──────────────────────────────────────────

// A JSON-RPC request — carries an `id`, so the server's reply can be
// matched back to it.
export function rpcRequest(id: number, method: string, params: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

// A JSON-RPC notification — no `id`, so the server sends no reply.
export function rpcNotification(method: string, params: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", method, params });
}

export type RpcResponse = { result?: unknown; error?: { message?: string } };

// Parse a transport's raw output into id-keyed JSON-RPC responses.
// Output is newline-delimited JSON (the MCP stdio framing, and the
// shape the HTTP transport normalizes to): one object per non-blank
// line. Lines that aren't JSON (a server's stray log output) are
// skipped; only objects carrying a numeric `id` — i.e. responses, not
// notifications — are indexed.
export function parseRpcResponses(text: string): Map<number, RpcResponse> {
  const out = new Map<number, RpcResponse>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (obj && typeof obj === "object" && typeof (obj as { id?: unknown }).id === "number") {
      const o = obj as { id: number; result?: unknown; error?: { message?: string } };
      out.set(o.id, { result: o.result, error: o.error });
    }
  }
  return out;
}

// The ordered frame list for one operation: the `initialize` /
// `initialized` handshake followed by the operation request. The
// operation always uses id 2 so the caller knows which response to
// pull out.
const OP_ID = 2;
export function buildExchangeFrames(method: string, params: unknown): string[] {
  return [
    rpcRequest(1, "initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "API Lab", version: "1.0" },
    }),
    rpcNotification("notifications/initialized", {}),
    rpcRequest(OP_ID, method, params),
  ];
}

// ── transports (bridge I/O) ──────────────────────────────────────────

function headerValue(headers: HttpHeader[], name: string): string {
  const lower = name.toLowerCase();
  for (const h of headers) if (h.name.toLowerCase() === lower) return h.value;
  return "";
}

// stdio — one-shot through the `mcp.stdio` native bridge command.
async function runStdio(
  t: Extract<McpTransport, { kind: "stdio" }>,
  frames: string[]
): Promise<McpResult<string>> {
  try {
    const res = await bridge.invoke<{ stdout?: string; exit_code?: number; error?: string }>(
      "mcp.stdio",
      { command: t.command, args: t.args, frames }
    );
    if (res.error) return { ok: false, error: res.error };
    return { ok: true, value: res.stdout ?? "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// http — POST each frame through the `http.request` bridge, threading
// the session id the server returns on `initialize`. Bodies are
// joined newline-delimited so `parseRpcResponses` reads them the same
// way as the stdio transport's output.
async function runHttp(
  t: Extract<McpTransport, { kind: "http" }>,
  frames: string[]
): Promise<McpResult<string>> {
  let sessionId = "";
  const collected: string[] = [];
  for (const frame of frames) {
    const headers: HttpHeader[] = [
      { name: "Content-Type", value: "application/json" },
      { name: "Accept", value: "application/json" },
    ];
    if (sessionId) headers.push({ name: "Mcp-Session-Id", value: sessionId });
    let res: HttpResponse;
    try {
      res = await bridge.invoke<HttpResponse>("http.request", {
        method: "POST",
        url: t.url,
        headers,
        body: frame,
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (res.error) return { ok: false, error: res.error };
    if (res.status >= 400) return { ok: false, error: `HTTP ${res.status}` };
    const sid = headerValue(res.headers, "mcp-session-id");
    if (sid) sessionId = sid;
    if (res.body.trim()) collected.push(res.body.trim());
  }
  return { ok: true, value: collected.join("\n") };
}

// Run an operation's frames over whichever transport is configured.
async function runExchange(t: McpTransport, frames: string[]): Promise<McpResult<string>> {
  if (!bridge.available) return { ok: false, error: "native bridge required" };
  return t.kind === "stdio" ? runStdio(t, frames) : runHttp(t, frames);
}

// Pull the operation response (id 2) out of a transport's raw output.
function operationResult(raw: string): McpResult<unknown> {
  const responses = parseRpcResponses(raw);
  const r = responses.get(OP_ID);
  if (!r) return { ok: false, error: "no response from the MCP server" };
  if (r.error) return { ok: false, error: r.error.message ?? "MCP server error" };
  return { ok: true, value: r.result };
}

// ── high-level operations ────────────────────────────────────────────

// List the tools an MCP server exposes.
export async function mcpListTools(t: McpTransport): Promise<McpResult<McpTool[]>> {
  const raw = await runExchange(t, buildExchangeFrames("tools/list", {}));
  if (!raw.ok) return raw;
  const op = operationResult(raw.value);
  if (!op.ok) return op;
  const tools = (op.value as { tools?: McpTool[] } | null)?.tools ?? [];
  return { ok: true, value: tools };
}

// Invoke one tool. `args` is the tool's arguments object.
export async function mcpCallTool(
  t: McpTransport,
  name: string,
  args: unknown
): Promise<McpResult<unknown>> {
  const raw = await runExchange(t, buildExchangeFrames("tools/call", { name, arguments: args }));
  if (!raw.ok) return raw;
  return operationResult(raw.value);
}
