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

export type HttpHeader = { name: string; value: string };

export type HttpRequest = {
  method: string;
  url: string;
  headers: HttpHeader[];
  body: string | null;
  timeout_ms?: number;
  follow_redirects?: number;
  insecure?: boolean;
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
