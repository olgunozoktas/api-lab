export type KvRow = { enabled: boolean; k: string; v: string };

export type AuthType = "none" | "bearer" | "basic" | "apikey";
export type Auth = {
  type: AuthType;
  token?: string;
  user?: string;
  pass?: string;
  header?: string;
  value?: string;
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
};

export type CurrentRequest = RequestSnapshot & {
  id: string | null;
  name: string;
};

export type Collection = {
  id: string;
  name: string;
  request: RequestSnapshot;
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

export type ComposerTab = "params" | "headers" | "auth" | "body" | "graphql";
export type ResponseTab = "body" | "headers" | "raw";
export type SidebarTab = "collections" | "history";

export type UiState = {
  theme: "auto" | "light" | "dark";
  composerTab: ComposerTab;
  responseTab: ResponseTab;
  sidebarTab: SidebarTab;
};

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
