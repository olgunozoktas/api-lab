/** Olgun Özoktaş geliştirdi · API Lab */
export type KvRow = { enabled: boolean; k: string; v: string };

export type AuthType = "none" | "bearer" | "basic" | "apikey" | "oauth2" | "aws-sigv4" | "mtls";
export type Auth = {
  type: AuthType;
  // bearer
  token?: string;
  // basic
  user?: string;
  pass?: string;
  // apikey
  header?: string;
  value?: string;
  // AWS Signature v4 — signs the request with AWS credentials. Signing
  // runs JS-side (lib/awsSigv4.ts) just before the request is sent.
  awsSigv4?: {
    accessKey?: string;
    secretKey?: string;
    region?: string;
    service?: string;
    sessionToken?: string; // for temporary (STS) credentials
  };
  // Mutual-TLS client-certificate auth. `certPath` / `keyPath` are
  // absolute paths to PEM files on disk; curl loads them via
  // `--cert` / `--key`. Native path only — browser fetch has no
  // client-certificate API.
  mtls?: {
    certPath?: string;
    keyPath?: string;
    passphrase?: string;
  };
  // oauth2 — manual helper variant. Full popup + redirect flow needs
  // zero-native upstream changes (popup WKWebView + redirect interception
  // + Keychain bridge); see backlog P2 follow-ups. v1 lets the user paste
  // tokens acquired from any external OAuth tool and refresh them via the
  // existing curl bridge.
  oauth2?: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number; // epoch ms; auto-set on refresh
    token_url?: string; // for refresh
    client_id?: string;
    client_secret?: string; // optional — public clients (PKCE) skip this
  };
};

export type BodyMode = "none" | "json" | "form" | "raw" | "multipart" | "binary";

// One field of a multipart/form-data body. `kind` decides whether the
// field carries an inline text value or an on-disk file (picked via
// the native file dialog). `filePath` is an absolute path; `fileName`
// is its basename, kept for display so the UI need not re-derive it.
export type MultipartField = {
  enabled: boolean;
  k: string;
  kind: "text" | "file";
  v: string;
  filePath: string;
  fileName: string;
};

export const emptyMultipartField = (): MultipartField => ({
  enabled: true,
  k: "",
  kind: "text",
  v: "",
  filePath: "",
  fileName: "",
});

// `parts` is populated only when `mode === "multipart"`; `filePath` /
// `fileName` only when `mode === "binary"`. Both are optional so
// persisted snapshots from before this landed hydrate cleanly.
export type Body = {
  mode: BodyMode;
  text: string;
  parts?: MultipartField[];
  filePath?: string;
  fileName?: string;
};

export type Gql = { query: string; vars: string };

// gRPC composer state — surfaced when current.url starts with grpc:// or
// grpcs://. The bridge call (src/handlers/grpc.zig) consumes a snake_case
// version of this; conversion happens in sendRequest's gRPC path.
//
// `metadata` uses KvRow (not a flat {name,value}[]) so users can toggle a
// metadata entry on/off without deleting it — same UX as request headers.
//
// `plaintext` is optional: when undefined, GrpcPanel auto-derives from the
// URL scheme (grpc:// → true, grpcs:// → false). Setting it explicitly
// overrides — useful when the user pastes a bare host:port and wants TLS.
//
// `tls` carries optional TLS overrides for grpcs:// targets:
// custom CA bundle, client cert/key (mTLS), TLS server name override, and
// HTTP/2 :authority pseudo-header override. PEM contents are pasted into
// the UI (not file paths) since WKWebView's file picker is constrained.
// Stored in IDB alongside the rest of GrpcState — the UI surfaces a
// security caveat for client keys.
export type GrpcTls = {
  caCert?: string; // PEM; passed to grpcurl -cacert
  clientCert?: string; // PEM; passed to grpcurl -cert
  clientKey?: string; // PEM; passed to grpcurl -key
  serverName?: string; // grpcurl -servername (TLS SNI override)
  authority?: string; // grpcurl -authority (HTTP/2 :authority override)
};

export type GrpcState = {
  fullMethod: string; // "package.Service/Method"
  message: string;
  metadata: KvRow[];
  useReflection: boolean;
  importPaths: string[];
  protoFiles: string[];
  plaintext?: boolean;
  tls?: GrpcTls;
};

export const emptyGrpcState = (): GrpcState => ({
  fullMethod: "",
  message: "{}",
  metadata: [{ enabled: true, k: "", v: "" }],
  useReflection: true,
  importPaths: [],
  protoFiles: [],
});

// One saved response example. Captured via the "Save as example"
// button on the response viewer; consumed by the (forthcoming Zig
// sidecar) mock server. Stored on the request itself so importing /
// exporting a collection round-trips the examples too.
export type Example = {
  id: string;
  name: string;
  status: number;
  headers: ResponseHeader[];
  body: string;
  contentType: string;
  // Path + method captured at save time. The mock server uses these
  // to route incoming requests back to this example. Trimmed to a
  // server-relative path (no scheme/host) — the live URL changes
  // between local + staging + prod, only the path matters for
  // matching.
  path: string;
  method: string;
  savedAt: number;
};

