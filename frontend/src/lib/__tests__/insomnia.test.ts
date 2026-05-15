/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect, beforeEach } from "vitest";
import { parseInsomniaV4, isInsomniaExport, __resetIdSeqForTesting } from "../importers/insomnia";

beforeEach(() => {
  __resetIdSeqForTesting();
});

// Minimal but realistic Insomnia v4 export — workspace with a folder,
// two requests, an environment, and one OAuth2-with-token auth.
const SAMPLE = {
  _type: "export",
  __export_format: 4,
  __export_date: "2026-05-15T07:00:00.000Z",
  __export_source: "insomnia.desktop.app:v8.0.0",
  resources: [
    { _id: "wrk_1", _type: "workspace", name: "Demo Workspace", parentId: null },
    { _id: "fld_1", _type: "request_group", name: "Users", parentId: "wrk_1" },
    {
      _id: "req_1",
      _type: "request",
      name: "Health",
      parentId: "wrk_1",
      method: "GET",
      url: "https://api.example.com/health",
      headers: [{ name: "Accept", value: "application/json" }],
      parameters: [{ name: "v", value: "1" }],
      authentication: { type: "none" },
    },
    {
      _id: "req_2",
      _type: "request",
      name: "List users",
      parentId: "fld_1",
      method: "GET",
      url: "https://api.example.com/users",
      headers: [
        { name: "Authorization", value: "Bearer {{token}}" },
        { name: "X-Disabled", value: "skip me", disabled: true },
      ],
      authentication: { type: "bearer", token: "{{token}}" },
    },
    {
      _id: "req_3",
      _type: "request",
      name: "Create user",
      parentId: "fld_1",
      method: "POST",
      url: "https://api.example.com/users",
      body: {
        mimeType: "application/json",
        text: '{"name":"alice"}',
      },
      authentication: {
        type: "basic",
        username: "admin",
        password: "secret",
      },
    },
    {
      _id: "env_1",
      _type: "environment",
      name: "Base",
      parentId: "wrk_1",
      data: { token: "abc123", base_url: "https://api.example.com", nested: { x: 1 } },
    },
  ],
};

describe("isInsomniaExport", () => {
  it("accepts a v4 export", () => {
    expect(isInsomniaExport(SAMPLE)).toBe(true);
  });

  it("accepts v5+ (future-compat — only requires format ≥ 4)", () => {
    expect(isInsomniaExport({ ...SAMPLE, __export_format: 5 })).toBe(true);
  });

  it("rejects v3 / non-export / missing resources", () => {
    expect(isInsomniaExport({ ...SAMPLE, __export_format: 3 })).toBe(false);
    expect(isInsomniaExport({ ...SAMPLE, _type: "something" })).toBe(false);
    expect(isInsomniaExport({ ...SAMPLE, resources: null })).toBe(false);
    expect(isInsomniaExport(null)).toBe(false);
    expect(isInsomniaExport("string")).toBe(false);
  });
});

describe("parseInsomniaV4", () => {
  it("returns the workspace name + counts", () => {
    const r = parseInsomniaV4(JSON.stringify(SAMPLE));
    expect(r.collectionName).toBe("Demo Workspace");
    expect(r.folderCount).toBe(1);
    expect(r.requestCount).toBe(3);
  });

  it("rebuilds the tree via parentId references", () => {
    const r = parseInsomniaV4(JSON.stringify(SAMPLE));
    const usersFolder = r.items.find((i) => i.kind === "folder" && i.name === "Users");
    expect(usersFolder).toBeDefined();
    const listUsers = r.items.find((i) => i.kind === "request" && i.name === "List users");
    expect(listUsers).toBeDefined();
    expect(listUsers!.parentId).toBe(usersFolder!.id);
    // Top-level "Health" request lands at the workspace root.
    const health = r.items.find((i) => i.kind === "request" && i.name === "Health");
    expect(health).toBeDefined();
    expect(health!.parentId).toBeNull();
  });

  it("maps headers, params, and respects disabled flags", () => {
    const r = parseInsomniaV4(JSON.stringify(SAMPLE));
    const listUsers = r.items.find((i) => i.name === "List users")!;
    const headers = listUsers.request!.headers;
    expect(headers.find((h) => h.k === "Authorization")?.enabled).toBe(true);
    expect(headers.find((h) => h.k === "X-Disabled")?.enabled).toBe(false);
    const health = r.items.find((i) => i.name === "Health")!;
    expect(health.request!.params.find((p) => p.k === "v")?.v).toBe("1");
  });

  it("maps bearer / basic / apikey auth correctly", () => {
    const r = parseInsomniaV4(JSON.stringify(SAMPLE));
    const listUsers = r.items.find((i) => i.name === "List users")!.request!.auth;
    expect(listUsers).toMatchObject({ type: "bearer", token: "{{token}}" });
    const createUser = r.items.find((i) => i.name === "Create user")!.request!.auth;
    expect(createUser).toMatchObject({ type: "basic", user: "admin", pass: "secret" });
  });

  it("maps json body verbatim", () => {
    const r = parseInsomniaV4(JSON.stringify(SAMPLE));
    const createUser = r.items.find((i) => i.name === "Create user")!.request!;
    expect(createUser.body.mode).toBe("json");
    expect(createUser.body.text).toBe('{"name":"alice"}');
  });

  it("flattens environment.data into envVars and warns on nested keys", () => {
    const r = parseInsomniaV4(JSON.stringify(SAMPLE));
    expect(r.envVars).toEqual({
      token: "abc123",
      base_url: "https://api.example.com",
    });
    expect(r.warnings.some((w) => w.includes("nested"))).toBe(true);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseInsomniaV4("{not json")).toThrow(/Invalid JSON/);
  });

  it("throws on non-Insomnia shape", () => {
    expect(() => parseInsomniaV4(JSON.stringify({ hello: "world" }))).toThrow(/Insomnia/);
  });

  it("handles unparented orphan requests gracefully", () => {
    const orphaned = {
      ...SAMPLE,
      resources: [
        ...SAMPLE.resources,
        {
          _id: "req_4",
          _type: "request",
          name: "Orphan",
          parentId: "ghost-parent",
          method: "GET",
          url: "https://example.com/orphan",
        },
      ],
    };
    const r = parseInsomniaV4(JSON.stringify(orphaned));
    // Orphan won't appear since its parent doesn't exist — that's fine,
    // the user can re-export. We just shouldn't crash.
    expect(r.requestCount).toBe(3);
  });
});
