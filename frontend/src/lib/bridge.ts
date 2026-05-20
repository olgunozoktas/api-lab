/** Olgun Özoktaş geliştirdi · API Lab */
// zero-native JS↔Zig bridge wrapper.
// Calls window.zero.invoke(command, payload) when available.

declare global {
  interface Window {
    zero?: { invoke: (command: string, payload: unknown) => Promise<unknown> };
  }
}

export const bridge = {
  get available() {
    return (
      typeof window !== "undefined" &&
      typeof window.zero !== "undefined" &&
      typeof window.zero.invoke === "function"
    );
  },
  async invoke<T = unknown>(command: string, payload: unknown): Promise<T> {
    if (!this.available) throw new Error("zero-native bridge unavailable");
    return (await window.zero!.invoke(command, payload)) as T;
  },
};

// `shell.open` — ask the native shell to open a URL in the system
// default browser. The Zig handler validates the scheme (`http://`
// or `https://` only) and refuses everything else, so a bad URL
// rejects with `{error}` rather than launching anything. Returns
// true on success; never throws — callers wire this from click
// handlers that should degrade gracefully (open the URL in-process
// via `window.location` is NOT a safe fallback under zero://app,
// so on failure we just toast or no-op).
export type ShellOpenResponse = { ok?: boolean; error?: string };

export async function shellOpen(url: string): Promise<boolean> {
  if (!bridge.available) return false;
  try {
    const res = await bridge.invoke<ShellOpenResponse>("shell.open", { url });
    return res.ok === true;
  } catch {
    return false;
  }
}

// `fs.stat` — look up `{exists, size}` for an absolute path. The Zig
// handler refuses relative paths and surfaces FileNotFound /
// NotDir / IsDir as `exists: false` (rather than an error). Returns
// null when the bridge is unavailable (browser-mode dev) so callers
// can render a fallback without writing `bridge.available` checks.
export type FsStatResponse = { exists?: boolean; size?: number; error?: string };

export async function fsStat(path: string): Promise<{ exists: boolean; size: number } | null> {
  if (!bridge.available) return null;
  try {
    const res = await bridge.invoke<FsStatResponse>("fs.stat", { path });
    if (res.error !== undefined) return null;
    return { exists: res.exists === true, size: res.size ?? 0 };
  } catch {
    return null;
  }
}

export type HttpHeader = { name: string; value: string };

export type HttpRequest = {
  method: string;
  url: string;
  headers: HttpHeader[];
  body: string | null;
  timeout_ms?: number;
  follow_redirects?: number;
  insecure?: boolean;
  // multipart/form-data fields. When set, the Zig handler builds curl
  // `-F` args (`name=value` for text, `name=@path` for files) and
  // ignores `body`. curl reads file parts off disk itself.
  multipart?: { name: string; value: string; is_file: boolean }[];
  // Raw-binary body — an absolute file path. When set, the handler
  // uses curl `--data-binary @path` and ignores `body`.
  binary_path?: string;
  // Outbound proxy URL — curl `--proxy`.
  proxy?: string;
  // mTLS client certificate — absolute PEM file paths + optional key
  // passphrase. curl `--cert` / `--key` / `--pass`.
  client_cert?: string;
  client_key?: string;
  client_key_pass?: string;
};

export type HttpResponse = {
  status: number;
  size_bytes: number;
  timing_ms: number;
  timing?: {
    namelookup_ms: number;
    connect_ms: number;
    ttfb_ms: number;
    total_ms: number;
  };
  url: string;
  headers: HttpHeader[];
  body: string;
  // Binary response channel (src/handlers/http.zig). When `body_base64`
  // is true, `body` is a standard-alphabet base64 string rather than
  // raw text. When `body_too_large` is true the binary body exceeded
  // the bridge's 1 MB result buffer and `body` is empty. Both are
  // additive — absent on text responses.
  body_base64?: boolean;
  body_too_large?: boolean;
  error?: string;
  exit_code?: number;
  stderr?: string;
};

// gRPC unary bridge command. Backed by `src/handlers/grpc.zig` which
// shells out to `grpcurl`. Field names are snake_case to match the Zig
// struct's parseFromSlice expectations.
export type GrpcMetadataEntry = { name: string; value: string };

export type GrpcRequest = {
  target: string; // "host:port" — caller has already stripped the scheme
  full_method: string; // "package.Service/Method"
  message: string; // JSON string for the request body; empty → grpcurl gets {}
  metadata?: GrpcMetadataEntry[];
  plaintext?: boolean;
  use_reflection?: boolean;
  import_paths?: string[];
  proto_files?: string[];
  timeout_ms?: number;
  // PEM contents (NOT paths). The Zig handler writes each one to a
  // per-request tmp file before invoking grpcurl, then deletes the
  // tmp dir on exit (success or error). Empty / undefined skips that
  // flag entirely.
  ca_cert?: string;
  client_cert?: string;
  client_key?: string;
  server_name?: string;
  authority?: string;
};

// gRPC reflection bridge — `grpc.reflect.list` enumerates services +
// per-service methods via grpcurl's `list` + `describe` subcommands.
// `grpc.reflect.skeleton` builds a JSON shell from a message-type's
// proto-descriptor field list. Both are best-effort: servers without
// reflection enabled get an `error` field instead of a populated
// `services` / `skeleton` field.
export type GrpcReflectListRequest = {
  target: string;
  plaintext?: boolean;
  timeout_ms?: number;
};

export type GrpcReflectMethod = {
  name: string;
  request_type: string;
  response_type: string;
  client_stream: boolean;
  server_stream: boolean;
};

export type GrpcReflectService = {
  name: string;
  methods: GrpcReflectMethod[];
  // Populated when `describe <service>` failed for that specific
  // service. Other services in the same response can still have
  // populated `methods`.
  error?: string;
};

export type GrpcReflectListResponse = {
  services?: GrpcReflectService[];
  // Populated when the initial `grpcurl <target> list` fails (server
  // doesn't support reflection at all). When set, `services` is missing.
  error?: string;
  exit_code?: number;
  stderr?: string;
  install_hint?: string;
  docs?: string;
};

export type GrpcReflectSkeletonRequest = {
  target: string;
  message_type: string;
  plaintext?: boolean;
  timeout_ms?: number;
};

export type GrpcReflectSkeletonResponse = {
  skeleton?: string;
  error?: string;
  exit_code?: number;
  stderr?: string;
  install_hint?: string;
  docs?: string;
};

export type GrpcResponse = {
  status: string; // "OK" / "NotFound" / "Unavailable" / ... — RFC names
  status_code_num: number; // 0..16, or -1 for unknown
  status_message: string; // populated when status != OK
  // Response messages, each a JSON-string-encoded body. Always present;
  // length is 1 for unary calls, N for server-streaming. Empty on
  // transport error. Replaces the legacy single-message `message` field
  // — server-streaming would have crammed multiple objects into the
  // same string and lost the boundaries.
  messages: string[];
  message_count: number; // length of messages, surfaced for cheap UI checks
  headers: GrpcMetadataEntry[];
  trailers: GrpcMetadataEntry[];
  exit_code: number;
  stderr: string;
  // Bridge-level error (binary missing / parse failure / etc) — distinct
  // from gRPC application status. The `grpcurl_missing` value triggers a
  // dedicated install-hint card in the UI.
  error?: string;
  install_hint?: string;
  docs?: string;
};