export type RequestSnapshot = {
  method: string;
  url: string;
  params: KvRow[];
  headers: KvRow[];
  auth: Auth;
  body: Body;
  gql: Gql;
  isGraphql?: boolean;
  // Pre-request and post-response scripts. Run inside a QuickJS WASM
  // sandbox (lib/scriptSandbox.ts) with a Postman-compatible `pm.*`
  // surface. Empty / undefined skips the script entirely. The
  // sandbox has no fetch/XHR access — network calls only happen
  // through the host bridge.
  preScript?: string;
  postScript?: string;
  // Saved-response examples for the local mock server (Phase L.1).
  examples?: Example[];
  // gRPC composer state. Optional so persisted state from before this
  // landed hydrates cleanly — readers should fall back to
  // `emptyGrpcState()` when undefined.
  grpc?: GrpcState;
};

export type CurrentRequest = RequestSnapshot & {
  id: string | null;
  name: string;
};

// Legacy v2 shape — flat list. Kept as a type so the v2→v3 migration
// can read the old persisted JSON without `any`. Active code uses
// `CollectionItem` below.
export type Collection = {
  id: string;
  name: string;
  request: RequestSnapshot;
};

// v3+ shape: tree with folders. Each item has a parentId (null = root),
// a kind (folder or request), an `order` field for sibling ordering.
// Folders carry no request payload; requests carry the snapshot.
export type CollectionItemKind = "folder" | "request";

export type CollectionItem = {
  id: string;
  parentId: string | null;
  kind: CollectionItemKind;
  name: string;
  order: number;
  request?: RequestSnapshot; // populated only when kind === "request"
};

export type Environment = {
  id: string;
  name: string;
  vars: Record<string, string>;
};

// One assertion made by a `pm.test(...)` call inside a sandboxed
// pre/post-request script.
export type ScriptAssert = {
  name: string;
  passed: boolean;
  error?: string;
};

// Outcome of one pre- or post-request script run — the assertions it
// made, captured console output, and any thrown error.
export type ScriptOutcome = {
  asserts: ScriptAssert[];
  console_log: string[];
  error?: string;
};

export type ResponseHeader = { k: string; v: string };

export type ResponseSnapshot = {
  status: number;
  statusText: string;
  headers: ResponseHeader[];
  body: string;
  contentType: string;
  sizeBytes: number;
  elapsedMs: number;
  url: string;
  transport: "native" | "fetch";
  timing?: {
    namelookup_ms: number;
    connect_ms: number;
    ttfb_ms: number;
    total_ms: number;
  };
  // Pre/post-request script outcomes for the run that produced this
  // response. Absent when the request carries no scripts.
  scriptResults?: { pre?: ScriptOutcome; post?: ScriptOutcome };
  // Binary response channel. When the native bridge flags a body as
  // binary it arrives base64-encoded; `bodyBase64` carries the raw
  // base64 so the image / audio / video / PDF / hex viewers can decode
  // faithful bytes, while `body` holds a best-effort lossy-text render
  // for the Raw tab. `bodyTooLarge` marks a binary body that exceeded
  // the bridge buffer — no bytes are available to preview.
  bodyBase64?: string;
  bodyTooLarge?: boolean;
};

export type HistoryItem = {
  id: string;
  ts: number;
  request: RequestSnapshot;
  // `body` / `contentType` / `bodyOmitted` are optional so v3 persisted
  // entries (recorded before history retained bodies) hydrate cleanly —
  // a missing `body` just means that entry isn't diffable. `bodyOmitted`
  // records WHY a body is absent: `too-large` (over the per-entry cap),
  // `binary` (image/audio/video/PDF — not text-diffable), or `budget`
  // (evicted because newer entries filled the total retention budget).
  // See lib/historyBody.ts for the caps + budget walk.
  response: {
    status: number;
    sizeBytes: number;
    elapsedMs: number;
    body?: string;
    contentType?: string;
    bodyOmitted?: "too-large" | "binary" | "budget";
  };
};

export type ComposerTab = "params" | "headers" | "auth" | "body" | "graphql" | "scripts";
export type ResponseTab =
  | "body"
  | "headers"
  | "raw"
  | "visualize"
  | "examples"
  | "tests"
  | "console";
export type SidebarTab = "collections" | "history";

export type Theme = "auto" | "light" | "dark" | "tokyo-night" | "github-light" | "high-contrast";

export const THEMES: Theme[] = [
  "auto",
  "light",
  "dark",
  "tokyo-night",
  "github-light",
  "high-contrast",
];

// Pixel widths persisted across reloads via the IDB Zustand middleware.
// `composerPx` is the request composer's width when the 3-pane layout
// is active; the response viewer takes whatever's left. In single-column
// modes (WS / gRPC) only `sidebarPx` is honored.
export type Layout = {
  sidebarPx: number;
  composerPx: number;
};

