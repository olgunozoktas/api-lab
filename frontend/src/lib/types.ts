export type KvRow = { enabled: boolean; k: string; v: string };

export type AuthType = "none" | "bearer" | "basic" | "apikey" | "oauth2";
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

export type BodyMode = "none" | "json" | "form" | "raw";
export type Body = { mode: BodyMode; text: string };

export type Gql = { query: string; vars: string };

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
};

export type HistoryItem = {
  id: string;
  ts: number;
  request: RequestSnapshot;
  response: { status: number; sizeBytes: number; elapsedMs: number };
};

export type ComposerTab = "params" | "headers" | "auth" | "body" | "graphql" | "scripts";
export type ResponseTab = "body" | "headers" | "raw";
export type SidebarTab = "collections" | "history";

export type Theme = "auto" | "light" | "dark" | "tokyo-night" | "github-light";

export const THEMES: Theme[] = ["auto", "light", "dark", "tokyo-night", "github-light"];

export type UiState = {
  theme: Theme;
  composerTab: ComposerTab;
  responseTab: ResponseTab;
  sidebarTab: SidebarTab;
};

// Default request behaviors — surfaced in the Settings modal so power
// users can shift project-wide defaults instead of editing each request.
// Persisted alongside the rest of the store under `defaults`.
export type RequestDefaults = {
  timeoutMs: number;
  followRedirects: number;
  insecure: boolean;
};

export const defaultRequestDefaults = (): RequestDefaults => ({
  timeoutMs: 60000,
  followRedirects: 10,
  insecure: false,
});

// One open tab in the multi-request workspace. `request` is the editable
// state; `lastResponse` is the most recent response shown in the response
// pane; `composerTab` and `responseTab` are the tab's UI memory so each
// tab remembers which sub-pane the user was looking at. The store keeps
// `current` / `lastResponse` / `ui.composerTab` / `ui.responseTab` mirrored
// to the *active* tab's fields so existing leaf components stay
// store-shape agnostic.
export type OpenTab = {
  id: string;
  name: string;
  request: CurrentRequest;
  lastResponse: ResponseSnapshot | null;
  composerTab: ComposerTab;
  responseTab: ResponseTab;
};

export const emptyTab = (id: string): OpenTab => ({
  id,
  name: "Yeni istek",
  request: { ...emptyRequest(), id: null, name: "Yeni istek" },
  lastResponse: null,
  composerTab: "params",
  responseTab: "body",
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
});