export const DEFAULT_LAYOUT: Layout = {
  sidebarPx: 240,
  composerPx: 560,
};

// Hard min/max bounds. Sidebar can't shrink below 180 (icons + nav text
// need room) or grow past 400 (no real upside). Composer 320–1200 covers
// laptop → ultrawide; tighter clamps would feel restrictive.
export const SIDEBAR_PX_MIN = 180;
export const SIDEBAR_PX_MAX = 400;
export const COMPOSER_PX_MIN = 320;
export const COMPOSER_PX_MAX = 1200;

export type UiState = {
  theme: Theme;
  composerTab: ComposerTab;
  responseTab: ResponseTab;
  sidebarTab: SidebarTab;
  layout: Layout;
  // ⌘B toggles the sidebar visibility. Optional so v3 persisted
  // snapshots without the field hydrate cleanly (`undefined` → open).
  sidebarCollapsed?: boolean;
  // Launch-time GitHub-release update check. Optional + default-on:
  // `undefined` / `true` → check; only an explicit `false` opts out.
  updateCheck?: boolean;
};

// Default request behaviors — surfaced in the Settings modal so power
// users can shift project-wide defaults instead of editing each request.
// Persisted alongside the rest of the store under `defaults`.
export type RequestDefaults = {
  timeoutMs: number;
  followRedirects: number;
  insecure: boolean;
  // Outbound proxy URL applied to every request via curl `--proxy`
  // (HTTP / HTTPS / SOCKS5 — the scheme is part of the URL). Empty
  // string = no proxy. Optional so older persisted snapshots hydrate.
  proxyUrl?: string;
};

export const defaultRequestDefaults = (): RequestDefaults => ({
  timeoutMs: 60000,
  followRedirects: 10,
  insecure: false,
  proxyUrl: "",
});

// Optional git-based collection sync (Phase K). `repoUrl` is an SSH
// remote — auth runs through the system SSH agent, so no secret is
// stored. Persisted; sync is fully off until `enabled` is true.
export type SyncConfig = {
  enabled: boolean;
  repoUrl: string;
};

export const defaultSyncConfig = (): SyncConfig => ({ enabled: false, repoUrl: "" });

// Runtime-only sync status (NOT persisted) — drives the status line in
// Settings and the conflict banner.
export type SyncStatus = {
  state: "idle" | "syncing" | "ok" | "error" | "conflict";
  message: string;
  lastSyncAt: number | null;
};

export const defaultSyncStatus = (): SyncStatus => ({
  state: "idle",
  message: "",
  lastSyncAt: null,
});

// One open tab in the multi-request workspace. `request` is the editable
// state; `lastResponse` is the most recent response shown in the response
// pane; `composerTab` and `responseTab` are the tab's UI memory so each
// tab remembers which sub-pane the user was looking at. The store keeps
// `current` / `lastResponse` / `ui.composerTab` / `ui.responseTab` mirrored
// to the *active* tab's fields so existing leaf components stay
// store-shape agnostic.
// State for an OpenAPI-editor tab. When `OpenTab.spec` is set the tab
// hosts the spec editor instead of the HTTP composer; the tab's
// `request` stays a throwaway empty request so the existing tab
// machinery (snapshot / clone / close / reopen) keeps working without
// any spec-aware branching.
export type SpecTabState = {
  // The raw spec source — YAML or JSON — as the user is editing it.
  text: string;
  // Display name (the imported file's name); also the tab title.
  fileName: string;
  // Optional custom Spectral ruleset (YAML) edited in-app. Layers a
  // `rules` override map on the built-in `oas` ruleset; applied
  // automatically on every lint pass. Absent → built-in `oas` only.
  ruleset?: string;
};

export type OpenTab = {
  id: string;
  name: string;
  request: CurrentRequest;
  lastResponse: ResponseSnapshot | null;
  composerTab: ComposerTab;
  responseTab: ResponseTab;
  // Pinned tabs stick to the left edge of the strip and are skipped
  // by "Close others" / "Close to the right" bulk-close actions.
  // Optional so persisted v3 snapshots from before pin shipped still
  // load — readers should default `pinned ?? false`.
  pinned?: boolean;
  // Present only on OpenAPI-editor tabs. Absent on normal request tabs.
  spec?: SpecTabState;
};

export const emptyTab = (id: string): OpenTab => ({
  id,
  name: "Yeni istek",
  request: { ...emptyRequest(), id: null, name: "Yeni istek" },
  lastResponse: null,
  composerTab: "params",
  responseTab: "body",
  pinned: false,
});

export const emptyRequest = (): CurrentRequest => ({
  id: null,
  name: "Yeni istek",
  method: "GET",
  url: "",
  params: [{ enabled: true, k: "", v: "" }],
  headers: [{ enabled: true, k: "", v: "" }],
  auth: { type: "none" },
  body: { mode: "none", text: "" },
  gql: { query: "", vars: "" },
  grpc: emptyGrpcState(),
});
